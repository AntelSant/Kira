import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AlertMessage {
  type: 'success' | 'danger' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertSubject = new Subject<AlertMessage>();
  alert$ = this.alertSubject.asObservable();

  success(message: string): void {
    this.alertSubject.next({ type: 'success', message });
  }

  danger(message: string): void {
    this.alertSubject.next({ type: 'danger', message });
  }

  info(message: string): void {
    this.alertSubject.next({ type: 'info', message });
  }
}
