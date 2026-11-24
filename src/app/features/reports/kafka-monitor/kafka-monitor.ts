import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, combineLatest, forkJoin, of } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import {
  LucideDatabase,
  LucideGauge,
  LucideLayers,
  LucideRefreshCw,
  LucideServer,
  LucideShieldCheck,
  LucideUsers,
} from '@lucide/angular';
import { KafkaAdminDataService } from '../kafka-admin-data.service';
import { withLivePolling } from '../../../core/utils/live-polling';
import { ButtonDirective } from '../../../shared/ui/button.component';
import {
  KafkaEntitySelectorComponent,
  KafkaSelectorOption,
} from './kafka-entity-selector.component';
import {
  KafkaConsumerGroupDetail,
  KafkaConsumerGroupSummary,
  KafkaTopicDetail,
  KafkaTopicSummary,
} from '../models/kafka-admin.model';

interface KafkaClusterViewState {
  readonly topics: readonly KafkaTopicSummary[];
  readonly groups: readonly KafkaConsumerGroupSummary[];
  readonly loading: boolean;
  readonly error: number | null;
}

@Component({
  selector: 'emx-kafka-monitor',
  standalone: true,
  imports: [
    LucideDatabase,
    LucideGauge,
    LucideLayers,
    LucideRefreshCw,
    LucideServer,
    LucideShieldCheck,
    LucideUsers,
    ButtonDirective,
    KafkaEntitySelectorComponent,
  ],
  templateUrl: './kafka-monitor.html',
  styleUrls: ['./kafka-monitor.css', './kafka-monitor-uiux08.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KafkaMonitorComponent {
  private readonly kafkaAdmin = inject(KafkaAdminDataService);
  readonly isAvailable = this.kafkaAdmin.isAvailable;

  private readonly refreshSubject = new BehaviorSubject<void>(undefined);
  readonly selectedTopicName = signal<string | null>('productions.events');
  readonly selectedGroupId = signal<string | null>('report-group');

  private cachedTopics: readonly KafkaTopicSummary[] = [];
  private cachedGroups: readonly KafkaConsumerGroupSummary[] = [];
  private cachedTopicDetail: KafkaTopicDetail | null = null;
  private cachedGroupDetail: KafkaConsumerGroupDetail | null = null;

  private readonly clusterState = toSignal(
    withLivePolling(this.refreshSubject).pipe(
      switchMap((isBackground) => {
        if (!this.isAvailable) {
          return of<KafkaClusterViewState>({ topics: [], groups: [], loading: false, error: null });
        }
        const hasCache = this.cachedTopics.length > 0 || this.cachedGroups.length > 0;
        return forkJoin({
          topics: this.kafkaAdmin.getTopics(),
          groups: this.kafkaAdmin.getConsumerGroups(),
        }).pipe(
          tap(({ topics, groups }) => {
            this.cachedTopics = topics.filter((t) => !t.internal);
            this.cachedGroups = groups;
            const currentTopic = this.selectedTopicName();
            if (!currentTopic || !this.cachedTopics.some((t) => t.name === currentTopic)) {
              const preferred = this.cachedTopics.find((t) => t.name === 'productions.events') ?? this.cachedTopics[0];
              if (preferred) this.selectedTopicName.set(preferred.name);
            }
            const currentGroup = this.selectedGroupId();
            if (!currentGroup || !groups.some((g) => g.groupId === currentGroup)) {
              const preferred = groups.find((g) => g.groupId === 'report-group') ?? groups[0];
              if (preferred) this.selectedGroupId.set(preferred.groupId);
            }
          }),
          map(({ topics, groups }): KafkaClusterViewState => ({
            topics: topics.filter((t) => !t.internal),
            groups,
            loading: false,
            error: null,
          })),
          catchError((err: HttpErrorResponse) =>
            of<KafkaClusterViewState>({
              topics: isBackground ? this.cachedTopics : [],
              groups: isBackground ? this.cachedGroups : [],
              loading: false,
              error: err.status ?? 0,
            })
          ),
          startWith<KafkaClusterViewState>({
            topics: this.cachedTopics,
            groups: this.cachedGroups,
            loading: !(isBackground && hasCache),
            error: null,
          }),
        );
      })
    ),
    { initialValue: { topics: [], groups: [], loading: false, error: null } as KafkaClusterViewState }
  );

  private readonly selectedTopic$ = new BehaviorSubject<string | null>('productions.events');
  private readonly selectedGroup$ = new BehaviorSubject<string | null>('report-group');

  private readonly topicDetailState = toSignal(
    combineLatest([this.selectedTopic$, withLivePolling(this.refreshSubject)]).pipe(
      switchMap(([topicName, isBackground]) => {
        if (!this.isAvailable || !topicName) {
          return of<KafkaTopicDetail | null>(null);
        }
        return this.kafkaAdmin.getTopicDetail(topicName).pipe(
          tap((detail) => { this.cachedTopicDetail = detail; }),
          catchError(() => of(isBackground ? this.cachedTopicDetail : null)),
        );
      })
    ),
    { initialValue: null as KafkaTopicDetail | null }
  );

  private readonly groupDetailState = toSignal(
    combineLatest([this.selectedGroup$, withLivePolling(this.refreshSubject)]).pipe(
      switchMap(([groupId, isBackground]) => {
        if (!this.isAvailable || !groupId) {
          return of<KafkaConsumerGroupDetail | null>(null);
        }
        return this.kafkaAdmin.getConsumerGroupDetail(groupId).pipe(
          tap((detail) => { this.cachedGroupDetail = detail; }),
          catchError(() => of(isBackground ? this.cachedGroupDetail : null)),
        );
      })
    ),
    { initialValue: null as KafkaConsumerGroupDetail | null }
  );

  readonly topics = computed(() => this.clusterState().topics);
  readonly groups = computed(() => this.clusterState().groups);
  readonly isLoading = computed(() => this.clusterState().loading);
  readonly errorCode = computed(() => this.clusterState().error);
  readonly topicDetail = computed(() => this.topicDetailState());
  readonly groupDetail = computed(() => this.groupDetailState());

  readonly totalClusterPartitions = computed(() =>
    this.topics().reduce((sum, t) => sum + (t.partitionsCount || 0), 0)
  );

  readonly stableGroupsCount = computed(() =>
    this.groups().filter((g) => g.state === 'STABLE').length
  );

  readonly topicSelectorOptions = computed<readonly KafkaSelectorOption[]>(() =>
    this.topics().map((t) => ({
      id: t.name,
      label: t.name,
      meta: `${t.partitionsCount}P`,
      stateTone: 'neutral',
    }))
  );

  readonly groupSelectorOptions = computed<readonly KafkaSelectorOption[]>(() =>
    this.groups().map((g) => ({
      id: g.groupId,
      label: g.groupId,
      meta: g.state,
      stateTone: this.resolveGroupStateTone(g.state),
    }))
  );

  readonly healthyPartitionsCount = computed(() => {
    const partitions = this.topicDetail()?.partitions ?? [];
    return partitions.filter((p) => p.replicas.length > 0 && p.isr.length >= p.replicas.length).length;
  });

  readonly hasRealTotalLag = computed(() => {
    const lag = this.groupDetail()?.totalLag;
    return typeof lag === 'number' && Number.isFinite(lag);
  });

  readonly effectivePartitionOffsets = computed(() => {
    const g = this.groupDetail();
    if (!g) return [];
    if (g.partitionOffsets && g.partitionOffsets.length > 0) {
      return g.partitionOffsets.map((po) => ({
        topic: po.topic,
        partition: po.partition,
        currentOffset: typeof po.currentOffset === 'number' && Number.isFinite(po.currentOffset) ? po.currentOffset : null,
        endOffset: typeof po.endOffset === 'number' && Number.isFinite(po.endOffset) ? po.endOffset : null,
        lag: typeof po.lag === 'number' && Number.isFinite(po.lag) ? po.lag : null,
      }));
    }
    // Preserve unknown state when partitions are assigned without committed offsets (never fabricate 0)
    const members = g.members ?? [];
    const rows: {
      topic: string;
      partition: number;
      currentOffset: number | null;
      endOffset: number | null;
      lag: number | null;
    }[] = [];
    for (const m of members) {
      for (const raw of m.assignedPartitions ?? []) {
        const dashIdx = raw.lastIndexOf('-');
        if (dashIdx > 0) {
          const topic = raw.slice(0, dashIdx);
          const partNum = Number(raw.slice(dashIdx + 1));
          if (Number.isFinite(partNum)) {
            rows.push({ topic, partition: partNum, currentOffset: null, endOffset: null, lag: null });
          }
        }
      }
    }
    return rows.sort((a, b) => a.topic.localeCompare(b.topic) || a.partition - b.partition);
  });

  resolveGroupStateTone(state: string | undefined): 'stable' | 'warn' | 'dead' | 'neutral' {
    if (!state) return 'neutral';
    if (state === 'STABLE') return 'stable';
    if (state === 'DEAD' || state === 'EMPTY') return 'dead';
    return 'warn';
  }

  readonly primaryMember = computed(() => {
    const members = this.groupDetail()?.members ?? [];
    return members.length > 0 ? members[0] : null;
  });

  formatHost(host: string | undefined): string {
    if (!host) return '—';
    return host.startsWith('/') ? host.slice(1) : host;
  }

  selectTopic(name: string): void {
    this.selectedTopicName.set(name);
    this.selectedTopic$.next(name);
  }

  selectGroup(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.selectedGroup$.next(groupId);
  }

  refresh(): void {
    this.refreshSubject.next();
  }
}
