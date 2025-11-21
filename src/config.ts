import z from 'zod';

export const ConfigSchema = z.object({
	twitchClientId: z.string(),
	twitchClientSecret: z.string(),
	databaseUrl: z.string(),
	telegramBotToken: z.string(),
	streamAlertsInterval: z.number().min(1),
});

export const config = ConfigSchema.parse({
	twitchClientId: Bun.env.TWITCH_CLIENT_ID,
	twitchClientSecret: Bun.env.TWITCH_CLIENT_SECRET,
	databaseUrl: Bun.env.DATABASE_URL,
	telegramBotToken: Bun.env.TELEGRAM_BOT_TOKEN,
	streamAlertsInterval: Number(Bun.env.STREAM_ALERTS_INTERVAL) || 5,
});
