import type { Message } from 'node-telegram-bot-api';
import { escapeMarkdownV2 } from '../utils/string.ts';
import type { TelegramBot } from './Bot.ts';
import type { TelegramBotCommand, TelegramBotMessage } from './types.ts';

export class CommandHelp implements TelegramBotCommand {
	readonly regexp = /\/help/;
	readonly name = '/help';
	readonly description = 'Показать список доступных команд';
	readonly usage =
		'\n1\\. `/help` — посмотреть список всех команд\n2\\. `/help <имя_команды>` — посмотреть подробную информацию о команде';

	protected readonly commands: TelegramBotCommand[];
	protected readonly telegramBot: TelegramBot;

	constructor(ctx: {
		commands: TelegramBotCommand[];
		telegramBot: TelegramBot;
	}) {
		this.commands = ctx.commands;
		this.telegramBot = ctx.telegramBot;
	}

	async handle(message: Message): Promise<void> {
		const chatId = message.chat.id;
		const match = message.text?.match(new RegExp(`${this.name}(.+)`));
		const [helpMessageText, helpMessageOptions] = this.makeHelpListMessage();
		if (match?.[1]) {
			const commandName = match[1].toLowerCase().trim();
			const foundCommand = this.commands.find(
				(command) => command.name === `/${commandName}`,
			);
			if (!commandName || !foundCommand) {
				await this.telegramBot.sendMessage(
					chatId,
					`Команда \`${escapeMarkdownV2(commandName)}\` не найдена\\. ${helpMessageText}`,
					{ parse_mode: 'MarkdownV2' },
				);
				return;
			}
			await this.telegramBot.sendMessage(
				chatId,
				...this.makeCommandHelpMessage(foundCommand),
			);
			return;
		}
		await this.telegramBot.sendMessage(message.chat.id, helpMessageText, helpMessageOptions);
	}

	protected makeCommandNotFoundMessage(commandName: string): TelegramBotMessage {
		return [
			`Команда ${escapeMarkdownV2(commandName)} не найдена\\.`,
			{ parse_mode: 'MarkdownV2' },
		];
	}

	protected makeCommandHelpMessage(command: TelegramBotCommand): TelegramBotMessage {
		const usage = command.usage ? `\n\nИспользование: ${command.usage}` : '';
		return [`${command.name}: ${command.description}${usage}`, { parse_mode: 'MarkdownV2' }];
	}

	protected makeHelpListMessage(): TelegramBotMessage {
		const commandsList = this.commands
			.map((command) => `${command.name}: ${command.description}\\.`)
			.join('\n');
		const header = 'Вот список доступных команд:\n\n';
		const footer =
			'\n\nДля просмотра подробной информации о команде, напиши: `/help <имя_команды>`';

		return [header + commandsList + footer, { parse_mode: 'MarkdownV2' }];
	}
}
