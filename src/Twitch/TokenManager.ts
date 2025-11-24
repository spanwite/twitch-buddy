import type { AppLogger } from '../types.ts';
import { fetchTwitchToken } from './Api.ts';
import { type TwitchToken, TwitchTokenSchema } from './Schemas.ts';

interface TwitchTokenManagerConfig {
	twitchClientId: string;
	twitchClientSecret: string;
	twitchTokenFilePath?: string;
}

export class TwitchTokenManager {
	protected readonly config: TwitchTokenManagerConfig;
	protected readonly logger: AppLogger;

	protected token: TwitchToken | null = null;
	protected pendingTokenPromise: Promise<TwitchToken> | null = null;

	constructor(container: {
		config: TwitchTokenManagerConfig;
		logger: AppLogger;
	}) {
		this.config = container.config;
		this.logger = container.logger;
	}

	async getToken(): Promise<TwitchToken> {
		if (this.token && TwitchTokenManager.isTokenValid(this.token)) {
			return this.token;
		}
		if (this.pendingTokenPromise) {
			return this.pendingTokenPromise;
		}
		this.pendingTokenPromise = this.fetchToken();
		try {
			this.token = await this.pendingTokenPromise;
			if (this.config.twitchTokenFilePath) {
				await this.saveTokenToFile(this.token);
			}
			return this.token;
		} finally {
			this.pendingTokenPromise = null;
		}
	}

	protected async fetchToken(): Promise<TwitchToken> {
		const { twitchClientId: clientId, twitchClientSecret: clientSecret } = this.config;

		const { access_token: token, expires_in: expiresIn } = await fetchTwitchToken({
			clientId,
			clientSecret,
		});

		return {
			token,
			expiresIn,
			lastUpdatedAt: Date.now(),
		};
	}

	protected async saveTokenToFile(token: TwitchToken): Promise<void> {
		const path = this.config.twitchTokenFilePath;
		if (!path) {
			throw new Error('twitch token file path is not set');
		}
		await Bun.write(path, JSON.stringify(token));
	}

	async loadTokenFromFile(): Promise<void> {
		const path = this.config.twitchTokenFilePath;
		if (!path) {
			throw new Error('twitch token file path is not set');
		}
		const file = Bun.file(path);
		const exists = await file.exists();
		if (exists === false) {
			this.logger.warn(`token not loaded. ${path} does not exist `);
			return;
		}
		const token = await file.json();
		this.token = TwitchTokenSchema.parse(token);
	}

	static isTokenValid(token: Omit<TwitchToken, 'token'>): boolean {
		return Date.now() < TwitchTokenManager.calculateTokenExpiry(token);
	}

	static calculateTokenExpiry(token: Omit<TwitchToken, 'token'>): number {
		return token ? token.lastUpdatedAt + token.expiresIn * 1000 : -1;
	}
}
