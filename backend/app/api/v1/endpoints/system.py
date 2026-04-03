from fastapi import APIRouter, HTTPException
import httpx

from app.core.config import settings

router = APIRouter()


@router.get("/code-runner/health")
async def code_runner_health():
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{settings.CODE_RUNNER_BASE_URL}/health")
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=503, detail="Code runner health check failed") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Code runner is unavailable") from exc

    return response.json()