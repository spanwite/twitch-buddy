import { Database } from 'bun:sqlite';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.ts';
import { streamEnded, streamStarted } from './helpers/telegramBotMessages.ts';
import { logger } from './logger.ts';
import { SubscriptionRepository } from './services/SubscriptionRepository.ts';
import { TelegramBotController } from './services/TelegramBotController.ts';
import type { TwitchStream } from './Twitch/Schema.ts';
import { TwitchSevice } from './Twitch/Service.ts';

const telegramBot = new TelegramBot(config.telegram.botToken, {
	polling: true,
});
const database = new Database(config.database.url);
const subsRepo = new SubscriptionRepository(database);
const twitchService = new TwitchSevice({
	config: { ...config.twitch, saveTokenToFile: 'twitchTokens.local.json' },
	logger,
});

new TelegramBotController({
	telegramBot,
	subsRepo,
	twitchService,
	logger,
});

let lastOnlineStreams: TwitchStream[] = [];

main();
setInterval(main, 1000 * 60 * 1);

async function main() {
	const uniqueStreamerIds = subsRepo
		.findMany({ distinct: 'streamerId' })
		.map((sub) => sub.streamerId);
	const fetchedStreams = await twitchService.fetchManyStreamsByUserIds(uniqueStreamerIds);
	logger.info(
		`from ${uniqueStreamerIds.length} streamers found ${fetchedStreams.length} active streams`,
	);
	const endedStreams = lastOnlineStreams.filter(
		(stream) => !fetchedStreams.find((s) => s.id === stream.id),
	);
	lastOnlineStreams = fetchedStreams;

	notifyUsersAboutOnlineStreams(lastOnlineStreams);
	notifyUsersAboutEndedStreams(endedStreams);
}

async function notifyUsersAboutOnlineStreams(streams: TwitchStream[]) {
	for (const stream of streams) {
		logger.info(`notifying users about ${stream.user_login}'s stream start`);

		const usersToNotify = subsRepo.findMany({
			where: {
				streamerId: stream.user_id,
				lastNotifiedStreamId: { not: stream.id },
			},
			select: { userId: true, lastNotifiedStreamId: true },
		});
		if (usersToNotify.length === 0) continue;

		const streamStartedMessage = streamStarted(stream);

		for (const { userId } of usersToNotify) {
			await telegramBot.sendMessage(userId, ...streamStartedMessage);
			subsRepo.updateMany({
				data: { lastNotifiedStreamId: stream.id },
				where: {
					userId,
					streamerId: stream.user_id,
				},
			});
			logger.info(
				`sent notification to user ${userId} about ${stream.user_login}'s stream start`,
			);
		}
	}
}

async function notifyUsersAboutEndedStreams(streams: TwitchStream[]) {
	for (const stream of streams) {
		logger.info(`notifying users about ${stream.user_login}'s stream end`);

		const usersToNotify = subsRepo.findMany({
			where: { lastNotifiedStreamId: stream.id },
		});

		const streamEndedMessage = streamEnded(stream);

		for (const { userId } of usersToNotify) {
			telegramBot.sendMessage(userId, ...streamEndedMessage);
			subsRepo.update({
				data: { lastNotifiedStreamId: '' },
				where: { userId, lastNotifiedStreamId: stream.id },
			});
			logger.info(
				`sent notification to user ${userId} about ${stream.user_login}'s stream end`,
			);
		}
	}
}
