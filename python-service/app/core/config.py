import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_HOST: str = os.getenv("APP_HOST", "127.0.0.1")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    PYTHON_SERVICE_TOKEN: str = os.getenv("PYTHON_SERVICE_TOKEN", "")
    APP_VERSION: str = "1.0.0"

settings = Settings()


def validate_settings() -> None:
    token = settings.PYTHON_SERVICE_TOKEN
    if len(token) < 32 or any(word in token.lower() for word in ("replace", "example", "placeholder")):
        raise RuntimeError(
            "Set PYTHON_SERVICE_TOKEN in python-service/.env to the same unique random value configured in backend/.env."
        )
