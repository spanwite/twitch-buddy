import type { AppLogger } from '../types.ts';
import { fetchTwitchStreams, fetchTwitchUsers } from './Api.ts';
import type { TwitchStream, TwitchToken, TwitchUser } from './Schemas.ts';
import type { TwitchTokenManager } from './TokenManager.ts';

interface TwitchServiceConfig {
	clientId: string;
}

export class TwitchService {
	static readonly baseUrl = 'https://api.twitch.tv/helix';

	protected readonly config: TwitchServiceConfig;
	protected readonly logger: AppLogger;
	protected readonly tokenManager: TwitchTokenManager;

	protected token: TwitchToken | null = null;

	constructor(container: {
		logger: AppLogger;
		twitchConfig: TwitchServiceConfig;
		tokenManager: TwitchTokenManager;
	}) {
		this.logger = container.logger;
		this.config = container.twitchConfig;
		this.tokenManager = container.tokenManager;
	}

	async fetchUserByLogin(userLogin: string): Promise<TwitchUser | null> {
		const token = await this.tokenManager.getToken();
		const [user] = await fetchTwitchUsers({
			userLogins: userLogin,
			clientId: this.config.clientId,
			token: token.token,
		});
		return user ?? null;
	}

	async fetchStreamsByUserIds(userIds: string[]): Promise<TwitchStream[]> {
		const token = await this.tokenManager.getToken();
		return fetchTwitchStreams({
			userIds,
			clientId: this.config.clientId,
			token: token.token,
		});
	}
}
