import type Database from 'bun:sqlite';
import { buildWhereQuery } from '../utils/string.ts';

export interface SubscriptionSchema {
	id: number;
	userId: string;
	streamerId: string;
	lastNotifiedStreamId: string;
	lastNotifiedStreamStatus: string;
}

export interface SubscriptionCreate {
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
		this.createTable();
	}

	protected createTable() {
		// this.database.run(`DROP TABLE ${this.tableName}`);
		this.database.run(
			`CREATE TABLE IF NOT EXISTS ${this.tableName} (
				userId TEXT NOT NULL,
				streamerId TEXT NOT NULL,
				lastNotifiedStreamId TEXT DEFAULT '',
				lastNotifiedStreamStatus TEXT DEFAULT '',
				PRIMARY KEY(userId, streamerId)
			);`,
		);
	}

	create({
		userId,
		streamerId,
		lastNotifiedStreamId,
		lastNotifiedStreamStatus,
	}: SubscriptionCreate) {
		return this.database
			.prepare(
				`INSERT INTO ${this.tableName} (userId, streamerId, lastNotifiedStreamId, lastNotifiedStreamStatus) VALUES (?, ?, ?, ?)`,
			)
			.run(userId, streamerId, lastNotifiedStreamId ?? '', lastNotifiedStreamStatus ?? '');
	}

	delete(args?: SubscriptionQuery) {
		const [whereQuery, whereParams] = buildWhereQuery(args?.where);
		return this.database
			.prepare(`DELETE FROM ${this.tableName} ${whereQuery}`)
			.run(...whereParams);
	}

	findFirst(args?: SubscriptionQuery): SubscriptionSchema | null {
		const [whereQuery, whereParams] = buildWhereQuery(args?.where);
		const query = `SELECT * FROM ${this.tableName} ${whereQuery}`;
		return this.database
			.query<SubscriptionSchema, (string | number)[]>(query)
			.get(...whereParams);
	}

	findMany(args?: SubscriptionQuery): SubscriptionSchema[] {
		const [whereQuery, whereParams] = buildWhereQuery(args?.where);
		const query = `SELECT * FROM ${this.tableName} ${whereQuery}`;
		return this.database
			.query<SubscriptionSchema, (string | number)[]>(query)
			.all(...whereParams);
	}
}
