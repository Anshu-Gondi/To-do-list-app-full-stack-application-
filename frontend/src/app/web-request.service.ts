import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebRequestService {
  readonly ROOT_URL = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  get<T>(url: string, headers?: { [key: string]: string }): Observable<T> {
    return this.http.get<T>(`${this.ROOT_URL}/${url}`, { headers });
  }

  post<T>(url: string, payload: object = {}, headers?: { [key: string]: string }): Observable<T> {
    return this.http.post<T>(`${this.ROOT_URL}/${url}`, payload, { headers });
  }

  patch<T>(url: string, payload: object = {}, headers?: { [key: string]: string }): Observable<T> {
    return this.http.patch<T>(`${this.ROOT_URL}/${url}`, payload, { headers });
  }

  delete(url: string, headers?: { [key: string]: string }): Observable<void> {
    return this.http.delete<void>(`${this.ROOT_URL}/${url}`, { headers });
  }
}
