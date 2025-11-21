import type TelegramBot from 'node-telegram-bot-api';

export enum TelegramBotActionVariant {
	RemoveStreamerWithId = 'RemoveStreamerWithId',
}

export interface TelegramBotCommand {
	regexp: RegExp;
	name: string;
	description: string;

	handle(message: TelegramBot.Message): Promise<void>;
}

export interface TelegramBotAction {
	variant: TelegramBotActionVariant;

	handle(query: TelegramBot.CallbackQuery): Promise<void>;
}

export type TelegramBotMessage = [string, TelegramBot.SendMessageOptions];
