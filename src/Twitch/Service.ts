import type { AppLogger } from '../types.ts';
import type { TwitchApi } from './Api.ts';
import type { TwitchStream, TwitchToken, TwitchUser } from './Schemas.ts';
import type { TwitchTokenManager } from './TokenManager.ts';

interface TwitchServiceConfig {
	twitchClientId: string;
}

export class TwitchService {
	static readonly baseUrl = 'https://api.twitch.tv/helix';

	protected readonly config: TwitchServiceConfig;
	protected readonly logger: AppLogger;
	protected readonly tokenManager: TwitchTokenManager;
	protected readonly twitchApi: TwitchApi;

	protected token: TwitchToken | null = null;

	constructor(container: {
		logger: AppLogger;
		config: TwitchServiceConfig;
		twitchApi: TwitchApi;
		tokenManager: TwitchTokenManager;
	}) {
		this.logger = container.logger;
		this.config = container.config;
		this.tokenManager = container.tokenManager;
		this.twitchApi = container.twitchApi;
	}

	async fetchUserByLogin(userLogin: string): Promise<TwitchUser | null> {
		const token = await this.tokenManager.getToken();
		const [user] = await this.twitchApi.fetchUsers({
			userLogins: userLogin,
			clientId: this.config.twitchClientId,
			token: token.token,
		});
		return user ?? null;
	}

	async fetchStreamsByUserIds(userIds: string[]): Promise<TwitchStream[]> {
		const token = await this.tokenManager.getToken();
		return this.twitchApi.fetchStreams({
			userIds,
			clientId: this.config.twitchClientId,
			token: token.token,
		});
	}
}
