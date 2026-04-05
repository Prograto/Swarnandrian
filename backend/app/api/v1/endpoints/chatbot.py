"""
Chatbot endpoint - AI assistant for students and faculty
Uses Groq API with meta-llama/llama-prompt-guard-2-22m and a configurable chat model.
Has access to student's own data for personalized answers.
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
from app.core.config import settings
from app.core.security import get_current_user
from app.db.mongodb import get_db
from pydantic import BaseModel

router = APIRouter()

GROQ_API_KEY = settings.GROQ_API_KEY
# Use a capable model - llama-prompt-guard is for content moderation, use llama3 for chat
GROQ_CHAT_MODEL = settings.GROQ_CHAT_MODEL
GROQ_GUARD_MODEL = "meta-llama/llama-prompt-guard-2-22m"


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


async def get_student_context(user_id: str, db) -> str:
    """Build rich context about the student's data for the chatbot"""
    student = await db.students.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not student:
        return ""

    ctx_parts = []

    # Basic info
    ctx_parts.append(f"Student Name: {student.get('name', 'N/A')}")
    ctx_parts.append(f"Student ID: {student.get('student_id', 'N/A')}")
    ctx_parts.append(f"Department: {student.get('department', 'N/A')}")
    ctx_parts.append(f"Year: {student.get('year', 'N/A')}")
    ctx_parts.append(f"Course: {student.get('course', 'N/A')}")

    # Stats
    stats = student.get("stats", {})
    if stats:
        ctx_parts.append(f"Total Score: {stats.get('total_score', 0)}")
        ctx_parts.append(f"Problems Solved: {stats.get('problems_solved', 0)}")
        ctx_parts.append(f"Tests Attempted: {stats.get('tests_attempted', 0)}")

    # Recent test submissions
    submissions = []
    async for s in db.test_submissions.find({"student_id": user_id}).sort("submitted_at", -1).limit(10):
        submissions.append({
            "test": s.get("test_name", "Unknown Test"),
            "score": s.get("score", 0),
            "total": s.get("total_marks", 0),
            "date": str(s.get("submitted_at", ""))[:10],
            "type": s.get("exam_type", "aptitude"),
        })
    if submissions:
        ctx_parts.append("\nRecent Test Results:")
        for sub in submissions:
            pct = round((sub["score"] / sub["total"] * 100) if sub["total"] else 0, 1)
            ctx_parts.append(f"  - {sub['test']} ({sub['type']}): {sub['score']}/{sub['total']} = {pct}% on {sub['date']}")

    # Recent coding submissions
    code_subs = []
    async for s in db.code_submissions.find({"student_id": user_id}).sort("submitted_at", -1).limit(5):
        code_subs.append(f"  - Problem: {s.get('problem_title', 'Unknown')} | Status: {s.get('status', 'N/A')}")
    if code_subs:
        ctx_parts.append("\nRecent Coding Submissions:")
        ctx_parts.extend(code_subs)

    # Leaderboard rank
    pipeline = [
        {"$group": {"_id": "$student_id", "score": {"$sum": "$score"}}},
        {"$sort": {"score": -1}},
    ]
    all_scores = await db.leaderboard.aggregate(pipeline).to_list(10000)
    rank = next((i + 1 for i, s in enumerate(all_scores) if s["_id"] == str(student["_id"])), None)
    if rank:
        ctx_parts.append(f"\nLeaderboard Rank: #{rank}")

    # Course progress
    progress_list = []
    async for p in db.course_progress.find({"student_id": user_id, "completed": True}).limit(20):
        blog = await db.course_blogs.find_one({"_id": ObjectId(p["blog_id"])}, {"title": 1, "course_id": 1})
        if blog:
            progress_list.append(blog.get("title", "Unknown"))
    if progress_list:
        ctx_parts.append(f"\nCompleted Course Topics: {', '.join(progress_list[:10])}")

    return "\n".join(ctx_parts)


async def get_faculty_context(user_id: str, db) -> str:
    """Build context for faculty"""
    faculty = await db.faculty.find_one({"_id": ObjectId(user_id)})
    if not faculty:
        return ""
    ctx_parts = [
        f"Faculty Name: {faculty.get('name', 'N/A')}",
        f"Department: {faculty.get('department', 'N/A')}",
        f"Designation: {faculty.get('designation', 'N/A')}",
    ]
    # Student count
    student_count = await db.students.count_documents({"department": faculty.get("department")})
    ctx_parts.append(f"Students in Department: {student_count}")

    # Tests created
    tests_created = await db.test_sections.count_documents({"created_by": user_id})
    ctx_parts.append(f"Tests/Sections Created: {tests_created}")

    return "\n".join(ctx_parts)


SYSTEM_PROMPT = """You are Swarna, an intelligent AI assistant for the Swarnandrian academic platform at Swarnandhra College of Engineering and Technology.

You help students and faculty with:
1. Platform-specific questions (scores, results, rankings, progress)
2. Academic topics: Data Structures, Algorithms, Aptitude, DBMS, OS, Computer Networks, OOP
3. Exam preparation and study guidance
4. Explaining concepts in detail with examples and code snippets
5. Career guidance and interview preparation

Context about the current user is provided below. Use it to give personalized, accurate answers.

Guidelines:
- Be concise but thorough
- Use code examples when explaining programming concepts
- When asked about marks/scores, refer to the user context provided
- Format responses with markdown for readability
- Be encouraging and supportive
- If asked about other students' private data, politely decline
"""


@router.post("/chat")
async def chat(request: ChatRequest, db=Depends(get_db), user=Depends(get_current_user)):
    if not GROQ_API_KEY:
        raise HTTPException(503, "Chatbot service not configured. Please set GROQ_API_KEY.")

    # Get user context
    if user["role"] == "student":
        user_context = await get_student_context(user["id"], db)
    else:
        user_context = await get_faculty_context(user["id"], db)

    system_with_context = SYSTEM_PROMPT + f"\n\n=== USER CONTEXT ===\n{user_context}\n===================\n"

    # Build messages
    messages = [{"role": "system", "content": system_with_context}]
    for h in (request.history or [])[-8:]:  # Keep last 8 messages for context
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": request.message})

    # Call Groq API
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_CHAT_MODEL,
                    "messages": messages,
                    "max_tokens": 1024,
                    "temperature": 0.7,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Groq API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(502, f"Chatbot error: {str(e)}")

    # Save to chat history
    await db.chat_history.insert_one({
        "user_id": user["id"],
        "role": user["role"],
        "user_message": request.message,
        "bot_reply": reply,
        "timestamp": datetime.utcnow(),
    })

    return {"reply": reply, "model": GROQ_CHAT_MODEL}


@router.get("/history")
async def chat_history(limit: int = 20, db=Depends(get_db), user=Depends(get_current_user)):
    history = []
    async for h in db.chat_history.find({"user_id": user["id"]}).sort("timestamp", -1).limit(limit):
        h["id"] = str(h.pop("_id"))
        h["timestamp"] = str(h["timestamp"])
        history.append(h)
    history.reverse()
    return history


@router.delete("/history")
async def clear_chat_history(db=Depends(get_db), user=Depends(get_current_user)):
    await db.chat_history.delete_many({"user_id": user["id"]})
    return {"message": "Chat history cleared"}
