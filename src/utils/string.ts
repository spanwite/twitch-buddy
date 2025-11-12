import type { SQLQueryBindings } from 'bun:sqlite';
import { list } from './array.ts';

export function buildSqlWhereClause(where: Record<string, any>): [string, any[]] {
	const params = [];
	const conditions = [];
	for (const [key, value] of Object.entries(where)) {
		if (typeof value === 'object' && value !== null && value.not !== undefined) {
			params.push(value.not);
			conditions.push(`${key} != ?`);
		} else {
			params.push(value);
			conditions.push(`${key} = ?`);
		}
	}
	return [`WHERE ${conditions.join(' AND ')}`, params];
}

export function buildSql(...sqls: any[]): string {
	return sqls.filter(Boolean).join(' ');
}

export function buildSqlParams(
	...params: (SQLQueryBindings | object | undefined | SQLQueryBindings[])[]
): SQLQueryBindings[] {
	const result = [];
	for (const param of params) {
		if (param === undefined) continue;
		else if (Array.isArray(param)) result.push(...param);
		else if (typeof param === 'object' && param !== null) result.push(...Object.values(param));
		else result.push(param);
	}
	return result;
}

export function buildReturningClause(returning?: Record<string, boolean>): string {
	return `RETURNING ${returning ? Object.keys(returning).join(', ') : '*'}`;
}

export function buildSelectClause(select?: Record<string, boolean>): string {
	return `SELECT ${select ? Object.keys(select).join(', ') : '*'}`;
}

export function buildDistinctClause(distinct: string | string[]): string {
	return `SELECT DISTINCT ${distinct ? list(distinct).join(', ') : '*'}`;
}

export function twitchUserUrl(login: string) {
	return `https://twitch.tv/${login}`;
}

export function markdownLink(text: string, link: string) {
	return `[${text}](${link})`;
}
