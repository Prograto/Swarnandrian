"""
Notifications API — Faculty creates, Students receive
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.mongodb import get_db

router = APIRouter()


class NotificationCreate(BaseModel):
    title: str
    message: str
    target_role: str = "student"          # student | faculty | all
    target_department: Optional[str] = None


def fix(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def get_user_uid(user: dict) -> str:
    # `get_current_user` normalizes Mongo `_id` into `id`.
    uid = user.get("id") or user.get("user_id")
    if not uid:
        raise HTTPException(401, "Invalid authenticated user")
    return uid


@router.post("/", status_code=201)
async def create_notification(
    data: NotificationCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Only faculty or admin can create notifications")

    doc = {
        "title": data.title,
        "message": data.message,
        "target_role": data.target_role,
        "target_department": data.target_department,
        "created_by": get_user_uid(user),
        "created_by_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
        "read_by": [],
    }
    result = await db.notifications.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Notification sent"}


@router.get("/")
async def get_notifications(
    page: int = 1,
    limit: int = 20,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    role = user["role"]
    dept = user.get("department")

    query: dict = {
        "$or": [
            {"target_role": role},
            {"target_role": "all"},
        ]
    }
    if dept:
        query["$or"].append({"target_department": dept})

    skip = (page - 1) * limit
    cursor = db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    uid = get_user_uid(user)

    items = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["is_read"] = uid in d.get("read_by", [])
        d.pop("read_by", None)
        items.append(d)

    total = await db.notifications.count_documents(query)
    unread = sum(1 for n in items if not n["is_read"])

    return {"notifications": items, "total": total, "unread": unread}


@router.post("/{notif_id}/read")
async def mark_read(
    notif_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    uid = get_user_uid(user)
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id)},
        {"$addToSet": {"read_by": uid}},
    )
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user=Depends(get_current_user), db=Depends(get_db)):
    uid = get_user_uid(user)
    role = user["role"]
    await db.notifications.update_many(
        {"$or": [{"target_role": role}, {"target_role": "all"}]},
        {"$addToSet": {"read_by": uid}},
    )
    return {"ok": True}


@router.delete("/{notif_id}")
async def delete_notification(
    notif_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    await db.notifications.delete_one({"_id": ObjectId(notif_id)})
    return {"ok": True}
