import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api.config';

export interface ClassificationResult {
  clase: string;
  confianza: string;
}

@Injectable({ providedIn: 'root' })
export class ClassifierService {
  constructor(private http: HttpClient) {}

  async classify(file: File): Promise<ClassificationResult> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<ClassificationResult>(`${API_URL}/predict`, formData));
  }
}
