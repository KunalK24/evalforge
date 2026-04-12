import asyncio
import time
from datetime import datetime, timezone
from models import (
    EvalSuite,
    EvalCaseResult,
    EvalSummary,
    ProviderConfig,
    ProviderRunResult,
    RunResult,
)
from providers.factory import get_provider

def _compute_summary(results: list[EvalCaseResult], duration_ms: int) -> EvalSummary:
    total = len(results)
    errored = sum(1 for r in results if r.error)
    scored = [r for r in results if r.score is not None]
    passed = sum(1 for r in scored if r.score == 1.0)
    failed = total - errored - passed

    average_score = (
        sum(r.score for r in scored) / len(scored) if scored else None  # type: ignore
    )
    average_latency_ms = (
        sum(r.latency_ms for r in results) / total if total else 0.0
    )
    total_tokens = sum(r.total_tokens for r in results)
    throughput = (total_tokens / duration_ms * 1000) if duration_ms > 0 else 0.0

    return EvalSummary(
        total=total,
        passed=passed,
        failed=failed,
        errored=errored,
        average_score=average_score,
        average_latency_ms=average_latency_ms,
        total_tokens=total_tokens,
        throughput=throughput,
    )

async def _run_provider(
    suite: EvalSuite,
    provider_config: ProviderConfig,
) -> ProviderRunResult:
    provider = get_provider(provider_config)
    run_at = datetime.now(timezone.utc).isoformat()
    start = time.monotonic()

    tasks = [
        provider.run_case(
            case=case,
            timeout_ms=suite.timeout_ms,
            max_retries=suite.max_retries,
        )
        for case in suite.cases
    ]

    # Run all cases concurrently — results preserve case order
    results: list[EvalCaseResult] = await asyncio.gather(*tasks)

    duration_ms = int((time.monotonic() - start) * 1000)
    summary = _compute_summary(list(results), duration_ms)

    return ProviderRunResult(
        provider_name=provider_config.name,
        model=provider_config.model,
        run_at=run_at,
        duration_ms=duration_ms,
        cases=list(results),
        summary=summary,
    )

async def run_suite(
    suite: EvalSuite,
    providers: list[ProviderConfig],
) -> RunResult:
    run_at = datetime.now(timezone.utc).isoformat()

    provider_tasks = [_run_provider(suite, provider) for provider in providers]
    provider_results: list[ProviderRunResult] = await asyncio.gather(*provider_tasks)

    return RunResult(
        suite_name=suite.name,
        run_at=run_at,
        providers=list(provider_results),
    )
