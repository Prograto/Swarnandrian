"""
AWS S3 Service — upload files, generate presigned URLs
"""
import boto3
import uuid
import mimetypes
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from app.core.config import settings


def _get_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


ALLOWED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    "video": ["video/mp4", "video/webm", "video/mpeg"],
    "document": [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
}

ALL_ALLOWED = [ct for types in ALLOWED_TYPES.values() for ct in types]


def _is_allowed_content_type(content_type: str, filename: str) -> bool:
    if content_type in ALL_ALLOWED:
        return True
    if content_type.startswith("image/") or content_type.startswith("video/"):
        return True
    lowered = (filename or "").lower()
    if lowered.endswith((".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm", ".mov", ".avi", ".mkv", ".txt")):
        return True
    return False


async def upload_to_s3(file: UploadFile, folder: str = "uploads") -> dict:
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)

    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(413, f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB allowed.")

    content_type = file.content_type or "application/octet-stream"
    if not _is_allowed_content_type(content_type, file.filename or ""):
        raise HTTPException(415, f"File type '{content_type}' not allowed.")

    ext = mimetypes.guess_extension(content_type) or ""
    if ext == ".jpe":
        ext = ".jpg"
    key = f"{folder}/{uuid.uuid4().hex}{ext}"

    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        url = f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

        # Detect category
        category = "document"
        for cat, types in ALLOWED_TYPES.items():
            if content_type in types:
                category = cat
                break

        return {
            "url": url,
            "key": key,
            "filename": file.filename,
            "size_mb": round(file_size_mb, 2),
            "content_type": content_type,
            "category": category,
        }
    except ClientError as e:
        raise HTTPException(500, f"S3 upload failed: {str(e)}")


def delete_from_s3(key: str) -> bool:
    try:
        client = _get_client()
        client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
        return True
    except ClientError:
        return False


def get_presigned_url(key: str, expires: int = 3600) -> str:
    try:
        client = _get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET, "Key": key},
            ExpiresIn=expires,
        )
    except ClientError:
        return ""
