# ⚙️ Kira — Server 3: API de Gestión, Base de Datos y Dashboard

Este directorio contiene la lógica principal de negocio y el almacenamiento de datos del sistema Kira.

## Estructura

- `/api-gestion`: El backend principal (FastAPI) encargado del CRUD de la base de datos (PostgreSQL), la gestión de lógica de negocio y las alertas.
- `/dashboard`: Aplicación Frontend en React/Vite para interactuar visualmente con el sistema.
- `init.sql`: Script de inicialización para construir las tablas base y esquemas de PostgreSQL al levantar los contenedores de Docker.

## Despliegue

Para levantar toda esta estructura, **Kira utiliza Docker Compose**. En lugar de correr scripts locales, consulta la guía principal `DOCKER_README.md` ubicada en la raíz del proyecto.

> **NOTA:** La base de datos requiere la extensión `pgvector` para el cálculo rápido de similitud coseno de los embeddings faciales.
