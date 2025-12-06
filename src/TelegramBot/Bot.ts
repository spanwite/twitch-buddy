import { default as NodeTelegramBot } from 'node-telegram-bot-api';
import { makeIntervalLimiter } from '../utils/function.ts';

export class TelegramBot extends NodeTelegramBot {
	private readonly globalLimiter = makeIntervalLimiter(1000, 30);
	private readonly chatLimiter = makeIntervalLimiter(1000, 1);

	override sendMessage(
		chatId: NodeTelegramBot.ChatId,
		text: string,
		options?: NodeTelegramBot.SendMessageOptions,
	): Promise<NodeTelegramBot.Message> {
		return this.globalLimiter.schedule(() =>
			this.chatLimiter.schedule(
				super.sendMessage.bind(this),
				chatId.toString(),
				chatId,
				text,
				options,
			),
		);
	}

	override editMessageText(
		text: string,
		options?: NodeTelegramBot.EditMessageTextOptions,
	): Promise<NodeTelegramBot.Message | boolean> {
		return this.globalLimiter.schedule(() =>
			this.chatLimiter.schedule(
				super.editMessageText.bind(this),
				options?.chat_id?.toString() ?? 'default',
				text,
				options,
			),
		);
	}

	override editMessageReplyMarkup(
		replyMarkup: NodeTelegramBot.InlineKeyboardMarkup,
		options?: NodeTelegramBot.EditMessageReplyMarkupOptions,
	): Promise<NodeTelegramBot.Message | boolean> {
		return this.globalLimiter.schedule(() =>
			this.chatLimiter.schedule(
				super.editMessageReplyMarkup.bind(this),
				options?.chat_id?.toString() ?? 'default',
				replyMarkup,
				options,
			),
		);
	}
}
