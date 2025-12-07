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
		const mockTokenService = jest.fn().mockImplementation(() => ({
			find: jest.fn(),
			renew: jest.fn(),
		}));
		const mockLogger = jest.fn().mockImplementation(() => ({
			info: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		}));
		tokenManager = new TwitchTokenManager({
			config: {
				twitchClientId: faker.string.alphanumeric({ length: 30 }),
				twitchClientSecret: faker.string.alphanumeric({ length: 30 }),
			},
			logger: mockLogger(),
			tokenService: mockTokenService(),
			twitchApi: {} as any,
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
});
