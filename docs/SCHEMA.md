# MongoDB Schema Reference — Swarnandrian Platform

## admins
```json
{
  "_id": "ObjectId",
  "name": "string",
  "designation": "string",
  "department": "string",
  "contact_number": "string",
  "email": "string",
  "admin_id": "string (unique)",
  "password_hash": "string",
  "is_active": true,
  "created_at": "datetime"
}
```

## faculty
```json
{
  "_id": "ObjectId",
  "name": "string",
  "designation": "string",
  "department": "string",
  "contact_number": "string",
  "email": "string",
  "faculty_id": "string (unique)",
  "password_hash": "string",
  "is_active": true,
  "created_at": "datetime"
}
```

## students
```json
{
  "_id": "ObjectId",
  "name": "string",
  "course": "BTech | MTech",
  "year": 1,
  "department": "CSE",
  "student_id": "string (unique)",
  "password_hash": "string",
  "is_active": true,
  "created_at": "datetime",
  "profile": {
    "email": "string",
    "phone": "string",
    "github": "string",
    "linkedin": "string",
    "portfolio_url": "string",
    "profile_photo_url": "string",
    "skills": ["Python", "React"],
    "projects": [{"title":"","description":"","tech_stack":[],"link":""}],
    "internships": [{"company":"","role":"","duration":"","description":""}],
    "achievements": ["string"],
    "certificates": [{"name":"","issuer":"","year":2024,"link":""}],
    "objective": "string",
    "interests": ["string"]
  },
  "stats": {
    "total_score": 0,
    "problems_solved": 0,
    "tests_attempted": 0
  }
}
```

## coding_sections
```json
{
  "_id": "ObjectId",
  "name": "DSA",
  "banner_url": "string | null",
  "description": "string | null",
  "created_by": "faculty_id (string)",
  "created_at": "datetime"
}
```

## coding_problems
```json
{
  "_id": "ObjectId",
  "problem_id": "P001",
  "section_id": "string",
  "banner_url": "string | null",
  "name": "Two Sum",
  "statement": "markdown string",
  "constraints": "1 ≤ N ≤ 10^5",
  "sample_input_1": "string",
  "sample_output_1": "string",
  "sample_input_2": "string",
  "sample_output_2": "string",
  "private_test_cases": [{"input":"","expected_output":""}],
  "difficulty": "Easy | Medium | Hard",
  "marks": 10,
  "editorial": "string | null",
  "mode": "practice | competitor",
  "created_by": "faculty_id",
  "created_at": "datetime"
}
```

## code_submissions
```json
{
  "_id": "ObjectId",
  "problem_id": "string",
  "student_id": "string",
  "language": "python | cpp | java | javascript | c",
  "code": "string",
  "status": "accepted | wrong_answer | tle | mle | runtime_error | compilation_error",
  "score": 10,
  "test_results": [
    {"case_number":1,"is_private":false,"status":"passed","expected":"","actual":"","time_ms":42}
  ],
  "compilation_error": "string | null",
  "runtime_error": "string | null",
  "submitted_at": "datetime"
}
```

## apt_sections
```json
{
  "_id": "ObjectId",
  "name": "Quantitative Aptitude",
  "type": "aptitude | technical",
  "description": "string | null",
  "created_by": "faculty_id",
  "created_at": "datetime"
}
```

## apt_questions
```json
{
  "_id": "ObjectId",
  "section_id": "string",
  "section_type": "aptitude | technical",
  "question_type": "mcq | msq | nat | fill",
  "question_text": "string",
  "image_url": "string | null",
  "options": ["A","B","C","D"],
  "correct_options": [0, 2],
  "correct_answer": "string | null",
  "explanation": "string | null",
  "marks": 1,
  "negative_marks": 0.25,
  "difficulty": "Easy | Medium | Hard",
  "created_by": "faculty_id",
  "created_at": "datetime"
}
```

## tests
```json
{
  "_id": "ObjectId",
  "section_id": "string",
  "section_type": "aptitude | technical",
  "name": "Mock Test 1",
  "mode": "practice | competitor",
  "question_ids": ["q1","q2","q3"],
  "time_limit_minutes": 60,
  "max_attempts": 1,
  "access_code": "string | null",
  "start_time": "datetime | null",
  "end_time": "datetime | null",
  "created_by": "faculty_id",
  "created_at": "datetime"
}
```

## apt_submissions
```json
{
  "_id": "ObjectId",
  "test_id": "string",
  "student_id": "string",
  "score": 8.5,
  "result_detail": [
    {"question_id":"","student_answer":0,"correct":true,"marks_earned":1}
  ],
  "submitted_at": "datetime"
}
```

## competitions
```json
{
  "_id": "ObjectId",
  "name": "Hack the Code",
  "description": "string",
  "start_time": "datetime",
  "end_time": "datetime",
  "access_code": "HACK2024",
  "max_attempts": 1,
  "faculty_id": "string",
  "is_active": true,
  "tests": ["test_id_1","test_id_2"],
  "created_at": "datetime"
}
```

## leaderboard
```json
{
  "_id": "ObjectId",
  "student_id": "string",
  "section": "aptitude | technical | coding",
  "score": 95.5,
  "updated_at": "datetime"
}
```

## Indexes Summary
| Collection        | Indexed Fields                              |
|-------------------|---------------------------------------------|
| admins            | admin_id (unique), email (unique)           |
| faculty           | faculty_id (unique), email (unique), dept   |
| students          | student_id (unique), (dept, year), course   |
| coding_sections   | created_by                                  |
| coding_problems   | section_id, difficulty                      |
| code_submissions  | (student_id, problem_id), problem_id, created_at |
| apt_sections      | type                                        |
| apt_questions     | section_id                                  |
| apt_submissions   | (student_id, test_id)                       |
| tests             | section_id, mode                            |
| competitions      | access_code (unique), faculty_id, (start,end) |
| leaderboard       | (student_id, section), score DESC           |
