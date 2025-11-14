import { Database } from 'bun:sqlite';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.ts';
import { logger } from './Logger.ts';
import type { TwitchStreamSchema } from './schemas/twitch.ts';
import { SubscriptionRepository } from './services/SubscriptionRepository.ts';
import { TelegramBotController } from './services/TelegramBotController.ts';
import { TwitchApi } from './services/TwitchApi.ts';
import { markdownLink, twitchUserUrl } from './utils/string.ts';

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
		if (usersToNotify.length === 0) {
			continue;
		}
		const { title, game_name, started_at, user_login, viewer_count } = stream;
		const streamerUrl = twitchUserUrl(user_login);
		const streamerText = markdownLink(user_login, streamerUrl);
		const message = `🔴 ${streamerText} — в эфире!\n🗂 Категория: ${game_name}\n📝 Название стрима: ${title}\n🕒 Онлайн с: ${started_at}\n👀 Сейчас смотрят: ${viewer_count} зрителей`;
		const options: TelegramBot.SendMessageOptions = {
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [[{ text: '🚀 Залететь на стрим', url: streamerUrl }]],
			},
		};
		for (const { userId } of usersToNotify) {
			await telegramBot.sendMessage(userId, message, options);
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
		const { title, game_name, started_at, user_login, viewer_count } = stream;
		const streamerUrl = twitchUserUrl(user_login);
		const streamerText = markdownLink(user_login, streamerUrl);
		const message = `⚫ ${streamerText} завершил(а) стрим\n📝Название было: ${title}`;
		const options: TelegramBot.SendMessageOptions = {
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
		};
		for (const { userId } of usersToNotify) {
			telegramBot.sendMessage(userId, message, options);
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
