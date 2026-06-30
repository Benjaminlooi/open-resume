import { writeFile } from "node:fs/promises";
import { createServer } from "./server.js";

const outputUrl = new URL("../openapi.json", import.meta.url);
const server = createServer();

try {
	await server.ready();
	const document = server.swagger();
	await writeFile(outputUrl, `${JSON.stringify(document, null, 2)}\n`);
	server.log.info({ path: outputUrl.pathname }, "wrote OpenAPI document");
} finally {
	await server.close();
}
