import { describe, expect, it, jest } from 'bun:test';
import { makeParallelLimiter } from './function.ts';

describe('limiter', () => {
	it('returns resolved value', async () => {
		const callWithLimit = makeParallelLimiter(1);
		const fn = jest.fn().mockResolvedValue('a');

		const result = callWithLimit(fn);

		expect(result).resolves.toBe('a');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('passes arguments to given function', async () => {
		const callWithLimit = makeParallelLimiter(1);
		const fn = jest.fn().mockImplementation((a: number, b: number) => a + b);

		const result = await callWithLimit(fn, 2, 3);

		expect(result).toBe(5);
		expect(fn).toHaveBeenCalledWith(2, 3);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('does not exceed the limit', async () => {
		const callWithLimit = makeParallelLimiter(4);
		let maxConcurrent = 0;
		let currentConcurrent = 0;
		const fn = jest.fn().mockImplementation(async () => {
			currentConcurrent++;
			maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
			await new Promise((resolve) => setTimeout(resolve, 100));
			currentConcurrent--;
		});

		await Promise.all(Array.from({ length: 10 }).map(() => callWithLimit(fn)));

		expect(maxConcurrent).toBeLessThanOrEqual(4);
		expect(fn).toHaveBeenCalledTimes(10);
	});
});

// const intervalLimiter = makeIntervalLimiter(10_000, 800);
// const task = (i: number) => new Promise((resolve) => setTimeout(() => resolve(i), 2000));
//
// const promises = Array.from({ length: 20 }).map((_, i) => intervalLimiter.schedule(task, i));
//
// Promise.all(promises).then(console.log);
