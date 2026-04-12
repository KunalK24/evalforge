import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import RunRequest, RunResult
from runner.executor import run_suite

app = FastAPI(
    title="EvalForge Runner",
    description="Python backend for executing LLM eval suites across multiple providers.",
    version="0.1.0",
)

# Allow requests from the TypeScript SDK running locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}


@app.post("/run", response_model=RunResult)
async def run(request: RunRequest) -> RunResult:
    """
    Execute an eval suite against one or more providers concurrently.

    Accepts a JSON body with:
    - suite: EvalSuite — the eval cases to run
    - providers: ProviderConfig[] — the providers to run against

    Returns a RunResult with per-provider, per-case scores, latency,
    token usage, and a summary.
    """
    if not request.providers:
        raise HTTPException(status_code=400, detail="At least one provider is required.")

    if not request.suite.cases:
        raise HTTPException(status_code=400, detail="Suite must contain at least one eval case.")

    try:
        result = await run_suite(request.suite, request.providers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Runner error: {str(e)}")

    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
