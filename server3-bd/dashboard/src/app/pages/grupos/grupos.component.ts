import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AlertService } from '../../core/services/alert.service';
import { Grupo, Materia, Usuario } from '../../core/models/interfaces';

@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>🏫 Grupos</h2>
      <p>Gestión de grupos académicos</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" (click)="abrirModal()">➕ Nuevo Grupo</button>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Materia</th><th>Profesor</th>
              <th>Aula</th><th>Semestre</th><th>Periodo</th><th>Alumnos</th>
            </tr>
          </thead>
          <tbody>
            @if (grupos.length === 0) {
              <tr><td colspan="7" class="empty-state"><p>No hay grupos registrados</p></td></tr>
            }
            @for (g of grupos; track g.id) {
              <tr>
                <td>{{ g.id }}</td>
                <td>{{ g.materia_nombre }}</td>
                <td>{{ g.profesor_nombre }}</td>
                <td>{{ g.aula }}</td>
                <td>{{ g.semestre }}</td>
                <td>{{ g.periodo }}</td>
                <td><span class="badge badge-info">{{ g.num_alumnos }}</span></td>
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
            <h3>➕ Nuevo Grupo</h3>
            <button class="modal-close" (click)="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>ID del Grupo (opcional, se auto-genera si se deja vacío)</label>
              <input type="number" class="form-control" [(ngModel)]="nuevo.id" placeholder="Ej: 5" />
            </div>
            <div class="form-group">
              <label>Materia</label>
              <select class="form-control" [(ngModel)]="nuevo.materia_id">
                @for (m of materias; track m.id) {
                  <option [value]="m.id">{{ m.nombre }} ({{ m.clave }})</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Profesor</label>
              <select class="form-control" [(ngModel)]="nuevo.profesor_id">
                @for (p of profesores; track p.id) {
                  <option [value]="p.id">{{ p.nombre }} {{ p.apellido }}</option>
                }
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Aula</label>
                <input type="text" class="form-control" [(ngModel)]="nuevo.aula" placeholder="A-201" />
              </div>
              <div class="form-group">
                <label>Semestre</label>
                <input type="text" class="form-control" [(ngModel)]="nuevo.semestre" placeholder="8vo" />
              </div>
            </div>
            <div class="form-group">
              <label>Periodo</label>
              <input type="text" class="form-control" [(ngModel)]="nuevo.periodo" placeholder="2026-1" />
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
export class GruposComponent implements OnInit {
  grupos: Grupo[] = [];
  materias: Materia[] = [];
  profesores: Usuario[] = [];
  showModal = false;
  nuevo: any = { id: null, materia_id: null, profesor_id: null, aula: '', semestre: '', periodo: '' };

  constructor(private api: ApiService, private alertService: AlertService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.get<Grupo[]>('/api/grupos').subscribe({
      next: (data) => (this.grupos = data || []),
      error: () => (this.grupos = []),
    });
  }

  abrirModal(): void {
    this.api.get<Materia[]>('/api/materias').subscribe({
      next: (data) => (this.materias = data || []),
    });
    this.api.get<Usuario[]>('/api/usuarios', { tipo: 'profesor' }).subscribe({
      next: (data) => (this.profesores = data || []),
    });
    this.nuevo = { id: null, materia_id: null, profesor_id: null, aula: '', semestre: '', periodo: '' };
    this.showModal = true;
  }

  guardar(): void {
    const payload: any = {
      materia_id: parseInt(this.nuevo.materia_id),
      profesor_id: parseInt(this.nuevo.profesor_id),
      aula: this.nuevo.aula.trim(),
      semestre: this.nuevo.semestre.trim(),
      periodo: this.nuevo.periodo.trim(),
    };
    if (this.nuevo.id) payload.id = parseInt(this.nuevo.id);

    if (!payload.aula || !payload.semestre || !payload.periodo) {
      this.alertService.danger('Todos los campos son obligatorios');
      return;
    }

    this.api.post<any>('/api/grupos/registrar', payload).subscribe({
      next: (result) => {
        if (result?.grupo_id) {
          this.showModal = false;
          this.cargar();
          this.alertService.success('Grupo registrado');
        } else {
          this.alertService.danger(result?.detail || 'Error al registrar grupo');
        }
      },
      error: (err) => this.alertService.danger(err.error?.detail || 'Error'),
    });
  }
}
