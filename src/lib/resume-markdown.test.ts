import { describe, expect, it } from "vitest";
import { dummyResumeData } from "./dummy-resume";
import { exportResumeToMarkdown, parseResumeMarkdown } from "./resume-markdown";
import type { EditorState } from "./resume-store";

const editorResume: EditorState = {
	id: "resume-1",
	name: "Ignored Name",
	activeSection: "skills",
	templateId: "modern",
	...dummyResumeData,
	personalInfo: {
		fullName: "Ada Lovelace",
		email: "ada@example.com",
		phone: "555-0100",
		location: "London, UK",
		contactLinks: [
			{
				id: "contact-website",
				label: "Website",
				url: "https://ada.example.com",
			},
			{
				id: "contact-github",
				label: "GitHub",
				url: "https://github.com/ada",
			},
		],
	},
	sections: [
		{ id: "summary", name: "Summary", visible: true },
		{ id: "experience", name: "Experience", visible: true },
		{ id: "education", name: "Education", visible: true },
		{ id: "skills", name: "Skills", visible: true },
		{ id: "projects", name: "Projects", visible: false },
		{ id: "certifications", name: "Certifications", visible: true },
		{ id: "languages", name: "Languages", visible: true },
	],
	summary:
		"<p>Pioneering computing collaborator focused on translating complex technical systems into practical programs.</p>",
	experience: [
		{
			id: "exp-1",
			role: "Analyst",
			company: "Babbage Labs",
			startDate: "Jan 1842",
			endDate: "Dec 1843",
			location: "London",
			description:
				"<p>Translated technical notes.</p><ul><li>Documented the first algorithm</li><li><strong>Explained</strong> machine potential</li></ul>",
		},
	],
	education: [
		{
			id: "edu-1",
			institution: "University of London",
			degree: "Mathematics",
			startDate: "1835",
			endDate: "1839",
			location: "London",
			gpa: "First",
			description: "<p>Studied symbolic logic.</p>",
		},
	],
	skills: [
		{
			id: "skill-1",
			category: "Technical",
			items: "Mathematics, Algorithms, Writing",
		},
	],
	projects: [
		{
			id: "project-1",
			name: "Hidden Project",
			url: "https://hidden.example.com",
			date: "1843",
			description: "Should not export",
		},
	],
	certifications: [
		{
			id: "cert-1",
			name: "Analytical Engine Fellow",
			issuer: "Royal Society",
			date: "1843",
		},
	],
	languages: [
		{
			id: "lang-1",
			language: "English",
			proficiency: "Native",
		},
	],
};

describe("resume markdown conversion", () => {
	it("exports visible resume content as readable markdown without app metadata", () => {
		const markdown = exportResumeToMarkdown(editorResume);

		expect(markdown).toContain("# Ada Lovelace");
		expect(markdown).toContain("Email: ada@example.com");
		expect(markdown).toContain("Website: https://ada.example.com");
		expect(markdown).toContain("GitHub: https://github.com/ada");
		expect(markdown).toContain("## Summary");
		expect(markdown).toContain(
			"Pioneering computing collaborator focused on translating complex technical systems into practical programs.",
		);
		expect(markdown).toContain("## Experience");
		expect(markdown).toContain("### Analyst, Babbage Labs");
		expect(markdown).toContain("- Documented the first algorithm");
		expect(markdown).toContain("- **Explained** machine potential");
		expect(markdown).toContain("## Certifications");
		expect(markdown).not.toContain("templateId");
		expect(markdown).not.toContain("resume-1");
		expect(markdown).not.toContain("## Projects");
		expect(markdown).not.toContain("Hidden Project");
	});

	it("parses readable markdown into resume content with generated ids and visible imported sections", () => {
		const parsed = parseResumeMarkdown(`# Grace Hopper

Email: grace@example.com
Phone: 555-0123
Location: Arlington, VA
Website: https://grace.example.com
GitHub: https://github.com/gracehopper
LinkedIn: https://linkedin.com/in/gracehopper

## Summary

Computer scientist and naval officer known for compiler leadership and practical programming systems.

## Experience

### Computer Scientist, Navy

Dates: 1943 - 1986
Location: United States

- Built compiler systems
- Popularized debugging

## Skills

### Languages

COBOL, FORTRAN, English

## Projects

### FLOW-MATIC

Date: 1955
URL: https://example.com/flow-matic

Business-oriented programming language.
`);

		expect(parsed.warnings).toEqual([]);
		expect(parsed.resume.personalInfo.fullName).toBe("Grace Hopper");
		expect(parsed.resume.summary).toBe(
			"<p>Computer scientist and naval officer known for compiler leadership and practical programming systems.</p>",
		);
		expect(parsed.resume.personalInfo.contactLinks).toEqual([
			{
				id: "contact-1",
				label: "Website",
				url: "https://grace.example.com",
			},
			{
				id: "contact-2",
				label: "GitHub",
				url: "https://github.com/gracehopper",
			},
			{
				id: "contact-3",
				label: "LinkedIn",
				url: "https://linkedin.com/in/gracehopper",
			},
		]);
		expect(parsed.resume.experience).toHaveLength(1);
		expect(parsed.resume.experience[0]).toMatchObject({
			role: "Computer Scientist",
			company: "Navy",
			startDate: "1943",
			endDate: "1986",
			location: "United States",
		});
		expect(parsed.resume.experience[0].id).toMatch(/^experience-/);
		expect(parsed.resume.experience[0].description).toContain(
			"<li>Built compiler systems</li>",
		);
		expect(parsed.resume.skills[0]).toMatchObject({
			category: "Languages",
			items: "COBOL, FORTRAN, English",
		});
		expect(parsed.resume.projects?.[0]).toMatchObject({
			name: "FLOW-MATIC",
			date: "1955",
			url: "https://example.com/flow-matic",
		});
		expect(
			parsed.resume.sections.find((section) => section.id === "projects")
				?.visible,
		).toBe(true);
		expect(
			parsed.resume.sections.find((section) => section.id === "summary")
				?.visible,
		).toBe(true);
		expect(
			parsed.resume.sections.find((section) => section.id === "education")
				?.visible,
		).toBe(false);
	});

	it("keeps imported resume sections in the same order as markdown headings", () => {
		const parsed = parseResumeMarkdown(`# Ada Lovelace

## Summary

Computing pioneer.

## Education

### Mathematics, University of London

Dates: 1835 - 1839
Location: London

## Experience

### Analyst, Babbage Labs

Dates: 1842 - 1843
Location: London

## Skills

### Technical

Algorithms, Writing
`);

		expect(parsed.resume.sections.map((section) => section.id)).toEqual([
			"summary",
			"education",
			"experience",
			"skills",
			"projects",
			"certifications",
			"languages",
		]);
		expect(
			parsed.resume.sections
				.filter((section) => section.visible)
				.map((section) => section.id),
		).toEqual(["summary", "education", "experience", "skills"]);
	});

	it("sanitizes unsafe markdown link protocols before storing rich text html", () => {
		const parsed = parseResumeMarkdown(`# Security Test

## Summary

See [profile](javascript:alert(1)), [website](https://example.com), [email](mailto:me@example.com), and [phone](tel:+15550123).

## Experience

### Engineer, Example

- Block [mixed case](JaVaScRiPt:alert(1))
- Keep [docs](http://docs.example.com)
`);

		expect(parsed.resume.summary).not.toContain("javascript:");
		expect(parsed.resume.summary).not.toContain("<a href=\"javascript:");
		expect(parsed.resume.summary).toContain("See profile,");
		expect(parsed.resume.summary).toContain(
			'<a href="https://example.com">website</a>',
		);
		expect(parsed.resume.summary).toContain(
			'<a href="mailto:me@example.com">email</a>',
		);
		expect(parsed.resume.summary).toContain(
			'<a href="tel:+15550123">phone</a>',
		);
		expect(parsed.resume.experience[0].description).not.toContain(
			"JaVaScRiPt:",
		);
		expect(parsed.resume.experience[0].description).toContain(
			"<li>Block mixed case</li>",
		);
		expect(parsed.resume.experience[0].description).toContain(
			'<a href="http://docs.example.com">docs</a>',
		);
	});

	it("round-trips exported markdown back into equivalent resume content", () => {
		const parsed = parseResumeMarkdown(exportResumeToMarkdown(editorResume));

		expect(parsed.resume.personalInfo).toMatchObject({
			fullName: editorResume.personalInfo.fullName,
			email: editorResume.personalInfo.email,
			phone: editorResume.personalInfo.phone,
			location: editorResume.personalInfo.location,
		});
		expect(parsed.resume.summary).toBe(editorResume.summary);
		expect(
			parsed.resume.personalInfo.contactLinks.map(({ label, url }) => ({
				label,
				url,
			})),
		).toEqual(
			editorResume.personalInfo.contactLinks.map(({ label, url }) => ({
				label,
				url,
			})),
		);
		expect(parsed.resume.experience[0]).toMatchObject({
			role: "Analyst",
			company: "Babbage Labs",
			startDate: "Jan 1842",
			endDate: "Dec 1843",
			location: "London",
		});
		expect(parsed.resume.education[0]).toMatchObject({
			institution: "University of London",
			degree: "Mathematics",
			startDate: "1835",
			endDate: "1839",
			location: "London",
			gpa: "First",
		});
		expect(parsed.resume.skills[0]).toMatchObject({
			category: "Technical",
			items: "Mathematics, Algorithms, Writing",
		});
		expect(parsed.resume.projects).toEqual([]);
		expect(parsed.resume.certifications?.[0]).toMatchObject({
			name: "Analytical Engine Fellow",
			issuer: "Royal Society",
			date: "1843",
		});
		expect(parsed.resume.languages?.[0]).toMatchObject({
			language: "English",
			proficiency: "Native",
		});
	});
});
