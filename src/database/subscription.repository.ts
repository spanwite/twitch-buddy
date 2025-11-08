import type Database from 'bun:sqlite';
import { buildWhereQuery } from './database.helpers.ts';

export interface SubscriptionSchema {
	id: number;
	userId: string;
	streamerId: string;
	lastNotifiedStreamId: string;
	lastNotifiedStreamStatus: string;
}

export interface SubscriptionDto {
	userId: string;
	streamerId: string;
	lastNotifiedStreamId?: string;
	lastNotifiedStreamStatus?: string;
}

interface SubscriptionQuery {
	where?: Partial<SubscriptionSchema>;
}

export class SubscriptionRepository {
	protected readonly database: Database;
	protected readonly tableName = 'subscriptions';

	constructor(deps: { database: Database }) {
		this.database = deps.database;
		this.init();
	}

	protected init() {
		this.database.run(
			`CREATE TABLE IF NOT EXISTS ${this.tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL, streamerId TEXT NOT NULL, lastNotifiedStreamId TEXT DEFAULT '', lastNotifiedStreamStatus TEXT DEFAULT '');`,
		);
	}

	create({
		userId,
		streamerId,
		lastNotifiedStreamId,
		lastNotifiedStreamStatus,
	}: SubscriptionDto) {
		this.database
			.prepare(
				`INSERT INTO ${this.tableName} (userId, streamerId, lastNotifiedStreamId, lastNotifiedStreamStatus) VALUES (?, ?, ?, ?)`,
			)
			.run(userId, streamerId, lastNotifiedStreamId ?? '', lastNotifiedStreamStatus ?? '');
	}

	findFirst(args?: SubscriptionQuery): SubscriptionSchema | null {
		const [whereQuery, whereParams] = buildWhereQuery(args?.where);
		const query = `SELECT * FROM ${this.tableName}${whereQuery}`;
		return this.database
			.query<SubscriptionSchema, (string | number)[]>(query)
			.get(...whereParams);
	}

	findMany(args?: SubscriptionQuery): SubscriptionSchema[] {
		const [whereQuery, whereParams] = buildWhereQuery(args?.where);
		const query = `SELECT * FROM ${this.tableName}${whereQuery}`;
		return this.database
			.query<SubscriptionSchema, (string | number)[]>(query)
			.all(...whereParams);
	}
}
