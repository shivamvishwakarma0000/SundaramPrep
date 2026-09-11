import json
from app import create_app
from app.models.core import db
from app.models.question import Question

def test_endpoints():
    app = create_app()
    client = app.test_client()
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.data}"
    health_data = res.get_json()
    assert health_data["success"] is True
    print("✓ Health Check Passed:", health_data["data"]["status"])
    
    # 2. Demo Auth Login
    res = client.post("/api/auth/demo-login")
    assert res.status_code == 200, f"Demo login failed: {res.data}"
    auth_data = res.get_json()
    token = auth_data["data"]["token"]
    assert token, "Token should be present"
    print("✓ Auth Demo Login Passed:", auth_data["data"]["user"]["email"])
    
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Student Home Aggregated Summary (Section 10 Low-Transfer Home)
    res = client.get("/api/student/home", headers=headers)
    assert res.status_code == 200, f"Home summary failed: {res.data}"
    home_data = res.get_json()["data"]
    assert "greeting" in home_data
    assert "streak" in home_data
    assert "daily_goal" in home_data
    assert "daily_current_affairs" in home_data
    print("✓ Student Home Summary Passed: Greeting:", home_data["greeting"])

    # 4. Student Practice Hub
    res = client.get("/api/student/practice-hub?exam=UPSC_CSE", headers=headers)
    assert res.status_code == 200
    hub_data = res.get_json()["data"]
    assert len(hub_data["subjects"]) > 0
    print("✓ Practice Hub Passed: Subjects Count:", len(hub_data["subjects"]))

    # 5. Quick 10 Blitz
    res = client.post("/api/student/quick-10", json={"exam": "UPSC_CSE"}, headers=headers)
    assert res.status_code == 200
    quick_data = res.get_json()["data"]
    assert len(quick_data["questions"]) > 0
    print("✓ Quick 10 Session Started:", len(quick_data["questions"]), "questions.")

    # 6. Questions Query
    res = client.get("/api/questions?exam=UPSC_CSE")
    assert res.status_code == 200
    q_data = res.get_json()
    assert q_data["data"]["total"] >= 1
    first_q = q_data["data"]["questions"][0]
    print(f"✓ Questions Query Passed: Total {q_data['data']['total']} questions.")

    # 7. Start Practice Session & Submit Wrong Answer to test Mistake Engine
    res = client.post("/api/practice/start", json={"exam": "UPSC_CSE", "count": 5}, headers=headers)
    assert res.status_code == 200
    session_id = res.get_json()["data"]["session"]["id"]
    
    # Submit intentionally wrong option (anything other than correct_answer)
    wrong_opt = "A" if first_q["correct_answer"] != "A" else "B"
    res = client.post("/api/practice/submit", json={
        "session_id": session_id,
        "question_id": first_q["id"],
        "selected_option": wrong_opt,
        "time_taken_seconds": 35
    }, headers=headers)
    assert res.status_code == 200
    sub_data = res.get_json()["data"]
    assert sub_data["is_correct"] is False
    print("✓ Submit Answer (Incorrect) Passed: Recorded in Mistake Engine.")

    # 8. Check Mistakes List
    res = client.get("/api/student/mistakes", headers=headers)
    assert res.status_code == 200
    mistakes_data = res.get_json()["data"]
    assert mistakes_data["total"] >= 1
    print("✓ Mistake Engine List Passed: Total mistakes tracked:", mistakes_data["total"])

    # 9. Bookmarks Toggle & List
    res = client.post("/api/student/bookmarks/toggle", json={
        "question_id": first_q["id"],
        "notes": "Review judicial review provisions"
    }, headers=headers)
    assert res.status_code == 200
    if not res.get_json()["data"]["bookmarked"]:
        # Was already bookmarked, toggle once more to ensure active
        res = client.post("/api/student/bookmarks/toggle", json={
            "question_id": first_q["id"],
            "notes": "Review judicial review provisions"
        }, headers=headers)
    assert res.get_json()["data"]["bookmarked"] is True
    
    res = client.get("/api/student/bookmarks", headers=headers)
    assert res.status_code == 200
    bm_data = res.get_json()["data"]
    assert bm_data["total"] >= 1
    print("✓ Bookmarks System Passed: Total bookmarked:", bm_data["total"])

    # 10. Profile & Settings (Section 12)
    res = client.get("/api/student/profile", headers=headers)
    assert res.status_code == 200
    prof_data = res.get_json()["data"]
    assert "user" in prof_data
    assert "stats" in prof_data
    print("✓ Student Profile Passed: Target exam:", prof_data["user"]["target_exam"])

    res = client.patch("/api/student/profile", json={"daily_goal": 35}, headers=headers)
    assert res.status_code == 200
    print("✓ Student Profile Update Passed.")

    # 11. AI Assistant Chat
    res = client.post("/api/ai/chat", json={
        "query": "Give me a memory trick for remembering the Preamble ideals in order",
        "language_mode": "EN"
    })
    assert res.status_code == 200
    print("✓ Sundaram AI Chat Passed.")

    print("\nALL NEON POSTGRESQL PRODUCTION BACKEND TESTS PASSED!")

if __name__ == "__main__":
    test_endpoints()
