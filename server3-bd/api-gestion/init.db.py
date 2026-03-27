import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from models import Base

load_dotenv()  # Cargar variables de entorno desde .env

# Leer la URL de la base de datos desde .env
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin@localhost:5432/uas_ai_db")

engine = create_engine(DATABASE_URL)

print("Conectando a PostgreSQL y creando tablas...")
Base.metadata.create_all(bind=engine)
print("¡Tablas creadas con éxito!")