import cors from "@fastify/cors";
import fp from "fastify-plugin";

export const registerCors = fp(async (server) => {
	await server.register(cors, {
		origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
		methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
	});
});
