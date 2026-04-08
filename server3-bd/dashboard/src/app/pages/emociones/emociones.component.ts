import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EmocionesTendencia } from '../../core/models/interfaces';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-emociones',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h2>😊 Análisis Emocional</h2>
      <p>Tendencias emocionales de la comunidad universitaria</p>
    </div>

    <div class="toolbar">
      <select class="form-control" [(ngModel)]="dias" (ngModelChange)="cargar()">
        <option value="7">Últimos 7 días</option>
        <option value="14">Últimos 14 días</option>
        <option value="30">Últimos 30 días</option>
      </select>
    </div>

    <div class="charts-grid">
      <div class="chart-card" style="grid-column: 1 / -1;">
        <h3>📈 Tendencia Emocional</h3>
        <div class="chart-canvas-container" style="height: 340px;">
          <canvas #chartTendencia></canvas>
        </div>
      </div>
    </div>
  `,
})
export class EmocionesComponent implements OnInit, OnDestroy {
  @ViewChild('chartTendencia', { static: true }) chartRef!: ElementRef<HTMLCanvasElement>;

  dias = '30';
  private chart: Chart | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  cargar(): void {
    this.api.get<EmocionesTendencia[]>(`/api/dashboard/emociones-tendencia`, { dias: this.dias }).subscribe({
      next: (datos) => {
        if (!datos?.length) return;

        const ctx = this.chartRef.nativeElement.getContext('2d')!;
        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: datos.map((d) => d.fecha),
            datasets: [
              {
                label: 'Positivo',
                data: datos.map((d) => d.positivo),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3,
              },
              {
                label: 'Neutro',
                data: datos.map((d) => d.neutro),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.3,
              },
              {
                label: 'Negativo',
                data: datos.map((d) => d.negativo),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { color: '#94a3b8', padding: 16 },
              },
            },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: '#1e2843' } },
              x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { display: false } },
            },
          },
        });
      },
    });
  }
}
