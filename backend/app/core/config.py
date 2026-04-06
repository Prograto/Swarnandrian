from pathlib import Path
from typing import List
from urllib.parse import urlparse

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Swarnandrian"
    APP_ENV: str = "development"

    MONGODB_URL: str
    MONGODB_DB_NAME: str = "swarnandrian"

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # In production, set CODE_RUNNER_URL to the public URL or Render hostport value.
    REDIS_URL: str = "redis://localhost:6379/0"
    CODE_RUNNER_URL: str = "http://localhost:8001"
    CODE_RUNNER_SECRET: str = "secret"

    @property
    def CODE_RUNNER_BASE_URL(self) -> str:
        url = self.CODE_RUNNER_URL.rstrip("/")
        if not url.startswith(("http://", "https://")):
            url = f"http://{url}"

        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()

        # Docker Compose service names do not resolve from a native Windows run.
        # When the app is not inside a container, fall back to localhost so the
        # backend can still talk to a Dockerized code-runner service.
        if host in {"code-runner", "swarnandrian-code-runner"} and not _running_inside_container():
            port = parsed.port or 8001
            return f"{parsed.scheme}://127.0.0.1:{port}"

        return url

    ALLOWED_ORIGINS_STR: str = "http://localhost:3000"

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        origins = [o.strip().rstrip("/") for o in self.ALLOWED_ORIGINS_STR.split(",") if o.strip()]

        frontend_url = self.FRONTEND_URL.strip().rstrip("/")
        if frontend_url:
            origins.append(frontend_url)

        unique_origins = []
        seen = set()
        for origin in origins:
            if origin not in seen:
                seen.add(origin)
                unique_origins.append(origin)

        return unique_origins

    FRONTEND_URL: str = "http://localhost:3000"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = "swarnandrian"

    MAX_BULK_UPLOAD_USERS: int = 2000
    MAX_FILE_SIZE_MB: int = 50

    GROQ_API_KEY: str = ""
    GROQ_CHAT_MODEL: str = "llama-3.1-8b-instant"

    SANDBOX_CPU_LIMIT: float = 0.5
    SANDBOX_MEM_LIMIT: str = "256m"
    SANDBOX_TIMEOUT: int = 10

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


settings = Settings()


def _running_inside_container() -> bool:
    return Path("/.dockerenv").exists() or Path("/run/.containerenv").exists()
