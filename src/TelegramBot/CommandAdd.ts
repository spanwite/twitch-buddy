import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TwitchService } from '../Twitch/Service.ts';
import type { AppLogger } from '../types.ts';
import { generateTwitchUserUrl } from '../utils/string.ts';
import type { TelegramBotCommand, TelegramBotMessage } from './types.ts';

export class CommandAdd implements TelegramBotCommand {
	regexp = /\/add/;
	name = '/add';
	description = 'Добавить стримера в список отслеживания';

	protected readonly bot: TelegramBot;
	protected readonly twitchService: TwitchService;
	protected readonly subsRepo: SubscriptionRepository;
	protected readonly logger: AppLogger;

	constructor(container: {
		telegramBot: TelegramBot;
		twitchService: TwitchService;
		subscriptionRepository: SubscriptionRepository;
		logger: AppLogger;
	}) {
		this.bot = container.telegramBot;
		this.twitchService = container.twitchService;
		this.subsRepo = container.subscriptionRepository;
		this.logger = container.logger;
	}

	async handle(message: TelegramBot.Message) {
		if (!message.text) {
			return;
		}
		const chatId = message.chat.id;
		const match = /\/add (.+)/.exec(message.text);
		if (!match?.[1]) {
			return void this.bot.sendMessage(chatId, ...makeInvalidFormatMessage());
		}
		const streamerLogin = match[1].toLowerCase().trim();
		const fetchedStreamer = await this.twitchService.fetchUserByLogin(streamerLogin);
		if (!fetchedStreamer) {
			return void this.bot.sendMessage(chatId, ...makeNotFoundMessage(streamerLogin));
		}
		const foundSub = this.subsRepo.findFirst({
			where: { userId: chatId.toString(), streamerId: fetchedStreamer.id },
		});
		if (foundSub) {
			return void this.bot.sendMessage(chatId, ...makeAlreadyAddedMessage(streamerLogin));
		}
		this.subsRepo.create({
			data: {
				userId: chatId.toString(),
				streamerId: fetchedStreamer.id,
				streamerLogin: fetchedStreamer.login,
				lastNotifiedStreamId: '',
			},
		});
		await this.bot.sendMessage(chatId, ...makeAddedMessage(streamerLogin));
		this.logger.info(`added subscription from user ${chatId} to streamer ${streamerLogin}`);
	}
}

function makeInvalidFormatMessage(): TelegramBotMessage {
	return [
		'Не понял, кого добавлять 🤔\nПравильный формат: `/add <ник_стримера>`',
		{ parse_mode: 'Markdown' },
	];
}

function makeNotFoundMessage(username: string): TelegramBotMessage {
	return [
		`Я обшарил Twitch вдоль и поперёк...\nНо ${username} там не нашел 👻 Проверь никнейм!`,
		{ parse_mode: 'Markdown', disable_web_page_preview: true },
	];
}

function makeAlreadyAddedMessage(username: string): TelegramBotMessage {
	const streamerUrl = generateTwitchUserUrl(username);
	return [
		`${streamerUrl} уже добавлен 🎮\nУведомлю, как только выйдет в онлайн 🌐`,
		{ parse_mode: 'Markdown', disable_web_page_preview: true },
	];
}

function makeAddedMessage(username: string): TelegramBotMessage {
	const streamer = generateTwitchUserUrl(username);
	return [
		`🎉 Всё чётко! ${streamer} теперь под наблюдением 👀\nДам знать, как только начнётся стрим 🎥`,
		{ parse_mode: 'Markdown', disable_web_page_preview: true },
	];
}
