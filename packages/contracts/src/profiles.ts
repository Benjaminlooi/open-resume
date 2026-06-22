import { z } from "zod";

export const targetRoleArchetypeSchema = z
	.object({
		name: z.string(),
		level: z.string(),
		fit: z.enum(["primary", "secondary", "adjacent"]),
	})
	.strict();

export type TargetRoleArchetype = z.infer<typeof targetRoleArchetypeSchema>;

export const candidateProfileSchema = z
	.object({
		candidate: z
			.object({
				fullName: z.string(),
				email: z.string(),
				phone: z.string(),
				location: z.string(),
				linkedin: z.string(),
				portfolioUrl: z.string(),
				github: z.string(),
				twitter: z.string().optional(),
			})
			.strict(),
		targetRoles: z
			.object({
				primary: z.array(z.string()),
				archetypes: z.array(targetRoleArchetypeSchema),
			})
			.strict(),
		narrative: z
			.object({
				headline: z.string(),
				exitStory: z.string(),
				superpowers: z.array(z.string()),
				proofPoints: z.array(
					z
						.object({
							name: z.string(),
							url: z.string(),
							heroMetric: z.string(),
						})
						.strict(),
				),
			})
			.strict(),
		compensation: z
			.object({
				targetRange: z.string(),
				currency: z.string(),
				minimum: z.string(),
				preferred: z.string(),
				locationFlexibility: z.string(),
			})
			.strict(),
		location: z
			.object({
				country: z.string(),
				city: z.string(),
				timezone: z.string(),
				visaStatus: z.string(),
				onsiteAvailability: z.string(),
				remotePolicy: z.string(),
			})
			.strict(),
	})
	.strict();

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
