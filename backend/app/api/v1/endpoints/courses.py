"""
Courses endpoint - GFG-style course management for Aptitude, Coding & Technical sections
Faculty can create courses, topics, sub-topics, blogs; Students can track progress.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
from app.core.security import get_current_user
from app.db.mongodb import get_db
from pydantic import BaseModel

router = APIRouter()

# ─── Models ────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str
    description: str
    section_type: str  # aptitude | coding | technical
    thumbnail_url: Optional[str] = ""
    is_published: bool = False
    tags: Optional[List[str]] = []
    difficulty: Optional[str] = "Beginner"

class TopicCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    order: int = 0

class SubTopicCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    order: int = 0

class BlogCreate(BaseModel):
    title: str
    content: str  # Rich HTML content
    summary: Optional[str] = ""
    video_url: Optional[str] = ""
    image_url: Optional[str] = ""
    code_snippets: Optional[List[dict]] = []
    tags: Optional[List[str]] = []
    related_test_id: Optional[str] = None
    estimated_read_time: int = 5

class ProgressUpdate(BaseModel):
    completed: bool
    time_spent_minutes: Optional[int] = 0


def _oid(s):
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(400, "Invalid ID")


# ─── Course CRUD ──────────────────────────────────────────────────────────

@router.post("/")
async def create_course(data: CourseCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Only faculty/admin can create courses")
    doc = {
        **data.model_dump(),
        "faculty_id": user["id"],
        "faculty_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "enrollment_count": 0,
        "topics": [],
    }
    result = await db.courses.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Course created"}


@router.get("/")
async def list_courses(
    section_type: Optional[str] = None,
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    page: int = 1,
    limit: int = 12,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query: dict = {}
    if user["role"] not in ("faculty", "admin"):
        query["is_published"] = True
    elif user["role"] == "faculty":
        # Faculty sees their own + published
        query["$or"] = [{"faculty_id": user["id"]}, {"is_published": True}]

    if section_type:
        query["section_type"] = section_type
    if difficulty:
        query["difficulty"] = difficulty
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}},
        ]

    total = await db.courses.count_documents(query)
    cursor = db.courses.find(query, {"topics": 0}).skip((page - 1) * limit).limit(limit).sort("created_at", -1)
    courses = []
    async for c in cursor:
        c["id"] = str(c.pop("_id"))
        # Count topics
        topic_count = await db.course_topics.count_documents({"course_id": c["id"]})
        c["topic_count"] = topic_count
        courses.append(c)
    return {"items": courses, "total": total, "page": page, "limit": limit}


@router.get("/{course_id}")
async def get_course(course_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    c = await db.courses.find_one({"_id": _oid(course_id)})
    if not c:
        raise HTTPException(404, "Course not found")
    c["id"] = str(c.pop("_id"))
    # Get topics with sub-topics
    topics = []
    async for t in db.course_topics.find({"course_id": course_id}).sort("order", 1):
        t["id"] = str(t.pop("_id"))
        # sub-topics
        subtopics = []
        async for st in db.course_subtopics.find({"topic_id": t["id"]}).sort("order", 1):
            st["id"] = str(st.pop("_id"))
            blog_docs = []
            async for blog in db.course_blogs.find({"subtopic_id": st["id"]}).sort("created_at", 1):
                blog["id"] = str(blog.pop("_id"))
                blog_docs.append(blog)
            st["blogs"] = blog_docs
            st["blog_count"] = len(blog_docs)
            subtopics.append(st)
        t["subtopics"] = subtopics
        topics.append(t)
    c["topics"] = topics
    return c


@router.put("/{course_id}")
async def update_course(course_id: str, data: CourseCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    update = {**data.model_dump(), "updated_at": datetime.utcnow()}
    await db.courses.update_one({"_id": _oid(course_id)}, {"$set": update})
    return {"message": "Course updated"}


@router.delete("/{course_id}")
async def delete_course(course_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    await db.courses.delete_one({"_id": _oid(course_id)})
    # Cascade delete
    await db.course_topics.delete_many({"course_id": course_id})
    await db.course_subtopics.delete_many({"course_id": course_id})
    await db.course_blogs.delete_many({"course_id": course_id})
    return {"message": "Course deleted"}


# ─── Topics ──────────────────────────────────────────────────────────────

@router.post("/{course_id}/topics")
async def create_topic(course_id: str, data: TopicCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    doc = {
        **data.model_dump(),
        "course_id": course_id,
        "created_at": datetime.utcnow(),
    }
    result = await db.course_topics.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Topic created"}


@router.put("/{course_id}/topics/{topic_id}")
async def update_topic(course_id: str, topic_id: str, data: TopicCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    await db.course_topics.update_one({"_id": _oid(topic_id)}, {"$set": data.model_dump()})
    return {"message": "Topic updated"}


@router.delete("/{course_id}/topics/{topic_id}")
async def delete_topic(course_id: str, topic_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    await db.course_topics.delete_one({"_id": _oid(topic_id)})
    await db.course_subtopics.delete_many({"topic_id": topic_id})
    await db.course_blogs.delete_many({"topic_id": topic_id})
    return {"message": "Topic deleted"}


# ─── Sub-Topics ───────────────────────────────────────────────────────────

@router.post("/{course_id}/topics/{topic_id}/subtopics")
async def create_subtopic(course_id: str, topic_id: str, data: SubTopicCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    doc = {
        **data.model_dump(),
        "course_id": course_id,
        "topic_id": topic_id,
        "created_at": datetime.utcnow(),
    }
    result = await db.course_subtopics.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Sub-topic created"}


@router.put("/{course_id}/topics/{topic_id}/subtopics/{subtopic_id}")
async def update_subtopic(course_id: str, topic_id: str, subtopic_id: str, data: SubTopicCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    await db.course_subtopics.update_one({"_id": _oid(subtopic_id)}, {"$set": data.model_dump()})
    return {"message": "Sub-topic updated"}


@router.delete("/{course_id}/topics/{topic_id}/subtopics/{subtopic_id}")
async def delete_subtopic(course_id: str, topic_id: str, subtopic_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    await db.course_subtopics.delete_one({"_id": _oid(subtopic_id)})
    await db.course_blogs.delete_many({"subtopic_id": subtopic_id})
    return {"message": "Sub-topic deleted"}


# ─── Blogs ───────────────────────────────────────────────────────────────

@router.post("/{course_id}/topics/{topic_id}/subtopics/{subtopic_id}/blogs")
async def create_blog(
    course_id: str, topic_id: str, subtopic_id: str,
    data: BlogCreate, db=Depends(get_db), user=Depends(get_current_user)
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    doc = {
        **data.model_dump(),
        "course_id": course_id,
        "topic_id": topic_id,
        "subtopic_id": subtopic_id,
        "author_id": user["id"],
        "author_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "views": 0,
        "likes": 0,
    }
    result = await db.course_blogs.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Blog created"}


@router.get("/{course_id}/topics/{topic_id}/subtopics/{subtopic_id}/blogs")
async def list_blogs(
    course_id: str, topic_id: str, subtopic_id: str,
    db=Depends(get_db), user=Depends(get_current_user)
):
    blogs = []
    async for b in db.course_blogs.find({"subtopic_id": subtopic_id}).sort("created_at", 1):
        b["id"] = str(b.pop("_id"))
        blogs.append(b)
    return blogs


@router.get("/blogs/{blog_id}")
async def get_blog(blog_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    b = await db.course_blogs.find_one({"_id": _oid(blog_id)})
    if not b:
        raise HTTPException(404, "Blog not found")
    b["id"] = str(b.pop("_id"))
    # Increment views
    await db.course_blogs.update_one({"_id": _oid(blog_id)}, {"$inc": {"views": 1}})
    return b


@router.put("/blogs/{blog_id}")
async def update_blog(blog_id: str, data: BlogCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    existing = await db.course_blogs.find_one({"_id": _oid(blog_id)}, {"subtopic_id": 1})
    update = {**data.model_dump(), "updated_at": datetime.utcnow()}
    await db.course_blogs.update_one({"_id": _oid(blog_id)}, {"$set": update})

    if existing and existing.get("subtopic_id"):
        subtopic_id = str(existing["subtopic_id"])
        blog_count = await db.course_blogs.count_documents({"subtopic_id": subtopic_id})
        if blog_count == 1:
            await db.course_subtopics.update_one(
                {"_id": _oid(subtopic_id)},
                {"$set": {"title": data.title, "updated_at": datetime.utcnow()}},
            )

    return {"message": "Blog updated"}


@router.post("/{course_id}/topics/{topic_id}/blogs")
async def create_topic_blog(
    course_id: str,
    topic_id: str,
    data: BlogCreate,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")

    subtopic_doc = {
        "title": data.title,
        "description": data.summary or "",
        "order": 0,
        "course_id": course_id,
        "topic_id": topic_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    subtopic_result = await db.course_subtopics.insert_one(subtopic_doc)
    subtopic_id = str(subtopic_result.inserted_id)

    blog_doc = {
        **data.model_dump(),
        "course_id": course_id,
        "topic_id": topic_id,
        "subtopic_id": subtopic_id,
        "author_id": user["id"],
        "author_name": user.get("name", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "views": 0,
        "likes": 0,
    }
    blog_result = await db.course_blogs.insert_one(blog_doc)
    return {"id": str(blog_result.inserted_id), "subtopic_id": subtopic_id, "message": "Blog created"}


@router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user["role"] not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    existing = await db.course_blogs.find_one({"_id": _oid(blog_id)}, {"subtopic_id": 1})
    await db.course_blogs.delete_one({"_id": _oid(blog_id)})

    if existing and existing.get("subtopic_id"):
        subtopic_id = str(existing["subtopic_id"])
        remaining = await db.course_blogs.count_documents({"subtopic_id": subtopic_id})
        if remaining == 0:
            await db.course_subtopics.delete_one({"_id": _oid(subtopic_id)})

    return {"message": "Blog deleted"}


# ─── Progress Tracking ────────────────────────────────────────────────────

@router.post("/blogs/{blog_id}/progress")
async def update_progress(blog_id: str, data: ProgressUpdate, db=Depends(get_db), user=Depends(get_current_user)):
    await db.course_progress.update_one(
        {"student_id": user["id"], "blog_id": blog_id},
        {"$set": {
            "student_id": user["id"],
            "blog_id": blog_id,
            "completed": data.completed,
            "time_spent_minutes": data.time_spent_minutes,
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )
    return {"message": "Progress saved"}


@router.get("/{course_id}/my-progress")
async def my_course_progress(course_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    """Get student's learning progress for a course"""
    # All blog IDs in this course
    blog_ids = []
    async for b in db.course_blogs.find({"course_id": course_id}, {"_id": 1}):
        blog_ids.append(str(b["_id"]))

    completed_count = await db.course_progress.count_documents({
        "student_id": user["id"],
        "blog_id": {"$in": blog_ids},
        "completed": True,
    })

    progress_docs = []
    async for p in db.course_progress.find({"student_id": user["id"], "blog_id": {"$in": blog_ids}}):
        p["id"] = str(p.pop("_id"))
        progress_docs.append(p)

    completion_pct = round((completed_count / len(blog_ids) * 100) if blog_ids else 0, 1)

    return {
        "total_blogs": len(blog_ids),
        "completed": completed_count,
        "completion_percentage": completion_pct,
        "progress": progress_docs,
    }


@router.get("/my-all-progress")
async def my_all_progress(db=Depends(get_db), user=Depends(get_current_user)):
    """Summary of student's progress across all enrolled courses"""
    # Get all courses the student has started
    started = await db.course_progress.distinct("blog_id", {"student_id": user["id"]})
    # Map blog → course
    course_progress = {}
    async for b in db.course_blogs.find({"_id": {"$in": [_oid(bid) for bid in started]}}):
        cid = b.get("course_id")
        if cid not in course_progress:
            course_progress[cid] = {"completed": 0, "total": 0}
        if await db.course_progress.find_one({"student_id": user["id"], "blog_id": str(b["_id"]), "completed": True}):
            course_progress[cid]["completed"] += 1
        course_progress[cid]["total"] += 1

    result = []
    for cid, prog in course_progress.items():
        course = await db.courses.find_one({"_id": _oid(cid)}, {"title": 1, "section_type": 1, "thumbnail_url": 1})
        if course:
            course["id"] = str(course.pop("_id"))
            pct = round((prog["completed"] / prog["total"] * 100) if prog["total"] else 0, 1)
            result.append({
                "course": course,
                "completed": prog["completed"],
                "total": prog["total"],
                "completion_percentage": pct,
            })
    return result
