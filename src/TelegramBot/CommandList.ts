import type TelegramBot from 'node-telegram-bot-api';
import type { AppContainer } from '../container.ts';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TwitchService } from '../Twitch/Service.ts';
import type { AppLogger } from '../types.ts';
import {
	TelegramBotActionVariant,
	type TelegramBotCommand,
	type TelegramBotMessage,
} from './types.ts';

export class CommandList implements TelegramBotCommand {
	readonly regexp = /\/list/;
	readonly name = '/list';
	readonly description = 'Показать список отслеживаемых стримеров';

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
		const userSubs = this.subscriptionRepository.findMany({
			where: { userId: chatId.toString() },
		});
		if (userSubs.length === 0) {
			return void this.bot.sendMessage(chatId, ...makeEmptyListMessage());
		}
		const streamersButtons: TelegramBot.InlineKeyboardButton[] = userSubs.map(
			({ streamerLogin, streamerId }) => ({
				text: streamerLogin,
				callback_data: `${TelegramBotActionVariant.RemoveStreamerWithId}=${streamerId}`,
			}),
		);
		this.bot.sendMessage(chatId, ...makeStreamersListMessage(streamersButtons));
	}
}

function makeEmptyListMessage(): TelegramBotMessage {
	return [
		`👀 Никого не нашёл в твоём списке...\nХочешь начать следить за кем-то? Напиши: \`/add <ник_стримера>\``,
		{ parse_mode: 'Markdown' },
	];
}

function makeStreamersListMessage(buttons: TelegramBot.InlineKeyboardButton[]): TelegramBotMessage {
	return [
		`❌ Хочешь перестать следить за кем-то?\nТкни по нику — и он пропадёт из списка 👇`,
		{
			reply_markup: {
				inline_keyboard: [buttons],
				one_time_keyboard: true,
			},
		},
	];
}
