import os
from dotenv import load_dotenv
from database import SessionLocal
from models import Horario, Grupo

def main():
    load_dotenv()
    db = SessionLocal()
    
    print("=== Limpiando Horarios Duplicados e Inválidos ===")
    
    horarios = db.query(Horario).all()
    
    vistos = set()
    para_eliminar = []
    
    for h in horarios:
        clave = (h.grupo_id, h.dia_semana, h.hora_inicio, h.hora_fin)
        
        # 1. Checar duplicados exactos
        if clave in vistos:
            print(f"[DUPLICADO] Horario ID {h.id} (Grupo {h.grupo_id}, Dia {h.dia_semana}, {h.hora_inicio}-{h.hora_fin})")
            para_eliminar.append(h)
        else:
            vistos.add(clave)
            
        # 2. Informar sobre horarios que cruzan medianoche (hora_fin <= hora_inicio)
        if h.hora_fin <= h.hora_inicio:
            print(f"[REVISAR] Horario ID {h.id} cruza medianoche o es 00:00 (Grupo {h.grupo_id}, Dia {h.dia_semana}, {h.hora_inicio}-{h.hora_fin})")

    if not para_eliminar:
        print("No se encontraron horarios duplicados para eliminar.")
    else:
        print(f"\nSe encontraron {len(para_eliminar)} horarios duplicados.")
        confirm = input("¿Deseas eliminarlos de la base de datos? (s/N): ")
        if confirm.lower() == 's':
            for h in para_eliminar:
                db.delete(h)
            db.commit()
            print("Horarios duplicados eliminados con éxito.")
        else:
            print("Operación cancelada.")
            
    db.close()

if __name__ == "__main__":
    main()
