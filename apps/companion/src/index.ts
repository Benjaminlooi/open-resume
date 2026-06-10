import { createServer } from "./server.js";

const port = Number.parseInt(
	process.env.OPEN_RESUME_COMPANION_PORT ?? "47321",
	10,
);
const host = process.env.OPEN_RESUME_COMPANION_HOST ?? "127.0.0.1";

const server = createServer();

try {
	await server.listen({ host, port });
	console.log(`Open Resume companion listening on http://${host}:${port}`);
} catch (error) {
	console.error(error);
	process.exit(1);
}
