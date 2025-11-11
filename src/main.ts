import { Database } from 'bun:sqlite';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.ts';
import { logger } from './Logger.ts';
import { SubscriptionRepository } from './services/SubscriptionRepository.ts';
import { TelegramBotController } from './services/TelegramBotController.ts';
import { TwitchApi } from './services/TwitchApi.ts';

const telegramBot = new TelegramBot(config.telegram.botToken, {
	polling: true,
});
const database = new Database(config.database.url);
const subsRepo = new SubscriptionRepository({ database });
const twitchApi = new TwitchApi(
	{ ...config.twitch, tokenFile: 'twitchTokens.local.json' },
	{ logger },
);

new TelegramBotController({
	telegramBot,
	subsRepo,
	twitchApi,
	logger,
});

setInterval(() => {}, 1000 * 60 * 5);
