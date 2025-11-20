import type TelegramBot from 'node-telegram-bot-api';
import type { SubscriptionRepository } from './Subscription/Repository.ts';
import type { TelegramBotMessage } from './TelegramBot/types.ts';
import type { TwitchStream } from './Twitch/Schemas.ts';
import type { TwitchService } from './Twitch/Service.ts';
import type { AppLogger } from './types.ts';
import { list } from './utils/array.ts';
import { generateTwitchUserUrl, markdownLink } from './utils/string.ts';

export class StreamAlerts {
	protected lastOnlineStreams: TwitchStream[] = [];

	protected readonly telegramBot: TelegramBot;
	protected readonly subscriptionRepository: SubscriptionRepository;
	protected readonly twitchService: TwitchService;
	protected readonly logger: AppLogger;

	constructor(container: {
		telegramBot: TelegramBot;
		subscriptionRepository: SubscriptionRepository;
		twitchService: TwitchService;
		logger: AppLogger;
	}) {
		this.telegramBot = container.telegramBot;
		this.subscriptionRepository = container.subscriptionRepository;
		this.twitchService = container.twitchService;
		this.logger = container.logger;
	}

	async startTracking(): Promise<void> {
		this.loop();

		setInterval(this.loop.bind(this), 1000 * 60 * 1);
	}

	async loop(): Promise<void> {
		const { onlineStreams, offlineStreams } = await this.checkStreamsFromDb();

		this.notifyAboutStartedStreams(onlineStreams);
		this.notifyAboutEndedStreams(offlineStreams);
	}

	protected async checkStreamsFromDb(): Promise<{
		onlineStreams: TwitchStream[];
		offlineStreams: TwitchStream[];
	}> {
		const streamerIds = this.subscriptionRepository
			.findMany({ distinct: 'streamerId' })
			.map((sub) => sub.streamerId);
		const onlineStreams = await this.twitchService.fetchStreamsByUserIds(streamerIds);
		this.logger.info(
			`found ${onlineStreams.length} active streams from ${streamerIds.length} streamers`,
		);
		const offlineStreams = this.lastOnlineStreams.filter(
			(stream) => !onlineStreams.find((s) => s.id === stream.id),
		);
		this.lastOnlineStreams = onlineStreams;

		return {
			onlineStreams,
			offlineStreams,
		};
	}

	protected async notifyAboutStartedStreams(
		streams: TwitchStream[] | TwitchStream,
	): Promise<void> {
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
				await this.telegramBot.sendMessage(userId, ...streamStartedMessage);
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
				this.telegramBot.sendMessage(userId, ...streamEndedMessage);
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

export function makeStreamEndedMessage(stream: TwitchStream): TelegramBotMessage {
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
