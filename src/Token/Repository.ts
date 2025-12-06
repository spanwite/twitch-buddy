import type { Database } from 'bun:sqlite';
import { SqliteRepository } from '../helpers/SqliteRepository.ts';

export interface Token {
	token: string;
	expiresIn: number;
	lastUpdatedAt: number;
}

export class TokenRepository extends SqliteRepository<Token> {
	constructor(database: Database) {
		super(
			{
				tableName: 'twitch_tokens',
				constraints: {
					token: 'TEXT NOT NULL PRIMARY KEY',
					expiresIn: 'INTEGER NOT NULL',
					lastUpdatedAt: 'INTEGER NOT NULL',
				},
			},
			database,
		);
	}
}
