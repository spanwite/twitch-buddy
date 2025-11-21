export function generateTwitchUserUrl(userLogin: string): string {
	return `https://twitch.tv/${userLogin}`;
}

export function escapeMarkdownV2(input: string): string {
	const specialChars = /[\\_*[\]()~`>#+\-=|{}.!]/g;
	return input.replace(specialChars, (match) => '\\' + match);
}

export function markdownLink(text: string, url: string): string {
	return `[${text}](${url})`;
}
