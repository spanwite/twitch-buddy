import type { TokenService } from '../Token/Service.ts';
import type { AppLogger } from '../types.ts';
import type { TwitchApi } from './Api.ts';
import type { TwitchToken } from './Schemas.ts';

interface TwitchTokenManagerConfig {
	twitchClientId: string;
	twitchClientSecret: string;
}

export class TwitchTokenManager {
	protected readonly config: TwitchTokenManagerConfig;
	protected readonly logger: AppLogger;
	protected readonly tokenService: TokenService;
	protected readonly twitchApi: TwitchApi;

	protected token: TwitchToken | null = null;
	protected pendingTokenPromise: Promise<TwitchToken> | null = null;

	constructor(container: {
		config: TwitchTokenManagerConfig;
		logger: AppLogger;
		tokenService: TokenService;
		twitchApi: TwitchApi;
	}) {
		this.config = container.config;
		this.logger = container.logger;
		this.tokenService = container.tokenService;
		this.token = this.tokenService.find();
		this.twitchApi = container.twitchApi;

		if (!this.token) {
			this.logger.info('no twitch token found in database');
		} else {
			this.logger.info(
				`twitch token loaded from database. it will expire at ${TwitchTokenManager.getTokenExpiryLabel(this.token)}`,
			);
		}
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
			this.tokenService.renew(this.token);
			this.logger.info(
				`twitch token updated. it will expire at ${TwitchTokenManager.getTokenExpiryLabel(this.token)}`,
			);
			return this.token;
		} finally {
			this.pendingTokenPromise = null;
		}
	}

	protected async fetchToken(): Promise<TwitchToken> {
		const { twitchClientId: clientId, twitchClientSecret: clientSecret } = this.config;

		const { access_token: token, expires_in: expiresIn } = await this.twitchApi.fetchToken({
			clientId,
			clientSecret,
		});

		return {
			token,
			expiresIn,
			lastUpdatedAt: Date.now(),
		};
	}

	static isTokenValid(token: Omit<TwitchToken, 'token'>): boolean {
		return Date.now() < TwitchTokenManager.calculateTokenExpiry(token);
	}

	static calculateTokenExpiry(token: Omit<TwitchToken, 'token'>): number {
		return token ? token.lastUpdatedAt + token.expiresIn * 1000 : -1;
	}

	static getTokenExpiryLabel(token: Omit<TwitchToken, 'token'>): string {
		const expiry = new Date(TwitchTokenManager.calculateTokenExpiry(token));
		return expiry.toISOString();
	}
}
