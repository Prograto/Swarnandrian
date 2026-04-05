"""Student profile endpoints"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.security import get_current_user, hash_password
from app.db.mongodb import get_db
from app.models.schemas import StudentProfileUpdate

router = APIRouter()


ACHIEVEMENT_BADGES = [
    {"id": "first_submission", "name": "First Step", "description": "Made your first code submission", "icon": "🎯", "category": "Coding", "metric": "total_submissions", "target": 1, "comparison": "gte"},
    {"id": "accepted_10", "name": "Getting Started", "description": "Solved 10 problems", "icon": "✅", "category": "Coding", "metric": "accepted_coding", "target": 10, "comparison": "gte"},
    {"id": "accepted_50", "name": "Problem Solver", "description": "Solved 50 problems", "icon": "⭐", "category": "Coding", "metric": "accepted_coding", "target": 50, "comparison": "gte"},
    {"id": "accepted_100", "name": "Expert Coder", "description": "Solved 100 problems", "icon": "👑", "category": "Coding", "metric": "accepted_coding", "target": 100, "comparison": "gte"},
    {"id": "consecutive_7", "name": "On Fire", "description": "7 day submission streak", "icon": "🔥", "category": "Consistency", "metric": "streak", "target": 7, "comparison": "gte"},
    {"id": "consecutive_30", "name": "Unstoppable", "description": "30 day submission streak", "icon": "🌟", "category": "Consistency", "metric": "streak", "target": 30, "comparison": "gte"},
    {"id": "easy_master", "name": "Easy Master", "description": "Solved 20 easy problems", "icon": "🟢", "category": "Coding", "metric": "easy_solved", "target": 20, "comparison": "gte"},
    {"id": "medium_master", "name": "Medium Master", "description": "Solved 15 medium problems", "icon": "🟡", "category": "Coding", "metric": "medium_solved", "target": 15, "comparison": "gte"},
    {"id": "hard_master", "name": "Hard Master", "description": "Solved 10 hard problems", "icon": "🔴", "category": "Coding", "metric": "hard_solved", "target": 10, "comparison": "gte"},
    {"id": "dsa_specialist", "name": "DSA Specialist", "description": "Solved 30 coding problems", "icon": "🧩", "category": "Coding", "metric": "dsa_solved", "target": 30, "comparison": "gte"},
    {"id": "speed_demon", "name": "Speed Demon", "description": "Solved a problem in under 5 minutes", "icon": "⚡", "category": "Performance", "metric": "speed_solves", "target": 1, "comparison": "gte"},
    {"id": "perfection", "name": "Perfection", "description": "Maintained an 80%+ first attempt acceptance rate", "icon": "💯", "category": "Performance", "metric": "first_attempt_rate", "target": 80, "comparison": "gte"},
    {"id": "leaderboard_top10", "name": "Top 10 Ranker", "description": "Reached the top 10 on the leaderboard", "icon": "🏆", "category": "Competition", "metric": "leaderboard_rank", "target": 10, "comparison": "lte"},
    {"id": "test_ace", "name": "Test Ace", "description": "Scored 95%+ in a test", "icon": "📚", "category": "Performance", "metric": "best_test_percent", "target": 95, "comparison": "gte"},
    {"id": "competition_winner", "name": "Champion", "description": "Won a competition", "icon": "🥇", "category": "Competition", "metric": "competition_wins", "target": 1, "comparison": "gte"},
    {"id": "night_owl", "name": "Night Owl", "description": "Submitted 5 solutions between midnight and 6 AM", "icon": "🌙", "category": "Consistency", "metric": "night_submissions", "target": 5, "comparison": "gte"},
    {"id": "early_bird", "name": "Early Bird", "description": "Submitted 5 solutions before sunrise", "icon": "🌅", "category": "Consistency", "metric": "morning_submissions", "target": 5, "comparison": "gte"},
]

BADGE_LOOKUP = {badge["id"]: badge for badge in ACHIEVEMENT_BADGES}


def _as_text(value):
    if hasattr(value, "value"):
        value = value.value
    return str(value or "").lower()


def _safe_object_ids(values):
    return [ObjectId(str(value)) for value in values if value and ObjectId.is_valid(str(value))]


def _threshold_progress(value, target):
    if not target:
        return 0.0
    return max(0.0, min(1.0, float(value or 0) / float(target)))


def _lower_is_better_progress(value, target):
    if not value:
        return 0.0
    return max(0.0, min(1.0, float(target) / float(value)))


def _sort_timestamp(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc).timestamp()
        return value.timestamp()
    return float('-inf')


async def _load_question_based_total(db, collection_name: str, test_id: str, cache: dict, allowed_types: set | None = None):
    if not test_id or not ObjectId.is_valid(str(test_id)):
        return None

    cache_key = f"{collection_name}:{test_id}"
    if cache_key in cache:
        return cache[cache_key]

    doc = await db[collection_name].find_one({"_id": ObjectId(test_id)}, {"question_ids": 1, "test_type": 1})
    if not doc:
        cache[cache_key] = None
        return None

    if allowed_types and doc.get("test_type") not in allowed_types:
        cache[cache_key] = None
        return None

    question_ids = _safe_object_ids(doc.get("question_ids") or [])
    if not question_ids:
        cache[cache_key] = 0.0
        return 0.0

    questions = await db.apt_questions.find({"_id": {"$in": question_ids}}, {"marks": 1}).to_list(len(question_ids))
    total = sum(max(0.0, float(question.get("marks") or 1)) for question in questions)
    cache[cache_key] = total
    return total


async def _build_achievement_snapshot(db, student_id: str):
    student = await db.students.find_one({"_id": ObjectId(student_id)}, {"stats": 1})
    if not student:
        raise HTTPException(404, "Profile not found")

    student_stats = student.get("stats") or {}

    code_subs = await db.code_submissions.find(
        {"student_id": student_id},
        {"problem_id": 1, "status": 1, "submitted_at": 1, "time_taken_ms": 1},
    ).sort("submitted_at", 1).to_list(5000)
    apt_subs = await db.apt_submissions.find(
        {"student_id": student_id},
        {"test_id": 1, "score": 1, "submitted_at": 1},
    ).sort("submitted_at", 1).to_list(5000)
    competition_subs = await db.competition_submissions.find(
        {"student_id": student_id},
        {"competition_id": 1, "test_id": 1, "score": 1, "submitted_at": 1},
    ).sort("submitted_at", 1).to_list(5000)

    all_submissions = [*code_subs, *apt_subs, *competition_subs]
    total_submissions = len(all_submissions)
    submission_dates = set()
    latest_submission_at = None
    night_submissions = 0
    morning_submissions = 0

    for submission in all_submissions:
        submitted_at = submission.get("submitted_at")
        if isinstance(submitted_at, datetime):
            submission_dates.add(submitted_at.date())
            latest_submission_at = submitted_at if latest_submission_at is None else max(
                (latest_submission_at, submitted_at),
                key=_sort_timestamp,
            )
            if 0 <= submitted_at.hour < 6:
                night_submissions += 1
            if 6 <= submitted_at.hour < 9:
                morning_submissions += 1

    current_streak = 0
    if submission_dates:
        cursor = max(submission_dates)
        while cursor in submission_dates:
            current_streak += 1
            cursor -= timedelta(days=1)

    first_submission_candidates = []
    if code_subs:
        first_submission_candidates.append(code_subs[0].get("submitted_at"))
    if apt_subs:
        first_submission_candidates.append(apt_subs[0].get("submitted_at"))
    if competition_subs:
        first_submission_candidates.append(competition_subs[0].get("submitted_at"))
    first_submission_at = min(
        (candidate for candidate in first_submission_candidates if isinstance(candidate, datetime)),
        key=_sort_timestamp,
        default=None,
    )

    first_submission_status = {}
    accepted_problem_order = []
    accepted_problem_first_dates = {}
    accepted_problem_times = {}

    for submission in code_subs:
        problem_id = str(submission.get("problem_id") or "").strip()
        if not problem_id:
            continue

        status = _as_text(submission.get("status"))
        submitted_at = submission.get("submitted_at")
        time_taken_ms = submission.get("time_taken_ms")

        if problem_id not in first_submission_status:
            first_submission_status[problem_id] = status

        if status == "accepted" and problem_id not in accepted_problem_first_dates:
            accepted_problem_first_dates[problem_id] = submitted_at
            accepted_problem_order.append((problem_id, submitted_at))

        if status == "accepted" and time_taken_ms is not None:
            current_time = float(time_taken_ms or 0)
            if problem_id not in accepted_problem_times or current_time < accepted_problem_times[problem_id]:
                accepted_problem_times[problem_id] = current_time

    accepted_problem_ids = list(accepted_problem_first_dates.keys())
    accepted_coding = len(accepted_problem_ids)
    accepted_first_try = sum(1 for problem_id in accepted_problem_ids if first_submission_status.get(problem_id) == "accepted")
    first_attempt_rate = round((accepted_first_try / accepted_coding) * 100, 2) if accepted_coding else 0.0

    coding_difficulties = {}
    easy_solved = 0
    medium_solved = 0
    hard_solved = 0
    if accepted_problem_ids:
        coding_docs = await db.coding_problems.find(
            {"problem_id": {"$in": accepted_problem_ids}},
            {"problem_id": 1, "difficulty": 1},
        ).to_list(len(accepted_problem_ids))
        coding_difficulties = {doc.get("problem_id"): _as_text(doc.get("difficulty")) for doc in coding_docs}
        for problem_id in accepted_problem_ids:
            difficulty = coding_difficulties.get(problem_id)
            if difficulty == "easy":
                easy_solved += 1
            elif difficulty == "medium":
                medium_solved += 1
            elif difficulty == "hard":
                hard_solved += 1

    dsa_solved = accepted_coding
    speed_solves = sum(1 for time_taken in accepted_problem_times.values() if time_taken <= 300000)

    leaderboard_pipeline = [
        {"$group": {"_id": "$student_id", "score": {"$sum": "$score"}}},
        {"$sort": {"score": -1}},
    ]
    leaderboard_rows = await db.leaderboard.aggregate(leaderboard_pipeline).to_list(10000)
    leaderboard_rank = next((index + 1 for index, row in enumerate(leaderboard_rows) if row.get("_id") == student_id), None)

    competition_groups = defaultdict(list)
    if competition_subs:
        comp_pipeline = [
            {"$group": {
                "_id": {"competition_id": "$competition_id", "student_id": "$student_id", "test_id": "$test_id"},
                "best_score": {"$max": {"$ifNull": ["$score", 0]}},
                "latest": {"$max": "$submitted_at"},
            }},
            {"$group": {
                "_id": {"competition_id": "$_id.competition_id", "student_id": "$_id.student_id"},
                "score": {"$sum": "$best_score"},
                "latest": {"$max": "$latest"},
            }},
        ]
        comp_rows = await db.competition_submissions.aggregate(comp_pipeline).to_list(10000)
        for row in comp_rows:
            comp_id = str((row.get("_id") or {}).get("competition_id") or "")
            if comp_id:
                competition_groups[comp_id].append(row)

    competition_wins = 0
    competition_win_dates = []
    for rows in competition_groups.values():
        rows.sort(key=lambda row: (-float(row.get("score") or 0), -_sort_timestamp(row.get("latest"))))
        winner = rows[0] if rows else None
        if winner and (winner.get("_id") or {}).get("student_id") == student_id and float(winner.get("score") or 0) > 0:
            competition_wins += 1
            latest = winner.get("latest")
            if isinstance(latest, datetime):
                competition_win_dates.append(latest)

    test_total_cache = {}
    best_test_percent = 0.0
    best_test_earned_at = None
    for submission in apt_subs:
        test_id = submission.get("test_id")
        score = float(submission.get("score") or 0)
        total = await _load_question_based_total(db, "tests", test_id, test_total_cache)
        if total and total > 0:
            percent = round((score / total) * 100, 2)
            if percent > best_test_percent:
                best_test_percent = percent
                best_test_earned_at = submission.get("submitted_at")

    for submission in competition_subs:
        test_id = submission.get("test_id")
        score = float(submission.get("score") or 0)
        total = await _load_question_based_total(db, "competition_tests", test_id, test_total_cache, {"aptitude", "technical"})
        if total and total > 0:
            percent = round((score / total) * 100, 2)
            if percent > best_test_percent:
                best_test_percent = percent
                best_test_earned_at = submission.get("submitted_at")

    earned_at_map = {}
    if first_submission_at:
        earned_at_map["first_submission"] = first_submission_at

    accepted_dates = [submitted_at for _, submitted_at in accepted_problem_order if isinstance(submitted_at, datetime)]
    if accepted_dates:
        if len(accepted_dates) >= 10:
            earned_at_map["accepted_10"] = accepted_dates[9]
        if len(accepted_dates) >= 50:
            earned_at_map["accepted_50"] = accepted_dates[49]
        if len(accepted_dates) >= 100:
            earned_at_map["accepted_100"] = accepted_dates[99]

    if current_streak >= 7 and submission_dates:
        earned_at_map["consecutive_7"] = max(submission_dates)
    if current_streak >= 30 and submission_dates:
        earned_at_map["consecutive_30"] = max(submission_dates)

    if accepted_problem_order:
        coding_counter = defaultdict(int)
        dsa_counter = 0
        coding_threshold_dates = {
            "easy_master": None,
            "medium_master": None,
            "hard_master": None,
            "dsa_specialist": None,
        }
        for problem_id, submitted_at in accepted_problem_order:
            dsa_counter += 1
            difficulty = coding_difficulties.get(problem_id)
            if difficulty == "easy":
                coding_counter["easy"] += 1
                if coding_threshold_dates["easy_master"] is None and coding_counter["easy"] >= 20:
                    coding_threshold_dates["easy_master"] = submitted_at
            elif difficulty == "medium":
                coding_counter["medium"] += 1
                if coding_threshold_dates["medium_master"] is None and coding_counter["medium"] >= 15:
                    coding_threshold_dates["medium_master"] = submitted_at
            elif difficulty == "hard":
                coding_counter["hard"] += 1
                if coding_threshold_dates["hard_master"] is None and coding_counter["hard"] >= 10:
                    coding_threshold_dates["hard_master"] = submitted_at

            if coding_threshold_dates["dsa_specialist"] is None and dsa_counter >= 30:
                coding_threshold_dates["dsa_specialist"] = submitted_at

        earned_at_map.update({key: value for key, value in coding_threshold_dates.items() if value is not None})

    if speed_solves > 0:
        fast_dates = [
            accepted_problem_first_dates[problem_id]
            for problem_id, time_taken in accepted_problem_times.items()
            if time_taken <= 300000 and accepted_problem_first_dates.get(problem_id)
        ]
        if fast_dates:
            earned_at_map["speed_demon"] = min(fast_dates, key=_sort_timestamp)

    if first_attempt_rate >= 80 and accepted_dates:
        earned_at_map["perfection"] = accepted_dates[-1]

    if leaderboard_rank is not None and leaderboard_rank <= 10:
        earned_at_map["leaderboard_top10"] = latest_submission_at or datetime.utcnow()

    if best_test_percent >= 95 and best_test_earned_at:
        earned_at_map["test_ace"] = best_test_earned_at

    if competition_wins > 0 and competition_win_dates:
        earned_at_map["competition_winner"] = max(competition_win_dates, key=_sort_timestamp)

    if night_submissions >= 5 and latest_submission_at:
        earned_at_map["night_owl"] = latest_submission_at
    if morning_submissions >= 5 and latest_submission_at:
        earned_at_map["early_bird"] = latest_submission_at

    metrics = {
        "total_submissions": total_submissions,
        "accepted_coding": accepted_coding,
        "streak": current_streak,
        "easy_solved": easy_solved,
        "medium_solved": medium_solved,
        "hard_solved": hard_solved,
        "dsa_solved": dsa_solved,
        "speed_solves": speed_solves,
        "first_attempt_rate": first_attempt_rate,
        "leaderboard_rank": leaderboard_rank or 0,
        "best_test_percent": best_test_percent,
        "competition_wins": competition_wins,
        "night_submissions": night_submissions,
        "morning_submissions": morning_submissions,
    }

    badge_progress = {}
    earned_badges = []
    for badge in ACHIEVEMENT_BADGES:
        metric_value = metrics.get(badge["metric"], 0)
        if badge["comparison"] == "lte":
            progress = _lower_is_better_progress(metric_value, badge["target"])
            earned = metric_value and metric_value <= badge["target"]
        else:
            progress = _threshold_progress(metric_value, badge["target"])
            earned = metric_value >= badge["target"]

        badge_progress[badge["id"]] = round(progress, 4)
        if earned:
            earned_badges.append({
                "badge_id": badge["id"],
                "earned_at": earned_at_map.get(badge["id"]),
            })

    earned_badges.sort(key=lambda item: _sort_timestamp(item.get("earned_at")), reverse=True)

    summary = {
        "total_submissions": total_submissions,
        "accepted_coding": accepted_coding,
        "current_streak": current_streak,
        "leaderboard_rank": leaderboard_rank,
        "best_test_percent": round(best_test_percent, 2),
        "competition_wins": competition_wins,
        "first_attempt_rate": round(first_attempt_rate, 2),
    }

    return {
        "summary": summary,
        "stats": {
            **student_stats,
            "total_submissions": total_submissions,
            "accepted_coding": accepted_coding,
            "current_streak": current_streak,
            "leaderboard_rank": leaderboard_rank,
        },
        "earned_badges": earned_badges,
        "badge_progress": badge_progress,
        "recent_badges": earned_badges[:4],
        "total_earned": len(earned_badges),
        "total_badges": len(ACHIEVEMENT_BADGES),
    }


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


@router.get("/me/achievements")
async def my_achievements(db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(403, "Only students can access achievements")
    return await _build_achievement_snapshot(db, user["id"])
