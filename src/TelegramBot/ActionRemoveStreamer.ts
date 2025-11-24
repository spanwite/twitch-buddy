import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TwitchService } from '../Twitch/Service.ts';
import type { AppLogger } from '../types.ts';
import { chunk } from '../utils/array.ts';
import { STREAMER_BUTTONS_PER_ROW } from './constants.ts';
import { type TelegramBotAction, TelegramBotActionVariant } from './types.ts';

export class ActionRemoveStreamer implements TelegramBotAction {
	readonly variant = TelegramBotActionVariant.RemoveStreamerWithLogin;

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

	async handle(query: TelegramBot.CallbackQuery) {
		const { data, message } = query;
		if (!data || !message) {
			this.logger.warn(
				'received invalid callback query in ActionRemoveStreamer: data or message is missing',
			);
			return;
		}
		const {
			message_id: messageId,
			chat: { id: chatId },
		} = message;
		const [, streamerLogin] = data.split('=');

		this.subscriptionRepository.delete({
			where: { userId: chatId.toString(), streamerLogin },
		});
		this.logger.info(`removed subscription from user ${chatId} to streamer ${streamerLogin}`);

		const streamerButtons = message.reply_markup?.inline_keyboard;
		if (!streamerButtons) {
			this.logger.warn(
				'received message without inline keyboard in ActionRemoveStreamer',
				message,
			);
			return;
		}
		const filteredButtons = streamerButtons
			.flat()
			.filter(({ callback_data }) => callback_data?.split('=')[1] !== streamerLogin);

		if (filteredButtons.length === 0) {
			await this.bot.editMessageText(
				`👀 Никого не нашёл в твоём списке...\nХочешь начать следить за кем-то? Напиши: \`/add <ник_стримера>\``,
				{ message_id: messageId, chat_id: chatId, parse_mode: 'Markdown' },
			);
		} else {
			await this.bot.editMessageReplyMarkup(
				{
					inline_keyboard: chunk(filteredButtons, STREAMER_BUTTONS_PER_ROW),
				},
				{ message_id: messageId, chat_id: chatId },
			);
		}
	}
}
