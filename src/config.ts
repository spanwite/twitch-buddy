import z from 'zod';

export const ConfigSchema = z.object({
	twitchClientId: z.string(),
	twitchClientSecret: z.string(),
	databaseUrl: z.string(),
	telegramBotToken: z.string(),
	notificationInterval: z.number().min(1),
});

export const config = ConfigSchema.parse({
	twitchClientId: Bun.env.TWITCH_CLIENT_ID,
	twitchClientSecret: Bun.env.TWITCH_CLIENT_SECRET,
	databaseUrl: Bun.env.DATABASE_URL,
	telegramBotToken: Bun.env.TELEGRAM_BOT_TOKEN,
	notificationInterval: Number(Bun.env.NOTIFICATION_INTERVAL) || 5,
} as z.infer<typeof ConfigSchema>);
