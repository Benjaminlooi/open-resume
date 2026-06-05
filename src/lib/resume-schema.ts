import { z } from "zod";

export const personalInfoSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email address").or(z.literal("")),
	phone: z.string(),
	location: z.string(),
	contactLinks: z.array(
		z.object({
			id: z.string(),
			label: z.string(),
			url: z.string(),
		}),
	),
});

export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type ContactLink = PersonalInfo["contactLinks"][number];

export const sectionSchema = z.object({
	id: z.string(),
	name: z.string(),
	visible: z.boolean(),
});

export type Section = z.infer<typeof sectionSchema>;

export const experienceSchema = z.object({
	id: z.string(),
	company: z.string(),
	role: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	location: z.string(),
	bullets: z.array(z.string()).optional(),
	description: z.string().optional(),
});

export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
	id: z.string(),
	institution: z.string(),
	degree: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	location: z.string(),
	gpa: z.string().optional(),
	bullets: z.array(z.string()).optional(),
	description: z.string().optional(),
});

export type Education = z.infer<typeof educationSchema>;

export const skillsSchema = z.object({
	id: z.string(),
	category: z.string(), // e.g., "Languages", "Frameworks"
	items: z.string(), // comma separated or array of strings, let's stick to a simple string for now e.g. "JavaScript, TypeScript"
});

export type SkillGroup = z.infer<typeof skillsSchema>;

export const projectSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string(),
	date: z.string(),
	description: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;

export const certificationSchema = z.object({
	id: z.string(),
	name: z.string(),
	issuer: z.string(),
	date: z.string(),
});

export type Certification = z.infer<typeof certificationSchema>;

export const languageSchema = z.object({
	id: z.string(),
	language: z.string(),
	proficiency: z.string(),
});

export type Language = z.infer<typeof languageSchema>;

export const resumeSchema = z.object({
	personalInfo: personalInfoSchema,
	summary: z.string().optional().default(""),
	sections: z.array(sectionSchema),
	experience: z.array(experienceSchema),
	education: z.array(educationSchema),
	skills: z.array(skillsSchema),
	projects: z.array(projectSchema).optional().default([]),
	certifications: z.array(certificationSchema).optional().default([]),
	languages: z.array(languageSchema).optional().default([]),
});

export type Resume = z.infer<typeof resumeSchema>;
