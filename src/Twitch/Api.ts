import Bottleneck from 'bottleneck';
import type { AppLogger } from '../types.ts';
import { chunk, list } from '../utils/array.ts';
import { HttpRequestError } from '../utils/error.ts';
import {
	type TwitchStream,
	TwitchStreamsResponseSchema,
	TwitchTokenResponseSchema,
	type TwitchUser,
	TwitchUsersResponseSchema,
} from './Schemas.ts';

export class TwitchApi {
	static readonly baseUrl = 'https://api.twitch.tv/helix';

	protected readonly limiter = new Bottleneck({
		reservoir: 800,
		reservoirRefreshAmount: 800,
		reservoirRefreshInterval: 30_000,
		maxConcurrent: 5,
		minTime: 50,
	});

	protected readonly logger: AppLogger;

	constructor(ctx: { logger: AppLogger }) {
		this.logger = ctx.logger;
	}

	protected async request(input: string, init?: RequestInit) {
		return this.limiter.schedule(fetch, input, init).then((response) => {
			const { hostname, pathname } = new URL(input);
			const method = init?.method ?? 'GET';
			this.logger.debug(
				`http_request ${hostname} ${method} ${pathname} -> ${response.status}`,
			);
			return response;
		});
	}

	async fetchUsers(params: {
		userIds?: string[] | string;
		userLogins?: string[] | string;
		clientId: string;
		token: string;
	}): Promise<TwitchUser[]> {
		const { userIds, userLogins, token, clientId } = params;

		const idQueries = list(userIds ?? []).map((id) => `id=${id}`);
		const loginQueries = list(userLogins ?? []).map((login) => `login=${login}`);
		const queries = ([] as Array<string>).concat(idQueries, loginQueries);

		if (queries.length === 0) {
			return [];
		}

		const chunks = chunk(queries, 100);
		const results: TwitchUser[] = [];

		const headers = this.generateRequestHeaders({
			token,
			clientId,
		});

		for (const chunk of chunks) {
			const query = chunk.join('&');
			const response = await this.request(`${TwitchApi.baseUrl}/users?${query}`, {
				method: 'GET',
				headers,
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

	async fetchStreams(params: {
		userIds?: string[] | string;
		userLogins?: string[] | string;
		clientId: string;
		token: string;
	}): Promise<TwitchStream[]> {
		const { userIds, userLogins, token, clientId } = params;

		const userIdQueries = list(userIds ?? []).map((id) => `user_id=${id}`);
		const userLoginQueries = list(userLogins ?? []).map((login) => `user_login=${login}`);
		const queries = ([] as Array<string>).concat(userIdQueries, userLoginQueries);

		if (queries.length === 0) {
			return [];
		}

		const chunks = chunk(queries, 100);
		const results: TwitchStream[] = [];

		const headers = this.generateRequestHeaders({ clientId, token });

		for (const chunk of chunks) {
			const query = chunk.join('&');
			const response = await this.request(`${TwitchApi.baseUrl}/streams?${query}`, {
				method: 'GET',
				headers,
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

	async fetchToken(params: { clientSecret: string; clientId: string }) {
		const { clientSecret, clientId } = params;
		const response = await this.request('https://id.twitch.tv/oauth2/token', {
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

	protected generateRequestHeaders(data: { token: string; clientId: string }) {
		return {
			'Client-Id': data.clientId,
			Authorization: `Bearer ${data.token}`,
			'Content-Type': 'application/json',
		};
	}
}
