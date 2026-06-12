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
				title: "Open Resume Companion API",
				version: "0.1.0",
				description:
					"Local companion service for extracting job details from pasted job URLs.",
			},
			tags: [
				{ name: "System", description: "Operational companion endpoints." },
				{
					name: "Profile",
					description: "Candidate profile and synced default resume endpoints.",
				},
				{
					name: "Resumes",
					description: "Saved resume management endpoints.",
				},
				{
					name: "Jobs",
					description: "Companion job intake and crawl lifecycle endpoints.",
				},
			],
		},
		transform: jsonSchemaTransform,
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
