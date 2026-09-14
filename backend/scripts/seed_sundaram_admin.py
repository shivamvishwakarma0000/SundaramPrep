import os
import psycopg2
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

# Load env variables
load_dotenv('backend/.env')
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    load_dotenv()
    db_url = os.environ.get('DATABASE_URL')

print(f"Connecting to database...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# 1. Add phone and role columns if not present
print("Ensuring columns in users table...")
cur.execute("""
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'STUDENT';
""")

# Create index on phone
cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users(phone) WHERE phone IS NOT NULL;
""")

# 2. Check if Sundaram user already exists by phone or email
phone = "9794529611"
default_password = "sundaram"
pwd_hash = generate_password_hash(default_password)

cur.execute("SELECT id, name, email, phone, role FROM users WHERE phone = %s OR email = %s;", (phone, 'aspirant@sundaramprep.com'))
existing = cur.fetchone()

if existing:
    user_id, name, email, u_phone, role = existing
    print(f"Updating existing user {user_id} ({email}) to Admin...")
    cur.execute("""
        UPDATE users 
        SET phone = %s, password_hash = %s, role = 'ADMIN', name = 'Sundaram Vishwakarma', updated_at = NOW()
        WHERE id = %s;
    """, (phone, pwd_hash, user_id))
    print(f"Sundaram admin updated with phone {phone} and password '{default_password}' (ADMIN role)!")
else:
    # Check if there is another user we can designate or create new
    import uuid
    new_id = str(uuid.uuid4())
    print("Creating new Sundaram Admin user...")
    cur.execute("""
        INSERT INTO users (id, name, email, email_verified, password_hash, phone, role, target_exam, language, daily_goal, status, created_at, updated_at)
        VALUES (%s, 'Sundaram Vishwakarma', 'sundaram@sundaramprep.com', true, %s, %s, 'ADMIN', 'UPSC_CSE', 'EN', 30, 'ACTIVE', NOW(), NOW());
    """, (new_id, pwd_hash, phone))
    print(f"Created Sundaram Admin user {new_id} with phone {phone}!")

# Verify
cur.execute("SELECT id, name, email, phone, role FROM users WHERE phone = %s;", (phone,))
row = cur.fetchone()
print(f"Verified Sundaram Admin in DB: {row}")

conn.close()
print("Migration & Seeding completed successfully.")
