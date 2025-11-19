export function generateTwitchUserUrl(userLogin: string): string {
	return `https://twitch.tv/${userLogin}`;
}

export function markdownLink(text: string, url: string): string {
	return `[${text}](${url})`;
}
