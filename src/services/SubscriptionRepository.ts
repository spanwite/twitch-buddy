import type Database from 'bun:sqlite';
import { list } from '../utils/array.ts';
import { buildWhereQuery } from '../utils/string.ts';
import type { OptionalFields } from '../utils/types.ts';

export interface SubscriptionSchema {
	userId: string;
	streamerId: string;
	streamerLogin: string;
	lastNotifiedStreamId: string;
	lastNotifiedStreamStatus: string;
}

type SubscriptionCreate = OptionalFields<
	SubscriptionSchema,
	'lastNotifiedStreamId' | 'lastNotifiedStreamStatus'
>;

interface SubscriptionQuery {
	where?: Partial<SubscriptionSchema>;
	distinct?: (keyof SubscriptionSchema)[] | keyof SubscriptionSchema;
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
				streamerLogin TEXT NOT NULL,
				lastNotifiedStreamId TEXT DEFAULT '',
				lastNotifiedStreamStatus TEXT DEFAULT '',
				PRIMARY KEY(userId, streamerId)
			);`,
		);
	}

	create({
		userId,
		streamerId,
		streamerLogin,
		lastNotifiedStreamId,
		lastNotifiedStreamStatus,
	}: SubscriptionCreate) {
		return this.database
			.prepare(
				`INSERT INTO ${this.tableName} (userId, streamerId, streamerLogin, lastNotifiedStreamId, lastNotifiedStreamStatus) VALUES (?, ?, ?, ?, ?)`,
			)
			.run(
				userId,
				streamerId,
				streamerLogin,
				lastNotifiedStreamId ?? '',
				lastNotifiedStreamStatus ?? '',
			);
	}

	delete(args?: SubscriptionQuery): SubscriptionSchema | null {
		const [whereQuery, whereParams] = buildWhereQuery(args?.where);
		return this.database
			.prepare<SubscriptionSchema, (string | number)[]>(
				`DELETE FROM ${this.tableName} ${whereQuery} RETURNING *`,
			)
			.get(...whereParams);
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
