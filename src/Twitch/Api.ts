import { chunk, list } from '../utils/array.ts';
import { HttpRequestError } from '../utils/error.ts';
import {
	type TwitchStream,
	TwitchStreamsResponseSchema,
	TwitchTokenResponseSchema,
	type TwitchUser,
	TwitchUsersResponseSchema,
} from './Schemas.ts';

const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';

export async function fetchTwitchUsers(params: {
	userIds?: string[] | string;
	userLogins?: string[] | string;
	token: string;
	clientId: string;
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

	const headers = generateRequestHeaders({ clientId, token });

	for (const chunk of chunks) {
		const query = chunk.join('&');
		const response = await fetch(`${TWITCH_API_BASE_URL}/users?${query}`, {
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

export async function fetchTwitchStreams(params: {
	userIds?: string[] | string;
	userLogins?: string[] | string;
	token: string;
	clientId: string;
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

	const headers = generateRequestHeaders({ clientId, token });

	for (const chunk of chunks) {
		const query = chunk.join('&');
		const response = await fetch(`${TWITCH_API_BASE_URL}/streams?${query}`, {
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

export async function fetchTwitchToken(data: { clientSecret: string; clientId: string }) {
	const { clientSecret, clientId } = data;
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

function generateRequestHeaders(data: { clientId: string; token: string }) {
	const { clientId, token } = data;
	return {
		'Client-Id': clientId,
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	};
}
