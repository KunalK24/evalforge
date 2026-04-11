from models import ProviderConfig
from providers.base import BaseProvider
from providers.ollama import OllamaProvider


# Registry maps provider name strings to their implementation classes.
# Add new providers here as they are implemented.
_PROVIDER_REGISTRY: dict[str, type[BaseProvider]] = {
    "ollama": OllamaProvider,
}

def get_provider(config: ProviderConfig) -> BaseProvider:
    """
    Instantiates and returns the correct provider implementation
    based on the provider name in the config.
    Raises ValueError for unsupported providers.
    """
    provider_cls = _PROVIDER_REGISTRY.get(config.name.lower())
    if provider_cls is None:
        supported = ", ".join(_PROVIDER_REGISTRY.keys())
        raise ValueError(
            f"Unsupported provider '{config.name}'. Supported: {supported}"
        )
    return provider_cls(config)
