import { createLogger, format, transports } from 'winston';

const { printf, colorize, timestamp, combine, json } = format;

const myFormat = printf(({ level, message, timestamp, context }) => {
	const contextLabel = context ? `(${context})` : '';
	return `[${timestamp}] ${level}${contextLabel}: ${message}`;
});

export const logger = createLogger({
	level: 'debug',
	format: combine(timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }), colorize(), myFormat),
	transports: [new transports.Console()],
});

if (Bun.env.NODE_ENV === 'production') {
	logger.clear();
	logger.add(
		new transports.File({
			filename: 'error.log',
			level: 'error',
			format: json(),
		}),
	);
	logger.add(new transports.File({ filename: 'combined.log', format: json() }));
}
