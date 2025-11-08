export interface Logger {
	error(message: string, ...meta: any[]): void;
	info(message: string, ...meta: any[]): void;
}
