import { Database } from 'bun:sqlite';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.ts';
import { logger } from './logger.ts';
import { StreamAlerts } from './StreamAlerts.ts';
import { SubscriptionRepository } from './Subscription/Repository.ts';
import { ActionRemoveStreamer } from './TelegramBot/ActionRemoveStreamer.ts';
import { CommandAdd } from './TelegramBot/CommandAdd.ts';
import { CommandList } from './TelegramBot/CommandList.ts';
import { CommandRemove } from './TelegramBot/CommandRemove.ts';
import { CommandStart } from './TelegramBot/CommandStart.ts';
import { TelegramBotController } from './TelegramBot/Controller.ts';
import type { TelegramBotAction, TelegramBotCommand } from './TelegramBot/types.ts';
import { TwitchService } from './Twitch/Service.ts';

const telegramBot = new TelegramBot(config.telegramBotToken, {
	polling: true,
});
const database = new Database(config.databaseUrl);
const subscriptionRepository = new SubscriptionRepository(database);
const twitchConfig = {
	clientId: config.twitchClientId,
	clientSecret: config.twitchClientSecret,
	saveTokenToFile: 'twitchTokens.local.json',
};
const twitchService = new TwitchService({
	twitchConfig,
	logger,
});
const commandStart = new CommandStart({ telegramBot });
const commandAdd = new CommandAdd({
	subscriptionRepository,
	telegramBot,
	twitchService,
	logger,
});
const commandRemove = new CommandRemove({
	twitchService,
	logger,
	telegramBot,
	subscriptionRepository,
});
const commandList = new CommandList({
	subscriptionRepository,
	logger,
	telegramBot,
	twitchService,
});
const actionRemoveStreamer = new ActionRemoveStreamer({
	subscriptionRepository,
	telegramBot,
	logger,
	twitchService,
});
const commands: TelegramBotCommand[] = [commandStart, commandAdd, commandRemove, commandList];
const actions: TelegramBotAction[] = [actionRemoveStreamer];
const telegramBotController = new TelegramBotController({
	telegramBot,
	subscriptionRepository,
	twitchService,
	logger,
	commands,
	actions,
});
const streamAlerts = new StreamAlerts({
	telegramBot,
	subscriptionRepository,
	logger,
	twitchService,
});

export const container = {
	telegramBot,
	database,
	subscriptionRepository,
	twitchService,
	telegramBotController,
	logger,
	streamAlerts,
};

export type AppContainer = typeof container;
