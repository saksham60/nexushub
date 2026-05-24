from __future__ import annotations


class NexusHubError(Exception):
    code = "nexushub_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class AuthenticationRequiredError(NexusHubError):
    code = "authentication_required"


class ConsentRequiredError(NexusHubError):
    code = "consent_required"


class GraphServiceError(NexusHubError):
    code = "graph_error"


class NotFoundError(NexusHubError):
    code = "not_found"


class ForbiddenError(NexusHubError):
    code = "forbidden"


class ConfigurationError(NexusHubError):
    code = "configuration_error"


class FeatureDisabledError(NexusHubError):
    code = "FEATURE_DISABLED"


class LLMUnavailableError(NexusHubError):
    code = "LLM_UNAVAILABLE"


class InsufficientEmailContextError(NexusHubError):
    code = "INSUFFICIENT_EMAIL_CONTEXT"


class DocumentParsingError(NexusHubError):
    code = "DOCUMENT_PARSING_ERROR"


class UnsupportedDocumentError(NexusHubError):
    code = "UNSUPPORTED_DOCUMENT"
