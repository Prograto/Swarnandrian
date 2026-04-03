"""Student profile endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.security import get_current_user, hash_password
from app.db.mongodb import get_db
from app.models.schemas import StudentProfileUpdate

router = APIRouter()


@router.get("/me")
async def my_profile(db=Depends(get_db), user=Depends(get_current_user)):
    student = await db.students.find_one({"_id": ObjectId(user["id"])}, {"password_hash": 0})
    if not student:
        raise HTTPException(404, "Profile not found")
    student["id"] = str(student.pop("_id"))
    return student


@router.put("/me")
async def update_profile(
    data: StudentProfileUpdate, db=Depends(get_db), user=Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    profile_update = {}

    if "name" in update_data:
        profile_update["name"] = update_data.pop("name")

    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            profile_update["password_hash"] = hash_password(password)

    profile_update.update({"profile." + k: v for k, v in update_data.items()})
    await db.students.update_one({"_id": ObjectId(user["id"])}, {"$set": profile_update})
    return {"message": "Profile updated"}


@router.get("/public/{student_id}")
async def public_portfolio(student_id: str, db=Depends(get_db)):
    """Public portfolio - accessible by recruiters without auth"""
    student = await db.students.find_one(
        {"student_id": student_id},
        {"password_hash": 0, "password": 0}
    )
    if not student:
        raise HTTPException(404, "Student not found")

    # Get leaderboard rank
    pipeline = [
        {"$group": {"_id": "$student_id", "score": {"$sum": "$score"}}},
        {"$sort": {"score": -1}},
    ]
    all_scores = await db.leaderboard.aggregate(pipeline).to_list(10000)
    rank = next((i + 1 for i, s in enumerate(all_scores) if s["_id"] == str(student["_id"])), None)

    student["id"] = str(student.pop("_id"))
    student["platform_rank"] = rank
    return student


@router.get("/me/stats")
async def my_stats(db=Depends(get_db), user=Depends(get_current_user)):
    student = await db.students.find_one({"_id": ObjectId(user["id"])}, {"stats": 1})
    submissions = await db.code_submissions.count_documents({"student_id": user["id"]})
    accepted = await db.code_submissions.count_documents({"student_id": user["id"], "status": "accepted"})

    return {
        "stats": student.get("stats", {}),
        "total_submissions": submissions,
        "accepted_submissions": accepted,
    }
