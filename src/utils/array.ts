export function chunk<T>(array: T[], chunkSize: number): T[][] {
	if (chunkSize < 1) {
		throw new Error('chunkSize must be more than 0');
	}
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

export function list<T>(value: T | T[]): T[] {
	if (Array.isArray(value)) {
		return value;
	}
	return [value];
}
