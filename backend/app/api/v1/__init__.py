from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, admin, faculty, students, coding,
    aptitude, technical, competitions, submissions,
    leaderboard, profile, websockets,
    notifications, media, upload, export, system,
)

router = APIRouter()

router.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
router.include_router(admin.router,         prefix="/admin",         tags=["Admin"])
router.include_router(faculty.router,       prefix="/faculty",       tags=["Faculty"])
router.include_router(students.router,      prefix="/students",      tags=["Students"])
router.include_router(coding.router,        prefix="/coding",        tags=["Coding"])
router.include_router(aptitude.router,      prefix="/aptitude",      tags=["Aptitude"])
router.include_router(technical.router,     prefix="/technical",     tags=["Technical"])
router.include_router(competitions.router,  prefix="/competitions",  tags=["Competitions"])
router.include_router(submissions.router,   prefix="/submissions",   tags=["Submissions"])
router.include_router(leaderboard.router,   prefix="/leaderboard",   tags=["Leaderboard"])
router.include_router(profile.router,       prefix="/profile",       tags=["Profile"])
router.include_router(websockets.router,    prefix="/ws",            tags=["WebSockets"])
router.include_router(notifications.router, prefix="/notifications",  tags=["Notifications"])
router.include_router(media.router,         prefix="/media",         tags=["Media"])
router.include_router(upload.router,        prefix="/upload",        tags=["Upload"])
router.include_router(export.router,        prefix="/export",        tags=["Export"])
router.include_router(system.router,        prefix="/system",        tags=["System"])
