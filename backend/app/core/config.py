from pydantic_settings import BaseSettings
from typing import List


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
        if url.startswith(("http://", "https://")):
            return url
        return f"http://{url}"

    ALLOWED_ORIGINS_STR: str = "http://localhost:3000"

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS_STR.split(",") if o.strip()]

    FRONTEND_URL: str = "http://localhost:3000"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = "swarnandrian"

    MAX_BULK_UPLOAD_USERS: int = 2000
    MAX_FILE_SIZE_MB: int = 50

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
