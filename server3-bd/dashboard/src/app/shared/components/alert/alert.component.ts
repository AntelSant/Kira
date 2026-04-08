import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertService, AlertMessage } from '../../../core/services/alert.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    @if (alerts.length > 0) {
      <div class="alert-container">
        @for (alert of alerts; track alert.id) {
          <div class="alert alert-{{ alert.type }}">
            {{ alert.icon }} {{ alert.message }}
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .alert-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    }
  `],
})
export class AlertComponent implements OnInit, OnDestroy {
  alerts: { id: number; type: string; message: string; icon: string }[] = [];
  private sub!: Subscription;
  private counter = 0;

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.sub = this.alertService.alert$.subscribe((alert: AlertMessage) => {
      const icons: Record<string, string> = {
        success: '✅',
        danger: '❌',
        info: 'ℹ️',
      };
      const id = ++this.counter;
      this.alerts.push({ id, type: alert.type, message: alert.message, icon: icons[alert.type] || '' });
      setTimeout(() => {
        this.alerts = this.alerts.filter((a) => a.id !== id);
      }, 4000);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
