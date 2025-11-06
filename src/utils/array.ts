export function chunk<T>(array: T[], chunkSize: number): T[][] {
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
