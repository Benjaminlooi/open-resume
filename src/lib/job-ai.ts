import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
	type CoverLetterDraft,
	coverLetterDraftSchema,
	type JobApplication,
	type JobFitBrief,
	jobFitBriefSchema,
	type ResumeEditProposal,
	resumeEditProposalSchema,
} from "./job-application-schema";
import type { Resume } from "./resume-schema";
import type { AIProvider } from "./settings-store";

export interface ProviderConfig {
	provider: AIProvider;
	apiKey?: string;
	baseUrl?: string;
	modelName?: string;
}

/**
 * Helper to clean up markdown JSON blocks and parse the JSON string.
 */
export function cleanJsonString(jsonString: string): string {
	let cleaned = jsonString.trim();

	// If it contains ```json ... ``` or ``` ... ```, extract just the content between them.
	const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
	if (match) {
		cleaned = match[1].trim();
	}

	return cleaned;
}

/**
 * Prompt-building helper for Job Fit Brief analysis.
 */
export function buildJobAnalysisPrompt(
	job: JobApplication,
	resume: Resume,
): string {
	const jobDetails = {
		company: job.company,
		title: job.title,
		location: job.location,
		description: job.description,
	};

	const resumeDetails = {
		personalInfo: resume.personalInfo,
		summary: resume.summary,
		experience: resume.experience,
		education: resume.education,
		skills: resume.skills,
		projects: resume.projects,
		certifications: resume.certifications,
		languages: resume.languages,
	};

	return `You are an expert technical recruiter and resume analyzer.
Your task is to analyze the following Job Description against the Candidate's Resume.

[JOB DESCRIPTION]
Company: ${jobDetails.company}
Title: ${jobDetails.title}
Location: ${jobDetails.location}
Description:
${jobDetails.description}

[CANDIDATE RESUME]
${JSON.stringify(resumeDetails, null, 2)}

Instructions:
1. Analyze the job description and candidate resume.
2. Under no circumstances should you invent, exaggerate, or fabricate any experience, skills, roles, or credentials for the candidate. Keep the analysis strictly grounded in the provided resume.
3. Return a JSON object with the following fields:
   - "roleSummary": A brief summary of the role and what it entails.
   - "requirements": List of key requirements extracted from the job description.
   - "keywords": List of important keywords (technologies, methodologies, skills) from the job description.
   - "strengths": List of areas/skills where the candidate's resume matches the job description.
   - "gaps": List of gaps in candidate's profile relative to the job requirements (e.g. missing skills, less experience).
   - "risks": List of risks or concerns (e.g. lack of experience in a specific domain, short tenures, mismatched industries).
   - "nextActions": List of recommended next steps for the candidate to address gaps or prepare for the role.

Return ONLY a valid JSON object matching the specifications above. Do not include any other text or markdown wrappers except the JSON itself.`;
}

/**
 * Prompt-building helper for Resume Tailoring Proposals.
 */
export function buildResumeTailoringPrompt(
	job: JobApplication,
	fitBrief: JobFitBrief,
	tailoredResume: Resume,
): string {
	const jobDetails = {
		company: job.company,
		title: job.title,
		location: job.location,
		description: job.description,
	};

	const fitDetails = {
		roleSummary: fitBrief.roleSummary,
		requirements: fitBrief.requirements,
		keywords: fitBrief.keywords,
		strengths: fitBrief.strengths,
		gaps: fitBrief.gaps,
		risks: fitBrief.risks,
	};

	const resumeDetails = {
		summary: tailoredResume.summary,
		experience: tailoredResume.experience.map((exp) => ({
			id: exp.id,
			company: exp.company,
			role: exp.role,
			description: exp.description,
			bullets: exp.bullets,
		})),
		skills: tailoredResume.skills.map((s) => ({
			id: s.id,
			category: s.category,
			items: s.items,
		})),
		projects:
			tailoredResume.projects?.map((p) => ({
				id: p.id,
				name: p.name,
				description: p.description,
			})) ?? [],
	};

	return `You are an expert resume writer and career coach.
Your task is to review the Job Description, the Job Fit Analysis, and the Candidate's Current Resume, and then generate concrete, targeted, and grounded editing proposals to tailor the resume for the job.

Do NOT rewrite the entire resume. Instead, generate specific, localized edit proposals (diffs) targeting particular fields or bullet points.

[JOB DESCRIPTION]
Company: ${jobDetails.company}
Title: ${jobDetails.title}
Location: ${jobDetails.location}
Description:
${jobDetails.description}

[JOB FIT ANALYSIS]
${JSON.stringify(fitDetails, null, 2)}

[CANDIDATE CURRENT RESUME (SERIALIZED WITH IDs)]
${JSON.stringify(resumeDetails, null, 2)}

Instructions:
1. Identify areas of the resume (summary, experience fields/bullets, skills list, project descriptions) that can be optimized to better match the job requirements.
2. IMPORTANT rules for suggested edits:
   - Strictly ground all suggestions in the candidate's actual experience and the provided resume.
   - Do NOT fabricate credentials, jobs, projects, technologies, or experience.
   - You must refer ONLY to the IDs of existing experiences, skills, or projects provided in the serialized resume. Do NOT invent new IDs or items.
   - For any target, the "currentText" field in your proposal MUST match the existing text exactly.
3. Return a JSON object with a "proposals" array, where each element is an object with:
   - "target": The target section/item to edit. The target object MUST match one of the following schemas:
     - { "section": "summary" }
     - { "section": "experience", "itemId": "ITEM_ID", "field": "role" }
     - { "section": "experience", "itemId": "ITEM_ID", "field": "description" }
     - { "section": "experience", "itemId": "ITEM_ID", "field": "bullet", "bulletIndex": number } (0-indexed index of the bullet point)
     - { "section": "skills", "itemId": "ITEM_ID", "field": "items" }
     - { "section": "projects", "itemId": "ITEM_ID", "field": "description" }
   - "currentText": The exact current text in that field/bullet point.
   - "suggestedText": The proposed new text, tailored to the job description without fabricating credentials.
   - "rationale": A brief explanation of why this change is suggested.

Return ONLY a valid JSON object of the format:
{
  "proposals": [
    {
      "target": { ... },
      "currentText": "...",
      "suggestedText": "...",
      "rationale": "..."
    }
  ]
}
Do not include any other text or markdown wrappers except the JSON itself.`;
}

/**
 * Prompt-building helper for Cover Letter generation.
 */
export function buildCoverLetterPrompt(
	job: JobApplication,
	fitBrief: JobFitBrief,
	tailoredResume: Resume,
): string {
	const jobDetails = {
		company: job.company,
		title: job.title,
		location: job.location,
		description: job.description,
	};

	const fitDetails = {
		roleSummary: fitBrief.roleSummary,
		requirements: fitBrief.requirements,
		keywords: fitBrief.keywords,
		strengths: fitBrief.strengths,
	};

	return `You are an expert career advisor and copywriter.
Your task is to write a highly professional, compelling, and tailored cover letter draft for the candidate applying to the job described below.

[JOB DESCRIPTION]
Company: ${jobDetails.company}
Title: ${jobDetails.title}
Location: ${jobDetails.location}
Description:
${jobDetails.description}

[JOB FIT ANALYSIS]
${JSON.stringify(fitDetails, null, 2)}

[CANDIDATE TAILORED RESUME]
${JSON.stringify(tailoredResume, null, 2)}

Instructions:
1. The cover letter must be professional, standard, and tailored specifically to the company and the role description.
2. Strictly ground the cover letter in the candidate's actual experience and credentials from the provided resume. Do NOT fabricate, invent, or exaggerate any experience, projects, degrees, or skills.
3. Use clean markdown formatting for paragraphs and signatures (e.g. bolding, line breaks).
4. Return a JSON object containing a "content" field with the cover letter text:
   {
     "content": "..."
   }

Return ONLY a valid JSON object. Do not include any other text or markdown wrappers except the JSON itself.`;
}

/**
 * Parsing helper for Job Fit Brief.
 */
export function parseJobFitBrief(jsonString: string): JobFitBrief {
	const cleaned = cleanJsonString(jsonString);
	let parsed: unknown;
	try {
		parsed = JSON.parse(cleaned);
	} catch (e) {
		throw new Error(
			`Failed to parse Job Fit Brief JSON: ${e instanceof Error ? e.message : String(e)}`,
		);
	}

	if (!parsed || typeof parsed !== "object") {
		throw new Error("Invalid Job Fit Brief format: expected an object");
	}

	const fitBrief = {
		...(parsed as Record<string, unknown>),
		generatedAt: Date.now(),
	};

	const validated = jobFitBriefSchema.safeParse(fitBrief);
	if (!validated.success) {
		const issues = validated.error.issues
			.map((i) => `${i.path.join(".")}: ${i.message}`)
			.join(", ");
		throw new Error(`Invalid Job Fit Brief format: ${issues}`);
	}

	return validated.data;
}

/**
 * Parsing helper for Resume Edit Proposals.
 */
export function parseResumeEditProposals(
	jsonString: string,
	tailoredResume: Resume,
): ResumeEditProposal[] {
	const cleaned = cleanJsonString(jsonString);
	let parsed: unknown;
	try {
		parsed = JSON.parse(cleaned);
	} catch (e) {
		throw new Error(
			`Failed to parse AI tailoring proposals JSON: ${
				e instanceof Error ? e.message : String(e)
			}`,
		);
	}

	if (
		!parsed ||
		typeof parsed !== "object" ||
		!("proposals" in parsed) ||
		!Array.isArray((parsed as Record<string, unknown>).proposals)
	) {
		throw new Error(
			"Invalid response format: expected a JSON object with a 'proposals' array.",
		);
	}

	const proposals: ResumeEditProposal[] = [];
	const rawProposals = (parsed as { proposals: unknown[] }).proposals;
	for (const rawProposal of rawProposals) {
		const proposalId =
			globalThis.crypto?.randomUUID?.() ??
			Math.random().toString(36).substring(2, 15);
		const proposal = {
			...(rawProposal as Record<string, unknown>),
			id: proposalId,
			status: "pending",
			createdAt: Date.now(),
		};

		const validated = resumeEditProposalSchema.safeParse(proposal);
		if (!validated.success) {
			const issues = validated.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join(", ");
			throw new Error(`Invalid proposal format: ${issues}`);
		}

		const data = validated.data;
		const target = data.target;

		if (target.section === "summary") {
			// Always valid
		} else if (target.section === "experience") {
			const item = tailoredResume.experience.find(
				(e) => e.id === target.itemId,
			);
			if (!item) {
				throw new Error(
					`Target experience item with ID '${target.itemId}' not found in resume.`,
				);
			}
			if (target.field === "bullet") {
				const bullets = item.bullets ?? [];
				if (target.bulletIndex < 0 || target.bulletIndex >= bullets.length) {
					throw new Error(
						`Bullet index ${target.bulletIndex} out of bounds for experience item '${target.itemId}' (total bullets: ${bullets.length}).`,
					);
				}
			}
		} else if (target.section === "skills") {
			const item = tailoredResume.skills.find((s) => s.id === target.itemId);
			if (!item) {
				throw new Error(
					`Target skills item with ID '${target.itemId}' not found in resume.`,
				);
			}
		} else if (target.section === "projects") {
			const item = tailoredResume.projects?.find((p) => p.id === target.itemId);
			if (!item) {
				throw new Error(
					`Target project item with ID '${target.itemId}' not found in resume.`,
				);
			}
		} else {
			throw new Error(
				`Unsupported target section: ${(target as { section: string }).section}`,
			);
		}

		proposals.push(data);
	}

	return proposals;
}

/**
 * Parsing helper for Cover Letter draft.
 */
export function parseCoverLetterDraft(jsonString: string): CoverLetterDraft {
	const cleaned = cleanJsonString(jsonString);
	let parsed: unknown;
	try {
		parsed = JSON.parse(cleaned);
	} catch (e) {
		throw new Error(
			`Failed to parse Cover Letter JSON: ${e instanceof Error ? e.message : String(e)}`,
		);
	}

	if (!parsed || typeof parsed !== "object") {
		throw new Error("Invalid Cover Letter format: expected an object");
	}

	const now = Date.now();
	const coverLetterDraft = {
		...(parsed as Record<string, unknown>),
		generatedAt: now,
		updatedAt: now,
	};

	const validated = coverLetterDraftSchema.safeParse(coverLetterDraft);
	if (!validated.success) {
		const issues = validated.error.issues
			.map((i) => `${i.path.join(".")}: ${i.message}`)
			.join(", ");
		throw new Error(`Invalid Cover Letter format: ${issues}`);
	}

	return validated.data;
}

/**
 * Constructs the appropriate model using AI SDK provider creators.
 */
export function getModel(config: ProviderConfig) {
	const provider = config.provider;
	const isLocal = provider === "ollama" || provider === "lmstudio";
	const apiKey = config.apiKey || (isLocal ? "dummy" : undefined);
	const baseUrl = config.baseUrl;
	const modelName = config.modelName;

	if (!apiKey && !isLocal) {
		throw new Error(
			`API Key is missing for provider '${provider}'. Please configure it in Settings.`,
		);
	}

	switch (provider) {
		case "openai":
			return createOpenAI({ apiKey })(modelName || "gpt-4o-mini");
		case "anthropic":
			return createAnthropic({ apiKey })(
				modelName || "claude-3-5-haiku-latest",
			);
		case "google":
			return createGoogleGenerativeAI({ apiKey })(
				modelName || "gemini-1.5-flash",
			);
		case "deepseek":
			return createOpenAI({
				apiKey,
				baseURL: baseUrl || "https://api.deepseek.com/v1",
			})(modelName || "deepseek-chat");
		case "groq":
			return createOpenAI({
				apiKey,
				baseURL: baseUrl || "https://api.groq.com/openai/v1",
			})(modelName || "llama3-8b-8192");
		case "ollama":
		case "lmstudio":
			if (!baseUrl || !modelName) {
				throw new Error(
					`Base URL and Model name are required for local provider '${provider}'.`,
				);
			}
			return createOpenAI({ apiKey: "dummy-key", baseURL: baseUrl })(modelName);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Generate Job Fit Brief from job application and resume.
 */
export async function generateJobFitBrief(
	config: ProviderConfig,
	job: JobApplication,
	resume: Resume,
): Promise<JobFitBrief> {
	const prompt = buildJobAnalysisPrompt(job, resume);
	const supportsJson = [
		"openai",
		"google",
		"deepseek",
		"groq",
		"ollama",
		"lmstudio",
	].includes(config.provider);
	try {
		const { text } = await generateText({
			model: getModel(config),
			prompt,
			...(supportsJson ? { responseFormat: { type: "json" } as const } : {}),
		});
		return parseJobFitBrief(text);
	} catch (error) {
		throw new Error(
			`Job fit analysis generation failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

/**
 * Generate Resume Tailoring proposals.
 */
export async function generateResumeTailoring(
	config: ProviderConfig,
	job: JobApplication,
	fitBrief: JobFitBrief,
	resume: Resume,
): Promise<ResumeEditProposal[]> {
	const prompt = buildResumeTailoringPrompt(job, fitBrief, resume);
	const supportsJson = [
		"openai",
		"google",
		"deepseek",
		"groq",
		"ollama",
		"lmstudio",
	].includes(config.provider);
	try {
		const { text } = await generateText({
			model: getModel(config),
			prompt,
			...(supportsJson ? { responseFormat: { type: "json" } as const } : {}),
		});
		return parseResumeEditProposals(text, resume);
	} catch (error) {
		throw new Error(
			`Resume tailoring generation failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

/**
 * Generate Cover Letter draft.
 */
export async function generateCoverLetter(
	config: ProviderConfig,
	job: JobApplication,
	fitBrief: JobFitBrief,
	resume: Resume,
): Promise<CoverLetterDraft> {
	const prompt = buildCoverLetterPrompt(job, fitBrief, resume);
	const supportsJson = [
		"openai",
		"google",
		"deepseek",
		"groq",
		"ollama",
		"lmstudio",
	].includes(config.provider);
	try {
		const { text } = await generateText({
			model: getModel(config),
			prompt,
			...(supportsJson ? { responseFormat: { type: "json" } as const } : {}),
		});
		return parseCoverLetterDraft(text);
	} catch (error) {
		throw new Error(
			`Cover letter generation failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}
