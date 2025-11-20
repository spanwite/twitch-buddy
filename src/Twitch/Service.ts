import type { AppLogger } from '../types.ts';
import { fetchStreams, fetchToken, fetchUsers } from './Api.ts';
import {
	type TwitchStream,
	type TwitchToken,
	TwitchTokenSchema,
	type TwitchUser,
} from './Schemas.ts';

interface TwitchConfig {
	clientId: string;
	clientSecret: string;
	saveTokenToFile?: string;
}

export class TwitchService {
	static readonly baseUrl = 'https://api.twitch.tv/helix';

	protected readonly config: TwitchConfig;
	protected readonly logger: AppLogger;

	protected token: TwitchToken | null = null;

	constructor(container: { logger: AppLogger; twitchConfig: TwitchConfig }) {
		this.logger = container.logger;
		this.config = container.twitchConfig;
	}

	async fetchUserByLogin(userLogin: string): Promise<TwitchUser | null> {
		const { clientId } = this.config;
		const token = await this.getValidToken();
		const users = await fetchUsers({
			userLogins: userLogin,
			clientId,
			token: token.token,
		});
		return users[0] ?? null;
	}

	async fetchStreamsByUserIds(userIds: string[]): Promise<TwitchStream[]> {
		const { clientId } = this.config;
		const token = await this.getValidToken();
		return fetchStreams({
			userIds,
			clientId,
			token: token.token,
		});
	}

	protected async getValidToken(): Promise<TwitchToken> {
		const { saveTokenToFile: tokenFilePath } = this.config;

		if (tokenFilePath && this.token === null) {
			const token = await readTokenFromFile(tokenFilePath);
			if (token) {
				this.token = token;
				this.logger.info(`appAccessToken loaded from file ${tokenFilePath}`);
			} else {
				this.logger.info(`failed to load appAccessToken from file ${tokenFilePath}`);
			}
		}

		if (this.token && !isTokenExpired(this.token)) {
			return this.token;
		}

		return this.renewToken();
	}

	protected async renewToken(): Promise<TwitchToken> {
		const { saveTokenToFile: tokenFilePath, clientId, clientSecret } = this.config;

		const response = await fetchToken({ clientId, clientSecret });
		this.token = {
			token: response.access_token,
			expiresIn: response.expires_in,
			lastUpdatedAt: Date.now(),
		};

		const tokenExpiresAt = calculateTokenExpiresAt(this.token);
		const expireLabel = new Date(tokenExpiresAt).toISOString();
		this.logger.info(`appAccessToken renewed. it will expire at ${expireLabel}`);

		if (tokenFilePath) {
			await writeTokenToFile(tokenFilePath, this.token);
			this.logger.info(`appAccessToken saved to a file ${tokenFilePath}`);
		}

		return this.token;
	}
}

function isTokenExpired(token: Pick<TwitchToken, 'expiresIn' | 'lastUpdatedAt'>): boolean {
	return Date.now() >= calculateTokenExpiresAt(token);
}

function calculateTokenExpiresAt(token: Pick<TwitchToken, 'expiresIn' | 'lastUpdatedAt'>): number {
	return token.lastUpdatedAt + token.expiresIn * 1000;
}

async function writeTokenToFile(filePath: string, token: TwitchToken): Promise<void> {
	await Bun.write(filePath, JSON.stringify(token));
}

async function readTokenFromFile(filePath: string): Promise<TwitchToken | null> {
	const file = Bun.file(filePath);
	const exists = await file.exists();
	if (exists === false) {
		return null;
	}
	const token = await file.json();
	const { data } = TwitchTokenSchema.safeParse(token);
	return data ?? null;
}
