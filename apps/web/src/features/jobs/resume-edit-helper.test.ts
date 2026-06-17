import { describe, expect, it } from "vitest";
import {
	parseBulletsFromHtml,
	applyProposalToResume,
	getStaleProposalWarning,
} from "./resume-edit-helper";
import type { Resume } from "#/lib/resume-schema";

describe("resume-edit-helper", () => {
	describe("parseBulletsFromHtml", () => {
		it("should parse list items from html string", () => {
			const html = "<ul><li>React</li><li>TypeScript</li></ul>";
			expect(parseBulletsFromHtml(html)).toEqual(["React", "TypeScript"]);
		});

		it("should return the original string if no li tags match", () => {
			const html = "Software Engineer role";
			expect(parseBulletsFromHtml(html)).toEqual(["Software Engineer role"]);
		});

		it("should return empty array for empty inputs", () => {
			expect(parseBulletsFromHtml("")).toEqual([]);
			expect(parseBulletsFromHtml(undefined)).toEqual([]);
		});
	});

	describe("applyProposalToResume", () => {
		const mockResume: Resume = {
			personalInfo: {
				fullName: "John Doe",
				email: "john@example.com",
				phone: "12345",
				location: "NY",
				contactLinks: [],
			},
			summary: "Experienced developer",
			sections: [],
			experience: [
				{
					id: "exp-1",
					company: "Google",
					role: "SWE",
					startDate: "2020",
					endDate: "2022",
					location: "NY",
					description: "<ul><li>Coding</li></ul>",
					bullets: ["Coding"],
				},
			],
			education: [],
			skills: [{ id: "skills-1", category: "Languages", items: "JS" }],
			projects: [
				{
					id: "proj-1",
					name: "Open Resume",
					url: "",
					date: "2023",
					description: "A resume builder",
				},
			],
			certifications: [],
			languages: [],
		};

		it("should update resume summary", () => {
			const result = applyProposalToResume(
				mockResume,
				{ section: "summary" },
				"New summary",
			);
			expect(result.summary).toBe("New summary");
		});

		it("should update experience role", () => {
			const result = applyProposalToResume(
				mockResume,
				{
					section: "experience",
					itemId: "exp-1",
					field: "role",
				},
				"Senior SWE",
			);
			expect(result.experience[0].role).toBe("Senior SWE");
		});

		it("should update experience bullet point", () => {
			const result = applyProposalToResume(
				mockResume,
				{
					section: "experience",
					itemId: "exp-1",
					field: "bullet",
					bulletIndex: 0,
				},
				"Coding JS",
			);
			expect(result.experience[0].description).toBe("<ul><li>Coding JS</li></ul>");
			expect(result.experience[0].bullets).toEqual(["Coding JS"]);
		});

		it("should update skills items", () => {
			const result = applyProposalToResume(
				mockResume,
				{
					section: "skills",
					itemId: "skills-1",
					field: "items",
				},
				"JS, TS",
			);
			expect(result.skills[0].items).toBe("JS, TS");
		});
	});

	describe("getStaleProposalWarning", () => {
		const mockResume: Resume = {
			personalInfo: {
				fullName: "John Doe",
				email: "john@example.com",
				phone: "12345",
				location: "NY",
				contactLinks: [],
			},
			summary: "Experienced developer",
			sections: [],
			experience: [
				{
					id: "exp-1",
					company: "Google",
					role: "SWE",
					startDate: "2020",
					endDate: "2022",
					location: "NY",
					description: "<ul><li>Coding</li></ul>",
					bullets: ["Coding"],
				},
			],
			education: [],
			skills: [{ id: "skills-1", category: "Languages", items: "JS" }],
			projects: [],
			certifications: [],
			languages: [],
		};

		it("should return warning if experience item missing", () => {
			const warning = getStaleProposalWarning(mockResume, {
				section: "experience",
				itemId: "missing-exp",
				field: "role",
			});
			expect(warning).toContain("no longer present");
		});

		it("should return warning if bullet index out of bounds", () => {
			const warning = getStaleProposalWarning(mockResume, {
				section: "experience",
				itemId: "exp-1",
				field: "bullet",
				bulletIndex: 5,
			});
			expect(warning).toContain("out of bounds");
		});

		it("should return null if proposal target is valid", () => {
			const warning = getStaleProposalWarning(mockResume, {
				section: "experience",
				itemId: "exp-1",
				field: "role",
			});
			expect(warning).toBeNull();
		});
	});
});
