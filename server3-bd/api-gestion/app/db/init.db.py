from sqlalchemy import create_engine
from models import Base

# Esta URL coincide con los datos que pusimos en el docker-compose.yml
DATABASE_URL = "postgresql://admin:admin@localhost:5432/uas_ai_db"

engine = create_engine(DATABASE_URL)

print("Conectando a PostgreSQL y creando tablas...")
Base.metadata.create_all(bind=engine)
print("¡Tablas creadas con éxito!")