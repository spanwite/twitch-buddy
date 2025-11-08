export function buildWhereQuery<Param extends string | number>(
	where?: Record<string, Param>,
): [string, Param[]] {
	if (!where) {
		return ['', []];
	}
	const conditions: string[] = [];
	const params: Param[] = [];

	for (const [key, value] of Object.entries(where)) {
		conditions.push(`${key} = ?`);
		params.push(value);
	}

	return [`WHERE ${conditions.join(' AND ')}`, params];
}

export function twitchUserUrl(login: string) {
	return `https://twitch.tv/${login}`;
}
