import asyncio
import time
import httpx

from models import EvalCase, EvalCaseResult, ProviderConfig
from providers.base import BaseProvider


class OllamaProvider(BaseProvider):
    """
    Provider implementation for local Ollama inference.
    Calls the /api/generate endpoint with stream=false.
    Supports configurable timeouts and automatic retries on transient errors.
    """

    DEFAULT_BASE_URL = "http://localhost:11434"

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = (config.base_url or self.DEFAULT_BASE_URL).rstrip("/")

    async def run_case(
        self,
        case: EvalCase,
        timeout_ms: int,
        max_retries: int,
    ) -> EvalCaseResult:
        timeout_s = timeout_ms / 1000
        retries = 0
        last_error: str | None = None
        output = ""
        prompt_tokens = 0
        completion_tokens = 0
        latency_ms = 0

        while retries <= max_retries:
            start = time.monotonic()
            try:
                async with httpx.AsyncClient(timeout=timeout_s) as client:
                    response = await client.post(
                        f"{self.base_url}/api/generate",
                        json={
                            "model": self.config.model,
                            "prompt": case.prompt,
                            "stream": False,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                latency_ms = int((time.monotonic() - start) * 1000)
                output = data.get("response", "").strip()
                prompt_tokens = data.get("prompt_eval_count", 0)
                completion_tokens = data.get("eval_count", 0)
                last_error = None
                break  # success — exit retry loop

            except httpx.TimeoutException:
                last_error = f"Timeout after {timeout_ms}ms"
            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}: {e.response.text}"
            except Exception as e:
                last_error = str(e)

            retries += 1
            if retries <= max_retries:
                # Exponential backoff: 500ms, 1000ms, ...
                await asyncio.sleep(0.5 * retries)

        score = self.score(output, case) if not last_error else None
        total_tokens = prompt_tokens + completion_tokens

        return EvalCaseResult(
            case_id=case.id,
            provider_name=self.config.name,
            model=self.config.model,
            prompt=case.prompt,
            output=output,
            expected=case.expected,
            score=score,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            retries=retries - 1 if not last_error else retries,
            error=last_error,
        )
