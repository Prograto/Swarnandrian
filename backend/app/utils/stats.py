from bson import ObjectId


async def get_best_submission_score(db, collection_name: str, match: dict) -> float:
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "best_score": {"$max": {"$ifNull": ["$score", 0]}}}},
    ]
    result = await db[collection_name].aggregate(pipeline).to_list(1)
    if not result:
        return 0.0
    return float(result[0].get("best_score") or 0)


async def refresh_student_stats(db, student_id: str) -> None:
    code_summary = await db.code_submissions.aggregate([
        {"$match": {"student_id": student_id}},
        {"$group": {"_id": "$problem_id", "best_score": {"$max": {"$ifNull": ["$score", 0]}}}},
        {
            "$group": {
                "_id": None,
                "total_score": {"$sum": "$best_score"},
                "problems_solved": {"$sum": {"$cond": [{"$gt": ["$best_score", 0]}, 1, 0]}},
            }
        },
    ]).to_list(1)

    aptitude_summary = await db.apt_submissions.aggregate([
        {"$match": {"student_id": student_id, "exam_type": "competitor"}},
        {
            "$group": {
                "_id": {
                    "section_type": "$section_type",
                    "section_id": "$section_id",
                    "test_id": "$test_id",
                },
                "best_score": {"$max": {"$ifNull": ["$score", 0]}},
            }
        },
        {"$group": {"_id": None, "total_score": {"$sum": "$best_score"}}},
    ]).to_list(1)

    competition_summary = await db.competition_submissions.aggregate([
        {"$match": {"student_id": student_id}},
        {
            "$group": {
                "_id": {"competition_id": "$competition_id", "test_id": "$test_id"},
                "best_score": {"$max": {"$ifNull": ["$score", 0]}},
            }
        },
        {"$group": {"_id": None, "total_score": {"$sum": "$best_score"}}},
    ]).to_list(1)

    code_total = float(code_summary[0].get("total_score") or 0) if code_summary else 0.0
    problems_solved = int(code_summary[0].get("problems_solved") or 0) if code_summary else 0
    aptitude_total = float(aptitude_summary[0].get("total_score") or 0) if aptitude_summary else 0.0
    competition_total = float(competition_summary[0].get("total_score") or 0) if competition_summary else 0.0

    tests_attempted = (
        await db.code_submissions.count_documents({"student_id": student_id})
        + await db.apt_submissions.count_documents({"student_id": student_id})
        + await db.competition_submissions.count_documents({"student_id": student_id})
    )

    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {
            "$set": {
                "stats.total_score": round(code_total + aptitude_total + competition_total, 2),
                "stats.problems_solved": problems_solved,
                "stats.tests_attempted": tests_attempted,
            }
        },
    )