export function isTwitchUsernameValid(username: string): boolean {
	return /^[a-zA-Z0-9_]{4,25}$/.test(username);
}
