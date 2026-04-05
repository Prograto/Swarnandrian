from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(oauth2_scheme)):
    from app.db.mongodb import get_db
    from bson import ObjectId

    payload = decode_token(token)
    user_id: str = payload.get("sub")
    role: str = payload.get("role")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db = await get_db()

    collection_map = {
        "admin": "admins",
        "faculty": "faculty",
        "student": "students",
    }

    collection = collection_map.get(role)
    if not collection:
        raise HTTPException(status_code=401, detail="Invalid role")

    user = await db[collection].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    user["role"] = role
    user["id"] = str(user["_id"])
    return user


def require_role(*roles: str):
    async def checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {roles}",
            )
        return current_user
    return checker


require_admin = require_role("admin")
require_faculty = require_role("admin", "faculty")
require_student = require_role("student")
require_any = require_role("admin", "faculty", "student")
