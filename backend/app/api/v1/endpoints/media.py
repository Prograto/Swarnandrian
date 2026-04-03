"""
Media Section API — Google Drive-like file/folder management with S3
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.mongodb import get_db
from app.services.s3_service import upload_to_s3, delete_from_s3

router = APIRouter()


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None     # None = root
    banner_url: Optional[str] = None
    description: Optional[str] = None
    branch: Optional[str] = None
    is_active: bool = True


class LinkCreate(BaseModel):
    name: str
    url: str
    folder_id: Optional[str] = None
    description: Optional[str] = None
    branch: Optional[str] = None
    is_active: bool = True


def fix(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
        if "parent_id" in doc and doc["parent_id"]:
            doc["parent_id"] = str(doc["parent_id"])
    return doc


def _student_branch(user: dict) -> Optional[str]:
    return user.get("branch") or user.get("department")


# ─── Folders ──────────────────────────────────────────────────────────────────

@router.post("/folders", status_code=201)
async def create_folder(
    data: FolderCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Only faculty or admin can create folders")

    creator_id = user.get("id") or user.get("user_id")
    doc = {
        "name": data.name,
        "parent_id": ObjectId(data.parent_id) if data.parent_id else None,
        "banner_url": data.banner_url,
        "description": data.description,
        "branch": data.branch,
        "is_active": data.is_active,
        "created_by": creator_id,
        "created_by_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
        "type": "folder",
    }
    result = await db.media.insert_one(doc)
    return {"id": str(result.inserted_id), "name": data.name}


@router.get("/folders")
async def list_folders(
    parent_id: Optional[str] = None,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    query: dict = {"type": "folder"}
    branch = None
    if parent_id:
        query["parent_id"] = ObjectId(parent_id)
    else:
        query["parent_id"] = None

    if user.get("role") == "student":
        branch = _student_branch(user)
        query["is_active"] = True

    cursor = db.media.find(query).sort("name", 1)
    folders = await cursor.to_list(200)
    if user.get("role") == "student" and branch:
        folders = [folder for folder in folders if not folder.get("branch") or folder.get("branch") == branch]
    return [fix(f) for f in folders]


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    # Delete folder + all children recursively
    async def delete_recursive(fid: ObjectId):
        children = await db.media.find({"parent_id": fid}).to_list(500)
        for child in children:
            if child["type"] == "folder":
                await delete_recursive(child["_id"])
            else:
                if child.get("s3_key"):
                    delete_from_s3(child["s3_key"])
        await db.media.delete_many({"parent_id": fid})
    
    oid = ObjectId(folder_id)
    await delete_recursive(oid)
    await db.media.delete_one({"_id": oid})
    return {"ok": True}


# ─── File Upload ──────────────────────────────────────────────────────────────

@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Only faculty or admin can upload files")

    creator_id = user.get("id") or user.get("user_id")
    s3_result = await upload_to_s3(file, folder="media")
    branch = user.get("branch") or user.get("department")

    doc = {
        "name": name or file.filename,
        "type": "file",
        "category": s3_result["category"],
        "url": s3_result["url"],
        "s3_key": s3_result["key"],
        "size_mb": s3_result["size_mb"],
        "content_type": s3_result["content_type"],
        "parent_id": ObjectId(folder_id) if folder_id else None,
        "branch": branch,
        "is_active": True,
        "created_by": creator_id,
        "created_by_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
    }
    result = await db.media.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    if doc.get("parent_id"):
        doc["parent_id"] = str(doc["parent_id"])
    return doc


# ─── External Links ───────────────────────────────────────────────────────────

@router.post("/links", status_code=201)
async def add_link(
    data: LinkCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")

    creator_id = user.get("id") or user.get("user_id")
    doc = {
        "name": data.name,
        "type": "link",
        "url": data.url,
        "description": data.description,
        "parent_id": ObjectId(data.folder_id) if data.folder_id else None,
        "branch": data.branch,
        "is_active": data.is_active,
        "created_by": creator_id,
        "created_by_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
    }
    result = await db.media.insert_one(doc)
    return {"id": str(result.inserted_id)}


# ─── List Contents ────────────────────────────────────────────────────────────

@router.get("/contents")
async def list_contents(
    folder_id: Optional[str] = None,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    query: dict = {"type": {"$ne": "folder"}}
    if folder_id:
        query["parent_id"] = ObjectId(folder_id)
    else:
        query["parent_id"] = None

    if user.get("role") == "student":
        query["is_active"] = True

    cursor = db.media.find(query).sort("created_at", -1)
    files = await cursor.to_list(500)
    student_branch = _student_branch(user)
    if user.get("role") == "student" and student_branch:
        files = [item for item in files if not item.get("branch") or item.get("branch") == student_branch]
    return [fix(f) for f in files]


# ─── Breadcrumb ───────────────────────────────────────────────────────────────

@router.get("/breadcrumb/{folder_id}")
async def get_breadcrumb(
    folder_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    crumbs = []
    current_id = folder_id
    for _ in range(10):  # max depth
        folder = await db.media.find_one({"_id": ObjectId(current_id)})
        if not folder:
            break
        crumbs.insert(0, {"id": str(folder["_id"]), "name": folder["name"]})
        if not folder.get("parent_id"):
            break
        current_id = str(folder["parent_id"])
    return crumbs


# ─── Delete File ──────────────────────────────────────────────────────────────

@router.delete("/{item_id}")
async def delete_item(
    item_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    item = await db.media.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(404, "Not found")
    if item.get("s3_key"):
        delete_from_s3(item["s3_key"])
    await db.media.delete_one({"_id": ObjectId(item_id)})
    return {"ok": True}


@router.patch("/{item_id}/toggle")
async def toggle_item(
    item_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    item = await db.media.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(404, "Not found")
    new_state = not item.get("is_active", True)
    await db.media.update_one({"_id": ObjectId(item_id)}, {"$set": {"is_active": new_state}})
    return {"id": item_id, "is_active": new_state}
