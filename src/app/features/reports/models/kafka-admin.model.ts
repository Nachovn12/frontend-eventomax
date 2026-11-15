export interface KafkaTopicSummary {
  readonly name: string;
  readonly internal: boolean;
  readonly partitionsCount: number;
}

export interface KafkaPartitionInfo {
  readonly partition: number;
  readonly leader: number;
  readonly leaderId?: number;
  readonly replicas: readonly number[];
  readonly isr: readonly number[];
}

export interface KafkaTopicDetail {
  readonly name: string;
  readonly partitionsCount: number;
  readonly replicationFactor: number;
  readonly partitions: readonly KafkaPartitionInfo[];
  readonly configs: Readonly<Record<string, string>>;
}

export interface KafkaConsumerGroupSummary {
  readonly groupId: string;
  readonly state: string;
  readonly simpleConsumerGroup: boolean;
}

export interface KafkaMemberInfo {
  readonly memberId: string;
  readonly clientId: string;
  readonly host: string;
  readonly assignedPartitions: readonly string[];
}

export interface KafkaPartitionOffset {
  readonly topic: string;
  readonly partition: number;
  readonly currentOffset: number;
  readonly endOffset: number;
  readonly lag: number;
}

export interface KafkaConsumerGroupDetail {
  readonly groupId: string;
  readonly state: string;
  readonly partitionAssignor: string;
  readonly coordinatorId: number;
  readonly members: readonly KafkaMemberInfo[];
  readonly totalLag: number;
  readonly partitionOffsets: readonly KafkaPartitionOffset[];
}
