export function twitchUserUrl(login: string) {
	return `https://twitch.tv/${login}`;
}

export function markdownLink(text: string, link: string) {
	return `[${text}](${link})`;
}
