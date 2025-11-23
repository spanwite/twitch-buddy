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

export function formatDate(date: Date | number | string, format: string): string {
	date = new Date(date);
	const pad = (num: number) => num.toString().padStart(2, '0');
	let result = format;

	const replacements: Record<'yyyy' | 'MM' | 'dd' | 'hh' | 'mm' | 'ss', string> = {
		yyyy: date.getFullYear().toString(),
		MM: pad(date.getMonth() + 1),
		dd: pad(date.getDate()),
		hh: pad(date.getHours()),
		mm: pad(date.getMinutes()),
		ss: pad(date.getSeconds()),
	};

	for (const [key, value] of Object.entries(replacements)) {
		result = result.replaceAll(key, value);
	}

	return result;
}
