import path from "node:path";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tanstackRouter()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@server": path.resolve(__dirname, "../src"),
		},
	},
	server: {
		proxy: {
			"/api/blackjack/ws": {
				target: "ws://localhost:2137",
				ws: true,
			},
			"/api": "http://localhost:2137",
		},
	},
});
