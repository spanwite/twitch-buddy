import { SQLiteError } from 'bun:sqlite';
import type TelegramBot from 'node-telegram-bot-api';
import type { Logger } from '../types.ts';
import type { SubscriptionRepository } from './SubscriptionRepository.ts';
import type { TwitchApi } from './TwitchApi.ts';

enum TelegramBotAction {
	RemoveStreamerWithId = 'REMOVE_STREAMER_WITH_ID',
}

export class TelegramBotController {
	protected readonly bot: TelegramBot;
	protected readonly subsRepo: SubscriptionRepository;
	protected readonly twitchApi: TwitchApi;
	protected readonly logger: Logger;

	constructor(deps: {
		telegramBot: TelegramBot;
		subsRepo: SubscriptionRepository;
		twitchApi: TwitchApi;
		logger: Logger;
	}) {
		this.bot = deps.telegramBot;
		this.subsRepo = deps.subsRepo;
		this.twitchApi = deps.twitchApi;
		this.logger = deps.logger;

		this.setupListeners();
	}

	protected setupListeners() {
		this.bot.onText(/\/start/, this.handleCommandStart.bind(this));
		this.bot.onText(/\/add/, this.handleCommandAdd.bind(this));
		this.bot.onText(/\/remove/, this.handleCommandRemove.bind(this));
		this.bot.onText(/\/list/, this.handleCommandList.bind(this));

		this.bot.on('callback_query', this.handleCallbackQuery.bind(this));

		this.logger.info('telegram bot is listening to messages');
	}

	protected handleCommandStart(message: TelegramBot.Message) {
		this.bot.sendMessage(
			message.chat.id,
			'Привет! 👋 Я буду твоим напарником в мире стримов на [Twitch](https://www.twitch.tv/). Напомню, когда твои любимые стримеры выходят в онлайн. Добавь ник — и забудь про FOMO! 🎮',
			{ parse_mode: 'Markdown', disable_web_page_preview: true },
		);
	}

	protected async handleCommandAdd(message: TelegramBot.Message): Promise<void> {
		const chatId = message.chat.id;
		const match = /\/add (.+)/.exec(message.text || '');
		if (!match?.[1]) {
			return void this.bot.sendMessage(
				chatId,
				'Не понял, кого добавлять 🤔\nПравильный формат: `/add <ник_стримера>`',
				{ parse_mode: 'Markdown' },
			);
		}
		const streamerLogin = match[1].toLowerCase().trim();
		const [fetchedStreamer] = await this.twitchApi.fetchUsers({
			logins: streamerLogin,
		});
		if (!fetchedStreamer) {
			return void this.bot.sendMessage(
				chatId,
				`Я обшарил Twitch вдоль и поперёк...\nНо ${streamerLogin} там не нашел 👻 Проверь никнейм!`,
				{ parse_mode: 'Markdown', disable_web_page_preview: true },
			);
		}
		try {
			this.subsRepo.create({
				userId: chatId.toString(),
				streamerId: fetchedStreamer.id,
				streamerLogin: fetchedStreamer.login,
			});
		} catch (error) {
			if (error instanceof SQLiteError) {
				if (error.errno === 1555) {
					return void this.bot.sendMessage(
						chatId,
						`${streamerLogin} уже добавлен 🎮\nУведомлю, как только выйдет в онлайн 🌐`,
						{ parse_mode: 'Markdown', disable_web_page_preview: true },
					);
				}
			}
			throw error;
		}
		this.bot.sendMessage(
			chatId,
			`🎉 Всё чётко! ${streamerLogin} теперь под наблюдением 👀\nДам знать, как только начнётся стрим 🎥`,
			{ parse_mode: 'Markdown', disable_web_page_preview: true },
		);
		this.logger.info(`new subscription added: user #${chatId} to streamer ${streamerLogin}`);
	}

	protected async handleCommandRemove(message: TelegramBot.Message): Promise<void> {
		const chatId = message.chat.id;
		const match = /\/remove (.+)/.exec(message.text || '');
		if (!match?.[1]) {
			return void this.bot.sendMessage(
				chatId,
				'Не понял, кого нужно удалить 🤔\nПравильный формат: `/remove <ник_стримера>`',
				{ parse_mode: 'Markdown' },
			);
		}
		const streamerLogin = match[1].trim().toLowerCase();
		const deleteSub = this.subsRepo.delete({
			where: { userId: chatId.toString(), streamerLogin },
		});
		if (deleteSub === null) {
			return void this.bot.sendMessage(
				chatId,
				`🤷 А я вообще не следил за ${streamerLogin}\nДобавь сначала, если хочешь, чтобы я присматривал 👀`,
				{ parse_mode: 'Markdown', disable_web_page_preview: true },
			);
		}
		this.bot.sendMessage(
			chatId,
			`🗑 ${streamerLogin} — отправлен в архив!\nУведомления? Какие уведомления? 😏`,
			{ parse_mode: 'Markdown', disable_web_page_preview: true },
		);
	}

	protected async handleCommandList(message: TelegramBot.Message): Promise<void> {
		const chatId = message.chat.id;
		const userSubs = this.subsRepo.findMany({
			where: { userId: chatId.toString() },
		});
		if (userSubs.length === 0) {
			return void this.bot.sendMessage(
				chatId,
				`👀 Никого не нашёл в твоём списке...\nХочешь начать следить за кем-то? Напиши: \`/add <ник_стримера>\``,
				{ parse_mode: 'Markdown' },
			);
		}
		const streamersButtons: TelegramBot.InlineKeyboardButton[] = userSubs.map(
			({ streamerLogin, streamerId }) => ({
				text: streamerLogin,
				callback_data: `${TelegramBotAction.RemoveStreamerWithId}=${streamerId}`,
			}),
		);
		this.bot.sendMessage(
			chatId,
			`❌ Хочешь перестать следить за кем-то?\nТкни по нику — и он пропадёт из списка 👇`,
			{
				reply_markup: {
					inline_keyboard: [streamersButtons],
					one_time_keyboard: true,
				},
			},
		);
	}

	protected async handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
		const { data, message } = query;
		if (!data || !message) {
			return;
		}
		const {
			message_id: messageId,
			chat: { id: chatId },
		} = message;
		const [action, streamerId] = data.split('=');

		if (action === TelegramBotAction.RemoveStreamerWithId) {
			this.subsRepo.delete({
				where: { userId: chatId.toString(), streamerId },
			});
			const streamerButtons = message.reply_markup?.inline_keyboard?.[0] ?? [];
			const newStreamerButtons = streamerButtons.filter(
				({ callback_data }) => callback_data?.split('=')[1] !== streamerId,
			);
			if (newStreamerButtons.length === 0) {
				this.bot.editMessageText(
					`👀 Никого не нашёл в твоём списке...\nХочешь начать следить за кем-то? Напиши: \`/add <ник_стримера>\``,
					{ message_id: messageId, chat_id: chatId, parse_mode: 'Markdown' },
				);
			}
			this.bot.editMessageReplyMarkup(
				{ inline_keyboard: [newStreamerButtons] },
				{ message_id: messageId, chat_id: chatId },
			);
		}
	}
}
