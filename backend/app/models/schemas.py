"""
Swarnandrian - MongoDB Schema Models (Pydantic v2)
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class Role(str, Enum):
    ADMIN = "admin"
    FACULTY = "faculty"
    STUDENT = "student"

class Course(str, Enum):
    BTECH = "BTech"
    MTECH = "MTech"

class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class Mode(str, Enum):
    PRACTICE = "practice"
    COMPETITOR = "competitor"

class QuestionType(str, Enum):
    MCQ = "mcq"
    MSQ = "msq"
    NAT = "nat"
    FILL = "fill"

class SectionType(str, Enum):
    APTITUDE = "aptitude"
    TECHNICAL = "technical"

class Language(str, Enum):
    PYTHON = "python"
    CPP = "cpp"
    JAVA = "java"
    JAVASCRIPT = "javascript"
    C = "c"

class SubmissionStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TLE = "tle"
    MLE = "mle"
    RUNTIME_ERROR = "runtime_error"
    COMPILATION_ERROR = "compilation_error"


# ─── Admin ───────────────────────────────────────────────────────────────────

class AdminCreate(BaseModel):
    name: str
    designation: str
    department: str
    contact_number: str
    email: EmailStr
    admin_id: str
    password: str

class AdminOut(BaseModel):
    id: str
    name: str
    designation: str
    department: str
    contact_number: str
    email: str
    admin_id: str
    is_active: bool
    created_at: datetime


# ─── Faculty ─────────────────────────────────────────────────────────────────

class FacultyCreate(BaseModel):
    name: str
    designation: str
    department: str
    contact_number: str
    email: EmailStr
    faculty_id: str
    password: str

class FacultyOut(BaseModel):
    id: str
    name: str
    designation: str
    department: str
    contact_number: str
    email: str
    faculty_id: str
    is_active: bool
    created_at: datetime


# ─── Student ─────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str
    course: Course
    year: int = Field(ge=1, le=4)
    department: str
    section: Optional[str] = None
    student_id: str
    password: str

class StudentOut(BaseModel):
    id: str
    name: str
    course: str
    year: int
    department: str
    section: Optional[str] = None
    student_id: str
    is_active: bool
    created_at: datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    user_id: str      # admin_id / faculty_id / student_id
    password: str
    role: Role

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: dict


# ─── Coding Section ──────────────────────────────────────────────────────────

class CodingSectionCreate(BaseModel):
    name: str
    banner_url: Optional[str] = None
    description: Optional[str] = None
    branch: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    is_active: bool = True

class CodingSectionOut(BaseModel):
    id: str
    name: str
    banner_url: Optional[str]
    description: Optional[str]
    created_by: str
    problem_count: int = 0
    created_at: datetime


# ─── Coding Problem ──────────────────────────────────────────────────────────

class TestCase(BaseModel):
    input: str
    expected_output: str

class CodingProblemCreate(BaseModel):
    problem_id: str
    section_id: str
    banner_url: Optional[str] = None
    name: str
    statement: str
    constraints: str
    sample_input_1: str
    sample_output_1: str
    sample_input_2: str
    sample_output_2: str
    private_test_cases: List[TestCase] = []
    difficulty: Difficulty
    marks: Optional[int] = None          # competitor mode only
    editorial: Optional[str] = None      # practice mode only
    mode: Mode
    branch: Optional[str] = None
    is_active: bool = True

class CodingProblemOut(BaseModel):
    id: str
    problem_id: str
    section_id: str
    banner_url: Optional[str]
    name: str
    statement: str
    constraints: str
    sample_input_1: str
    sample_output_1: str
    sample_input_2: str
    sample_output_2: str
    difficulty: str
    marks: Optional[int]
    mode: str
    created_at: datetime
    # editorial and private_test_cases excluded from student view


# ─── Code Submission ─────────────────────────────────────────────────────────

class CodeSubmitRequest(BaseModel):
    problem_id: str
    language: Language
    code: str
    mode: str = "submit"   # "run" | "submit"

class TestCaseResult(BaseModel):
    case_number: int
    is_private: bool
    status: str            # passed | failed
    expected: Optional[str] = None   # only for public
    actual: Optional[str] = None     # only for public
    time_ms: Optional[float] = None
    memory_kb: Optional[float] = None

class CodeSubmissionOut(BaseModel):
    id: str
    problem_id: str
    student_id: str
    language: str
    status: SubmissionStatus
    score: int = 0
    test_results: List[TestCaseResult]
    compilation_error: Optional[str] = None
    runtime_error: Optional[str] = None
    time_ms: Optional[float] = None
    memory_kb: Optional[float] = None
    submitted_at: datetime


# ─── Aptitude / Technical Section ────────────────────────────────────────────

class AptSectionCreate(BaseModel):
    type: SectionType
    name: str
    banner_url: Optional[str] = None
    description: Optional[str] = None
    branch: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    is_active: bool = True

class AptQuestionCreate(BaseModel):
    section_id: str
    question_type: QuestionType
    question_text: str
    image_url: Optional[str] = None
    options: Optional[List[str]] = None     # MCQ / MSQ
    correct_options: Optional[List[int]] = None  # index list
    correct_answer: Optional[str] = None    # NAT / Fill
    explanation: Optional[str] = None
    marks: int = 1
    negative_marks: float = 0.0
    difficulty: Difficulty = Difficulty.MEDIUM
    branch: Optional[str] = None
    is_active: bool = True

class AptTestCreate(BaseModel):
    section_id: str
    name: str
    banner_url: Optional[str] = None
    description: Optional[str] = None
    mode: Mode
    question_ids: List[str]
    time_limit_minutes: int
    max_attempts: Optional[int] = None   # competitor mode
    max_violations: int = Field(default=3, ge=1)
    access_code: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    branch: Optional[str] = None
    is_active: bool = True


# ─── Competition ─────────────────────────────────────────────────────────────

class CompetitionCreate(BaseModel):
    name: str
    banner_url: Optional[str] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    access_code: str
    max_attempts: int = 1
    course: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None

class CompetitionTestCreate(BaseModel):
    competition_id: str
    name: str
    banner_url: Optional[str] = None
    description: Optional[str] = None
    section_id: Optional[str] = None
    test_type: str    # coding | aptitude | technical
    question_ids: Optional[List[str]] = None
    problem_ids: Optional[List[str]] = None
    time_limit_minutes: int
    max_violations: int = Field(default=3, ge=1)
    access_code: Optional[str] = None
    marks_per_question: float = 1.0
    branch: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    is_active: bool = True


# ─── Student Profile ─────────────────────────────────────────────────────────

class Project(BaseModel):
    title: str
    description: str
    tech_stack: List[str]
    link: Optional[str] = None

class Internship(BaseModel):
    company: str
    role: str
    duration: str
    description: Optional[str] = None

class Certificate(BaseModel):
    name: str
    issuer: str
    year: Optional[int] = None
    link: Optional[str] = None


class Education(BaseModel):
    institution: str
    degree: str
    year: str
    description: Optional[str] = None

class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio_url: Optional[str] = None
    profile_photo_url: Optional[str] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[Project]] = None
    internships: Optional[List[Internship]] = None
    achievements: Optional[List[str]] = None
    certificates: Optional[List[Certificate]] = None
    education: Optional[List[Education]] = None
    objective: Optional[str] = None
    interests: Optional[List[str]] = None
    password: Optional[str] = None


# ─── Leaderboard ─────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    student_id: str
    student_name: str
    department: str
    year: int
    score: float
    problems_solved: int
    section_type: Optional[str] = None
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    test_id: Optional[str] = None
    test_name: Optional[str] = None
    section: Optional[str] = None


# ─── Bulk Upload ─────────────────────────────────────────────────────────────

class BulkUploadResponse(BaseModel):
    total: int
    created: int
    skipped: int
    errors: List[dict]
