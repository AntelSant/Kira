import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="stat-card">
      <div class="stat-icon" [ngClass]="colorClass">{{ icon }}</div>
      <div class="stat-info">
        <h3>{{ value }}</h3>
        <p>{{ label }}</p>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input() icon = '';
  @Input() value: string | number = '—';
  @Input() label = '';
  @Input() colorClass = 'blue';
}
