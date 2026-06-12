import { existsSync, readFileSync } from "node:fs";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { AIConfig } from "../config.js";

export interface JobFitBrief {
	roleSummary: string;
	requirements: string[];
	keywords: string[];
	strengths: string[];
	gaps: string[];
	risks: string[];
	nextActions: string[];
	generatedAt: number;
}

export interface AIAnalysisResult {
	title: string;
	company: string;
	location: string;
	description: string;
	fitScore: number;
	fitBrief: JobFitBrief;
}

const fitBriefOutputSchema = z.object({
	roleSummary: z.string(),
	requirements: z.array(z.string()),
	keywords: z.array(z.string()),
	strengths: z.array(z.string()),
	gaps: z.array(z.string()),
	risks: z.array(z.string()),
	nextActions: z.array(z.string()),
});

const aiAnalysisOutputSchema = z.object({
	title: z.string(),
	company: z.string(),
	location: z.string(),
	description: z.string(),
	fitScore: z.number().min(0).max(100),
	fitBrief: fitBriefOutputSchema,
});

export async function analyzeJobPosting(input: {
	profilePath: string;
	resumePath?: string;
	resumeContent?: string;
	cleanedText: string;
	aiConfig: AIConfig;
}): Promise<AIAnalysisResult> {
	if (!existsSync(input.profilePath)) {
		throw new Error(
			"Candidate profile not found. Please set up your profile in the settings panel.",
		);
	}
	if (
		input.resumeContent === undefined &&
		(!input.resumePath || !existsSync(input.resumePath))
	) {
		throw new Error(
			"Synced default resume not found. Please sync your resume in the settings panel.",
		);
	}

	const profileContent = readFileSync(input.profilePath, "utf8").trim();
	if (!profileContent) {
		throw new Error("Candidate profile is empty.");
	}

	let resumeContent: string;
	if (input.resumeContent !== undefined) {
		resumeContent = input.resumeContent.trim();
	} else {
		const resumePath = input.resumePath as string;
		resumeContent = readFileSync(resumePath, "utf8").trim();
	}
	if (!resumeContent) {
		throw new Error("Synced default resume is empty.");
	}

	const { provider, apiKey, modelName } = input.aiConfig;
	let modelInstance: any;

	if (provider === "openai") {
		const openai = createOpenAI({ apiKey });
		modelInstance = openai(modelName);
	} else if (provider === "google") {
		const google = createGoogleGenerativeAI({ apiKey });
		modelInstance = google(modelName);
	} else if (provider === "anthropic") {
		const anthropic = createAnthropic({ apiKey });
		modelInstance = anthropic(modelName);
	} else if (provider === "deepseek") {
		const deepseek = createOpenAI({
			apiKey,
			baseURL: "https://api.deepseek.com/v1",
		});
		modelInstance = deepseek(modelName);
	} else {
		throw new Error(`Unsupported AI provider: ${provider}`);
	}

	const systemPrompt = `
You are an expert technical recruiter and career coach. Your task is to analyze the following job posting and evaluate how well it matches the candidate's target roles, experience level, superpowers, location preferences, remote policy, and compensation requirements.

Candidate Profile:
${profileContent}

Candidate Default Resume:
${resumeContent}

Career-Ops Evaluation Rubric:
1. Target Roles/Archetypes Match: Does the job align with candidate's target roles and preferred level/archetype?
2. Exit Story/Superpowers: Can the candidate's core narrative and exit story be framed well for this role? Do they have proof points?
3. Location/Timezone/Remote Flex: Does the job match candidate's location restrictions, remote policy, and visa status?
4. Compensation: Does the role fit candidate's minimum and preferred compensation thresholds?
5. Red Flags/Blockers: Identify any critical mismatches (e.g. visa requirements not met, strict onsite policy, low pay, skills hard blockers).

Score Calculation:
Calculate an aggregate compatibility score from 0 to 100 based on these dimensions.
- 90-100: Exceptional match across all alignment dimensions.
- 70-89: Good match, strong candidate fit, some minor tradeoffs.
- 50-69: Moderate match, notable gaps or risks, requires compromises.
- <50: Critical blocker or significant misalignment.

Ensure the returned output has:
- title: The official job title.
- company: The hiring company name.
- location: Location of the job.
- description: Markdown job description parsed/cleaned from the job posting text.
- fitScore: Score between 0 and 100.
- fitBrief: A brief containing roleSummary, requirements, keywords, strengths, gaps, risks, nextActions.
`;

	const { object } = await generateObject({
		model: modelInstance,
		schema: aiAnalysisOutputSchema,
		system: systemPrompt,
		prompt: `Analyze this job posting cleaned text:\n\n${input.cleanedText}`,
	});

	return {
		...object,
		fitBrief: {
			...object.fitBrief,
			generatedAt: Date.now(),
		},
	};
}
