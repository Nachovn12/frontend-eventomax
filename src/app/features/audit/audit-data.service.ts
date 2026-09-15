import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DEMO_AUDIT } from '../../demo/eventomax.fixtures';

@Injectable({ providedIn: 'root' })
export class AuditDataService {
  getEvents(): Observable<readonly any[]> {
    return of(DEMO_AUDIT);
  }
}
