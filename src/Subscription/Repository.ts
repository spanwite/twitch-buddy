import type { Database } from 'bun:sqlite';
import { SqliteRepository } from '../helpers/SqliteRepository.ts';

export interface Subscription {
	userId: string;
	streamerId: string;
	streamerLogin: string;
	lastNotifiedStreamId: string;
}

export class SubscriptionRepository extends SqliteRepository<Subscription> {
	constructor(database: Database) {
		super(
			{
				tableName: 'subscriptions',
				constraints: {
					userId: 'TEXT NOT NULL',
					streamerId: 'TEXT NOT NULL',
					streamerLogin: 'TEXT NOT NULL',
					lastNotifiedStreamId: 'TEXT',
				},
				modifiers: ['PRIMARY KEY (userId, streamerId)'],
			},
			database,
		);
	}
}
