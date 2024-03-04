import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
//import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
	},
	vitePlugin: {
		experimental: {
			inspector: {
				holdMode: true,
			},
		},
	},
	preprocess: [vitePreprocess({})],
};

export default config;
