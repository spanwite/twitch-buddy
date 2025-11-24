import { makeApp } from './Application/App.ts';
import { container } from './container.ts';

const app = makeApp(container);
app.start();

process.on('SIGINT', app.shutdown.bind(app));
process.on('SIGTERM', app.shutdown.bind(app));
