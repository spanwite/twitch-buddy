import z from 'zod';

// from https://dev.twitch.tv/docs/api/reference#get-users
const TwitchUserSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	login: z.string(),
});
export type TwitchUser = z.infer<typeof TwitchUserSchema>;

export const TwitchUsersResponseSchema = z.object({
	data: z.array(TwitchUserSchema),
});

// from https://dev.twitch.tv/docs/api/reference/#get-streams
const TwitchStreamSchema = z.object({
	id: z.string(),
	game_name: z.string(),
	started_at: z.string(),
	user_id: z.string(),
	user_login: z.string(),
	title: z.string(),
	viewer_count: z.number(),
});
export type TwitchStream = z.infer<typeof TwitchStreamSchema>;

export const TwitchStreamsResponseSchema = z.object({
	data: z.array(TwitchStreamSchema),
});

// from https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
export const TwitchTokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
});

export const TwitchTokenSchema = z.object({
	token: z.string(),
	expiresIn: z.number(),
	lastUpdatedAt: z.number(),
});

export type TwitchToken = z.infer<typeof TwitchTokenSchema>;
