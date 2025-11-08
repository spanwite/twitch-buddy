import z from 'zod';

export const ConfigSchema = z.object({
	twitch: z.object({
		clientId: z.string(),
		clientSecret: z.string(),
	}),
	database: z.object({
		url: z.string(),
	}),
});
