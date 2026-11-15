import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';
import {
  KafkaConsumerGroupDetail,
  KafkaConsumerGroupSummary,
  KafkaTopicDetail,
  KafkaTopicSummary,
} from './models/kafka-admin.model';

@Injectable({ providedIn: 'root' })
export class KafkaAdminDataService {
  private readonly api = inject(ApiClientService, { optional: true });

  readonly isAvailable = this.api !== null;

  getTopics(): Observable<readonly KafkaTopicSummary[]> {
    if (!this.api) return of([]);
    return this.api.get<readonly KafkaTopicSummary[]>(
      `${environment.apiGatewayUrl}/api/kafka-admin/topics`
    );
  }

  getTopicDetail(name: string): Observable<KafkaTopicDetail> {
    if (!this.api) {
      return of({ name, partitionsCount: 0, replicationFactor: 0, partitions: [], configs: {} });
    }
    return this.api.get<KafkaTopicDetail>(
      `${environment.apiGatewayUrl}/api/kafka-admin/topics/${encodeURIComponent(name)}`
    ).pipe(
      map((res) => ({
        ...res,
        partitions: (res.partitions ?? []).map((p) => ({
          ...p,
          leader: p.leader ?? p.leaderId ?? -1,
        })),
        configs: res.configs ?? {},
      }))
    );
  }

  getConsumerGroups(): Observable<readonly KafkaConsumerGroupSummary[]> {
    if (!this.api) return of([]);
    return this.api.get<readonly KafkaConsumerGroupSummary[]>(
      `${environment.apiGatewayUrl}/api/kafka-admin/consumer-groups`
    );
  }

  getConsumerGroupDetail(groupId: string): Observable<KafkaConsumerGroupDetail> {
    if (!this.api) {
      return of({
        groupId,
        state: 'UNKNOWN',
        partitionAssignor: '',
        coordinatorId: -1,
        members: [],
        totalLag: 0,
        partitionOffsets: [],
      });
    }
    return this.api.get<KafkaConsumerGroupDetail>(
      `${environment.apiGatewayUrl}/api/kafka-admin/consumer-groups/${encodeURIComponent(groupId)}`
    ).pipe(
      map((res) => ({
        ...res,
        members: res.members ?? [],
        totalLag: res.totalLag ?? 0,
        partitionOffsets: res.partitionOffsets ?? [],
      }))
    );
  }
}
