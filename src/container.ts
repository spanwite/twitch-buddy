import { Database } from 'bun:sqlite';
import { StreamNotifier } from './Application/StreamNotifier.ts';
import { StreamTracker } from './Application/StreamTracker.ts';
import { config } from './config.ts';
import { logger } from './logger.ts';
import { SubscriptionRepository } from './Subscription/Repository.ts';
import { ActionRemoveStreamer } from './TelegramBot/ActionRemoveStreamer.ts';
import { TelegramBot } from './TelegramBot/Bot.ts';
import { CommandAdd } from './TelegramBot/CommandAdd.ts';
import { CommandHelp } from './TelegramBot/CommandHelp.ts';
import { CommandList } from './TelegramBot/CommandList.ts';
import { CommandRemove } from './TelegramBot/CommandRemove.ts';
import { CommandStart } from './TelegramBot/CommandStart.ts';
import { TelegramBotController } from './TelegramBot/Controller.ts';
import type { TelegramBotAction, TelegramBotCommand } from './TelegramBot/types.ts';
import { TokenRepository } from './Token/Repository.ts';
import { TokenService } from './Token/Service.ts';
import { TwitchApi } from './Twitch/Api.ts';
import { TwitchService } from './Twitch/Service.ts';
import { TwitchTokenManager } from './Twitch/TokenManager.ts';

const telegramBot = new TelegramBot(config.telegramBotToken, {
	polling: true,
});
const database = new Database(config.databaseUrl);
const subscriptionRepository = new SubscriptionRepository(database);
const tokenRepository = new TokenRepository(database);
const tokenService = new TokenService({ tokenRepository });
const twitchApi = new TwitchApi({ logger });
const twitchTokenManager = new TwitchTokenManager({
	config,
	logger,
	tokenService,
	twitchApi,
});
const twitchService = new TwitchService({
	config,
	tokenManager: twitchTokenManager,
	logger,
	twitchApi,
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
const commandHelp = new CommandHelp({
	telegramBot,
	commands,
});
commands.push(commandHelp);
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
