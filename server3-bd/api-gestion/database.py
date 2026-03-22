from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# La misma URL que usamos para inicializar la BD
SQLALCHEMY_DATABASE_URL = "postgresql://admin:admin@localhost:5432/uas_ai_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependencia para inyectar la sesión en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()