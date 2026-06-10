import { createServer } from "./server.js";

const port = Number.parseInt(
	process.env.OPEN_RESUME_COMPANION_PORT ?? "47321",
	10,
);
const host = process.env.OPEN_RESUME_COMPANION_HOST ?? "127.0.0.1";

const server = createServer({
	logLevel: process.env.OPEN_RESUME_COMPANION_LOG_LEVEL ?? "info",
});

try {
	await server.listen({ host, port });
	server.log.info({ host, port }, "Open Resume companion listening");
} catch (error) {
	server.log.error({ error }, "Open Resume companion failed to start");
	process.exit(1);
}
