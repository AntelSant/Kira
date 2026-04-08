import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AlertService } from '../../core/services/alert.service';
import { Materia } from '../../core/models/interfaces';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>📚 Materias</h2>
      <p>Gestión de materias del programa académico</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" (click)="showModal = true">➕ Nueva Materia</button>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Clave</th></tr>
          </thead>
          <tbody>
            @if (materias.length === 0) {
              <tr><td colspan="3" class="empty-state"><p>No hay materias registradas</p></td></tr>
            }
            @for (m of materias; track m.id) {
              <tr>
                <td>{{ m.id }}</td>
                <td>{{ m.nombre }}</td>
                <td><code>{{ m.clave }}</code></td>
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
            <h3>➕ Nueva Materia</h3>
            <button class="modal-close" (click)="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nombre de la Materia</label>
              <input type="text" class="form-control" [(ngModel)]="nueva.nombre" placeholder="Inteligencia Artificial" />
            </div>
            <div class="form-group">
              <label>Clave</label>
              <input type="text" class="form-control" [(ngModel)]="nueva.clave" placeholder="IA-401" />
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
export class MateriasComponent implements OnInit {
  materias: Materia[] = [];
  showModal = false;
  nueva = { nombre: '', clave: '' };

  constructor(private api: ApiService, private alertService: AlertService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.get<Materia[]>('/api/materias').subscribe({
      next: (data) => (this.materias = data || []),
      error: () => (this.materias = []),
    });
  }

  guardar(): void {
    if (!this.nueva.nombre || !this.nueva.clave) {
      this.alertService.danger('Todos los campos son obligatorios');
      return;
    }
    this.api.post<any>('/api/materias/registrar', this.nueva).subscribe({
      next: (result) => {
        if (result?.materia_id) {
          this.showModal = false;
          this.nueva = { nombre: '', clave: '' };
          this.cargar();
          this.alertService.success('Materia registrada');
        } else {
          this.alertService.danger(result?.detail || 'Error al registrar materia');
        }
      },
      error: (err) => this.alertService.danger(err.error?.detail || 'Error'),
    });
  }
}
