import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import type { AIConfig } from "../config.js";
import {
	type CoverLetterDraft,
	coverLetterDraftSchema,
	type JobApplication,
	type JobFitBrief,
	jobFitBriefSchema,
	type ResumeEditProposal,
	resumeEditProposalSchema,
} from "@open-resume/contracts";

export function getModel(config: AIConfig): LanguageModel {
	const provider = config.provider;
	const apiKey = config.apiKey;
	const modelName = config.modelName;

	switch (provider) {
		case "openai":
			return createOpenAI({ apiKey })(modelName);
		case "google":
			return createGoogleGenerativeAI({ apiKey })(modelName);
		case "anthropic":
			return createAnthropic({ apiKey })(modelName);
		case "deepseek":
			return createOpenAI({
				apiKey,
				baseURL: "https://api.deepseek.com/v1",
			})(modelName);
		case "groq":
			return createOpenAI({
				apiKey,
				baseURL: "https://api.groq.com/openai/v1",
			})(modelName);
		case "ollama":
			return createOpenAI({
				baseURL: config.baseUrl || "http://localhost:11434/v1",
			})(modelName);
		case "lmstudio":
			return createOpenAI({
				baseURL: config.baseUrl || "http://localhost:1234/v1",
			})(modelName);
		case "custom":
			return createOpenAI({
				apiKey,
				baseURL: config.baseUrl,
			})(modelName);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

export function cleanJsonString(jsonString: string): string {
	let cleaned = jsonString.trim();
	const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
	if (match) {
		cleaned = match[1].trim();
	}
	return cleaned;
}

export function parseBulletsFromDescription(description?: string): string[] {
	if (!description) return [];
	const bullets: string[] = [];
	const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
	let match = regex.exec(description);
	while (match) {
		bullets.push(match[1].trim());
		match = regex.exec(description);
	}
	return bullets;
}

export function buildJobAnalysisPrompt(job: JobApplication, resume: any): string {
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
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description:
${job.description}

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

export function buildResumeTailoringPrompt(job: JobApplication, fitBrief: JobFitBrief, resume: any): string {
	const resumeDetails = {
		summary: resume.summary,
		experience: (resume.experience || []).map((exp: any) => ({
			id: exp.id,
			company: exp.company,
			role: exp.role,
			description: exp.description,
			bullets: exp.bullets || parseBulletsFromDescription(exp.description),
		})),
		skills: (resume.skills || []).map((s: any) => ({ id: s.id, category: s.category, items: s.items })),
		projects: (resume.projects || []).map((p: any) => ({ id: p.id, name: p.name, description: p.description })),
	};
	return `You are an expert resume writer and career coach.
Your task is to review the Job Description, the Job Fit Analysis, and the Candidate's Current Resume, and then generate concrete, targeted, and grounded editing proposals to tailor the resume for the job.

Do NOT rewrite the entire resume. Instead, generate specific, localized edit proposals (diffs) targeting particular fields or bullet points.

[JOB DESCRIPTION]
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description:
${job.description}

[JOB FIT ANALYSIS]
${JSON.stringify(fitBrief, null, 2)}

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

export function buildCoverLetterPrompt(job: JobApplication, fitBrief: JobFitBrief, resume: any): string {
	const fitDetails = {
		roleSummary: fitBrief.roleSummary,
		requirements: fitBrief.requirements,
		keywords: fitBrief.keywords,
		strengths: fitBrief.strengths,
	};
	return `You are an expert career advisor and copywriter.
Your task is to write a highly professional, compelling, and tailored cover letter draft for the candidate applying to the job described below.

[JOB DESCRIPTION]
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description:
${job.description}

[JOB FIT ANALYSIS]
${JSON.stringify(fitDetails, null, 2)}

[CANDIDATE TAILORED RESUME]
${JSON.stringify(resume, null, 2)}

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

export async function generateJobFitBrief(config: AIConfig, job: JobApplication, resume: any): Promise<JobFitBrief> {
	const prompt = buildJobAnalysisPrompt(job, resume);
	const supportsJson = ["openai", "google", "deepseek", "custom"].includes(config.provider);
	const { text } = await generateText({
		model: getModel(config),
		prompt,
		...(supportsJson ? { responseFormat: { type: "json" } as const } : {}),
	});
	const cleaned = cleanJsonString(text);
	const parsed = JSON.parse(cleaned);
	const fitBrief = { ...parsed, generatedAt: Date.now() };
	return jobFitBriefSchema.parse(fitBrief);
}

export async function generateResumeTailoring(config: AIConfig, job: JobApplication, fitBrief: JobFitBrief, resume: any): Promise<ResumeEditProposal[]> {
	const prompt = buildResumeTailoringPrompt(job, fitBrief, resume);
	const supportsJson = ["openai", "google", "deepseek", "custom"].includes(config.provider);
	const { text } = await generateText({
		model: getModel(config),
		prompt,
		...(supportsJson ? { responseFormat: { type: "json" } as const } : {}),
	});
	const cleaned = cleanJsonString(text);
	const parsed = JSON.parse(cleaned);
	if (!parsed || !Array.isArray(parsed.proposals)) {
		throw new Error("Invalid response format: expected a JSON object with a 'proposals' array.");
	}
	return parsed.proposals.map((p: any) => {
		const proposal = {
			...p,
			id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2, 15),
			status: "pending",
			createdAt: Date.now(),
		};
		return resumeEditProposalSchema.parse(proposal);
	});
}

export async function generateCoverLetter(config: AIConfig, job: JobApplication, fitBrief: JobFitBrief, resume: any): Promise<CoverLetterDraft> {
	const prompt = buildCoverLetterPrompt(job, fitBrief, resume);
	const supportsJson = ["openai", "google", "deepseek", "custom"].includes(config.provider);
	const { text } = await generateText({
		model: getModel(config),
		prompt,
		...(supportsJson ? { responseFormat: { type: "json" } as const } : {}),
	});
	const cleaned = cleanJsonString(text);
	const parsed = JSON.parse(cleaned);
	const draft = { ...parsed, generatedAt: Date.now(), updatedAt: Date.now() };
	return coverLetterDraftSchema.parse(draft);
}
