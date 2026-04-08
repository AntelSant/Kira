import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AlertService } from '../../core/services/alert.service';
import { Horario, Grupo } from '../../core/models/interfaces';

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>🕐 Horarios</h2>
      <p>Gestión de horarios por grupo</p>
    </div>

    <div class="toolbar">
      <select class="form-control" [(ngModel)]="grupoId" (ngModelChange)="cargarHorarios()">
        <option value="">-- Selecciona un grupo --</option>
        @for (g of grupos; track g.id) {
          <option [value]="g.id">{{ g.materia_nombre }} — {{ g.profesor_nombre }} ({{ g.aula }})</option>
        }
      </select>
      <button class="btn btn-primary" (click)="abrirModal()">➕ Nuevo Horario</button>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>ID</th><th>Día</th><th>Hora Inicio</th><th>Hora Fin</th><th>Tolerancia</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            @if (horarios.length === 0) {
              <tr><td colspan="6" class="empty-state"><p>{{ grupoId ? 'Sin horarios asignados' : 'Selecciona un grupo' }}</p></td></tr>
            }
            @for (h of horarios; track h.id) {
              <tr>
                <td>{{ h.id }}</td>
                <td>{{ h.dia_nombre }}</td>
                <td>{{ h.hora_inicio }}</td>
                <td>{{ h.hora_fin }}</td>
                <td>{{ h.tolerancia_minutos }} min</td>
                <td><button class="btn btn-sm btn-danger" (click)="eliminar(h.id)">🗑️</button></td>
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
            <h3>➕ Nuevo Horario</h3>
            <button class="modal-close" (click)="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Día de la Semana</label>
              <select class="form-control" [(ngModel)]="nuevo.dia_semana">
                <option value="0">Lunes</option>
                <option value="1">Martes</option>
                <option value="2">Miércoles</option>
                <option value="3">Jueves</option>
                <option value="4">Viernes</option>
                <option value="5">Sábado</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Hora Inicio</label>
                <input type="time" class="form-control" [(ngModel)]="nuevo.hora_inicio" />
              </div>
              <div class="form-group">
                <label>Hora Fin</label>
                <input type="time" class="form-control" [(ngModel)]="nuevo.hora_fin" />
              </div>
            </div>
            <div class="form-group">
              <label>Tolerancia (minutos)</label>
              <input type="number" class="form-control" [(ngModel)]="nuevo.tolerancia_minutos" min="0" max="60" />
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
export class HorariosComponent implements OnInit {
  grupos: Grupo[] = [];
  horarios: Horario[] = [];
  grupoId = '';
  showModal = false;
  nuevo = { dia_semana: '0', hora_inicio: '08:00', hora_fin: '10:00', tolerancia_minutos: 10 };

  constructor(private api: ApiService, private alertService: AlertService) {}

  ngOnInit(): void {
    this.api.get<Grupo[]>('/api/grupos').subscribe({
      next: (data) => (this.grupos = data || []),
    });
  }

  cargarHorarios(): void {
    if (!this.grupoId) {
      this.horarios = [];
      return;
    }
    this.api.get<Horario[]>(`/api/horarios/${this.grupoId}`).subscribe({
      next: (data) => (this.horarios = data || []),
      error: () => (this.horarios = []),
    });
  }

  abrirModal(): void {
    if (!this.grupoId) {
      alert('Primero selecciona un grupo');
      return;
    }
    this.nuevo = { dia_semana: '0', hora_inicio: '08:00', hora_fin: '10:00', tolerancia_minutos: 10 };
    this.showModal = true;
  }

  guardar(): void {
    const payload = {
      grupo_id: parseInt(this.grupoId),
      dia_semana: parseInt(this.nuevo.dia_semana),
      hora_inicio: this.nuevo.hora_inicio,
      hora_fin: this.nuevo.hora_fin,
      tolerancia_minutos: this.nuevo.tolerancia_minutos,
    };

    this.api.post<any>('/api/horarios/registrar', payload).subscribe({
      next: (result) => {
        if (result?.horario_id) {
          this.showModal = false;
          this.cargarHorarios();
          this.alertService.success('Horario registrado');
        } else {
          this.alertService.danger(result?.detail || 'Error');
        }
      },
      error: (err) => this.alertService.danger(err.error?.detail || 'Error'),
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este horario?')) return;
    this.api.delete(`/api/horarios/${id}`).subscribe({
      next: () => this.cargarHorarios(),
    });
  }
}
