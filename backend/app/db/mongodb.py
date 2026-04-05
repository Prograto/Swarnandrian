from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    _db = _client[settings.MONGODB_DB_NAME]
    # Create indexes
    await _create_indexes()


async def close_db():
    global _client
    if _client:
        _client.close()


async def get_db() -> AsyncIOMotorDatabase:
    return _db


async def _create_indexes():
    """Create all required MongoDB indexes for performance."""
    # Admins
    await _db.admins.create_index("admin_id", unique=True)
    await _db.admins.create_index("email", unique=True)

    # Faculty
    await _db.faculty.create_index("faculty_id", unique=True)
    await _db.faculty.create_index("email", unique=True)
    await _db.faculty.create_index("department")

    # Students
    await _db.students.create_index("student_id", unique=True)
    await _db.students.create_index([("department", 1), ("year", 1)])
    await _db.students.create_index("section")
    await _db.students.create_index("course")

    # Coding
    await _db.coding_sections.create_index("created_by")
    await _db.coding_problems.create_index("section_id")
    await _db.coding_problems.create_index("difficulty")

    # Submissions
    await _db.code_submissions.create_index([("student_id", 1), ("problem_id", 1)])
    await _db.code_submissions.create_index("problem_id")
    await _db.code_submissions.create_index("created_at")

    # Aptitude / Technical
    await _db.apt_sections.create_index("type")  # 'aptitude' | 'technical'
    await _db.apt_questions.create_index("section_id")
    await _db.apt_submissions.create_index([("student_id", 1), ("test_id", 1)])

    # Tests
    await _db.tests.create_index("section_id")
    await _db.tests.create_index("mode")  # practice | competitor

    # Competitions
    await _db.competitions.create_index("access_code", unique=True)
    await _db.competitions.create_index("faculty_id")
    await _db.competitions.create_index([("start_time", 1), ("end_time", 1)])

    # Leaderboard
    await _db.leaderboard.create_index([("student_id", 1), ("section", 1)])
    await _db.leaderboard.create_index([("student_id", 1), ("section_type", 1), ("section_id", 1), ("test_id", 1)])
    await _db.leaderboard.create_index([("score", -1)])

    # Auth audit trail
    await _db.login_history.create_index([("login_at", -1)])
    await _db.login_history.create_index([("role", 1), ("login_at", -1)])
    await _db.login_history.create_index([("department", 1), ("login_at", -1)])
    await _db.login_history.create_index("user_id")

    print("✅ MongoDB indexes created")
