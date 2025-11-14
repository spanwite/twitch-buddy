import { describe, expect, it } from 'bun:test';
import { chunk, list, pickRandom } from './array.ts';

describe('chunk', () => {
	it('splits array into chunks of given size', () => {
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	it('returns array with one chunk if chunkSize >= array.length', () => {
		expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
		expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
	});

	it('handles chunkSize of 1', () => {
		expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
	});

	it('returns empty array when input is empty', () => {
		expect(chunk([], 3)).toEqual([]);
	});

	it('throws error if chunkSize is less than 1', () => {
		expect(() => chunk([1, 2, 3], 0)).toThrow();
		expect(() => chunk([1, 2, 3], -2)).toThrow();
	});
});

describe('list', () => {
	it('returns the same array if input is already an array', () => {
		const array = [1, 2, 3];
		const result = list(array);
		expect(result).toBe(array);
		expect(result).toEqual(array);
	});

	it('wraps a single value in an array', () => {
		expect(list(undefined)).toEqual([undefined]);
		expect(list(null)).toEqual([null]);
		expect(list('a')).toEqual(['a']);
		expect(list(1)).toEqual([1]);
		expect(list(false)).toEqual([false]);
	});
});

describe('pickRandom', () => {
	it('returns undefined for empty array', () => {
		expect(pickRandom([])).toBeUndefined();
	});

	it('returns the only element for single-element array', () => {
		expect(pickRandom([42])).toBe(42);
	});

	it('returns an element from the array', () => {
		const arr = [1, 2, 3, 4, 5];
		const result = pickRandom(arr);
		expect(arr).toContain(result);
	});

	it('works with string arrays', () => {
		const arr = ['a', 'b', 'c'];
		const result = pickRandom(arr);
		expect(arr).toContain(result);
	});
});
