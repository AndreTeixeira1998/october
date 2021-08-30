import App from './App.svelte'
import { ready } from '@wails/runtime'
import { routes } from 'svelte-hash-router'
import Homepage from './Homepage.svelte'
import Device from './Device.svelte'

let app;

routes.set({
	'/': Homepage,
	'/device': Device,
})

ready(() => {
	app = new App({
		target: document.body,
	});
});

export default app;
