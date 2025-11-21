import type { StreamAlerts } from './StreamAlerts.ts';
import type { TelegramBotController } from './TelegramBot/Controller.ts';
import type { AppLogger } from './types.ts';

export interface AppConfig {
	streamAlertsInterval: number;
}

export class App {
	protected readonly telegramBotController: TelegramBotController;
	protected readonly streamAlerts: StreamAlerts;
	protected readonly logger: AppLogger;
	protected readonly config: AppConfig;

	constructor(
		protected readonly container: {
			telegramBotController: TelegramBotController;
			streamAlerts: StreamAlerts;
			logger: AppLogger;
			config: AppConfig;
		},
	) {
		this.telegramBotController = container.telegramBotController;
		this.streamAlerts = container.streamAlerts;
		this.logger = container.logger;
		this.config = container.config;
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
			const { onlineStreams, offlineStreams } = await this.streamAlerts.checkStreamsFromDb();
			this.streamAlerts.notifyAboutStartedStreams(onlineStreams);
			this.streamAlerts.notifyAboutEndedStreams(offlineStreams);
		} catch (error) {
			this.logger.error('stream alerts loop failed', error);
		}
	}
}
