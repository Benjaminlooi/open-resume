import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { streamText } from "ai";
import {
	jobApplicationSchema,
	jobFitBriefSchema,
	resumeEditProposalSchema,
	coverLetterDraftSchema,
} from "@open-resume/contracts";
import {
	generateJobFitBrief,
	generateResumeTailoring,
	generateCoverLetter,
	getModel,
} from "../job-postings/ai-generation.js";
import type { AIConfig } from "../config.js";

export function createAiRoutes(options: { aiConfig: AIConfig }): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.post(
			"/ai/fit-brief",
			{
				schema: {
					operationId: "aiFitBrief",
					tags: ["AI"],
					summary: "Generate Job Fit Brief",
					body: z.object({
						job: jobApplicationSchema,
						resume: z.record(z.string(), z.unknown()),
					}),
					response: {
						200: jobFitBriefSchema,
					},
				},
			},
			async (request) => {
				return await generateJobFitBrief(options.aiConfig, request.body.job, request.body.resume);
			}
		);

		typedServer.post(
			"/ai/tailor",
			{
				schema: {
					operationId: "aiTailor",
					tags: ["AI"],
					summary: "Generate Resume Tailoring Proposals",
					body: z.object({
						job: jobApplicationSchema,
						fitBrief: jobFitBriefSchema,
						resume: z.record(z.string(), z.unknown()),
					}),
					response: {
						200: z.object({
							proposals: z.array(resumeEditProposalSchema),
						}),
					},
				},
			},
			async (request) => {
				const proposals = await generateResumeTailoring(
					options.aiConfig,
					request.body.job,
					request.body.fitBrief,
					request.body.resume
				);
				return { proposals };
			}
		);

		typedServer.post(
			"/ai/cover-letter",
			{
				schema: {
					operationId: "aiCoverLetter",
					tags: ["AI"],
					summary: "Generate Cover Letter",
					body: z.object({
						job: jobApplicationSchema,
						fitBrief: jobFitBriefSchema,
						resume: z.record(z.string(), z.unknown()),
					}),
					response: {
						200: coverLetterDraftSchema,
					},
				},
			},
			async (request) => {
				return await generateCoverLetter(
					options.aiConfig,
					request.body.job,
					request.body.fitBrief,
					request.body.resume
				);
			}
		);

		typedServer.post(
			"/ai/chat",
			{
				schema: {
					operationId: "aiChatStream",
					tags: ["AI"],
					summary: "Stream AI Coach Suggestions",
					body: z.object({
						messages: z.array(
							z.object({
								role: z.enum(["user", "assistant", "system", "tool"]),
								content: z.any(),
								_toolCalls: z.array(z.any()).optional(),
							})
						),
						context: z.record(z.string(), z.unknown()),
					}),
				},
			},
			async (request, reply) => {
				const { messages, context } = request.body;

				const coreMessages = messages.flatMap((m) => {
					if (m.role === "user")
						return { role: "user" as const, content: m.content as string };

					if (m.role === "assistant") {
						const parts: any[] = [];
						if (typeof m.content === "string") {
							parts.push({ type: "text", text: m.content });
						}
						if (m._toolCalls && m._toolCalls.length > 0) {
							m._toolCalls.forEach((tc: any) => {
								parts.push({
									type: "tool-call",
									toolCallId: tc.toolCallId,
									toolName: tc.toolName,
									args: tc.args,
								});
							});
						}
						const msgs: any[] = [{ role: "assistant", content: parts.length > 0 ? parts : m.content }];
						if (m._toolCalls && m._toolCalls.length > 0) {
							const resultParts = m._toolCalls.map((tc: any) => ({
								type: "tool-result",
								toolCallId: tc.toolCallId,
								toolName: tc.toolName,
								result: tc.args,
							}));
							msgs.push({ role: "tool", content: resultParts });
						}
						return msgs;
					}
					return m as any;
				});

				const systemPrompt = `You are an expert resume coach and reviewer.
The user is updating their resume for the following context:
${JSON.stringify(context, null, 2)}

YOUR WORKFLOW:
1. Discuss, critique, and provide *draft* bullet points in plain markdown text. 
2. Ask for the user's feedback on your drafts.
3. Iterate based on their feedback.
4. **CRITICAL:** Wait for the user to explicitly confirm they are satisfied with a final set of bullet points (e.g., "Yes, that looks good", "Let's apply those").
5. **ONLY** after receiving explicit confirmation, use the \`propose_resume_update\` tool to finalize the changes.

DO NOT use the \`propose_resume_update\` tool during the drafting or brainstorming phase. ONLY use it when the user asks to apply or finalize the agreed-upon bullets.`;

				const model = getModel(options.aiConfig);
				const result = streamText({
					model,
					system: systemPrompt,
					messages: coreMessages,
					tools: {
						propose_resume_update: {
							description: "Propose a new set of resume bullet points.",
							inputSchema: z.object({
								bullets: z
									.array(z.string())
									.describe(
										"An array of proposed resume bullet points. Each string should be a single bullet point. Do not include HTML tags."
									),
							}),
						},
					},
				});

				reply.raw.writeHead(200, {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					"Connection": "keep-alive",
				});

				try {
					for await (const chunk of result.fullStream) {
						reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
					}
				} catch (err) {
					request.log.error(err, "Error streaming chat response");
				} finally {
					reply.raw.end();
				}
			}
		);
	};
}
