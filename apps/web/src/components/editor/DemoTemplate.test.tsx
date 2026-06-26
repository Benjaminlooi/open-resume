import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dummyResumeData } from "#/lib/dummy-resume";
import type { EditorState } from "#/lib/resume-schema";
import DemoTemplate from "./DemoTemplate";

const resume: EditorState = {
	id: "resume-1",
	name: "Benjamin Looi",
	activeSection: "personalInfo",
	templateId: "demo",
	...dummyResumeData,
};

describe("DemoTemplate", () => {
	it("renders the classic template like Benjamin's PDF resume", () => {
		const html = renderToStaticMarkup(<DemoTemplate resume={resume} />);

		expect(html).toContain("Benjamin Looi");
		expect(html).toContain("github.com/benjaminlooi");
		expect(html).toContain("benjaminlooi.dev");
		expect(html).toContain("Product-minded Full Stack Engineer");
		expect(html).toContain("WORK EXPERIENCE");
		expect(html).not.toContain(">Summary<");

		const educationIndex = html.indexOf("EDUCATION");
		const experienceIndex = html.indexOf("WORK EXPERIENCE");
		const projectsIndex = html.indexOf("PROJECTS");
		const skillsIndex = html.indexOf("SKILLS");

		expect(educationIndex).toBeGreaterThan(-1);
		expect(experienceIndex).toBeGreaterThan(educationIndex);
		expect(projectsIndex).toBeGreaterThan(experienceIndex);
		expect(skillsIndex).toBeGreaterThan(projectsIndex);
	});

	it("uses the screenshot-style spacious left-aligned classic layout", () => {
		const html = renderToStaticMarkup(<DemoTemplate resume={resume} />);

		expect(html).toContain("px-[12mm]");
		expect(html).toContain("py-[17mm]");
		expect(html).toContain("mb-7 text-left");
		expect(html).toContain("text-[32px]");
		expect(html).toContain("text-[15px]");
		expect(html).toContain("border-b border-[#8a8a8a]");
		expect(html).toContain("text-[#1155cc]");
		expect(html).toContain("italic");
		expect(html).toContain("[&amp;_ul]:pl-8");
	});

	it("allows sections to paginate while keeping short education entries together", () => {
		const html = renderToStaticMarkup(<DemoTemplate resume={resume} />);

		expect(html).not.toContain('<section class="break-inside-avoid"><h2');
		expect(html).toContain(
			'class="break-inside-avoid"><div class="grid grid-cols-[1fr_auto] gap-6"><div class="text-[16px] font-bold leading-tight">Diploma',
		);
	});

	it("allows long experience entries to split across printed pages", () => {
		const html = renderToStaticMarkup(<DemoTemplate resume={resume} />);

		expect(html).not.toContain(
			'class="break-inside-avoid"><div class="grid grid-cols-[1fr_auto] gap-6"><div class="text-[16px] font-bold leading-tight">TalentCloud AI',
		);
		expect(html).toContain(
			'class="break-inside-avoid break-after-avoid"><div class="grid grid-cols-[1fr_auto] gap-6"><div class="text-[16px] font-bold leading-tight">TalentCloud AI',
		);
	});
});
