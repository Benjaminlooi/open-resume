import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type {
	CoverLetterDraft,
	JobApplication,
	JobFitBrief,
	ResumeEditProposal,
} from "./job-application-schema";
import {
	jobFitBriefSchema,
	resumeEditTargetSchema,
} from "./job-application-schema";
import type { Resume } from "./resume-schema";
import type { AIProvider } from "./settings-store";

export interface ParseResult<T> {
	ok: boolean;
	value?: T;
	error?: string;
}

export interface JobAIProviderConfig {
	provider: AIProvider;
	apiKey?: string;
	baseUrl?: string;
	modelName?: string;
}

const artifactRules = [
	"Return only valid JSON. Do not wrap the response in markdown.",
	"Do not invent employers, achievements, dates, credentials, tools, or metrics.",
	"Ground every recommendation in the supplied resume and job description.",
	"Prefer concrete wording improvements over broad career advice.",
].join("\n");

const publicJobFields = (job: JobApplication) => ({
	company: job.company,
	title: job.title,
	location: job.location,
	sourceUrl: job.sourceUrl,
	description: job.description,
});

export const buildJobAnalysisPrompt = (
	job: JobApplication,
	resume: Resume,
) => `Analyze this job against the candidate's existing resume.

${artifactRules}

Return this exact JSON shape:
{
	"roleSummary": "one concise paragraph",
	"requirements": ["requirement from job description"],
	"keywords": ["ATS keyword or phrase"],
	"strengths": ["resume-backed strength"],
	"gaps": ["honest gap or unknown"],
	"risks": ["application risk to consider"],
	"nextActions": ["human action before tailoring"]
}

Job:
${JSON.stringify(publicJobFields(job), null, 2)}

Resume:
${JSON.stringify(resume, null, 2)}`;

export const buildResumeTailoringPrompt = (
	job: JobApplication,
	fitBrief: JobFitBrief,
	tailoredResume: Resume,
) => `Propose human-reviewed edits for this tailored resume snapshot.

${artifactRules}

Return this exact JSON shape:
{
	"proposals": [
		{
			"target": { "section": "summary" },
			"currentText": "existing text copied exactly",
			"suggestedText": "replacement text",
			"rationale": "why this helps for this job"
		}
	]
}

Allowed targets:
- { "section": "summary" }
- { "section": "experience", "itemId": "...", "field": "role" }
- { "section": "experience", "itemId": "...", "field": "description" }
- { "section": "experience", "itemId": "...", "field": "bullet", "bulletIndex": 0 }
- { "section": "skills", "itemId": "...", "field": "items" }
- { "section": "projects", "itemId": "...", "field": "description" }

Do not rewrite the whole resume. Propose only high-confidence edits.

Job:
${JSON.stringify(publicJobFields(job), null, 2)}

Fit brief:
${JSON.stringify(fitBrief, null, 2)}

Tailored resume snapshot:
${JSON.stringify(tailoredResume, null, 2)}`;

export const buildCoverLetterPrompt = (
	job: JobApplication,
	fitBrief: JobFitBrief,
	tailoredResume: Resume,
) => `Draft a concise cover letter for this application.

${artifactRules}

Return this exact JSON shape:
{
	"content": "cover letter text with paragraphs separated by blank lines"
}

Use a natural, specific tone. Keep it under 400 words. Do not claim experience that is not present in the resume.

Job:
${JSON.stringify(publicJobFields(job), null, 2)}

Fit brief:
${JSON.stringify(fitBrief, null, 2)}

Tailored resume snapshot:
${JSON.stringify(tailoredResume, null, 2)}`;

const extractJson = (input: string): unknown => {
	const trimmed = input.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced?.[1] ?? trimmed;
	return JSON.parse(candidate);
};

export const parseJobFitBrief = (input: string): ParseResult<JobFitBrief> => {
	try {
		const parsed = jobFitBriefSchema
			.omit({ generatedAt: true })
			.parse(extractJson(input));
		return {
			ok: true,
			value: { ...parsed, generatedAt: Date.now() },
		};
	} catch (_error) {
		return {
			ok: false,
			error:
				"AI returned invalid job analysis JSON. Regenerate or edit the response.",
		};
	}
};

export const parseResumeEditProposals = (
	input: string,
): ParseResult<ResumeEditProposal[]> => {
	try {
		const json = extractJson(input) as { proposals?: unknown[] };
		if (!Array.isArray(json.proposals)) {
			return {
				ok: false,
				error: "AI tailoring response must include a proposals array.",
			};
		}
		const timestamp = Date.now();
		const proposals = json.proposals.map((proposal, index) => {
			const value = proposal as {
				target?: unknown;
				currentText?: unknown;
				suggestedText?: unknown;
				rationale?: unknown;
			};
			return {
				id: globalThis.crypto?.randomUUID?.() ?? `proposal-${timestamp}-${index}`,
				target: resumeEditTargetSchema.parse(value.target),
				currentText: String(value.currentText ?? ""),
				suggestedText: String(value.suggestedText ?? ""),
				rationale: String(value.rationale ?? ""),
				status: "pending" as const,
				createdAt: timestamp,
			};
		});
		return { ok: true, value: proposals };
	} catch (_error) {
		return {
			ok: false,
			error:
				"AI returned unsupported resume edit targets. Regenerate with the allowed target schema.",
		};
	}
};

export const parseCoverLetterDraft = (
	input: string,
): ParseResult<CoverLetterDraft> => {
	try {
		const json = extractJson(input) as { content?: unknown };
		if (typeof json.content !== "string" || !json.content.trim()) {
			return {
				ok: false,
				error: "AI cover letter response must include non-empty content.",
			};
		}
		const timestamp = Date.now();
		return {
			ok: true,
			value: {
				content: json.content,
				generatedAt: timestamp,
				updatedAt: timestamp,
			},
		};
	} catch (_error) {
		return {
			ok: false,
			error:
				"AI returned invalid cover letter JSON. Regenerate or edit the response.",
		};
	}
};

const createModel = (config: JobAIProviderConfig) => {
	switch (config.provider) {
		case "openai":
			return createOpenAI({ apiKey: config.apiKey })(
				config.modelName ?? "gpt-4o-mini",
			);
		case "anthropic":
			return createAnthropic({ apiKey: config.apiKey })(
				config.modelName ?? "claude-3-5-haiku-latest",
			);
		case "google":
			return createGoogleGenerativeAI({ apiKey: config.apiKey })(
				config.modelName ?? "gemini-1.5-flash",
			);
		case "deepseek":
			return createOpenAI({
				apiKey: config.apiKey,
				baseURL: "https://api.deepseek.com/v1",
			})(config.modelName ?? "deepseek-chat");
		case "groq":
			return createOpenAI({
				apiKey: config.apiKey,
				baseURL: "https://api.groq.com/openai/v1",
			})(config.modelName ?? "llama3-8b-8192");
		case "ollama":
		case "lmstudio":
			if (!config.baseUrl || !config.modelName) {
				throw new Error("Local AI providers require baseUrl and modelName.");
			}
			return createOpenAI({ apiKey: "dummy-key", baseURL: config.baseUrl })(
				config.modelName,
			);
		default: {
			const exhaustive: never = config.provider;
			throw new Error(`Unsupported AI provider: ${exhaustive}`);
		}
	}
};

export const generateJobFitBrief = async (
	config: JobAIProviderConfig,
	job: JobApplication,
	resume: Resume,
) => {
	const result = await generateText({
		model: createModel(config),
		prompt: buildJobAnalysisPrompt(job, resume),
	});
	return parseJobFitBrief(result.text);
};

export const generateResumeEditProposals = async (
	config: JobAIProviderConfig,
	job: JobApplication,
	fitBrief: JobFitBrief,
	tailoredResume: Resume,
) => {
	const result = await generateText({
		model: createModel(config),
		prompt: buildResumeTailoringPrompt(job, fitBrief, tailoredResume),
	});
	return parseResumeEditProposals(result.text);
};

export const generateCoverLetterDraft = async (
	config: JobAIProviderConfig,
	job: JobApplication,
	fitBrief: JobFitBrief,
	tailoredResume: Resume,
) => {
	const result = await generateText({
		model: createModel(config),
		prompt: buildCoverLetterPrompt(job, fitBrief, tailoredResume),
	});
	return parseCoverLetterDraft(result.text);
};
