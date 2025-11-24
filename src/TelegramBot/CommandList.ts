import type TelegramBot from 'node-telegram-bot-api';
import type { StreamTracker } from '../Application/StreamTracker.ts';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { AppLogger } from '../types.ts';
import { escapeMarkdownV2, generateTwitchUserUrl, markdownLink } from '../utils/string.ts';
import type { TelegramBotCommand, TelegramBotMessage } from './types.ts';

export class CommandList implements TelegramBotCommand {
	readonly regexp = /\/list/;
	readonly name = '/list';
	readonly description = 'Показать список отслеживаемых стримеров';

	protected readonly bot: TelegramBot;
	protected readonly subscriptionRepository: SubscriptionRepository;
	protected readonly logger: AppLogger;
	protected readonly streamTracker: StreamTracker;

	constructor(container: {
		telegramBot: TelegramBot;
		subscriptionRepository: SubscriptionRepository;
		streamTracker: StreamTracker;
		logger: AppLogger;
	}) {
		this.bot = container.telegramBot;
		this.subscriptionRepository = container.subscriptionRepository;
		this.logger = container.logger;
		this.streamTracker = container.streamTracker;
	}

	async handle(message: TelegramBot.Message) {
		const chatId = message.chat.id;
		const userSubs = this.subscriptionRepository.findMany({
			where: { userId: chatId.toString() },
		});
		if (userSubs.length === 0) {
			await this.bot.sendMessage(chatId, ...makeEmptyListMessage());
			return;
		}
		const streamers = userSubs.map(({ streamerLogin, streamerId }) => ({
			streamerLogin,
			gameName: this.streamTracker.online.find((stream) => stream.user_id === streamerId)
				?.game_name,
		}));
		await this.bot.sendMessage(chatId, ...makeListMessage(streamers));
	}
}

function makeEmptyListMessage(): TelegramBotMessage {
	return [
		`👀 Никого не нашёл в твоём списке...\nХочешь начать следить за кем-то? Напиши: \`/add <ник_стримера>\``,
		{ parse_mode: 'Markdown' },
	];
}

function makeListMessage(
	streamers: { streamerLogin: string; gameName?: string }[],
): TelegramBotMessage {
	let message = '👀 Вот список стримеров, которых ты отслеживаешь:\n\n';

	let listMark = 1;
	for (const { streamerLogin, gameName } of streamers) {
		const status = gameName ? `*стримит ${escapeMarkdownV2(gameName)}*` : '_офлайн_';
		const user = markdownLink(
			escapeMarkdownV2(streamerLogin),
			generateTwitchUserUrl(streamerLogin),
		);
		message += `${listMark}\\. ${user} — \\(${status}\\)\n`;
		listMark++;
	}

	return [
		message,
		{
			parse_mode: 'MarkdownV2',
			disable_web_page_preview: true,
		},
	];
}
