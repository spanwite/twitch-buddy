export function limiter(limit: number) {
	const queue: (() => void)[] = [];
	let active = 0;

	return async <T, U extends unknown[]>(
		fn: (...args: U) => Promise<T> | T,
		...args: U
	): Promise<T> => {
		return new Promise((resolve, reject) => {
			const task = () => {
				active++;
				Promise.try(fn, ...args)
					.then(resolve)
					.catch(reject)
					.finally(() => {
						active--;
						const next = queue.shift();
						if (next) {
							next();
						}
					});
			};
			if (active < limit) {
				task();
			} else {
				queue.push(task);
			}
		});
	};
}
