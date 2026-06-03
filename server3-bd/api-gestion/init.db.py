import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from models import Base

load_dotenv()  # Cargar variables de entorno desde .env

# Leer la URL de la base de datos desde .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or "<usuario>" in DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL no está configurada correctamente en .env")

engine = create_engine(DATABASE_URL)

print("Conectando a PostgreSQL y creando tablas...")
Base.metadata.create_all(bind=engine)
print("¡Tablas creadas/verificadas con éxito!")

print("Verificando columnas faltantes en tablas existentes...")
inspector = inspect(engine)

with engine.connect() as conn:
    for table_name, table in Base.metadata.tables.items():
        if inspector.has_table(table_name):
            existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
            for column in table.columns:
                if column.name not in existing_columns:
                    col_type = column.type.compile(engine.dialect)
                    print(f"Agregando columna faltante: {table_name}.{column.name} de tipo {col_type}")
                    # Para PostgreSQL:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}"))
    conn.commit()

print("¡Verificación de columnas completada!")