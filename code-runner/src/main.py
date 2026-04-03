"""
Swarnandrian Code Execution Microservice
─────────────────────────────────────────
All language runtimes (Python, C++, C, Java, Node.js) are installed
directly inside this container. Each submission is run as a subprocess
with a strict timeout. No Docker-in-Docker required.
"""

import os
import uuid
import shutil
import subprocess
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── App setup ───────────────────────────────────────────────────────────────
app = FastAPI(title="Swarnandrian Code Runner", version="2.0.0")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS_STR",
        "http://localhost:3000,http://localhost:80",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERNAL_SECRET = os.getenv("CODE_RUNNER_SECRET", "code-runner-internal-secret")
SANDBOX_DIR = Path("/tmp/sandbox")
SANDBOX_DIR.mkdir(exist_ok=True)

# Thread pool for running blocking subprocess calls
executor = ThreadPoolExecutor(max_workers=8)

# ─── Language configuration ──────────────────────────────────────────────────
# Each entry:
#   filename  – source file name saved to disk
#   compile   – shell command to compile (None = interpreted)
#   run       – shell command to execute
LANG_CONFIG = {
    "python": {
        "filename": "solution.py",
        "compile":  None,
        "run":      "python3 solution.py",
    },
    "cpp": {
        "filename": "solution.cpp",
        "compile":  "g++ -O2 -o solution solution.cpp",
        "run":      "./solution",
    },
    "c": {
        "filename": "solution.c",
        "compile":  "gcc -O2 -o solution solution.c",
        "run":      "./solution",
    },
    "java": {
        "filename": "Solution.java",
        "compile":  "javac Solution.java",
        "run":      "java Solution",
    },
    "javascript": {
        "filename": "solution.js",
        "compile":  None,
        "run":      "node solution.js",
    },
}

HEALTH_CHECK_BINARIES = {
    "python": "python3",
    "cpp": "g++",
    "c": "gcc",
    "java": "javac",
    "javascript": "node",
}

# ─── Pydantic models ─────────────────────────────────────────────────────────
class TestCase(BaseModel):
    number:     int
    input:      str
    expected:   str
    is_private: bool = False


class ExecuteRequest(BaseModel):
    language:   str
    code:       str
    test_cases: List[TestCase]
    mode:       str = "submit"   # "run" | "submit"
    time_limit: int = 10         # seconds per test case


class TestResult(BaseModel):
    number:     int
    is_private: bool
    status:     str              # passed | failed | tle | runtime_error
    expected:   str
    actual:     str
    time_ms:    Optional[float] = None


# ─── Core execution logic ─────────────────────────────────────────────────────
def _run_one_testcase(
    lang: str,
    code: str,
    stdin_input: str,
    time_limit: int,
) -> dict:
    """
    Write code to a temp workspace, optionally compile it, then run it
    with the given stdin. Returns a dict with keys:
        actual, time_ms, compilation_error, runtime_error, tle
    """
    cfg       = LANG_CONFIG[lang]
    workspace = SANDBOX_DIR / str(uuid.uuid4())
    workspace.mkdir(parents=True, exist_ok=True)

    try:
        # ── 1. Write source file ───────────────────────────────────
        src = workspace / cfg["filename"]
        src.write_text(code, encoding="utf-8")

        # ── 2. Compile (if needed) ─────────────────────────────────
        if cfg["compile"]:
            try:
                result = subprocess.run(
                    cfg["compile"],
                    shell=True,
                    cwd=str(workspace),
                    capture_output=True,
                    timeout=30,
                )
            except subprocess.TimeoutExpired:
                return {"compilation_error": "Compilation timed out.", "actual": ""}

            if result.returncode != 0:
                err = result.stderr.decode("utf-8", errors="replace").strip()
                return {"compilation_error": err or "Compilation failed.", "actual": ""}

        # ── 3. Run ────────────────────────────────────────────────
        start = time.perf_counter()
        try:
            proc = subprocess.run(
                cfg["run"],
                shell=True,
                cwd=str(workspace),
                input=stdin_input.encode("utf-8"),
                capture_output=True,
                timeout=time_limit,
            )
        except subprocess.TimeoutExpired:
            return {"tle": True, "actual": "", "time_ms": time_limit * 1000}

        elapsed_ms = (time.perf_counter() - start) * 1000

        stdout = proc.stdout.decode("utf-8", errors="replace").strip()
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()

        if proc.returncode != 0 and stderr:
            return {
                "actual":        stdout,
                "time_ms":       elapsed_ms,
                "runtime_error": stderr,
            }

        return {"actual": stdout, "time_ms": elapsed_ms}

    finally:
        shutil.rmtree(workspace, ignore_errors=True)


# ─── API routes ──────────────────────────────────────────────────────────────
@app.post("/execute")
def execute(req: ExecuteRequest, x_internal_secret: str = Header(...)):
    # Auth check
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    if req.language not in LANG_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {req.language}")

    test_results: List[TestResult] = []
    compilation_error = None
    runtime_error     = None
    any_tle           = False

    for tc in req.test_cases:
        result = _run_one_testcase(
            lang=req.language,
            code=req.code,
            stdin_input=tc.input,
            time_limit=req.time_limit,
        )

        # ── Compilation error → all remaining cases fail immediately
        if result.get("compilation_error"):
            compilation_error = result["compilation_error"]
            for remaining in req.test_cases:
                test_results.append(TestResult(
                    number=remaining.number,
                    is_private=remaining.is_private,
                    status="failed",
                    expected=remaining.expected,
                    actual="",
                ))
            break

        # ── TLE
        if result.get("tle"):
            any_tle = True
            test_results.append(TestResult(
                number=tc.number,
                is_private=tc.is_private,
                status="tle",
                expected=tc.expected,
                actual="",
                time_ms=result.get("time_ms"),
            ))
            continue

        # ── Runtime error (but may still have partial output)
        if result.get("runtime_error"):
            runtime_error = result["runtime_error"]
            test_results.append(TestResult(
                number=tc.number,
                is_private=tc.is_private,
                status="runtime_error",
                expected=tc.expected,
                actual=result.get("actual", ""),
                time_ms=result.get("time_ms"),
            ))
            continue

        # ── Normal: compare output
        actual = result.get("actual", "")
        passed = actual.strip() == tc.expected.strip()
        test_results.append(TestResult(
            number=tc.number,
            is_private=tc.is_private,
            status="passed" if passed else "failed",
            expected=tc.expected,
            actual=actual,
            time_ms=result.get("time_ms"),
        ))

    return {
        "test_results":      [tr.model_dump() for tr in test_results],
        "compilation_error": compilation_error,
        "runtime_error":     runtime_error,
        "tle":               any_tle,
    }


@app.get("/health")
def health():
    """Quick health check — also reports which runtimes are available."""
    runtimes = {}
    for lang, binary in HEALTH_CHECK_BINARIES.items():
        runtimes[lang] = shutil.which(binary) is not None
    return {"status": "ok", "service": "code-runner", "runtimes": runtimes}

