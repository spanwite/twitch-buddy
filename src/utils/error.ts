export class HttpRequestError extends Error {
	public statusCode: number;
	public responseBody?: unknown;

	constructor(statusCode: number, responseBody?: unknown) {
		super('Request failed');
		this.name = 'HttpRequestError';
		this.statusCode = statusCode;
		this.responseBody = responseBody;
		Object.setPrototypeOf(this, HttpRequestError.prototype);
	}
}
