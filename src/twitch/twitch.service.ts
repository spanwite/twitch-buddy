import type { Logger } from '../logger/logger.interface.ts';
import { chunk } from '../utils/array.ts';
import { HttpRequestError } from '../utils/error.ts';
import {
	type TwitchStreamSchema,
	TwitchStreamsResponseSchema,
	TwitchTokenResponseSchema,
	type TwitchUserSchema,
	TwitchUsersResponseSchema,
} from './twitch.schemas.ts';

export class TwitchService {
	protected readonly baseUrl = 'https://api.twitch.tv/helix';
	protected appAccessToken = '';
	protected appAccessTokenExpiresAt = 0;
	protected readonly logger: Logger;

	constructor(
		protected readonly config: { clientId: string; clientSecret: string },
		deps: { logger: Logger },
	) {
		this.logger = deps.logger;
	}

	async fetchUsersByLogins(logins: string[]): Promise<TwitchUserSchema[]>;
	async fetchUsersByLogins(login: string): Promise<TwitchUserSchema | null>;
	async fetchUsersByLogins(
		loginsOrLogin: string[] | string,
	): Promise<TwitchUserSchema[] | TwitchUserSchema | null> {
		await this.updateAppAccessTokenIfExpired();

		const isLoginsArray = Array.isArray(loginsOrLogin);
		const logins = isLoginsArray ? loginsOrLogin : [loginsOrLogin];
		const chunks = chunk(logins, 100);
		const results: TwitchUserSchema[] = [];

		for (const chunk of chunks) {
			const query = chunk.map((login) => `login=${login}`).join('&');
			const response = await fetch(`${this.baseUrl}/users?${query}`, {
				method: 'GET',
				headers: this.headers,
			});
			if (!response.ok) {
				const responseBody = await response.json();
				throw new HttpRequestError(response.status, responseBody);
			}
			const data = await response.json();
			const users = TwitchUsersResponseSchema.parse(data).data;

			results.push(...users);
		}

		if (isLoginsArray) {
			return results;
		} else {
			return results[0] ?? null;
		}
	}

	async fetchStreamsByUserIds(userIds: string[]): Promise<TwitchStreamSchema[]>;
	async fetchStreamsByUserIds(userId: string): Promise<TwitchStreamSchema | null>;
	async fetchStreamsByUserIds(
		idsOrId: string[] | string,
	): Promise<TwitchStreamSchema[] | TwitchStreamSchema | null> {
		await this.updateAppAccessTokenIfExpired();

		const isUserIdsArray = Array.isArray(idsOrId);
		const userIds = isUserIdsArray ? idsOrId : [idsOrId];
		const chunks = chunk(userIds, 100);
		const results: TwitchStreamSchema[] = [];

		for (const chunk of chunks) {
			const query = chunk.map((userId) => `user_id=${userId}`).join('&');
			const response = await fetch(`${this.baseUrl}/streams?${query}`, {
				method: 'GET',
				headers: this.headers,
			});
			if (!response.ok) {
				const responseBody = await response.json();
				throw new HttpRequestError(response.status, responseBody);
			}
			const data = await response.json();
			if (!data) {
				throw new Error('empty response from server');
			}
			const streams = TwitchStreamsResponseSchema.parse(data).data;

			results.push(...streams);
		}

		if (isUserIdsArray) {
			return results;
		} else {
			return results[0] ?? null;
		}
	}

	protected async updateAppAccessTokenIfExpired() {
		if (Date.now() >= this.appAccessTokenExpiresAt) {
			this.logger.info('twitch app_access_token is expired');
			await this.updateAppAccessToken();
		}
	}

	protected async updateAppAccessToken() {
		const { access_token, expires_in } = await this.fetchAppAccessToken();

		this.appAccessToken = access_token;
		this.appAccessTokenExpiresAt = Date.now() + expires_in * 1000;
		this.logger.info('twitch app_access_token has been updated');
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
		if (!response.ok) {
			const responseBody = await response.json();
			throw new HttpRequestError(response.status, responseBody);
		}
		const data = await response.json();
		if (!data) {
			throw new Error('empty response from server');
		}
		return TwitchTokenResponseSchema.parse(data);
	}

	protected get headers() {
		return {
			'Client-Id': this.config.clientId,
			Authorization: `Bearer ${this.appAccessToken}`,
			'Content-Type': 'application/json',
		};
	}
}
