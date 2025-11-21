import { createLogger, format, transports } from 'winston';

const logFormat = format.printf(({ level, message, timestamp, stack, ...restMeta }) => {
	const metaString = Object.keys(restMeta).length ? `\n${JSON.stringify(restMeta)}` : '';
	const stackString = stack ? `\n${stack}` : '';
	return `${timestamp} ${level}: ${message}${metaString}${stackString}`;
});

export const logger = createLogger({
	level: 'debug',
	format: format.combine(
		format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
		format.colorize(),
		logFormat,
	),
	transports: [new transports.Console()],
});

if (Bun.env.NODE_ENV === 'production') {
	logger.clear();
	logger.add(
		new transports.File({
			filename: 'error.log',
			level: 'error',
			format: format.json(),
		}),
	);
	logger.add(new transports.File({ filename: 'combined.log', format: format.json() }));
}
