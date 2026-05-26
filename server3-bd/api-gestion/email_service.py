import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

def enviar_alerta_desercion(destinatarios: list, alumno_nombre: str, alumno_matricula: str,
                            grupo_nombre: str, materia: str, faltas: int, emocion: str):
    """Envía un correo HTML al coordinador académico con la alerta de deserción"""
    if not SMTP_USER or not SMTP_PASSWORD:
        print("!! -- Alerta: No hay credenciales SMTP configuradas. Email de alerta NO enviado.")
        return False
        
    if not destinatarios:
        print("!! -- Alerta: No hay destinatarios para la alerta de deserción.")
        return False

    fecha_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">⚠️ Alerta de Deserción Escolar</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; line-height: 1.5;">Estimado Coordinador,</p>
          <p style="font-size: 16px; line-height: 1.5;">El sistema Kira ha detectado a un alumno en riesgo potencial de deserción, basado en sus inasistencias y su estado emocional reciente.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin-top: 0; color: #1e293b;">Datos del Alumno:</h3>
            <ul style="list-style-type: none; padding-left: 0; line-height: 1.8;">
              <li><strong>Nombre:</strong> {alumno_nombre}</li>
              <li><strong>Matrícula:</strong> {alumno_matricula}</li>
              <li><strong>Materia:</strong> {materia}</li>
              <li><strong>Aula/Grupo:</strong> {grupo_nombre}</li>
            </ul>
            
            <h3 style="margin-bottom: 5px; color: #1e293b;">Motivo de Alerta:</h3>
            <ul style="list-style-type: none; padding-left: 0; line-height: 1.8;">
              <li><strong style="color: #ef4444;">Faltas Consecutivas:</strong> {faltas} clases</li>
              <li><strong style="color: #f59e0b;">Última Emoción Detectada:</strong> {emocion.capitalize() if emocion else 'Desconocida'}</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5;">Por favor, acceda al Dashboard de Administración de Kira para ver el reporte detallado y tomar las medidas necesarias.</p>
          <br/>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">Generado automáticamente por Kira UAS el {fecha_str}</p>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = SMTP_FROM
    msg['To'] = ", ".join(destinatarios)
    msg['Subject'] = f"⚠️ Alerta: Riesgo de Deserción - {alumno_nombre}"
    
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"-- Email de alerta enviado exitosamente a {len(destinatarios)} admin(s)")
        return True
    except Exception as e:
        print(f"!! -- Error enviando email de alerta: {str(e)}")
        return False
