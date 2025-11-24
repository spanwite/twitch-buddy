import { Database } from 'bun:sqlite';
import TelegramBot from 'node-telegram-bot-api';
import { StreamNotifier } from './Application/StreamNotifier.ts';
import { StreamTracker } from './Application/StreamTracker.ts';
import { config as globalConfig } from './config.ts';
import { logger } from './logger.ts';
import { SubscriptionRepository } from './Subscription/Repository.ts';
import { ActionRemoveStreamer } from './TelegramBot/ActionRemoveStreamer.ts';
import { CommandAdd } from './TelegramBot/CommandAdd.ts';
import { CommandList } from './TelegramBot/CommandList.ts';
import { CommandRemove } from './TelegramBot/CommandRemove.ts';
import { CommandStart } from './TelegramBot/CommandStart.ts';
import { TelegramBotController } from './TelegramBot/Controller.ts';
import type { TelegramBotAction, TelegramBotCommand } from './TelegramBot/types.ts';
import { TwitchService } from './Twitch/Service.ts';
import { TwitchTokenManager } from './Twitch/TokenManager.ts';

const telegramBot = new TelegramBot(globalConfig.telegramBotToken, {
	polling: true,
});
const database = new Database(globalConfig.databaseUrl);
const subscriptionRepository = new SubscriptionRepository(database);
const twitchConfig = {
	clientId: globalConfig.twitchClientId,
	clientSecret: globalConfig.twitchClientSecret,
};
const twitchTokenManager = new TwitchTokenManager({
	config: {
		twitchClientId: twitchConfig.clientId,
		twitchClientSecret: twitchConfig.clientSecret,
		twitchTokenFilePath: 'twitchTokens.local.json',
	},
	logger,
});
twitchTokenManager.loadTokenFromFile();
const twitchService = new TwitchService({
	twitchConfig,
	tokenManager: twitchTokenManager,
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
const streamTracker = new StreamTracker({
	twitchService,
	subscriptionRepository,
});
const commandList = new CommandList({
	subscriptionRepository,
	logger,
	telegramBot,
	streamTracker,
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
const streamNotifier = new StreamNotifier({
	telegramBot,
	subscriptionRepository,
	logger,
});
const config = {
	streamAlertsInterval: globalConfig.streamAlertsInterval,
};

export const container = {
	telegramBot,
	database,
	subscriptionRepository,
	twitchService,
	telegramBotController,
	logger,
	streamNotifier,
	streamTracker,
	config,
};

export type AppContainer = typeof container;
