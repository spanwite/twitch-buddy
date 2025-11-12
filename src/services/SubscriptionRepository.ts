import type Database from 'bun:sqlite';
import type { SQLQueryBindings } from 'bun:sqlite';
import {
	buildDistinctClause,
	buildReturningClause,
	buildSelectClause,
	buildSql,
	buildSqlParams,
	buildSqlWhereClause,
} from '../utils/string.ts';
import type { OptionalFields, PickByValue } from '../utils/types.ts';

interface Subscription {
	userId: string;
	streamerId: string;
	streamerLogin: string;
	lastNotifiedStreamId: string;
	lastNotifiedStreamStatus: string;
}

type SubscriptionCreate = OptionalFields<
	Subscription,
	'lastNotifiedStreamId' | 'lastNotifiedStreamStatus'
>;

interface SubscriptionArgs {
	data: Partial<Subscription>;
	where?: {
		[Key in keyof Subscription]?: Subscription[Key] | { not: Subscription[Key] };
	};
	distinct?: (keyof Subscription)[] | keyof Subscription;
	select?: Partial<Record<keyof Subscription, boolean>>;
}

type SubscriptionUpdateManyArgs = Pick<SubscriptionArgs, 'data' | 'where' | 'select'>;
type SubscriptionFindManyArgs = Pick<SubscriptionArgs, 'where' | 'distinct' | 'select'>;
type SubscriptionFindFirstArgs = Pick<SubscriptionArgs, 'where'>;
type SubscriptionDeleteArgs = Pick<SubscriptionArgs, 'where' | 'select'>;

type SubscriptionReturn<
	Args extends Pick<SubscriptionArgs, 'distinct' | 'select'>,
	Distinct = Args['distinct'],
> = Distinct extends keyof Subscription
	? Record<Distinct, Subscription[Distinct]>
	: Distinct extends (keyof Subscription)[]
		? Pick<Subscription, Extract<Distinct[number], keyof Subscription>>
		: Args extends Pick<SubscriptionArgs, 'select'>
			? Pick<Subscription, keyof PickByValue<Args['select'], true>>
			: Subscription;

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

	update<Args extends SubscriptionUpdateManyArgs, Return = SubscriptionReturn<Args>>({
		data,
		where,
		select,
	}: Args): Return | null {
		const [whereSql, whereParams] = where ? buildSqlWhereClause(where) : ['', []];
		const sql = buildSql(
			'UPDATE',
			this.tableName,
			'SET',
			Object.keys(data).map((key) => `${key} = ?`),
			whereSql,
			buildReturningClause(select),
		);
		const params = buildSqlParams(data, whereParams);
		return this.database.prepare<Return, SQLQueryBindings[]>(sql).get(...params);
	}

	updateMany<Args extends SubscriptionUpdateManyArgs, Return = SubscriptionReturn<Args>>({
		data,
		where,
		select,
	}: Args): Return[] {
		const [whereSql, whereParams] = where ? buildSqlWhereClause(where) : ['', []];
		const sql = buildSql(
			'UPDATE',
			this.tableName,
			'SET',
			Object.keys(data).map((key) => `${key} = ?`),
			whereSql,
			buildReturningClause(select),
		);
		const params = buildSqlParams(data, whereParams);
		return this.database.prepare<Return, SQLQueryBindings[]>(sql).all(...params);
	}

	delete<Args extends SubscriptionDeleteArgs, Return = SubscriptionReturn<Args>>(
		{ where, select }: Args = <Args>{},
	): Return | null {
		const [whereSql, whereParams] = where ? buildSqlWhereClause(where) : ['', []];
		const sql = buildSql('DELETE FROM', this.tableName, whereSql, buildReturningClause(select));
		const params = buildSqlParams(whereParams);
		return this.database.prepare<Return, SQLQueryBindings[]>(sql).get(...params);
	}

	findFirst<Args extends SubscriptionFindFirstArgs>(
		{ where }: Args = <Args>{},
	): Subscription | null {
		const [whereSql, whereParams] = where ? buildSqlWhereClause(where) : ['', []];
		const query = buildSql('SELECT * FROM', this.tableName, whereSql);
		const params = buildSqlParams(whereParams);
		return this.database.query<Subscription, SQLQueryBindings[]>(query).get(...params);
	}

	findMany<Args extends SubscriptionFindManyArgs, Return = SubscriptionReturn<Args>>(
		{ where, distinct, select }: Args = <Args>{},
	): Return[] {
		const [whereSql, whereParams] = where ? buildSqlWhereClause(where) : ['', []];
		const query = buildSql(
			[distinct && buildDistinctClause(distinct), buildSelectClause(select)].find(Boolean),
			'FROM',
			this.tableName,
			whereSql,
		);
		const params = buildSqlParams(whereParams);
		return this.database.query<Return, SQLQueryBindings[]>(query).all(...params);
	}
}
