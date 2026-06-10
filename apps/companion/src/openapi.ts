import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

const httpUrlSchema = {
	type: "string",
	format: "uri",
} as const;

export function registerOpenApi(server: FastifyInstance) {
	server.addSchema({
		$id: "HealthResponse",
		type: "object",
		properties: {
			ok: { type: "boolean" },
			service: { type: "string" },
		},
		required: ["ok", "service"],
		additionalProperties: false,
	});

	server.addSchema({
		$id: "ExtractJobRequest",
		type: "object",
		properties: {
			url: {
				type: "string",
				description: "HTTP or HTTPS job posting URL to extract.",
			},
		},
		required: ["url"],
		additionalProperties: false,
	});

	server.addSchema({
		$id: "JobExtractionResult",
		type: "object",
		properties: {
			sourceUrl: httpUrlSchema,
			title: { type: "string" },
			company: { type: "string" },
			location: { type: "string" },
			description: { type: "string" },
			rawText: { type: "string" },
			extractionMethod: {
				type: "string",
				enum: ["json-ld", "readability", "playwright"],
			},
			extractedAt: {
				type: "number",
				description: "Unix timestamp in milliseconds.",
			},
		},
		required: [
			"sourceUrl",
			"title",
			"company",
			"location",
			"description",
			"rawText",
			"extractionMethod",
			"extractedAt",
		],
		additionalProperties: false,
	});

	server.addSchema({
		$id: "CompanionErrorResponse",
		type: "object",
		properties: {
			error: { type: "string" },
			details: { type: "string" },
		},
		required: ["error"],
		additionalProperties: false,
	});

	server.register(swagger, {
		openapi: {
			openapi: "3.0.3",
			info: {
				title: "Open Resume Companion API",
				version: "0.1.0",
				description:
					"Local companion service for extracting job details from pasted job URLs.",
			},
			tags: [
				{ name: "System", description: "Operational companion endpoints." },
				{
					name: "Extraction",
					description: "Job posting extraction endpoints.",
				},
			],
		},
		refResolver: {
			buildLocalReference(json, _baseUri, _fragment, index) {
				return json.$id?.toString() ?? `def-${index}`;
			},
		},
	});

	server.register(swaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
	});
}
