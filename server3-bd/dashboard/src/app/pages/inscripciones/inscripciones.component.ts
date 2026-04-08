import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AlertService } from '../../core/services/alert.service';
import { Inscripcion, Grupo, Usuario } from '../../core/models/interfaces';

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>📋 Inscripciones</h2>
      <p>Asigna alumnos a grupos</p>
    </div>

    <div class="toolbar">
      <select class="form-control" [(ngModel)]="grupoId" (ngModelChange)="cargarInscripciones()">
        <option value="">-- Selecciona un grupo --</option>
        @for (g of grupos; track g.id) {
          <option [value]="g.id">{{ g.materia_nombre }} — {{ g.profesor_nombre }} ({{ g.aula }})</option>
        }
      </select>
      <button class="btn btn-primary" (click)="abrirModal()">➕ Inscribir Alumno</button>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>ID</th><th>Alumno</th><th>Matrícula</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @if (inscripciones.length === 0) {
              <tr><td colspan="4" class="empty-state"><p>{{ grupoId ? 'Sin alumnos inscritos' : 'Selecciona un grupo' }}</p></td></tr>
            }
            @for (i of inscripciones; track i.inscripcion_id) {
              <tr>
                <td>{{ i.inscripcion_id }}</td>
                <td>{{ i.nombre }}</td>
                <td><code>{{ i.matricula }}</code></td>
                <td><button class="btn btn-sm btn-danger" (click)="eliminar(i.inscripcion_id)">🗑️</button></td>
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
            <h3>➕ Inscribir Alumno</h3>
            <button class="modal-close" (click)="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Alumno</label>
              <select class="form-control" [(ngModel)]="alumnoId">
                @for (a of alumnos; track a.id) {
                  <option [value]="a.id">{{ a.nombre }} {{ a.apellido }} — {{ a.matricula }}</option>
                }
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="showModal = false">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()">💾 Inscribir</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InscripcionesComponent implements OnInit {
  grupos: Grupo[] = [];
  inscripciones: Inscripcion[] = [];
  alumnos: Usuario[] = [];
  grupoId = '';
  alumnoId = '';
  showModal = false;

  constructor(private api: ApiService, private alertService: AlertService) {}

  ngOnInit(): void {
    this.api.get<Grupo[]>('/api/grupos').subscribe({
      next: (data) => (this.grupos = data || []),
    });
    this.api.get<Usuario[]>('/api/usuarios', { tipo: 'alumno' }).subscribe({
      next: (data) => (this.alumnos = data || []),
    });
  }

  cargarInscripciones(): void {
    if (!this.grupoId) {
      this.inscripciones = [];
      return;
    }
    this.api.get<Inscripcion[]>(`/api/inscripciones/${this.grupoId}`).subscribe({
      next: (data) => (this.inscripciones = data || []),
      error: () => (this.inscripciones = []),
    });
  }

  abrirModal(): void {
    if (!this.grupoId) {
      alert('Primero selecciona un grupo');
      return;
    }
    this.alumnoId = '';
    this.showModal = true;
  }

  guardar(): void {
    const payload = {
      alumno_id: parseInt(this.alumnoId),
      grupo_id: parseInt(this.grupoId),
    };
    this.api.post<any>('/api/inscripciones/registrar', payload).subscribe({
      next: (result) => {
        if (result?.inscripcion_id) {
          this.showModal = false;
          this.cargarInscripciones();
          this.alertService.success('Alumno inscrito');
        } else {
          this.alertService.danger(result?.detail || 'Error al inscribir');
        }
      },
      error: (err) => this.alertService.danger(err.error?.detail || 'Error'),
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar esta inscripción?')) return;
    this.api.delete(`/api/inscripciones/${id}`).subscribe({
      next: () => this.cargarInscripciones(),
    });
  }
}
