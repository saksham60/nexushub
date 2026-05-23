from __future__ import annotations

from cryptography.fernet import Fernet

from app.config import get_settings
from app.core.errors import ConfigurationError


def _fernet() -> Fernet:
    key = get_settings().token_encryption_key
    if not key:
        raise ConfigurationError("TOKEN_ENCRYPTION_KEY is not configured.")
    return Fernet(key.encode("utf-8"))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str) -> str:
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
