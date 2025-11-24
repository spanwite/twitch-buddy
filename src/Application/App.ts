import type { TelegramBotController } from '../TelegramBot/Controller.ts';
import type { AppLogger } from '../types.ts';
import type { StreamNotifier } from './StreamNotifier.ts';
import type { StreamTracker } from './StreamTracker.ts';

export interface AppConfig {
	streamAlertsInterval: number;
}

export class App {
	protected readonly telegramBotController: TelegramBotController;
	protected readonly streamNotifier: StreamNotifier;
	protected readonly logger: AppLogger;
	protected readonly config: AppConfig;
	protected readonly streamTracker: StreamTracker;

	constructor(
		protected readonly container: {
			telegramBotController: TelegramBotController;
			streamNotifier: StreamNotifier;
			streamTracker: StreamTracker;
			logger: AppLogger;
			config: AppConfig;
		},
	) {
		this.telegramBotController = container.telegramBotController;
		this.streamNotifier = container.streamNotifier;
		this.logger = container.logger;
		this.config = container.config;
		this.streamTracker = container.streamTracker;
	}

	start(): void {
		this.telegramBotController.setupHandlers();
		this.streamAlertsLoop();

		const interval = 1000 * 60 * this.config.streamAlertsInterval;
		setInterval(this.streamAlertsLoop.bind(this), interval);

		this.logger.info(
			`started stream alerts loop with interval: ${this.config.streamAlertsInterval} minutes`,
		);
	}

	protected async streamAlertsLoop(): Promise<void> {
		try {
			await this.streamTracker.checkStreamsFromDb();

			this.streamNotifier.notifyAboutStartedStreams(this.streamTracker.online);
			this.streamNotifier.notifyAboutEndedStreams(this.streamTracker.wentOffline);
		} catch (error) {
			this.logger.error('stream alerts loop failed', error);
		}
	}
}
