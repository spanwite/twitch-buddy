import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TwitchService } from '../Twitch/Service.ts';
import type { AppLogger } from '../types.ts';
import { escapeMarkdownV2 } from '../utils/string.ts';
import type { TelegramBotCommand, TelegramBotMessage } from './types.ts';

export class CommandRemove implements TelegramBotCommand {
	readonly regexp = /\/remove/;
	readonly name = '/remove';
	readonly description = 'Удалить стримера из списка отслеживания';

	protected readonly bot: TelegramBot;
	protected readonly subscriptionRepository: SubscriptionRepository;
	protected readonly twitchService: TwitchService;
	protected readonly logger: AppLogger;

	constructor(container: {
		telegramBot: TelegramBot;
		subscriptionRepository: SubscriptionRepository;
		twitchService: TwitchService;
		logger: AppLogger;
	}) {
		this.bot = container.telegramBot;
		this.subscriptionRepository = container.subscriptionRepository;
		this.twitchService = container.twitchService;
		this.logger = container.logger;
	}

	async handle(message: TelegramBot.Message) {
		const chatId = message.chat.id;
		const match = /\/remove (.+)/.exec(message.text || '');
		if (!match?.[1]) {
			await this.bot.sendMessage(chatId, ...makeInvalidFormatMessage());
			return;
		}
		const streamerLogin = match[1].trim().toLowerCase();
		const deleteSub = this.subscriptionRepository.delete({
			where: { userId: chatId.toString(), streamerLogin },
		});
		if (deleteSub === null) {
			await this.bot.sendMessage(chatId, ...makeNotAddedMessage(streamerLogin));
			return;
		}
		await this.bot.sendMessage(chatId, ...makeRemovedMessage(streamerLogin));
		this.logger.info(`removed subscription from user ${chatId} to streamer ${streamerLogin}`);
	}
}

function makeInvalidFormatMessage(): TelegramBotMessage {
	return [
		'Не понял, кого нужно удалить 🤔\nПравильный формат: `/remove <ник_стримера>`',
		{ parse_mode: 'Markdown' },
	];
}

function makeRemovedMessage(username: string): TelegramBotMessage {
	const streamer = `\`${escapeMarkdownV2(username)}\``;
	return [
		`🗑 ${streamer} — отправлен в архив\\!\nУведомления? Какие уведомления? 😏`,
		{ parse_mode: 'MarkdownV2', disable_web_page_preview: true },
	];
}

export function makeNotAddedMessage(username: string): TelegramBotMessage {
	const streamer = `\`${escapeMarkdownV2(username)}\``;
	return [
		`🤷 А я вообще не следил за ${streamer}\nДобавь сначала, если хочешь, чтобы я присматривал 👀`,
		{ parse_mode: 'MarkdownV2', disable_web_page_preview: true },
	];
}
