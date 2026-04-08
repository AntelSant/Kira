import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AlertService } from '../../core/services/alert.service';
import { Admin } from '../../core/models/interfaces';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>🛡️ Administradores</h2>
      <p>Gestión de acceso al dashboard</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" (click)="showModal = true">➕ Nuevo Administrador</button>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Desde</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @if (admins.length === 0) {
              <tr><td colspan="5" class="empty-state"><p>No hay administradores registrados</p></td></tr>
            }
            @for (a of admins; track a.id) {
              <tr>
                <td>{{ a.id }}</td>
                <td>{{ a.nombre }}</td>
                <td>{{ a.email }}</td>
                <td>{{ a.fecha_registro || '—' }}</td>
                <td>
                  <button class="btn btn-sm btn-danger" (click)="eliminar(a.id)">🗑️</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showModal) {
      <div class="modal-overlay active" (click)="showModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🛡️ Nuevo Administrador</h3>
            <button class="modal-close" (click)="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nombre completo</label>
              <input type="text" class="form-control" [(ngModel)]="nuevo.nombre" placeholder="Ana García" />
            </div>
            <div class="form-group">
              <label>Correo electrónico</label>
              <input type="email" class="form-control" [(ngModel)]="nuevo.email" placeholder="ana@uas.edu.mx" />
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" class="form-control" [(ngModel)]="nuevo.password" placeholder="Mínimo 8 caracteres" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showModal = false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()">💾 Registrar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminsComponent implements OnInit {
  admins: Admin[] = [];
  showModal = false;
  nuevo = { nombre: '', email: '', password: '' };

  constructor(private api: ApiService, private alertService: AlertService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.get<Admin[]>('/api/admins').subscribe({
      next: (data) => (this.admins = data || []),
      error: (err) => {
        this.admins = [];
        this.alertService.danger(err.message || 'Error al cargar administradores');
      },
    });
  }

  guardar(): void {
    const { nombre, email, password } = this.nuevo;
    if (!nombre || !email || !password) {
      this.alertService.danger('Todos los campos son obligatorios');
      return;
    }
    if (password.length < 8) {
      this.alertService.danger('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    this.api.post<any>('/api/admins/registrar', { nombre, email, password }).subscribe({
      next: () => {
        this.showModal = false;
        this.nuevo = { nombre: '', email: '', password: '' };
        this.cargar();
        this.alertService.success('Administrador registrado');
      },
      error: (err) => {
        this.alertService.danger(err.error?.detail || 'Error al registrar');
      },
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este administrador?')) return;
    this.api.delete<any>(`/api/admins/${id}`).subscribe({
      next: (resp) => this.cargar(),
      error: (err) => alert(err.error?.detail || 'Error al eliminar'),
    });
  }
}
