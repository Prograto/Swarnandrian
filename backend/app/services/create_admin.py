"""
Swarnandrian - Create Admin Account
Run this script once to create your first admin.
Usage: python create_admin.py
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password

# ─── CONFIGURE THESE ─────────────────────────────────────────────────────────
MONGODB_URL = "mongodb+srv://swarnandrian_db_user:Swarnandrian89@swarnandrian.m2yxgzv.mongodb.net/?appName=Swarnandrian"

ADMIN = {
    "name":           "Super Admin",
    "designation":    "HOD",
    "department":     "CSE",
    "contact_number": "9999999999",
    "email":          "admin@swarnandrian.edu",
    "admin_id":       "ADMIN001",
    "password":       "Admin@123",
}
# ─────────────────────────────────────────────────────────────────────────────


async def create_admin():
    print("\n🎓 Swarnandrian - Admin Creator")
    print("─" * 40)

    # Connect
    print(f"🔌 Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client["swarnandrian"]

    try:
        # Test connection
        await client.admin.command("ping")
        print("✅ Connected to MongoDB\n")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("\n💡 Fix: Update MONGODB_URL at the top of this script")
        return

    # Check if admin already exists
    existing = await db.admins.find_one({"admin_id": ADMIN["admin_id"]})
    if existing:
        print(f"⚠️  Admin '{ADMIN['admin_id']}' already exists!")
        print("   Change the admin_id in this script to create another one.")
        client.close()
        return

    # Create admin document
    doc = {
        "name":           ADMIN["name"],
        "designation":    ADMIN["designation"],
        "department":     ADMIN["department"],
        "contact_number": ADMIN["contact_number"],
        "email":          ADMIN["email"],
        "admin_id":       ADMIN["admin_id"],
        "password_hash":  hash_password(ADMIN["password"]),
        "is_active":      True,
        "created_at":     datetime.utcnow(),
    }

    result = await db.admins.insert_one(doc)

    print("✅ Admin created successfully!")
    print()
    print("  Login Details")
    print("  ─────────────────────────────")
    print(f"  URL      : http://localhost:3000/login")
    print(f"  Role     : Admin")
    print(f"  Admin ID : {ADMIN['admin_id']}")
    print(f"  Password : {ADMIN['password']}")
    print()
    print("  Change the password after first login!")
    print()

    client.close()


if __name__ == "__main__":
    asyncio.run(create_admin())
