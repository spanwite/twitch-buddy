import z from 'zod';

const ConfigSchema = z.object({
	twitch: z.object({
		clientId: z.string(),
		clientSecret: z.string(),
	}),
});

export const config = ConfigSchema.parse({
	// checkInterval: Bun.env.CHECK_INTERVAL,
	twitch: {
		clientId: Bun.env.TWITCH_CLIENT_ID,
		clientSecret: Bun.env.TWITCH_CLIENT_SECRET,
	},
	// telegram: {
	// 	botToken: Bun.env.TELEGRAM_BOT_TOKEN,
	// },
});
