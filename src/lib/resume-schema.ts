import { z } from "zod";

export const personalInfoSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email address").or(z.literal("")),
	phone: z.string(),
	location: z.string(),
	website: z.string(),
});

export type PersonalInfo = z.infer<typeof personalInfoSchema>;

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
	bullets: z.array(z.string()),
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
});

export type Education = z.infer<typeof educationSchema>;

export const skillsSchema = z.object({
	id: z.string(),
	category: z.string(), // e.g., "Languages", "Frameworks"
	items: z.string(), // comma separated or array of strings, let's stick to a simple string for now e.g. "JavaScript, TypeScript"
});

export type SkillGroup = z.infer<typeof skillsSchema>;

export const resumeSchema = z.object({
	personalInfo: personalInfoSchema,
	sections: z.array(sectionSchema),
	experience: z.array(experienceSchema),
	education: z.array(educationSchema),
	skills: z.array(skillsSchema),
});

export type Resume = z.infer<typeof resumeSchema>;
