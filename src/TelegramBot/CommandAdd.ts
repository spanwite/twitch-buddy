import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import { isTwitchUsernameValid } from '../Twitch/helpers.ts';
import type { TwitchUser } from '../Twitch/Schemas.ts';
import type { TwitchService } from '../Twitch/Service.ts';
import type { AppLogger } from '../types.ts';
import { HttpRequestError } from '../utils/error.ts';
import { escapeMarkdownV2, generateTwitchUserUrl, markdownLink } from '../utils/string.ts';
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
			this.logger.warn('received /add command with empty message text');
			return;
		}
		const chatId = message.chat.id;
		const match = /\/add (.+)/.exec(message.text);
		if (!match?.[1]) {
			await this.bot.sendMessage(chatId, ...makeInvalidFormatMessage());
			return;
		}
		const streamerLogin = match[1].toLowerCase().trim();
		if (isTwitchUsernameValid(streamerLogin) === false) {
			await this.bot.sendMessage(chatId, ...makeNotFoundMessage(streamerLogin));
			return;
		}
		let fetchedStreamer: TwitchUser | null = null;
		try {
			fetchedStreamer = await this.twitchService.fetchUserByLogin(streamerLogin);
		} catch (error) {
			if (!(error instanceof HttpRequestError) || error.statusCode !== 400) {
				throw error;
			}
		}
		if (fetchedStreamer === null) {
			await this.bot.sendMessage(chatId, ...makeNotFoundMessage(streamerLogin));
			return;
		}
		const foundSub = this.subsRepo.findFirst({
			where: { userId: chatId.toString(), streamerId: fetchedStreamer.id },
		});
		if (foundSub) {
			await this.bot.sendMessage(chatId, ...makeAlreadyAddedMessage(streamerLogin));
			return;
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
		this.logger.info(`added subscription user ${chatId} to streamer ${streamerLogin}`);
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
		`Я обшарил Twitch вдоль и поперёк…\nНо \`${escapeMarkdownV2(username)}\` там не нашел 👻 Проверь никнейм\\!`,
		{ parse_mode: 'MarkdownV2', disable_web_page_preview: true },
	];
}

function makeAlreadyAddedMessage(username: string): TelegramBotMessage {
	const streamerUrl = escapeMarkdownV2(generateTwitchUserUrl(username));
	const streamer = markdownLink(escapeMarkdownV2(username), streamerUrl);
	return [
		`${streamer} уже добавлен 🎮\nУведомлю, как только выйдет в онлайн 🌐`,
		{ parse_mode: 'MarkdownV2', disable_web_page_preview: true },
	];
}

function makeAddedMessage(username: string): TelegramBotMessage {
	const streamerUrl = generateTwitchUserUrl(username);
	return [
		`🎉 Всё чётко! ${markdownLink(username, streamerUrl)} теперь под наблюдением 👀\nДам знать, как только начнётся стрим 🎥`,
		{ parse_mode: 'Markdown', disable_web_page_preview: true },
	];
}
