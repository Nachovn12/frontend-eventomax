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
});
