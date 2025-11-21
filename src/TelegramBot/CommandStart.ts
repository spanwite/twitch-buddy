import type TelegramBot from 'node-telegram-bot-api';
import type { TelegramBotCommand, TelegramBotMessage } from './types.ts';

export class CommandStart implements TelegramBotCommand {
	readonly regexp = /\/start/;
	readonly name = '/start';
	readonly description = 'Начать работу с ботом';

	protected readonly bot: TelegramBot;

	constructor(container: { telegramBot: TelegramBot }) {
		this.bot = container.telegramBot;
	}

	async handle(message: TelegramBot.Message) {
		await this.bot.sendMessage(message.chat.id, ...makeGreetMessage());
	}
}

function makeGreetMessage(): TelegramBotMessage {
	return [
		'Привет! 👋 Я буду твоим напарником в мире стримов на [Twitch](https://www.twitch.tv/). Напомню, когда твои любимые стримеры выходят в онлайн. Добавь ник — и забудь про FOMO! 🎮',
		{ parse_mode: 'Markdown', disable_web_page_preview: true },
	];
}
