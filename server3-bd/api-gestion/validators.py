import re
from functools import wraps
from fastapi import HTTPException, status

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)

def validate_email(email: str) -> tuple[bool, str]:
    if not email:
        return False, "El correo electrónico es requerido"
    if not isinstance(email, str):
        return False, "El correo electrónico debe ser una cadena de texto"
    email = email.strip()
    if len(email) > 100:
        return False, "El correo electrónico no puede exceder 100 caracteres"
    if not EMAIL_REGEX.match(email):
        return False, "El formato del correo electrónico no es válido"
    return True, ""


def debe_ser_email(email: str) -> str:
    valido, mensaje = validate_email(email)
    if not valido:
        raise HTTPException(status_code=400, detail=mensaje)
    return email.strip()


def check_email_no_existe(db, model, email: str, exclude_id: int = None) -> None:
    query = db.query(model).filter(model.email == email)
    if exclude_id:
        query = query.filter(model.id != exclude_id)
    existente = query.first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Este correo electrónico ya está registrado"
        )
