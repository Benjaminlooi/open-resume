import { describe, expect, it } from "vitest";
import { dummyResumeData } from "./dummy-resume";

describe("dummyResumeData", () => {
	it("uses Benjamin Looi's resume content instead of placeholder sample data", () => {
		expect(dummyResumeData.personalInfo).toMatchObject({
			fullName: "Benjamin Looi",
			email: "benjaminlooi97@gmail.com",
			phone: "+60 12-4065-711",
			location: "Based in Phnom Penh, Cambodia • From Malaysia",
		});
		expect(dummyResumeData.personalInfo.contactLinks).toEqual([
			{
				id: "contact-github",
				label: "GitHub",
				url: "github.com/benjaminlooi",
			},
			{
				id: "contact-website",
				label: "Website",
				url: "benjaminlooi.dev",
			},
		]);
		expect(dummyResumeData.sections.map((section) => section.id)).toEqual([
			"summary",
			"education",
			"experience",
			"projects",
			"skills",
			"certifications",
			"languages",
		]);
		expect(
			dummyResumeData.sections.find(
				(section) => section.id === "certifications",
			)?.visible,
		).toBe(false);
		expect(
			dummyResumeData.sections.find((section) => section.id === "languages")
				?.visible,
		).toBe(false);
		expect(dummyResumeData.education[0]).toMatchObject({
			institution: "Uniten, University Tenaga National",
			degree: "Diploma, Computer Science",
			gpa: "3.94/4.0 CGPA",
		});
		expect(dummyResumeData.experience.map((item) => item.company)).toEqual([
			"Sokha Tech",
			"TalentCloud AI",
			"OpensoftHR",
			"Platinum Code",
			"Plentisoft Sdn. Bhd",
		]);
		expect(dummyResumeData.projects.map((project) => project.name)).toEqual([
			"Baguette POS",
			"WOLE",
		]);
		expect(dummyResumeData.skills.map((skill) => skill.category)).toEqual([
			"Languages",
			"Frontend",
			"Backend",
			"Tools & DevOps",
		]);
	});
});
