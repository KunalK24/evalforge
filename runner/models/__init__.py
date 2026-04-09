from __future__ import annotations
from typing import Optional, Callable
from pydantic import BaseModel, Field

# Request Models

class ProviderConfig(BaseModel):
    name: str
    model: str
    base_url: Optional[str] = None


class EvalCase(BaseModel):
    id: str
    prompt: str
    expected: Optional[str] = None
    scorer_type: Optional[str] = Field(
        default="exact_match",
        description="'exact_match' | 'contains' | 'none'"
    )


class EvalSuite(BaseModel):
    name: str
    description: Optional[str] = None
    cases: list[EvalCase]
    timeout_ms: int = 30_000
    max_retries: int = 2


class RunRequest(BaseModel):
    suite: EvalSuite
    providers: list[ProviderConfig]


# Result Models

class EvalCaseResult(BaseModel):
    case_id: str
    provider_name: str
    model: str
    prompt: str
    output: str
    expected: Optional[str] = None
    score: Optional[float] = None
    latency_ms: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    retries: int = 0
    error: Optional[str] = None


class EvalSummary(BaseModel):
    total: int
    passed: int
    failed: int
    errored: int
    average_score: Optional[float] = None
    average_latency_ms: float
    total_tokens: int
    throughput: float  # tokens per second


class ProviderRunResult(BaseModel):
    provider_name: str
    model: str
    run_at: str
    duration_ms: int
    cases: list[EvalCaseResult]
    summary: EvalSummary


class RunResult(BaseModel):
    suite_name: str
    run_at: str
    providers: list[ProviderRunResult]
