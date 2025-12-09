import { mkdirSync } from 'node:fs';
import { createLogger, format, transports } from 'winston';

const logFormat = format.printf(({ level, message, timestamp, stack, ...restMeta }) => {
	const metaString = Object.keys(restMeta).length ? `\n${JSON.stringify(restMeta)}` : '';
	const stackString = stack ? `\n${stack}` : '';
	return `${timestamp} ${level}: ${message}${metaString}${stackString}`;
});

export const logger = createLogger({
	transports: [
		new transports.Console({
			level: Bun.env.NODE_ENV === 'development' ? 'debug' : 'info',
			format: format.combine(
				format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
				format.colorize(),
				logFormat,
			),
		}),
	],
});

if (Bun.env.NODE_ENV !== 'development') {
	mkdirSync('logs', { recursive: true });
	logger
		.add(
			new transports.File({
				filename: 'error.log',
				level: 'error',
				format: format.json(),
				dirname: 'logs',
			}),
		)
		.add(
			new transports.File({
				filename: 'combined.log',
				level: 'info',
				format: format.json(),
				dirname: 'logs',
			}),
		);
}
