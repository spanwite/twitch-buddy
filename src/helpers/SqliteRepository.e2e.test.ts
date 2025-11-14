import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { faker } from '@faker-js/faker';
import { pickRandom } from '../utils/array.ts';
import { SqliteRepository } from './SqliteRepository.ts';

interface TestEntity {
	id: number;
	name: string;
	isAdult: number;
}

describe('SqliteRepository', () => {
	let database: Database;
	let repo: SqliteRepository<TestEntity>;

	const generateEntity = (): TestEntity => ({
		id: faker.number.int({ min: 1 }),
		name: faker.person.firstName(),
		isAdult: faker.number.int({ min: 0, max: 1 }),
	});

	beforeEach(() => {
		database = new Database(':memory:');
		repo = new SqliteRepository(
			{
				tableName: 'test',
				constraints: {
					id: 'INTEGER PRIMARY KEY',
					name: 'TEXT',
					isAdult: 'BOOLEAN',
				},
			},
			database,
		);
	});

	afterEach(() => {
		database.close();
	});

	it('creates a table', () => {
		const table = database
			.prepare(
				`SELECT name FROM sqlite_master WHERE type = "table" AND name = "${repo.tableName}"`,
			)
			.get() as { name: string };
		expect(table.name).toBe('test');
	});

	describe('create', () => {
		it('inserts new records to a table', () => {
			const entity = generateEntity();
			repo.create({
				data: entity,
			});
			const found = database
				.prepare(`select * from ${repo.tableName} where id = ${entity.id}`)
				.get();
			expect(found).toEqual(entity);
		});

		it('returns only selected fields', () => {
			const entity = generateEntity();
			const result = repo.create({ data: entity, select: { name: true } });
			expect(result).toEqual({ name: entity.name });
		});

		it('returns all fields if select is not provided', () => {
			const entity = generateEntity();
			const result = repo.create({ data: entity });
			expect(result).toEqual(entity);
		});
	});

	describe('createMany', () => {
		it('inserts several records to a table', () => {
			const data = Array.from(
				{
					length: faker.number.int({ min: 1, max: 20 }),
				},
				generateEntity,
			);
			repo.createMany({ data });
			const found = database.query(`SELECT * FROM ${repo.tableName}`).all();
			expect(found).toEqual(expect.arrayContaining(data));
		});

		it('returns array of selected fields only', () => {
			const data = Array.from(
				{
					length: faker.number.int({ min: 1, max: 20 }),
				},
				generateEntity,
			);
			const onlyNames = data.map(({ name }) => ({ name }));
			const result = repo.createMany({ data, select: { name: true } });
			expect(result).toEqual(expect.arrayContaining(onlyNames));
		});

		it('returns array of all fields if select in not provided', () => {
			const data = Array.from(
				{
					length: faker.number.int({ min: 1, max: 20 }),
				},
				generateEntity,
			);
			const result = repo.createMany({ data });
			expect(result).toEqual(expect.arrayContaining(data));
		});
	});

	describe('findFirst', () => {
		const firstEntity = generateEntity();
		const secondEntity = generateEntity();

		beforeEach(() => {
			repo.create({ data: firstEntity });
			repo.create({ data: secondEntity });
		});

		it('returns first matching entity', () => {
			const found = repo.findFirst({
				where: { id: firstEntity.id },
			});
			expect(found).toEqual(firstEntity);
		});

		it('returns null if no entity matches', () => {
			const found = repo.findFirst({ where: { id: 0 } });
			expect(found).toBeNull();
		});

		it('returns all fields if select is not provided', () => {
			const found = repo.findFirst({ where: { id: firstEntity.id } });
			expect(found).toEqual(firstEntity);
		});

		it('returns only selected fields', () => {
			const found = repo.findFirst({
				where: { id: secondEntity.id },
				select: { name: true },
			});
			expect(found).toEqual({ name: secondEntity.name });
		});
	});

	describe('update', () => {
		const firstEntity = generateEntity();
		const secondEntity = generateEntity();

		beforeEach(() => {
			repo.create({ data: firstEntity });
			repo.create({ data: secondEntity });
		});

		it('updates an existing entity', () => {
			const data = { name: faker.person.firstName() };
			const result = repo.update({
				data: data,
				where: { id: firstEntity.id },
			});
			const fetched = database
				.prepare(`SELECT * FROM ${repo.tableName} WHERE id = ${firstEntity.id}`)
				.get();
			expect(result).toEqual({ ...firstEntity, name: data.name });
			expect(fetched).toEqual({ ...firstEntity, name: data.name });
		});

		it('returns null if entity does not exist', () => {
			const result = repo.update({
				data: { name: faker.person.firstName() },
				where: { id: 0 },
			});
			expect(result).toBeNull();
		});
	});

	describe('updateMany', () => {
		const data = Array.from({ length: faker.number.int({ min: 1, max: 50 }) }, generateEntity);

		beforeEach(() => {
			repo.createMany({ data });
		});

		it('updates several records by where clause and returns them', () => {
			const results = repo.updateMany({
				data: { isAdult: 1 },
				where: { isAdult: { not: 1 } },
			});
			const expected = data.map((item) =>
				item.isAdult === 1 ? item : { ...item, isAdult: 1 },
			);
			const filtered = data
				.filter((item) => item.isAdult === 0)
				.map((item) => ({ ...item, isAdult: 1 }));
			const found = repo.findMany();
			expect(found).toEqual(expect.arrayContaining(expected));
			expect(results).toEqual(expect.arrayContaining(filtered));
		});
	});

	describe('findMany', () => {
		const data = Array.from({ length: faker.number.int({ min: 1, max: 50 }) }, generateEntity);

		beforeEach(() => {
			repo.createMany({ data });
		});

		it('returns all records by default', () => {
			const results = repo.findMany();
			expect(results).toEqual(expect.arrayContaining(data));
		});

		it('handles where clause', () => {
			const results = repo.findMany({ where: { isAdult: 1 } });
			const filteredData = data.filter((item) => item.isAdult === 1);
			expect(results).toEqual(expect.arrayContaining(filteredData));
		});

		it('handles select clause', () => {
			const results = repo.findMany({ select: { name: true } });
			const onlyNames = data.map(({ name }) => ({ name }));
			expect(results).toEqual(expect.arrayContaining(onlyNames));
		});

		it('handles distinct clause', () => {
			const results = repo.findMany({ distinct: 'isAdult' });
			const uniqueIsAdult = Array.from(
				new Map(data.map(({ isAdult }) => [isAdult, { isAdult }])).values(),
			);
			expect(results).toEqual(expect.arrayContaining(uniqueIsAdult));
		});
	});

	describe('delete', () => {
		const data = Array.from({ length: faker.number.int({ min: 1, max: 20 }) }, generateEntity);

		beforeEach(() => {
			repo.createMany({ data });
		});

		it('removes and returns one record', () => {
			const randomItem = pickRandom(data)!;
			const withoutDeletedItem = data.filter((item) => item.id !== randomItem.id);

			const result = repo.delete({ where: randomItem });
			const found = repo.findMany();

			expect(result).toEqual(randomItem);
			expect(found).toEqual(expect.arrayContaining(withoutDeletedItem));
		});

		it('returns null if record not found', () => {
			const result = repo.delete({ where: { id: 0 } });
			expect(result).toBeNull();
		});
	});
});
