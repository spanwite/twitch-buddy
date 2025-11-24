import type { SubscriptionRepository } from '../Subscription/Repository.ts';
import type { TwitchStream } from '../Twitch/Schemas.ts';
import type { TwitchService } from '../Twitch/Service.ts';

export class StreamTracker {
	protected readonly twitchService: TwitchService;
	protected readonly subscriptionRepository: SubscriptionRepository;

	protected onlineStreams: TwitchStream[] = [];
	protected offlineStreams: TwitchStream[] = [];

	constructor(container: {
		twitchService: TwitchService;
		subscriptionRepository: SubscriptionRepository;
	}) {
		this.twitchService = container.twitchService;
		this.subscriptionRepository = container.subscriptionRepository;
	}

	async checkStreamsFromDb(): Promise<void> {
		const streamerIds = this.subscriptionRepository
			.findMany({ distinct: 'streamerId' })
			.map((sub) => sub.streamerId);
		const online = await this.twitchService.fetchStreamsByUserIds(streamerIds);

		const offline = this.onlineStreams.filter(
			(stream) => !online.find((s) => s.id === stream.id),
		);
		this.onlineStreams = online;
		this.offlineStreams = offline;
	}

	get online(): TwitchStream[] {
		return this.onlineStreams;
	}

	get wentOffline(): TwitchStream[] {
		return this.offlineStreams;
	}
}
