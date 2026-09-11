import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.core import db
from app.models.user import User, EmailVerificationOTP
from app.models.pdf_document import PDFDocument
from app.services.otp_service import otp_service
from app.utils.security import generate_jwt, hash_password

def run_tests():
    app = create_app()
    client = app.test_client()

    with app.app_context():
        print("🚀 STARTING SUNDARAM PREP AUTHENTICATION TEST SUITE...\n")

        # Clean up any test users
        test_email = "aspirant.test@sundaramprep.com"
        User.query.filter_by(email=test_email).delete()
        EmailVerificationOTP.query.filter_by(email=test_email).delete()
        db.session.commit()

        # =================================================================
        # TEST 1: REGISTRATION FLOW
        # =================================================================
        print("1. Testing Registration (Account creation in PENDING state)...")
        reg_payload = {
            "full_name": "Aspirant Test",
            "email": test_email,
            "password": "SecurePassword123!",
            "target_exam": "UPSC_CSE"
        }
        res = client.post("/api/auth/register", json=reg_payload)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.data}"
        data = res.get_json()["data"]
        assert data["requires_otp"] is True, "requires_otp must be True"
        assert data["status"] == "PENDING", "User status must be PENDING"
        
        # Verify DB state: user is unverified and raw OTP is NOT stored
        user = User.query.filter_by(email=test_email).first()
        assert user is not None, "User not found in DB"
        assert user.email_verified is False, "email_verified must be False after registration"
        assert user.status == "PENDING", "User status in DB must be PENDING"

        otp_record = EmailVerificationOTP.query.filter_by(email=test_email, purpose="REGISTRATION").first()
        assert otp_record is not None, "EmailVerificationOTP record must be created"
        assert len(otp_record.otp_hash) == 64, "otp_hash must be SHA-256 hash"
        assert otp_record.used_at is None, "used_at must be None initially"
        print("✓ Registration Test Passed: User created in PENDING state, OTP hashed in DB.\n")

        # =================================================================
        # TEST 2: RESEND LIMIT / COOLDOWN TEST
        # =================================================================
        print("2. Testing Resend Cooldown (30-second spam prevention)...")
        res = client.post("/api/auth/resend-otp", json={"email": test_email, "purpose": "REGISTRATION"})
        assert res.status_code == 429, f"Expected 429 Cooldown, got {res.status_code}"
        err = res.get_json()["error"]
        assert "Resend available in" in err["message"], f"Expected cooldown message, got: {err['message']}"
        print("✓ Resend Cooldown Test Passed: Fast resend request blocked with 429.\n")

        # =================================================================
        # TEST 3: INVALID OTP & BRUTE FORCE LOCK TEST
        # =================================================================
        print("3. Testing Invalid OTP & Brute-Force Lockout (5 attempts max)...")
        # Attempt 1: wrong OTP
        res = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": "000000"})
        assert res.status_code == 400, f"Expected 400 for wrong OTP, got {res.status_code}"
        assert "attempt(s) remaining" in res.get_json()["error"]["message"]

        # Attempts 2, 3, 4: wrong OTP
        for _ in range(3):
            client.post("/api/auth/verify-otp", json={"email": test_email, "otp": "000000"})

        # Attempt 5: should trigger lock
        res5 = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": "000000"})
        assert res5.status_code == 400
        assert "Code locked" in res5.get_json()["error"]["message"]

        # Attempt 6 after lock
        res6 = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": "000000"})
        assert res6.status_code == 400
        assert "locked" in res6.get_json()["error"]["message"]
        print("✓ Invalid OTP & Brute-Force Lock Test Passed: Code locked after 5 failed attempts.\n")

        # =================================================================
        # TEST 4: EXPIRED OTP TEST
        # =================================================================
        print("4. Testing Expired OTP Rejection...")
        # Reset cooldown by backdating old OTPs
        EmailVerificationOTP.query.filter_by(email=test_email).delete()
        db.session.commit()

        # Create an expired OTP directly
        raw_code = "123456"
        hashed = otp_service._hash_otp(test_email, raw_code, "REGISTRATION")
        expired_otp = EmailVerificationOTP(
            email=test_email,
            otp_hash=hashed,
            purpose="REGISTRATION",
            expires_at=datetime.utcnow() - timedelta(minutes=5),  # 5 minutes in the past
            created_at=datetime.utcnow() - timedelta(minutes=15)
        )
        db.session.add(expired_otp)
        db.session.commit()

        res = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": raw_code})
        assert res.status_code == 400, f"Expected 400 for expired OTP, got {res.status_code}"
        assert "expired" in res.get_json()["error"]["message"].lower()
        print("✓ Expired OTP Test Passed: Expired OTP rejected cleanly.\n")

        # =================================================================
        # TEST 5: SUCCESSFUL OTP VERIFICATION & ACTIVATION
        # =================================================================
        print("5. Testing Successful OTP Verification & Session Cookie Creation...")
        # Issue a fresh valid OTP
        success, msg, data = otp_service.create_and_send_otp(test_email, purpose="REGISTRATION", user_id=user.id)
        raw_otp = data["_dev_otp"]
        assert raw_otp is not None, "Dev OTP should be available in test environment"

        res = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.data}"
        res_json = res.get_json()["data"]
        assert res_json["verified"] is True
        assert res_json["token"] is not None

        # Verify HTTP-only cookie was set
        cookies = res.headers.getlist("Set-Cookie")
        assert any("access_token=" in c and "HttpOnly" in c for c in cookies), f"HTTP-Only cookie not set: {cookies}"

        # Verify DB state
        db.session.refresh(user)
        assert user.email_verified is True, "email_verified must now be True"
        assert user.status == "ACTIVE", "User status must now be ACTIVE"

        # Verify OTP is marked used (single use)
        otp_used = EmailVerificationOTP.query.filter_by(email=test_email, purpose="REGISTRATION").order_by(EmailVerificationOTP.created_at.desc()).first()
        assert otp_used.used_at is not None, "used_at must be populated after successful verification"

        # Verify replay attack fails
        replay_res = client.post("/api/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
        assert replay_res.status_code == 400, "Replay verification of used OTP must fail"
        print("✓ Successful OTP Verification Passed: User activated, session cookie set, replay prevented.\n")

        # =================================================================
        # TEST 6: LOGIN FLOW (WITH VERIFIED CHECK & COOKIE)
        # =================================================================
        print("6. Testing Login with Credentials & Cookie Session...")
        login_res = client.post("/api/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
        assert login_res.status_code == 200
        assert login_res.get_json()["data"]["user"]["email_verified"] is True
        cookies = login_res.headers.getlist("Set-Cookie")
        assert any("access_token=" in c and "HttpOnly" in c for c in cookies)

        # Wrong password test
        bad_pass = client.post("/api/auth/login", json={"email": test_email, "password": "WrongPassword"})
        assert bad_pass.status_code == 401
        print("✓ Login Flow Passed: Correct credentials authenticated, session cookie set.\n")

        # =================================================================
        # TEST 7: FORGOT PASSWORD FLOW
        # =================================================================
        print("7. Testing Forgot Password Flow (Request -> OTP -> Reset)...")
        # Request OTP
        req_res = client.post("/api/auth/forgot-password/request", json={"email": test_email})
        assert req_res.status_code == 200

        fp_otp = EmailVerificationOTP.query.filter_by(email=test_email, purpose="FORGOT_PASSWORD").order_by(EmailVerificationOTP.created_at.desc()).first()
        assert fp_otp is not None, "Forgot password OTP must be created"

        # Backdoor retrieve for test verification via service salt
        # Let's generate a known one
        raw_fp_otp = otp_service.generate_code()
        fp_otp.otp_hash = otp_service._hash_otp(test_email, raw_fp_otp, "FORGOT_PASSWORD")
        db.session.commit()

        # Reset password
        new_pass = "BrandNewSecretPass456!"
        reset_res = client.post("/api/auth/forgot-password/reset", json={
            "email": test_email,
            "otp": raw_fp_otp,
            "new_password": new_pass
        })
        assert reset_res.status_code == 200, f"Reset failed: {reset_res.data}"

        # Confirm old password no longer works
        old_login = client.post("/api/auth/login", json={"email": test_email, "password": "SecurePassword123!"})
        assert old_login.status_code == 401

        # Confirm new password works
        new_login = client.post("/api/auth/login", json={"email": test_email, "password": new_pass})
        assert new_login.status_code == 200
        print("✓ Forgot Password Test Passed: Password securely reset and authenticated.\n")

        # =================================================================
        # TEST 8: EMAIL CHANGE FLOW
        # =================================================================
        print("8. Testing Email Change Flow (Old email active until new verified)...")
        auth_token = new_login.get_json()["data"]["token"]
        new_email = "aspirant.updated@sundaramprep.com"
        User.query.filter_by(email=new_email).delete()
        EmailVerificationOTP.query.filter_by(email=new_email).delete()
        db.session.commit()

        # Step 1: Request change
        change_req = client.post(
            "/api/auth/change-email/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"new_email": new_email}
        )
        assert change_req.status_code == 200

        # Confirm user's email in DB is STILL the old email
        db.session.refresh(user)
        assert user.email == test_email, "Old email must remain active until verification succeeds!"

        # Step 2: Verify with OTP
        ch_otp = EmailVerificationOTP.query.filter_by(email=new_email, purpose="EMAIL_CHANGE").first()
        raw_ch_otp = otp_service.generate_code()
        ch_otp.otp_hash = otp_service._hash_otp(new_email, raw_ch_otp, "EMAIL_CHANGE")
        db.session.commit()

        verify_change = client.post(
            "/api/auth/verify-otp",
            json={"email": new_email, "otp": raw_ch_otp, "purpose": "EMAIL_CHANGE"}
        )
        assert verify_change.status_code == 200

        # Confirm user's email in DB has updated to new email
        db.session.refresh(user)
        assert user.email == new_email, "Email should now be updated to new email"
        print("✓ Email Change Test Passed: Old email protected until new verified.\n")

        # =================================================================
        # TEST 9: STUDENT PROTECTION & RESOURCE ISOLATION
        # =================================================================
        print("9. Testing Student Protection & Multi-Tenant Resource Isolation...")
        # Create Student B
        student_b_email = "student.b@sundaramprep.com"
        User.query.filter_by(email=student_b_email).delete()
        db.session.commit()

        student_b = User(
            name="Student B",
            email=student_b_email,
            email_verified=True,
            password_hash=hash_password("PassB123!"),
            status="ACTIVE"
        )
        db.session.add(student_b)
        db.session.commit()

        token_b = generate_jwt(student_b.id, student_b.email)

        # Student A uploads a PDF document
        doc_a = PDFDocument(
            user_id=user.id,
            file_name="student_a_private_notes.pdf",
            file_path="/tmp/test.pdf",
            file_size_bytes=1024,
            status="READY"
        )
        db.session.add(doc_a)
        db.session.commit()

        # Student B attempts to access Student A's document drafts
        res_access = client.get(
            f"/api/pdf/documents/{doc_a.id}/drafts",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert res_access.status_code == 403, f"Expected 403 Forbidden for cross-student access, got {res_access.status_code}"
        assert "Access denied" in res_access.get_json()["error"]["message"]

        # Student A can access their own document
        res_access_a = client.get(
            f"/api/pdf/documents/{doc_a.id}/drafts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert res_access_a.status_code == 200, "Student A should have access to their own document"
        print("✓ Student Protection Test Passed: Student A's documents strictly isolated from Student B.\n")

        # Clean up test artifacts
        db.session.delete(doc_a)
        db.session.delete(user)
        db.session.delete(student_b)
        EmailVerificationOTP.query.filter_by(email=test_email).delete()
        EmailVerificationOTP.query.filter_by(email=new_email).delete()
        EmailVerificationOTP.query.filter_by(email=student_b_email).delete()
        db.session.commit()

        print("🎉 ALL PRODUCTION AUTHENTICATION & SECURITY TESTS PASSED 100%!")

if __name__ == "__main__":
    run_tests()
