"""
General file upload endpoint (S3)
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.security import get_current_user
from app.services.s3_service import upload_to_s3

router = APIRouter()


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "uploads",
    user=Depends(get_current_user),
):
    if user["role"] not in ("faculty", "admin", "student"):
        raise HTTPException(403, "Only authenticated users can upload files")
    result = await upload_to_s3(file, folder=folder)
    return result
