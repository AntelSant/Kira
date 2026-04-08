import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { RegistroAsistencia, Grupo } from '../../core/models/interfaces';

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="page-header">
      <h2>✅ Registros de Asistencia</h2>
      <p>Consulta detallada de asistencia por grupo</p>
    </div>

    <div class="toolbar">
      <select class="form-control" [(ngModel)]="grupoId" (ngModelChange)="cargar()">
        <option value="">-- Selecciona un grupo --</option>
        @for (g of grupos; track g.id) {
          <option [value]="g.id">{{ g.materia_nombre }} — {{ g.profesor_nombre }} ({{ g.aula }})</option>
        }
      </select>
      <input type="date" class="form-control" [(ngModel)]="fecha" (ngModelChange)="cargar()" />
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Matrícula</th><th>Fecha</th>
              <th>Hora</th><th>Estado</th><th>Emoción</th>
            </tr>
          </thead>
          <tbody>
            @if (registros.length === 0) {
              <tr><td colspan="6" class="empty-state"><p>{{ grupoId ? 'Sin registros de asistencia' : 'Selecciona un grupo' }}</p></td></tr>
            }
            @for (r of registros; track $index) {
              <tr>
                <td>{{ r.nombre }}</td>
                <td><code>{{ r.matricula }}</code></td>
                <td>{{ r.fecha }}</td>
                <td>{{ r.hora_registro }}</td>
                <td>
                  <span class="badge" [ngClass]="estadoClass(r.estado)">
                    {{ estadoLabel(r.estado) }}
                  </span>
                </td>
                <td>
                  <span class="badge" [ngClass]="emocionClass(r.emocion)">
                    {{ r.emocion || '—' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AsistenciaComponent implements OnInit {
  grupos: Grupo[] = [];
  registros: RegistroAsistencia[] = [];
  grupoId = '';
  fecha = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<Grupo[]>('/api/grupos').subscribe({
      next: (data) => (this.grupos = data || []),
    });
  }

  cargar(): void {
    if (!this.grupoId) {
      this.registros = [];
      return;
    }
    const params: Record<string, string> = {};
    if (this.fecha) params['fecha'] = this.fecha;

    this.api.get<RegistroAsistencia[]>(`/api/asistencia/${this.grupoId}`, params).subscribe({
      next: (data) => (this.registros = data || []),
      error: () => (this.registros = []),
    });
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      a_tiempo: 'badge-success',
      retardo: 'badge-warning',
      fuera_de_horario: 'badge-danger',
    };
    return map[estado] || 'badge-info';
  }

  estadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      a_tiempo: 'A tiempo',
      retardo: 'Retardo',
      fuera_de_horario: 'Fuera de horario',
    };
    return labels[estado] || estado;
  }

  emocionClass(emocion: string): string {
    const map: Record<string, string> = {
      positivo: 'badge-success',
      neutro: 'badge-purple',
      negativo: 'badge-danger',
    };
    return map[emocion] || 'badge-info';
  }
}
