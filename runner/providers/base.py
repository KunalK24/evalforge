from abc import ABC, abstractmethod
from models import EvalCase, EvalCaseResult, ProviderConfig


class BaseProvider(ABC):
    def __init__(self, config: ProviderConfig):
        self.config = config

    @abstractmethod
    async def run_case(
        self,
        case: EvalCase,
        timeout_ms: int,
        max_retries: int,
    ) -> EvalCaseResult:


    def score(self, output: str, case: EvalCase) -> float | None:
        if case.expected is None or case.scorer_type == "none":
            return None

        if case.scorer_type == "exact_match":
            return 1.0 if output.strip().lower() == case.expected.strip().lower() else 0.0

        if case.scorer_type == "contains":
            return 1.0 if case.expected.strip().lower() in output.strip().lower() else 0.0

        return None
