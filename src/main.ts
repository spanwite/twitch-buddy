import { Database } from 'bun:sqlite';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.ts';
import { streamEnded, streamStarted } from './helpers/telegramBotMessages.ts';
import { logger } from './Logger.ts';
import type { TwitchStreamSchema } from './schemas/twitch.ts';
import { SubscriptionRepository } from './services/SubscriptionRepository.ts';
import { TelegramBotController } from './services/TelegramBotController.ts';
import { TwitchApi } from './services/TwitchApi.ts';

const telegramBot = new TelegramBot(config.telegram.botToken, {
	polling: true,
});
const database = new Database(config.database.url);
const subsRepo = new SubscriptionRepository(database);
const twitchApi = new TwitchApi(
	{ ...config.twitch, tokenFile: 'twitchTokens.local.json' },
	{ logger },
);

new TelegramBotController({
	telegramBot,
	subsRepo,
	twitchApi,
	logger,
});

let onlineStreams: TwitchStreamSchema[] = [];
let endedStreams: TwitchStreamSchema[] = [];

main();
setInterval(main, 1000 * 10);

async function main() {
	const uniqueStreamerIds = subsRepo
		.findMany({ distinct: ['streamerId'] })
		.map((sub) => sub.streamerId);

	const fetchedStreams = await twitchApi.fetchStreams({
		userIds: uniqueStreamerIds,
	});
	logger.info(
		`streamers checked – ${fetchedStreams.length} of ${uniqueStreamerIds.length} is online`,
	);
	for (const stream of onlineStreams) {
		if (fetchedStreams.find((s) => s.id === stream.id)) continue;
		endedStreams.push(stream);
	}
	onlineStreams = fetchedStreams;

	notifyUsersAboutStartedStreams();
	notifyUsersAboutEndedStreams();
}

async function notifyUsersAboutStartedStreams() {
	for (const stream of onlineStreams) {
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
				`notification about ${stream.user_login}'s new stream sent to user #${userId}`,
			);
		}
	}
}

async function notifyUsersAboutEndedStreams() {
	for (const stream of endedStreams) {
		const usersToNotify = subsRepo.findMany({
			where: { lastNotifiedStreamId: stream.id },
		});
		if (usersToNotify.length === 0) {
			endedStreams = endedStreams.filter((s) => s.id !== stream.id);
			continue;
		}

		const streamEndedMessage = streamEnded(stream);

		for (const { userId } of usersToNotify) {
			telegramBot.sendMessage(userId, ...streamEndedMessage);
			subsRepo.update({
				data: { lastNotifiedStreamId: '' },
				where: { userId, lastNotifiedStreamId: stream.id },
			});
			logger.info(
				`notification about ${stream.user_login}'s stream end sent to user #${userId}`,
			);
		}
	}
}
