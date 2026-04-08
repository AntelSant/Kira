import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import {
  DashboardResumen,
  AsistenciaSemanal,
  EmocionesDato,
} from '../../core/models/interfaces';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="page-header">
      <h2>📊 Panel de Control</h2>
      <p>Resumen del sistema Kira UAS</p>
    </div>

    <div class="stats-grid">
      <app-stat-card icon="🎓" [value]="resumen?.total_alumnos ?? '—'" label="Alumnos" colorClass="blue" />
      <app-stat-card icon="👨‍🏫" [value]="resumen?.total_profesores ?? '—'" label="Profesores" colorClass="green" />
      <app-stat-card icon="🏫" [value]="resumen?.total_grupos ?? '—'" label="Grupos" colorClass="orange" />
      <app-stat-card icon="📸" [value]="resumen?.embeddings_registrados ?? '—'" label="Caras Registradas" colorClass="purple" />
      <app-stat-card icon="✅" [value]="resumen?.asistencias_hoy ?? '—'" label="Asistencias Hoy" colorClass="green" />
      <app-stat-card icon="📚" [value]="resumen?.total_materias ?? '—'" label="Materias" colorClass="blue" />
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>📈 Asistencias — Última semana</h3>
        <div class="chart-canvas-container">
          <canvas #chartAsistencia></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>🎭 Distribución Emocional — Últimos 7 días</h3>
        <div class="chart-canvas-container">
          <canvas #chartEmociones></canvas>
        </div>
      </div>
    </div>
  `,
})
export class InicioComponent implements OnInit, OnDestroy {
  @ViewChild('chartAsistencia', { static: true }) chartAsistenciaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEmociones', { static: true }) chartEmocionesRef!: ElementRef<HTMLCanvasElement>;

  resumen: DashboardResumen | null = null;
  private chartAsistencia: Chart | null = null;
  private chartEmociones: Chart | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.chartAsistencia?.destroy();
    this.chartEmociones?.destroy();
  }

  private cargarDatos(): void {
    // Resumen
    this.api.get<DashboardResumen>('/api/dashboard/resumen').subscribe({
      next: (data) => (this.resumen = data),
    });

    // Chart: Asistencia semanal
    this.api.get<AsistenciaSemanal[]>('/api/dashboard/asistencia-semanal').subscribe({
      next: (semanal) => {
        if (!semanal?.length) return;
        const ctx = this.chartAsistenciaRef.nativeElement.getContext('2d')!;
        if (this.chartAsistencia) this.chartAsistencia.destroy();

        this.chartAsistencia = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: semanal.map((d) => d.dia),
            datasets: [
              {
                label: 'Asistencias',
                data: semanal.map((d) => d.cantidad),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: '#1e2843' } },
              x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            },
          },
        });
      },
    });

    // Chart: Emociones
    this.api.get<{ datos: EmocionesDato[] }>('/api/dashboard/emociones', { dias: '7' }).subscribe({
      next: (resp) => {
        if (!resp?.datos?.length) return;
        const ctx = this.chartEmocionesRef.nativeElement.getContext('2d')!;
        if (this.chartEmociones) this.chartEmociones.destroy();

        const colorMap: Record<string, string> = {
          positivo: '#10b981',
          neutro: '#6366f1',
          negativo: '#ef4444',
        };

        this.chartEmociones = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: resp.datos.map((d) => d.emocion.charAt(0).toUpperCase() + d.emocion.slice(1)),
            datasets: [
              {
                data: resp.datos.map((d) => d.cantidad),
                backgroundColor: resp.datos.map((d) => colorMap[d.emocion] || '#64748b'),
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', padding: 16 },
              },
            },
          },
        });
      },
    });
  }
}
