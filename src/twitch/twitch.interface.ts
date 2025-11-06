export namespace Twitch {
	export interface User {
		id: string;
		login: string;
		display_name: string;
		type: string;
		broadcaster_type: string;
		description: string;
		profile_image_url: string;
		offline_image_url: string;
		view_count: number;
		created_at: string;
	}

	export interface Stream {
		id: string;
		user_id: string;
		nuser_login: string;
		user_name: string;
		game_id: string;
		game_name: string;
		type: string;
		ttitle: string;
		viewer_count: number;
		started_at: string;
		language: string;
		thumbnail_url: string;
		tag_ids: string[];
		tags: string[];
		is_mature: boolean;
	}

	export interface UsersResponse {
		data: User[];
	}

	export interface StreamsResponse {
		data: Stream[];
	}

	export interface AccessTokenResponse {
		data: {
			access_token: string;
			expires_in: number;
		};
	}
}
