import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TelegramBotMessage } from '../TelegramBot/types.ts';
import type { TwitchStream } from '../Twitch/Schemas.ts';
import type { AppLogger } from '../types.ts';
import { list } from '../utils/array.ts';
import {
	escapeMarkdownV2,
	formatDate,
	generateTwitchUserUrl,
	markdownLink,
} from '../utils/string.ts';

export class StreamNotifier {
	protected lastOnlineStreams: TwitchStream[] = [];

	protected readonly telegramBot: TelegramBot;
	protected readonly subscriptionRepository: SubscriptionRepository;
	protected readonly logger: AppLogger;

	constructor(container: {
		telegramBot: TelegramBot;
		subscriptionRepository: SubscriptionRepository;
		logger: AppLogger;
	}) {
		this.telegramBot = container.telegramBot;
		this.subscriptionRepository = container.subscriptionRepository;
		this.logger = container.logger;
	}

	async notifyAboutStartedStreams(streams: TwitchStream[] | TwitchStream): Promise<void> {
		streams = list(streams);

		for (const stream of streams) {
			const usersToNotify = this.subscriptionRepository.findMany({
				where: {
					streamerId: stream.user_id,
					lastNotifiedStreamId: { not: stream.id },
				},
				select: { userId: true },
			});

			const streamStartedMessage = makeStreamStartedMessage(stream);

			for (const { userId } of usersToNotify) {
				try {
					await this.telegramBot.sendMessage(userId, ...streamStartedMessage);
				} catch (error) {
					this.logger.error(
						`failed to send stream start notification to user ${userId}`,
						error,
					);
					continue;
				}
				this.subscriptionRepository.updateMany({
					data: { lastNotifiedStreamId: stream.id },
					where: {
						userId,
						streamerId: stream.user_id,
					},
				});
				this.logger.info(
					`sent notification to user ${userId} about ${stream.user_login}'s stream start`,
				);
			}
		}
	}

	async notifyAboutEndedStreams(streams: TwitchStream[] | TwitchStream): Promise<void> {
		streams = list(streams);

		for (const stream of streams) {
			const usersToNotify = this.subscriptionRepository.findMany({
				where: { lastNotifiedStreamId: stream.id },
			});

			const streamEndedMessage = makeStreamEndedMessage(stream);

			for (const { userId } of usersToNotify) {
				try {
					await this.telegramBot.sendMessage(userId, ...streamEndedMessage);
				} catch (error) {
					this.logger.error(
						`failed to send stream end notification to user ${userId}`,
						error,
					);
					continue;
				}
				this.subscriptionRepository.update({
					data: { lastNotifiedStreamId: '' },
					where: { userId, lastNotifiedStreamId: stream.id },
				});
				this.logger.info(
					`sent notification to user ${userId} about ${stream.user_login}'s stream end`,
				);
			}
		}
	}
}

export function makeStreamStartedMessage(stream: TwitchStream): TelegramBotMessage {
	const { title, game_name, started_at, user_login, viewer_count } = stream;

	const streamerUrl = generateTwitchUserUrl(user_login);
	const streamerText = markdownLink(escapeMarkdownV2(user_login), escapeMarkdownV2(streamerUrl));
	const streamStarted = escapeMarkdownV2(formatDate(started_at, 'hh:mm, dd.MM.yyyy'));

	const messageText = [
		`🔴 ${streamerText} — в эфире\\!`,
		`🗂 Категория: ${escapeMarkdownV2(game_name)}`,
		`📝 Название стрима: ${escapeMarkdownV2(title)}`,
		`🕒 Онлайн с: ${streamStarted}`,
		`👀 Сейчас смотрят: ${viewer_count} зрителей`,
	].join('\n');
	const messageOptions: TelegramBot.SendMessageOptions = {
		parse_mode: 'MarkdownV2',
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: [[{ text: '🚀 Залететь на стрим', url: streamerUrl }]],
		},
	};

	return [messageText, messageOptions];
}

export function makeStreamEndedMessage(stream: TwitchStream): TelegramBotMessage {
	const { title, user_login } = stream;
	const streamerUrl = generateTwitchUserUrl(user_login);
	const streamerText = markdownLink(escapeMarkdownV2(user_login), escapeMarkdownV2(streamerUrl));

	const messageText = [
		`⚫ ${streamerText} завершил\\(а\\) стрим`,
		`📝 Название было: ${escapeMarkdownV2(title)}`,
	].join('\n');
	const messageOptions: TelegramBot.SendMessageOptions = {
		parse_mode: 'MarkdownV2',
		disable_web_page_preview: true,
	};

	return [messageText, messageOptions];
}
