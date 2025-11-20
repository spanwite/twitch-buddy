import type { AppContainer } from './container.ts';

export class App {
	constructor(protected readonly container: AppContainer) {}

	start(): void {
		this.container.telegramBotController.setupHandlers();
		this.container.streamAlerts.startTracking();
	}
}
