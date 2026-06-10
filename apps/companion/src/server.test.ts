import { describe, expect, it } from "vitest";
import { createServer } from "./server.js";

describe("companion server", () => {
	it("responds to health checks", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "GET",
			url: "/health",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			ok: true,
			service: "open-resume-companion",
		});
	});

	it("rejects invalid extraction requests", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "file:///etc/passwd" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: "Invalid extraction request",
		});
	});
});
