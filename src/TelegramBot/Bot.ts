import Bottleneck from 'bottleneck';
import { default as NodeTelegramBot } from 'node-telegram-bot-api';

export class TelegramBot extends NodeTelegramBot {
	protected readonly globalLimiter = new Bottleneck({
		reservoir: 30,
		reservoirRefreshAmount: 30,
		reservoirRefreshInterval: 1000,
		maxConcurrent: 3,
		minTime: 33,
	});
	protected readonly chatLimiters = new Bottleneck.Group({
		minTime: 1000,
		maxConcurrent: 1,
	});

	constructor(token: string, options?: NodeTelegramBot.ConstructorOptions) {
		super(token, options);
		this.chatLimiters.on('created', (limiter) => {
			limiter.chain(this.globalLimiter);
		});
	}

	override sendMessage(
		chatId: NodeTelegramBot.ChatId,
		text: string,
		options?: NodeTelegramBot.SendMessageOptions,
	): Promise<NodeTelegramBot.Message> {
		return this.chatLimiters
			.key(String(chatId))
			.schedule(() => super.sendMessage(chatId, text, options));
	}

	override editMessageText(
		text: string,
		options?: NodeTelegramBot.EditMessageTextOptions,
	): Promise<NodeTelegramBot.Message | boolean> {
		const key = options?.chat_id?.toString() ?? 'default';
		return this.chatLimiters.key(key).schedule(() => super.editMessageText(text, options));
	}

	override editMessageReplyMarkup(
		replyMarkup: NodeTelegramBot.InlineKeyboardMarkup,
		options?: NodeTelegramBot.EditMessageReplyMarkupOptions,
	): Promise<NodeTelegramBot.Message | boolean> {
		const key = options?.chat_id?.toString() ?? 'default';
		return this.chatLimiters
			.key(key)
			.schedule(() => super.editMessageReplyMarkup(replyMarkup, options));
	}
}
