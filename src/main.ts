import { App } from './Application/App.ts';
import { container } from './container.ts';

const app = new App(container);
app.start();
