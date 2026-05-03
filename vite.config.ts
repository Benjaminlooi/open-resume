import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		process.env.VITEST ? null : cloudflare({ viteEnvironment: { name: "ssr" } }),
		TanStackRouterVite(),
		viteReact(),
	],
});

export default config;
