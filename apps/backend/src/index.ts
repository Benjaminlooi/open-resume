import { createServer } from "./server.js";

const port = Number.parseInt(
	process.env.OPEN_RESUME_BACKEND_PORT ?? "47321",
	10,
);
const host = process.env.OPEN_RESUME_BACKEND_HOST ?? "127.0.0.1";

const server = createServer({
	recoverJobsOnStartup: true,
});

try {
	await server.listen({ host, port });
	server.log.info({ host, port }, "Open Resume backend listening");
} catch (error) {
	server.log.error({ error }, "Open Resume backend failed to start");
	process.exit(1);
}
