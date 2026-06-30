import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import {
	jsonSchemaTransform,
	jsonSchemaTransformObject,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import "../schema.js";

export const registerOpenApi = fp(async (server) => {
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	await server.register(swagger, {
		openapi: {
			openapi: "3.0.3",
			info: {
				title: "Open Resume Backend API",
				version: "0.1.0",
					description:
						"Local backend service for extracting job details from pasted job URLs.",
			},
			tags: [
				{ name: "System", description: "Operational backend endpoints." },
				{
					name: "Profile",
					description: "Candidate profile and synced default resume endpoints.",
				},
				{
					name: "Resumes",
					description: "Saved resume management endpoints.",
				},
				{
					name: "Job Postings",
					description: "Job posting intake and crawl lifecycle endpoints.",
				},
			],
		},
		transform: (input: any) => {
			const result = jsonSchemaTransform(input);
			if (
				(input.url === "/job-postings/:id/screenshot" ||
					input.url === "/job-postings/{id}/screenshot") &&
				result.schema?.response
			) {
				(result.schema.response as any)["200"] = {
					content: {
						"image/png": {
							schema: {
								type: "string",
								format: "binary",
							},
						},
					},
					description: "The captured screenshot PNG image.",
				};
			}
			return result;
		},
		transformObject: jsonSchemaTransformObject,
	});

	await server.register(swaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
	});
});
