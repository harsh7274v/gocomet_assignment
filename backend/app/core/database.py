from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Render and Heroku provide DATABASE_URL starting with postgres://, but SQLAlchemy 2.0 requires postgresql://
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

is_sqlite = db_url.startswith("sqlite")

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

