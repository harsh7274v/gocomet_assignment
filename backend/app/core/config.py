import os
from pydantic_settings import BaseSettings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "rfq_auction.db")
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "British Auction in RFQ System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "b3c9f2e4871092a48ef897d26b1d03c6218f6734e56a7bc901e23f54a8b12c49")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Absolute path ensures seamless resolution regardless of execution working directory
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
    
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        case_sensitive = True

settings = Settings()
