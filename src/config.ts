import { ConfigSchema } from './schemas/config.ts';

export const config = ConfigSchema.parse({
	twitchClientId: Bun.env.TWITCH_CLIENT_ID,
	twitchClientSecret: Bun.env.TWITCH_CLIENT_SECRET,
	databaseUrl: Bun.env.DATABASE_URL,
	telegramBotToken: Bun.env.TELEGRAM_BOT_TOKEN,
});
