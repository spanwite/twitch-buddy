import { describe, expect, it } from 'bun:test';
import { generateCreateTableQuery, generateTableSchema } from './SqliteRepository.ts';

describe('generateTableSchema', () => {
	it('generates schema string from constraints', () => {
		const constraints = {
			id: 'INTEGER PRIMARY KEY',
			name: 'TEXT',
			age: 'INTEGER',
		};
		const result = generateTableSchema(constraints);
		expect(result).toBe('id INTEGER PRIMARY KEY, name TEXT, age INTEGER');
	});

	it('includes modifiers when provided as string', () => {
		const constraints = { id: 'INTEGER' };
		const result = generateTableSchema(constraints, ['PRIMARY KEY (id)']);
		expect(result).toBe('id INTEGER, PRIMARY KEY (id)');
	});

	it('includes modifiers when provided as array', () => {
		const constraints = { id: 'INTEGER' };
		const result = generateTableSchema(constraints, ['UNIQUE', 'WITHOUT ROWID']);
		expect(result).toBe('id INTEGER, UNIQUE, WITHOUT ROWID');
	});

	it('throws error if constraints is an empty object', () => {
		expect(() => generateTableSchema({})).toThrow(Error);
	});
});

describe('generateCreateTableQuery', () => {
	it('generates corrent CREATE TABLE query', () => {
		const result = generateCreateTableQuery(
			'users',
			'id INTEGER PRIMARY KEY, name TEXT, age INTEGER',
		);
		expect(result).toBe(
			'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);',
		);
	});

	it('throws error if tableName or schema is an empty string', () => {
		expect(() => generateCreateTableQuery('users', '')).toThrow(Error);
		expect(() => generateCreateTableQuery('', 'id INTEGER')).toThrow(Error);
		expect(() => generateCreateTableQuery('', '')).toThrow(Error);
	});
});
