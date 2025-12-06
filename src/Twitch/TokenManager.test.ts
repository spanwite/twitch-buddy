import { beforeEach, describe, expect, it, jest } from 'bun:test';
import { faker } from '@faker-js/faker';
import type { TwitchToken } from './Schemas.ts';
import { TwitchTokenManager } from './TokenManager.ts';

const generateRandomToken = (): TwitchToken => ({
	token: faker.string.alphanumeric({ length: 30 }),
	expiresIn: faker.number.int({ min: 1000, max: 10000 }),
	lastUpdatedAt: Date.now(),
});

describe('TokenManager', () => {
	let tokenManager: TwitchTokenManager;

	beforeEach(() => {
		tokenManager = new TwitchTokenManager({
			config: {
				twitchClientId: faker.string.alphanumeric({ length: 30 }),
				twitchClientSecret: faker.string.alphanumeric({ length: 30 }),
			},
			logger: jest.fn() as any,
			tokenService: jest.fn() as any,
		});
	});

	it('returns the same token on concurrent requests', async () => {
		tokenManager['fetchToken'] = jest.fn().mockImplementation(generateRandomToken);

		const [firstToken, ...restTokens] = await Promise.all([
			tokenManager.getToken(),
			tokenManager.getToken(),
			tokenManager.getToken(),
			tokenManager.getToken(),
		]);

		expect(tokenManager['fetchToken']).toHaveBeenCalledTimes(1);

		for (const token of restTokens) {
			expect(token).toBe(firstToken);
		}
	});

	// it('saves token to file after token updating if setting is provided', async () => {
	// 	const token = generateRandomToken();
	//
	// 	tokenManager['fetchToken'] = jest.fn().mockResolvedValue(token);
	// 	tokenManager['updateToken'] = jest.fn();
	// 	tokenManager['config'].twitchTokenFilePath = faker.system.filePath();
	//
	// 	await tokenManager.getToken();
	//
	// 	expect(tokenManager['updateToken']).toHaveBeenCalledWith(token);
	// });
});
