import { logger } from '../Logger.ts';
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

export class TwitchApi {
	protected readonly baseUrl = 'https://api.twitch.tv/helix';
	protected appAccessToken = '';
	protected appAccessTokenExpiresAt = 0;
	protected readonly logger: Logger;

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
		const idItems = list(query?.ids ?? []).map((id) => `id=${id}`);
		const loginItems = list(query?.logins ?? []).map((login) => `login=${login}`);
		const queryItems = ([] as Array<string>).concat(idItems, loginItems);

		if (queryItems.length === 0) return [];
		await this.updateAppAccessTokenIfExpired();

		const chunks = chunk(queryItems, 100);
		const results: TwitchUserSchema[] = [];

		for (const chunk of chunks) {
			const query = chunk.join('&');
			const response = await fetch(`${this.baseUrl}/users?${query}`, {
				method: 'GET',
				headers: this.headers,
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

		if (queryItems.length === 0) return [];
		await this.updateAppAccessTokenIfExpired();

		const chunks = chunk(queryItems, 100);
		const results: TwitchStreamSchema[] = [];

		for (const chunk of chunks) {
			const query = chunk.join('&');
			const response = await fetch(`${this.baseUrl}/streams?${query}`, {
				method: 'GET',
				headers: this.headers,
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

	protected async updateAppAccessTokenIfExpired() {
		const { tokenFile } = this.config;
		if (!this.appAccessToken && tokenFile) {
			const tokenData = await Bun.file(tokenFile).json();
			const { data, success } = TwitchTokenJsonSchema.safeParse(tokenData);
			if (success) {
				this.appAccessToken = data.token;
				this.appAccessTokenExpiresAt = data.expiresAt;
				logger.info(`twitch appAccessToken loaded from a file`);
			}
		}
		if (Date.now() >= this.appAccessTokenExpiresAt) {
			this.logger.info('twitch appAppAccessToken is expired');
			await this.updateAppAccessToken();
		}
	}

	protected async updateAppAccessToken() {
		const { access_token, expires_in } = await this.fetchAppAccessToken();
		const { tokenFile } = this.config;

		this.appAccessToken = access_token;
		this.appAccessTokenExpiresAt = Date.now() + expires_in * 1000;
		this.logger.info('twitch appAccessToken updated from server');

		if (tokenFile) {
			await Bun.write(
				tokenFile,
				JSON.stringify({
					token: access_token,
					expiresAt: this.appAccessTokenExpiresAt,
				}),
			);
			this.logger.info(`token info wrote to a file ${tokenFile}`);
		}
	}

	protected async fetchAppAccessToken() {
		const { clientId, clientSecret } = this.config;
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

	protected get headers() {
		return {
			'Client-Id': this.config.clientId,
			Authorization: `Bearer ${this.appAccessToken}`,
			'Content-Type': 'application/json',
		};
	}

	static generateUserUrl(userLogin: string) {
		return `https://twitch.tv/${userLogin}`;
	}
}
