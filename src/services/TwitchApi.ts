import {
	type TwitchStreamSchema,
	TwitchStreamsResponseSchema,
	TwitchTokenJsonSchema,
	TwitchTokenResponseSchema,
	type TwitchUserSchema,
	TwitchUsersResponseSchema,
} from '../schemas/twitch.ts';
import type { Logger } from '../types.ts';
import { chunk, list } from '../utils/array.ts';
import { HttpRequestError } from '../utils/error.ts';

interface TokenData {
	token: string;
	expiresIn: number;
	lastUpdatedAt: number;
}

export class TwitchApi {
	protected readonly logger: Logger;
	static readonly baseUrl = 'https://api.twitch.tv/helix';
	protected tokenData: TokenData | null = null;

	constructor(
		protected readonly config: {
			clientId: string;
			clientSecret: string;
			tokenFile?: string;
		},
		deps: { logger: Logger },
	) {
		this.logger = deps.logger;
	}

	async fetchUsers(query?: {
		ids?: string[] | string;
		logins?: string[] | string;
	}): Promise<TwitchUserSchema[]> {
		const idQueries = list(query?.ids ?? []).map((id) => `id=${id}`);
		const loginQueries = list(query?.logins ?? []).map((login) => `login=${login}`);
		const queries = ([] as Array<string>).concat(idQueries, loginQueries);

		if (queries.length === 0) {
			return [];
		}
		if (this.isTokenExpired()) {
			await this.renewToken();
		}

		const chunks = chunk(queries, 100);
		const results: TwitchUserSchema[] = [];

		for (const chunk of chunks) {
			const query = chunk.join('&');
			const response = await fetch(`${TwitchApi.baseUrl}/users?${query}`, {
				method: 'GET',
				headers: this.getRequestHeaders(),
			});
			const responseBody = await response.json();
			if (!response.ok) {
				throw new HttpRequestError(response.status, responseBody);
			}
			const users = TwitchUsersResponseSchema.parse(responseBody).data;

			results.push(...users);
		}

		return results;
	}

	async fetchStreams(query?: {
		userIds?: string[] | string;
		userLogins?: string[] | string;
	}): Promise<TwitchStreamSchema[]> {
		const userIdItems = list(query?.userIds ?? []).map((id) => `user_id=${id}`);
		const userLoginItems = list(query?.userLogins ?? []).map((login) => `user_login=${login}`);
		const queryItems = ([] as Array<string>).concat(userIdItems, userLoginItems);

		if (queryItems.length === 0) {
			return [];
		}
		if (this.isTokenExpired()) {
			await this.renewToken();
		}

		const chunks = chunk(queryItems, 100);
		const results: TwitchStreamSchema[] = [];

		for (const chunk of chunks) {
			const query = chunk.join('&');
			const response = await fetch(`${TwitchApi.baseUrl}/streams?${query}`, {
				method: 'GET',
				headers: this.getRequestHeaders(),
			});
			const responseBody = await response.json();
			if (!response.ok) {
				throw new HttpRequestError(response.status, responseBody);
			}
			const streams = TwitchStreamsResponseSchema.parse(responseBody).data;

			results.push(...streams);
		}

		return results;
	}

	protected isTokenExpired(): boolean {
		return this.tokenData === null || Date.now() >= this.calculateTokenExpiresAt();
	}

	protected calculateTokenExpiresAt(): number {
		if (this.tokenData === null) {
			throw new Error('Token data is not available');
		}
		return this.tokenData.lastUpdatedAt + this.tokenData.expiresIn * 1000;
	}

	protected async renewToken(): Promise<void> {
		if (this.tokenData === null) {
			return this.loadTokenFromFile();
		}
		const tokenResponse = await this.fetchToken();
		this.tokenData = {
			token: tokenResponse.access_token,
			expiresIn: tokenResponse.expires_in,
			lastUpdatedAt: Date.now(),
		};
		const expireLabel = new Date(this.calculateTokenExpiresAt()).toISOString();

		this.logger.info(`appAccessToken renewed. it will expire at ${expireLabel}`);

		await this.saveTokenToFile();
	}

	protected async loadTokenFromFile() {
		const { tokenFile } = this.config;
		if (tokenFile) {
			const tokenData = await Bun.file(tokenFile).json();
			const { data, success } = TwitchTokenJsonSchema.safeParse(tokenData);
			if (success) {
				this.tokenData = data;
				this.logger.info(`appAccessToken loaded from a file`);
			}
		}
	}

	protected async saveTokenToFile(): Promise<void> {
		const { tokenFile } = this.config;
		if (tokenFile && this.tokenData) {
			await Bun.write(tokenFile, JSON.stringify(this.tokenData));
			this.logger.info(`appAccessToken saved to a file ${tokenFile}`);
		}
	}

	protected async fetchToken() {
		const { clientSecret, clientId } = this.config;
		const response = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'client_credentials',
			}),
		});
		const responseBody = await response.json();
		if (!response.ok) {
			throw new HttpRequestError(response.status, responseBody);
		}
		return TwitchTokenResponseSchema.parse(responseBody);
	}

	protected getRequestHeaders() {
		return {
			'Client-Id': this.config.clientId,
			Authorization: `Bearer ${this.tokenData?.token}`,
			'Content-Type': 'application/json',
		};
	}

	static generateUserUrl(userLogin: string) {
		return `https://twitch.tv/${userLogin}`;
	}
}
