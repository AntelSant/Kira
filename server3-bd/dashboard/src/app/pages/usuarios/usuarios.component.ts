import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AlertService } from '../../core/services/alert.service';
import { Usuario } from '../../core/models/interfaces';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>👥 Gestión de Usuarios</h2>
      <p>Administra alumnos y profesores</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" (click)="showModalUsuario = true">➕ Nuevo Usuario</button>
      <select class="form-control" [(ngModel)]="filtroTipo" (ngModelChange)="cargarUsuarios()">
        <option value="">Todos</option>
        <option value="alumno">Alumnos</option>
        <option value="profesor">Profesores</option>
      </select>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Matrícula</th>
              <th>Tipo</th>
              <th>Cara IA</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (usuarios.length === 0) {
              <tr>
                <td colspan="6" class="empty-state"><p>No hay usuarios registrados</p></td>
              </tr>
            }
            @for (u of usuarios; track u.id) {
              <tr>
                <td>{{ u.id }}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    @if (u.foto_perfil) {
                      <img [src]="u.foto_perfil" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
                    }
                    <span>{{ u.nombre }} {{ u.apellido }}</span>
                  </div>
                </td>
                <td><code>{{ u.matricula }}</code></td>
                <td>
                  <span class="badge" [class.badge-info]="u.tipo === 'alumno'" [class.badge-purple]="u.tipo === 'profesor'">
                    {{ u.tipo }}
                  </span>
                </td>
                <td>
                  @if (u.tiene_embedding) {
                    <span class="badge badge-success">✅ Sí</span>
                  } @else {
                    <span class="badge badge-warning">⚠️ No</span>
                  }
                </td>
                <td>
                  <button class="btn btn-sm btn-primary" (click)="abrirCapturaCara(u)">📷 Cara</button>
                  <button class="btn btn-sm btn-danger" (click)="eliminarUsuario(u.id)">🗑️</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Nuevo Usuario -->
    @if (showModalUsuario) {
      <div class="modal-overlay active" (click)="showModalUsuario = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>➕ Nuevo Usuario</h3>
            <button class="modal-close" (click)="showModalUsuario = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Nombre</label>
                <input type="text" class="form-control" [(ngModel)]="nuevoUsuario.nombre" placeholder="Juan" />
              </div>
              <div class="form-group">
                <label>Apellido</label>
                <input type="text" class="form-control" [(ngModel)]="nuevoUsuario.apellido" placeholder="Pérez" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Matrícula / Num. Empleado</label>
                <input type="text" class="form-control" [(ngModel)]="nuevoUsuario.matricula" placeholder="123456" />
              </div>
              <div class="form-group">
                <label>Tipo</label>
                <select class="form-control" [(ngModel)]="nuevoUsuario.tipo">
                  <option value="alumno">Alumno</option>
                  <option value="profesor">Profesor</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Foto de Perfil</label>
              <input type="file" class="form-control" (change)="onFotoSelected($event)" accept="image/*" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showModalUsuario = false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardarUsuario()">💾 Registrar</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: Captura de Cara -->
    @if (showModalCara) {
      <div class="modal-overlay active" (click)="cerrarModalCara()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📷 Registro Facial</h3>
            <button class="modal-close" (click)="cerrarModalCara()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom:12px;color:var(--text-secondary);">
              Registrando cara para <strong>{{ caraUsuarioNombre }}</strong> ({{ caraMatricula }})
            </p>
            <div class="camera-container">
              <div class="camera-preview" id="camera-preview">
                @if (caraImagenPreview) {
                  <img [src]="caraImagenPreview" />
                } @else if (cameraActive) {
                  <video #videoElement autoplay playsinline muted></video>
                } @else {
                  <div class="placeholder">📷 Vista previa</div>
                }
              </div>
              <div class="camera-actions">
                @if (!cameraActive && !caraImagenPreview) {
                  <button class="btn btn-outline" (click)="iniciarCamara()">🎥 Usar Cámara</button>
                  <button class="btn btn-outline" (click)="fileUploadCara.click()">📁 Subir Imagen</button>
                  <input #fileUploadCara type="file" accept="image/*" style="display:none" (change)="cargarImagenCara($event)" />
                }
                @if (cameraActive && !caraImagenPreview) {
                  <button class="btn btn-primary" (click)="capturarFoto()">📸 Capturar</button>
                }
              </div>
            </div>
            <canvas #canvasCaptura style="display:none;"></canvas>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="cerrarModalCara()">Cancelar</button>
            <button class="btn btn-primary" (click)="enviarCara()" [disabled]="!capturedBase64 || enviandoCara">
              {{ enviandoCara ? '⏳ Procesando...' : '🚀 Registrar Cara' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  filtroTipo = '';

  // Modal: Nuevo Usuario
  showModalUsuario = false;
  nuevoUsuario = { nombre: '', apellido: '', matricula: '', tipo: 'alumno' };
  fotoFile: File | null = null;

  // Modal: Captura de Cara
  showModalCara = false;
  caraMatricula = '';
  caraUsuarioNombre = '';
  caraImagenPreview: string | null = null;
  capturedBase64: string | null = null;
  cameraActive = false;
  enviandoCara = false;
  private mediaStream: MediaStream | null = null;

  constructor(
    private api: ApiService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    const params: Record<string, string> = {};
    if (this.filtroTipo) params['tipo'] = this.filtroTipo;

    this.api.get<Usuario[]>('/api/usuarios', params).subscribe({
      next: (data) => (this.usuarios = data || []),
      error: () => (this.usuarios = []),
    });
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.fotoFile = input.files[0];
    }
  }

  guardarUsuario(): void {
    const { nombre, apellido, matricula, tipo } = this.nuevoUsuario;
    if (!nombre || !apellido || !matricula || !this.fotoFile) {
      this.alertService.danger('Todos los campos son obligatorios');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('apellido', apellido);
    formData.append('matricula', matricula);
    formData.append('tipo', tipo);
    formData.append('foto', this.fotoFile);

    this.api.postFormData<any>('/api/usuarios/registrar', formData).subscribe({
      next: () => {
        this.showModalUsuario = false;
        this.nuevoUsuario = { nombre: '', apellido: '', matricula: '', tipo: 'alumno' };
        this.fotoFile = null;
        this.cargarUsuarios();
        this.alertService.success('Usuario registrado correctamente');
      },
      error: (err) => {
        this.alertService.danger(err.error?.detail || 'Error al registrar');
      },
    });
  }

  eliminarUsuario(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    this.api.delete(`/api/usuarios/${id}`).subscribe({
      next: () => this.cargarUsuarios(),
    });
  }

  // ── Captura de Cara ──────────────────────────────────
  abrirCapturaCara(u: Usuario): void {
    this.caraMatricula = u.matricula;
    this.caraUsuarioNombre = `${u.nombre} ${u.apellido}`;
    this.caraImagenPreview = null;
    this.capturedBase64 = null;
    this.cameraActive = false;
    this.enviandoCara = false;
    this.showModalCara = true;
  }

  cerrarModalCara(): void {
    this.stopCamera();
    this.showModalCara = false;
  }

  async iniciarCamara(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      const esHTTP = location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
      if (esHTTP) {
        this.alertService.danger('La cámara requiere acceder por localhost o HTTPS.');
      } else {
        this.alertService.danger('Tu navegador no soporta acceso a la cámara.');
      }
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      this.cameraActive = true;

      // Wait for Angular to render the video element
      setTimeout(() => {
        const video = document.querySelector('#camera-preview video') as HTMLVideoElement;
        if (video) {
          video.srcObject = this.mediaStream;
          video.play();
        }
      }, 100);
    } catch (e: any) {
      let msg = 'No se pudo acceder a la cámara.';
      if (e.name === 'NotAllowedError') {
        msg = '🔒 Permiso de cámara denegado. Permite el acceso en la barra de dirección.';
      } else if (e.name === 'NotFoundError') {
        msg = '📷 No se encontró ninguna cámara.';
      } else if (e.name === 'NotReadableError') {
        msg = '⚠️ La cámara está siendo usada por otra aplicación.';
      }
      this.alertService.danger(msg);
    }
  }

  capturarFoto(): void {
    const video = document.querySelector('#camera-preview video') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    this.stopCamera();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.caraImagenPreview = dataUrl;
    this.capturedBase64 = dataUrl.split(',')[1];
    this.cameraActive = false;
  }

  cargarImagenCara(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.caraImagenPreview = dataUrl;
      this.capturedBase64 = dataUrl.split(',')[1];
    };
    reader.readAsDataURL(file);
  }

  enviarCara(): void {
    if (!this.capturedBase64) return;
    this.enviandoCara = true;

    this.api
      .postServer1<any>('/api/register', {
        matricula: this.caraMatricula,
        foto_base64: this.capturedBase64,
      })
      .subscribe({
        next: (result) => {
          if (result?.status === 'success') {
            this.alertService.success('¡Cara registrada correctamente!');
            setTimeout(() => {
              this.cerrarModalCara();
              this.cargarUsuarios();
            }, 1500);
          } else {
            this.alertService.danger(result?.mensaje || 'Error al procesar. ¿Server1 está corriendo?');
            this.enviandoCara = false;
          }
        },
        error: () => {
          this.alertService.danger('Error de conexión con Server1');
          this.enviandoCara = false;
        },
      });
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }
}
