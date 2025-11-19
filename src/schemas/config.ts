import z from 'zod';

export const ConfigSchema = z.object({
	twitchClientId: z.string(),
	twitchClientSecret: z.string(),
	databaseUrl: z.string(),
	telegramBotToken: z.string(),
});
