import type { AppContainer } from '../container.ts';

export function makeApp(ctx: AppContainer) {
	let mainLoop: NodeJS.Timeout;

	return {
		start(): void {
			if (mainLoop) {
				ctx.logger.warn('app is already running');
				return;
			}

			ctx.telegramBotController.setupHandlers();

			this.loop();
			mainLoop = setInterval(
				this.loop.bind(this),
				1000 * 60 * ctx.config.notificationInterval,
			);

			ctx.logger.info(
				`stream notification loop started with interval: ${ctx.config.notificationInterval} minute(s)`,
			);
		},

		stop(): void {
			clearInterval(mainLoop);
		},

		async loop(): Promise<void> {
			try {
				await ctx.streamTracker.checkStreamsFromDb();

				await Promise.all([
					ctx.streamNotifier.notifyAboutStartedStreams(ctx.streamTracker.online),
					ctx.streamNotifier.notifyAboutEndedStreams(ctx.streamTracker.wentOffline),
				]);
			} catch (error) {
				ctx.logger.error('stream notification loop failed', error);
			}
		},

		async shutdown(): Promise<void> {
			this.stop();
			await ctx.telegramBot.stopPolling();
			ctx.database.close();
			ctx.logger.debug('app has been shut down gracefully');
			process.exit(0);
		},
	};
}
