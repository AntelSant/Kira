import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiBase = environment.apiBase;
  private readonly server1Url = environment.server1Url;

  constructor(private http: HttpClient) {}

  // ── Server 3 (Database) ───────────────────────────────
  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) httpParams = httpParams.set(key, value);
      });
    }
    return this.http.get<T>(`${this.apiBase}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiBase}${path}`, body);
  }

  postFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.apiBase}${path}`, formData);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.apiBase}${path}`);
  }

  // ── Server 1 (Face Recognition) ───────────────────────
  postServer1<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.server1Url}${path}`, body);
  }
}
