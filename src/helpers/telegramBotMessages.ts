import type TelegramBot from 'node-telegram-bot-api';
import type { TwitchStream } from '../Twitch/Schema.ts';
import { generateTwitchUserUrl } from '../Twitch/Utils.ts';

type ReturnMessage = [string, TelegramBot.SendMessageOptions];

export function streamStarted(stream: TwitchStream): ReturnMessage {
	const { title, game_name, started_at, user_login, viewer_count } = stream;
	const streamerUrl = generateTwitchUserUrl(user_login);
	const streamerText = markdownLink(user_login, streamerUrl);

	const messageText = [
		`🔴 ${streamerText} — в эфире!`,
		`🗂 Категория: ${game_name}`,
		`📝 Название стрима: ${title}`,
		`🕒 Онлайн с: ${started_at}`,
		`👀 Сейчас смотрят: ${viewer_count} зрителей`,
	].join('\n');
	const messageOptions: TelegramBot.SendMessageOptions = {
		parse_mode: 'Markdown',
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: [[{ text: '🚀 Залететь на стрим', url: streamerUrl }]],
		},
	};

	return [messageText, messageOptions];
}

export function streamEnded(stream: TwitchStream): ReturnMessage {
	const { title, user_login } = stream;
	const streamerUrl = generateTwitchUserUrl(user_login);
	const streamerText = markdownLink(user_login, streamerUrl);

	const messageText = [`⚫ ${streamerText} завершил(а) стрим`, `📝 Название было: ${title}`].join(
		'\n',
	);
	const messageOptions: TelegramBot.SendMessageOptions = {
		parse_mode: 'Markdown',
		disable_web_page_preview: true,
	};

	return [messageText, messageOptions];
}

export function markdownLink(text: string, url: string): string {
	return `[${text}](${url})`;
}
