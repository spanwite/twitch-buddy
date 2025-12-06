export function makeParallelLimiter(limit: number) {
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

interface Bucket {
	timestamps: number[];
	queue: (() => void)[];
}

export function makeIntervalLimiter(intervalMs: number, limit: number) {
	const buckets = new Map<string, Bucket>();

	const processQueue = (key: string, bucket: Bucket) => {
		const now = Date.now();

		bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < intervalMs);

		if (bucket.queue.length === 0) {
			return;
		}

		if (bucket.timestamps.length < limit) {
			const task = bucket.queue.shift()!;
			task();
		} else {
			const waitTime = intervalMs - (now - bucket.timestamps[0]!);
			setTimeout(() => processQueue(key, bucket), waitTime);
		}
	};

	const getBucket = (key: string): Bucket => {
		if (!buckets.has(key)) {
			buckets.set(key, { timestamps: [], queue: [] });
		}
		return buckets.get(key)!;
	};

	return {
		schedule: async <T, U extends unknown[]>(
			fn: (...args: U) => Promise<T> | T,
			key = 'default',
			...args: U
		): Promise<T> => {
			const bucket = getBucket(key);

			return new Promise((resolve, reject) => {
				const task = () => {
					bucket.timestamps.push(Date.now());
					Promise.try(fn, ...args)
						.then(resolve)
						.catch(reject);
				};
				bucket.queue.push(task);
				processQueue(key, bucket);
			});
		},
	};
}

export function debounce<F extends (...args: any[]) => any>(func: F, wait: number): F {
	let timeout: NodeJS.Timeout;
	return ((...args: Parameters<F>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	}) as F;
}
