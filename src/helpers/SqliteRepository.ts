import type Database from 'bun:sqlite';
import { list } from '../utils/array.ts';
import type { PickByValue } from '../utils/types.ts';

type SQLQueryBindings = string | bigint | number | boolean | null;

type WhereArg<Entity> = {
	[Key in keyof Entity]?: Entity[Key] | { not: Entity[Key] };
};
type SelectArg<Entity> = Partial<Record<keyof Entity, true>>;
type DistinctArg<Entity> = (keyof Entity)[] | keyof Entity;

interface QueryArgs<Entity extends Record<string, any>> {
	where?: WhereArg<Entity>;
	select?: SelectArg<Entity>;
	distinct?: DistinctArg<Entity>;
}
type ReturnSchema<
	Entity extends Record<string, any>,
	Args extends { select?: SelectArg<Entity>; distinct?: DistinctArg<Entity> },
> = Args['distinct'] extends keyof Entity
	? Pick<Entity, Args['distinct']>
	: Args['distinct'] extends (keyof Entity)[]
		? Pick<Entity, Extract<Args['distinct'][number], keyof Entity>>
		: Args['select'] extends SelectArg<Entity>
			? Pick<Entity, keyof PickByValue<Args['select'], true>>
			: Entity;

export class SqliteRepository<Entity extends Record<string, any>> {
	public readonly tableName: string;
	protected readonly database: Database;
	protected readonly constraints: Record<keyof Entity, string>;
	protected readonly modifiers: string | string[] | undefined;

	constructor(
		opts: {
			tableName: string;
			constraints: Record<keyof Entity, string>;
			modifiers?: string | string[];
		},
		database: Database,
	) {
		this.tableName = opts.tableName;
		this.constraints = opts.constraints;
		this.modifiers = opts.modifiers;

		this.database = database;

		this.createTable();
	}

	protected createTable(): void {
		const schema = generateTableSchema(this.constraints, this.modifiers);
		const query = generateCreateTableQuery(this.tableName, schema);
		this.database.run(query);
	}

	createMany<
		Args extends Pick<QueryArgs<Entity>, 'select'> & { data: Entity[] },
		Return = ReturnSchema<Entity, Args>,
	>({ data, select }: Args): Return[] {
		if (data.length === 0) return [];
		const dataKeys = Object.keys(data[0]!);
		const keysSchema = `(${dataKeys.join(', ')})`;
		const valuesSchema = data
			.map(() => `(${Array(dataKeys.length).fill('?').join(', ')})`)
			.join(', ');
		const returningSchema = generateReturningClause(select);
		const values = data.flatMap((item) => Object.values(item));

		const query = `INSERT INTO ${this.tableName} ${keysSchema} VALUES ${valuesSchema} ${returningSchema}`;

		return this.database.prepare<Return, SQLQueryBindings[]>(query).all(...values);
	}

	create<
		Args extends Pick<QueryArgs<Entity>, 'select'> & { data: Entity },
		Return = ReturnSchema<Entity, Args>,
	>({ data, select }: Args): Return | null {
		const keysSchema = Object.keys(data).join(', ');
		const valuesSchema = Array(Object.keys(data).length).fill('?').join(', ');
		const returningSchema = generateReturningClause(select);

		const query = `INSERT INTO ${this.tableName} (${keysSchema}) VALUES (${valuesSchema}) ${returningSchema}`;

		return this.database.prepare<Return, SQLQueryBindings[]>(query).get(...Object.values(data));
	}

	findMany<
		Args extends Pick<QueryArgs<Entity>, 'where' | 'select' | 'distinct'>,
		Return = ReturnSchema<Entity, Args>,
	>({ where, select, distinct }: Args = <Args>{}): Return[] {
		const [whereQuery, whereParams] = generateWhereClause(where);
		let selectSchema = '*';
		if (distinct) {
			selectSchema = `DISTINCT ${list(distinct).join(', ')}`;
		} else if (select) {
			selectSchema = Object.keys(select).join(', ');
		}

		const query = `SELECT ${selectSchema} FROM ${this.tableName} ${whereQuery}`;

		return this.database.query<Return, SQLQueryBindings[]>(query).all(...whereParams);
	}

	findFirst<
		Args extends Pick<QueryArgs<Entity>, 'where' | 'select'>,
		Return = ReturnSchema<Entity, Args>,
	>({ where, select }: Args = {} as Args): Return | null {
		const [whereQuery, whereParams] = where ? generateWhereClause(where) : ['', []];
		const selectSchema = select ? Object.keys(select).join(', ') : '*';

		const query = `SELECT ${selectSchema} FROM ${this.tableName} ${whereQuery}`;

		return this.database.query<Return, SQLQueryBindings[]>(query).get(...whereParams);
	}

	update<
		Args extends Pick<QueryArgs<Entity>, 'where' | 'select'> & {
			data: Partial<Entity>;
		},
		Return = ReturnSchema<Entity, Args>,
	>({ data, select, where }: Args): Return | null {
		const [whereQuery, whereParams] = generateWhereClause(where);
		const returningClause = generateReturningClause(select);
		const valuesSchema = Object.keys(data)
			.map((key) => `${key} = ?`)
			.join(', ');

		const query = `UPDATE ${this.tableName} SET ${valuesSchema} ${whereQuery} ${returningClause}`;

		return this.database
			.prepare<Return, SQLQueryBindings[]>(query)
			.get(...Object.values(data), ...whereParams);
	}

	updateMany<
		Args extends Pick<QueryArgs<Entity>, 'where' | 'select'> & {
			data: Partial<Entity>;
		},
		Return = ReturnSchema<Entity, Args>,
	>({ data, select, where }: Args): Return[] {
		const [whereQuery, whereParams] = generateWhereClause(where);
		const returningClause = generateReturningClause(select);
		const valuesSchema = Object.keys(data)
			.map((key) => `${key} = ?`)
			.join(', ');

		const query = `UPDATE ${this.tableName} SET ${valuesSchema} ${whereQuery} ${returningClause}`;

		return this.database
			.prepare<Return, SQLQueryBindings[]>(query)
			.all(...Object.values(data), ...whereParams);
	}

	delete<
		Args extends Pick<QueryArgs<Entity>, 'where' | 'select'>,
		Return = ReturnSchema<Entity, Args>,
	>({ where, select }: Args): Return | null {
		const [whereQuery, whereParams] = generateWhereClause(where);
		const returningClause = generateReturningClause(select);

		const query = `DELETE FROM ${this.tableName} ${whereQuery} ${returningClause}`;

		return this.database.prepare<Return, SQLQueryBindings[]>(query).get(...whereParams);
	}
}

export function generateReturningClause(
	returning?: Record<string, true | undefined>,
	defaultValue = '*',
): string {
	const schema = returning ? Object.keys(returning).join(', ') : defaultValue;
	return `RETURNING ${schema}`;
}

export function generateWhereClause(
	where: Record<string, SQLQueryBindings | { not: SQLQueryBindings } | undefined> | undefined,
): [string, SQLQueryBindings[]] {
	if (where === undefined) {
		return ['', []];
	}
	const params = [];
	const conditions = [];
	for (const [key, value] of Object.entries(where)) {
		if (typeof value === 'object' && value !== null && 'not' in value) {
			params.push(value.not);
			conditions.push(`${key} != ?`);
		} else if (value !== undefined) {
			params.push(value);
			conditions.push(`${key} = ?`);
		}
	}
	if (conditions.length === 0) {
		return ['', []];
	}
	return [`WHERE ${conditions.join(' AND ')}`, params];
}

export function generateCreateTableQuery(tableName: string, schema: string): string {
	if (!tableName || !schema) {
		throw new Error('tableName and schema must not be empty');
	}
	return `CREATE TABLE IF NOT EXISTS ${tableName} (${schema});`;
}

export function generateTableSchema(
	constraints: Record<string, string>,
	modifiers?: string | string[] | undefined,
): string {
	if (Object.keys(constraints).length === 0) {
		throw new Error('at least one constraint must be provided to create table');
	}
	return Object.entries(constraints)
		.map((c) => c.join(' '))
		.concat(modifiers ?? [])
		.join(', ');
}
