import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TwitchService } from '../Twitch/Service.ts';
import type { AppLogger } from '../types.ts';
import type { TelegramBotAction, TelegramBotCommand } from './types.ts';

export class TelegramBotController {
	protected readonly bot: TelegramBot;
	protected readonly subsRepo: SubscriptionRepository;
	protected readonly twitchService: TwitchService;
	protected readonly logger: AppLogger;

	protected readonly commands: TelegramBotCommand[] = [];
	protected readonly actions: TelegramBotAction[] = [];

	constructor(container: {
		telegramBot: TelegramBot;
		subscriptionRepository: SubscriptionRepository;
		twitchService: TwitchService;
		logger: AppLogger;
		commands: TelegramBotCommand[];
		actions: TelegramBotAction[];
	}) {
		this.bot = container.telegramBot;
		this.subsRepo = container.subscriptionRepository;
		this.twitchService = container.twitchService;
		this.logger = container.logger;
		this.commands = container.commands;
		this.actions = container.actions;
	}

	setupHandlers() {
		this.setupCommands();
		this.setupActions();
	}

	protected setupCommands(): void {
		const botCommands: TelegramBot.BotCommand[] = [];
		for (const command of this.commands) {
			const { name, description, regexp, handle } = command;
			this.bot.onText(regexp, (message) => {
				handle.call(command, message).catch((error) => {
					this.logger.error(`bot command ${name} failed`, error);
				});
			});
			botCommands.push({
				command: name,
				description: description,
			});
			this.logger.info(`registered bot command ${name}`);
		}
		this.bot.setMyCommands(botCommands);
	}

	protected setupActions(): void {
		this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
		for (const action of this.actions) {
			this.logger.info(`registered bot action ${action.variant}`);
		}
	}

	protected handleCallbackQuery(query: TelegramBot.CallbackQuery): void {
		if (!query.data) {
			return;
		}
		const [variant] = query.data.split('=');
		for (const action of this.actions) {
			if (action.variant === variant) {
				action.handle.call(action, query).catch((error) => {
					this.logger.error(`bot action ${action.variant} failed`, error);
				});
				return;
			}
		}
	}
}
