import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { KafkaMonitorComponent } from './kafka-monitor';
import { KafkaAdminDataService } from '../kafka-admin-data.service';
import { KafkaConsumerGroupDetail, KafkaTopicDetail } from '../models/kafka-admin.model';

describe('KafkaMonitorComponent (EP6 Supervision)', () => {
  const topicDetail: KafkaTopicDetail = {
    name: 'productions.events',
    partitionsCount: 3,
    replicationFactor: 3,
    partitions: [
      { partition: 0, leader: 1, replicas: [1, 2, 3], isr: [1, 2, 3] },
      { partition: 1, leader: 2, replicas: [2, 3, 1], isr: [2, 3, 1] },
      { partition: 2, leader: 3, replicas: [3, 1, 2], isr: [3, 1, 2] },
    ],
    configs: {
      'cleanup.policy': 'delete',
      'min.insync.replicas': '2',
    },
  };

  const groupDetail: KafkaConsumerGroupDetail = {
    groupId: 'report-group',
    state: 'STABLE',
    partitionAssignor: 'range',
    coordinatorId: 2,
    members: [
      { memberId: 'm1', clientId: 'report-client', host: '/10.0.0.2', assignedPartitions: ['productions.events-0'] },
    ],
    totalLag: 4,
    partitionOffsets: [
      { topic: 'productions.events', partition: 0, currentOffset: 10, endOffset: 14, lag: 4 },
    ],
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Kafka topics, partition replicas/ISR and consumer group lag', async () => {
    const kafkaAdminMock = {
      isAvailable: true,
      getTopics: vi.fn(() => of([
        { name: 'productions.events', internal: false, partitionsCount: 3 },
        { name: 'audit.timeline', internal: false, partitionsCount: 3 },
        { name: '__consumer_offsets', internal: true, partitionsCount: 50 },
      ])),
      getTopicDetail: vi.fn(() => of(topicDetail)),
      getConsumerGroups: vi.fn(() => of([
        { groupId: 'report-group', state: 'STABLE', simpleConsumerGroup: false },
        { groupId: 'audit-timeline-group', state: 'DEAD', simpleConsumerGroup: false },
      ])),
      getConsumerGroupDetail: vi.fn(() => of(groupDetail)),
    };

    await TestBed.configureTestingModule({
      imports: [KafkaMonitorComponent],
      providers: [{ provide: KafkaAdminDataService, useValue: kafkaAdminMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(KafkaMonitorComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('productions.events');
    expect(text).toContain('audit.timeline');
    expect(text).not.toContain('__consumer_offsets');
    expect(text).toContain('min.insync.replicas: 2');
    expect(text).toContain('report-group');
    expect(text).toContain('Lag total: 4');
    expect(text).toContain('14');
  });

  it('polls Kafka telemetry automatically every 30s', async () => {
    vi.useFakeTimers();
    const kafkaAdminMock = {
      isAvailable: true,
      getTopics: vi.fn(() => of([{ name: 'productions.events', internal: false, partitionsCount: 3 }])),
      getTopicDetail: vi.fn(() => of(topicDetail)),
      getConsumerGroups: vi.fn(() => of([{ groupId: 'report-group', state: 'STABLE', simpleConsumerGroup: false }])),
      getConsumerGroupDetail: vi.fn(() => of(groupDetail)),
    };

    await TestBed.configureTestingModule({
      imports: [KafkaMonitorComponent],
      providers: [{ provide: KafkaAdminDataService, useValue: kafkaAdminMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(KafkaMonitorComponent);
    fixture.detectChanges();

    expect(kafkaAdminMock.getTopics).toHaveBeenCalledTimes(1);
    expect(kafkaAdminMock.getConsumerGroupDetail).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    fixture.detectChanges();

    expect(kafkaAdminMock.getTopics).toHaveBeenCalledTimes(2);
    expect(kafkaAdminMock.getConsumerGroupDetail).toHaveBeenCalledTimes(2);
  });

  it('UI/UX-08: distinguishes real lag 0 vs unknown uncommitted offsets, detects degraded ISR, and supports selectors', async () => {
    const degradedTopic: KafkaTopicDetail = {
      name: 'productions.events.report.DLT',
      partitionsCount: 1,
      replicationFactor: 3,
      partitions: [{ partition: 0, leader: 1, replicas: [1, 2, 3], isr: [1, 2] }],
      configs: { 'cleanup.policy': 'delete', 'min.insync.replicas': '2' },
    };
    const uncommittedGroup: KafkaConsumerGroupDetail = {
      groupId: 'audit-group-audit-retry',
      state: 'STABLE',
      partitionAssignor: 'range',
      coordinatorId: 1,
      members: [{ memberId: 'm2', clientId: 'retry-client', host: '/10.0.0.5', assignedPartitions: ['productions.events-0'] }],
      totalLag: null as unknown as number,
      partitionOffsets: [],
    };
    const kafkaAdminMock = {
      isAvailable: true,
      getTopics: vi.fn(() => of([
        { name: 'productions.events', internal: false, partitionsCount: 3 },
        { name: 'productions.events.report.DLT', internal: false, partitionsCount: 1 },
      ])),
      getTopicDetail: vi.fn((name: string) => of(name === 'productions.events.report.DLT' ? degradedTopic : topicDetail)),
      getConsumerGroups: vi.fn(() => of([
        { groupId: 'report-group', state: 'STABLE', simpleConsumerGroup: false },
        { groupId: 'audit-group-audit-retry', state: 'STABLE', simpleConsumerGroup: false },
      ])),
      getConsumerGroupDetail: vi.fn((id: string) => of(id === 'audit-group-audit-retry' ? uncommittedGroup : groupDetail)),
    };

    await TestBed.configureTestingModule({
      imports: [KafkaMonitorComponent],
      providers: [{ provide: KafkaAdminDataService, useValue: kafkaAdminMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(KafkaMonitorComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sincronización automática · 30 s');
    expect(el.textContent).toContain('Topología configurada: 3 Brokers · ZooKeeper');
    expect(el.textContent).not.toContain('Streaming · 30s');

    // Switch topic to degraded DLT via corporate selector
    el.querySelector<HTMLButtonElement>('#kafka-topic-selector')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('button[data-kafka-option="productions.events.report.DLT"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('Degradado');
    expect(el.textContent).toContain('0/1 particiones sincronizadas');

    // Switch group to uncommitted offsets group: must NOT fabricate 0 or Al día
    el.querySelector<HTMLButtonElement>('#kafka-group-selector')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('button[data-kafka-option="audit-group-audit-retry"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('No disponible');
    expect(el.textContent).toContain('Sin offset');
    expect(el.textContent).toContain('Sin lectura');
  });
});
