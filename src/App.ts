import type { StreamAlerts } from './StreamAlerts.ts';
import type { TelegramBotController } from './TelegramBot/Controller.ts';

export class App {
	constructor(
		protected readonly container: {
			telegramBotController: TelegramBotController;
			streamAlerts: StreamAlerts;
		},
	) {}

	start(): void {
		this.container.telegramBotController.setupHandlers();
		this.container.streamAlerts.startTracking();
	}
}
