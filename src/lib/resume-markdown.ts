import type {
	Certification,
	Education,
	Experience,
	Language,
	Project,
	Resume,
	Section,
	SkillGroup,
} from "./resume-schema";

type SupportedSectionId =
	| "experience"
	| "education"
	| "skills"
	| "projects"
	| "certifications"
	| "languages";

type MarkdownEntry = {
	title: string;
	body: string;
};

type ParsedMarkdownSection = {
	id: SupportedSectionId;
	entries: MarkdownEntry[];
};

export type ParsedResumeMarkdown = {
	resume: Resume;
	warnings: string[];
};

const SECTION_LABELS: Record<SupportedSectionId, string> = {
	experience: "Experience",
	education: "Education",
	skills: "Skills",
	projects: "Projects",
	certifications: "Certifications",
	languages: "Languages",
};

const SECTION_IDS = Object.keys(SECTION_LABELS) as SupportedSectionId[];

const SECTION_BY_HEADING = new Map(
	SECTION_IDS.map((id) => [SECTION_LABELS[id].toLowerCase(), id]),
);

const makeIdFactory = () => {
	const counts: Partial<Record<SupportedSectionId, number>> = {};
	return (sectionId: SupportedSectionId) => {
		counts[sectionId] = (counts[sectionId] ?? 0) + 1;
		return `${sectionId}-${counts[sectionId]}`;
	};
};

export function exportResumeToMarkdown(resume: Resume): string {
	const lines: string[] = [];

	lines.push(`# ${resume.personalInfo.fullName}`);
	lines.push("");
	addContactLine(lines, "Email", resume.personalInfo.email);
	addContactLine(lines, "Phone", resume.personalInfo.phone);
	addContactLine(lines, "Location", resume.personalInfo.location);
	addContactLine(lines, "Website", resume.personalInfo.website);

	const visibleSectionIds = resume.sections
		.filter((section) => section.visible)
		.map((section) => section.id)
		.filter((id): id is SupportedSectionId =>
			SECTION_IDS.includes(id as SupportedSectionId),
		);

	for (const sectionId of visibleSectionIds) {
		const sectionLines = exportSection(sectionId, resume);
		if (sectionLines.length === 0) continue;
		lines.push("", `## ${SECTION_LABELS[sectionId]}`, "", ...sectionLines);
	}

	return `${trimBlankLines(lines).join("\n")}\n`;
}

export function parseResumeMarkdown(markdown: string): ParsedResumeMarkdown {
	const warnings: string[] = [];
	const lines = normalizeLineEndings(markdown).split("\n");
	const titleIndex = lines.findIndex((line) => line.startsWith("# "));
	const fullName =
		titleIndex >= 0 ? lines[titleIndex].replace(/^#\s+/, "").trim() : "";
	const firstSectionIndex = lines.findIndex((line) => line.startsWith("## "));
	const contactLines = lines.slice(
		titleIndex >= 0 ? titleIndex + 1 : 0,
		firstSectionIndex >= 0 ? firstSectionIndex : lines.length,
	);
	const contacts = parseLabels(contactLines.join("\n"));
	const parsedSections = parseSections(lines, warnings);
	const nextId = makeIdFactory();
	const importedSectionIds = new Set(
		parsedSections.map((section) => section.id),
	);

	const resume: Resume = {
		personalInfo: {
			fullName,
			email: contacts.Email ?? "",
			phone: contacts.Phone ?? "",
			location: contacts.Location ?? "",
			website: contacts.Website ?? "",
		},
		sections: buildSections(importedSectionIds),
		experience: [],
		education: [],
		skills: [],
		projects: [],
		certifications: [],
		languages: [],
	};

	for (const section of parsedSections) {
		for (const entry of section.entries) {
			switch (section.id) {
				case "experience":
					resume.experience.push(parseExperience(entry, nextId));
					break;
				case "education":
					resume.education.push(parseEducation(entry, nextId));
					break;
				case "skills":
					resume.skills.push(parseSkillGroup(entry, nextId));
					break;
				case "projects":
					resume.projects?.push(parseProject(entry, nextId));
					break;
				case "certifications":
					resume.certifications?.push(parseCertification(entry, nextId));
					break;
				case "languages":
					resume.languages?.push(parseLanguage(entry, nextId));
					break;
			}
		}
	}

	return { resume, warnings };
}

function exportSection(
	sectionId: SupportedSectionId,
	resume: Resume,
): string[] {
	switch (sectionId) {
		case "experience":
			return resume.experience.flatMap(exportExperience);
		case "education":
			return resume.education.flatMap(exportEducation);
		case "skills":
			return resume.skills.flatMap(exportSkillGroup);
		case "projects":
			return (resume.projects ?? []).flatMap(exportProject);
		case "certifications":
			return (resume.certifications ?? []).flatMap(exportCertification);
		case "languages":
			return (resume.languages ?? []).flatMap(exportLanguage);
	}
}

function exportExperience(item: Experience): string[] {
	return trimBlankLines([
		`### ${joinTitleParts(item.role, item.company)}`,
		"",
		`Dates: ${joinDateRange(item.startDate, item.endDate)}`,
		`Location: ${item.location}`,
		"",
		...htmlToMarkdownLines(item.description),
		"",
	]);
}

function exportEducation(item: Education): string[] {
	return trimBlankLines([
		`### ${joinTitleParts(item.degree, item.institution)}`,
		"",
		`Dates: ${joinDateRange(item.startDate, item.endDate)}`,
		`Location: ${item.location}`,
		item.gpa ? `GPA: ${item.gpa}` : "",
		"",
		...htmlToMarkdownLines(item.description),
		"",
	]);
}

function exportSkillGroup(item: SkillGroup): string[] {
	return trimBlankLines([`### ${item.category}`, "", item.items, ""]);
}

function exportProject(item: Project): string[] {
	return trimBlankLines([
		`### ${item.name}`,
		"",
		`Date: ${item.date}`,
		item.url ? `URL: ${item.url}` : "",
		"",
		...htmlToMarkdownLines(item.description),
		"",
	]);
}

function exportCertification(item: Certification): string[] {
	return trimBlankLines([
		`### ${joinTitleParts(item.name, item.issuer)}`,
		"",
		`Date: ${item.date}`,
		"",
	]);
}

function exportLanguage(item: Language): string[] {
	return trimBlankLines([
		`### ${item.language}`,
		"",
		`Proficiency: ${item.proficiency}`,
		"",
	]);
}

function parseSections(
	lines: string[],
	warnings: string[],
): ParsedMarkdownSection[] {
	const sections: ParsedMarkdownSection[] = [];
	let currentSection: ParsedMarkdownSection | null = null;
	let currentEntry: { title: string; lines: string[] } | null = null;

	const flushEntry = () => {
		if (!currentSection || !currentEntry) return;
		currentSection.entries.push({
			title: currentEntry.title,
			body: trimBlankLines(currentEntry.lines).join("\n"),
		});
		currentEntry = null;
	};

	for (const line of lines) {
		if (line.startsWith("## ")) {
			flushEntry();
			const heading = line
				.replace(/^##\s+/, "")
				.trim()
				.toLowerCase();
			const id = SECTION_BY_HEADING.get(heading);
			if (!id) {
				warnings.push(`Skipped unsupported section: ${heading}`);
				currentSection = null;
				continue;
			}
			currentSection = { id, entries: [] };
			sections.push(currentSection);
			continue;
		}

		if (line.startsWith("### ")) {
			flushEntry();
			if (!currentSection) continue;
			currentEntry = { title: line.replace(/^###\s+/, "").trim(), lines: [] };
			continue;
		}

		if (currentEntry) currentEntry.lines.push(line);
	}

	flushEntry();
	return sections;
}

function parseExperience(
	entry: MarkdownEntry,
	nextId: ReturnType<typeof makeIdFactory>,
): Experience {
	const { labels, content } = splitLabelsAndContent(entry.body);
	const [role, company] = splitTitle(entry.title);
	const [startDate, endDate] = splitDateRange(labels.Dates ?? "");
	return {
		id: nextId("experience"),
		role,
		company,
		startDate,
		endDate,
		location: labels.Location ?? "",
		description: markdownToHtml(content),
	};
}

function parseEducation(
	entry: MarkdownEntry,
	nextId: ReturnType<typeof makeIdFactory>,
): Education {
	const { labels, content } = splitLabelsAndContent(entry.body);
	const [degree, institution] = splitTitle(entry.title);
	const [startDate, endDate] = splitDateRange(labels.Dates ?? "");
	return {
		id: nextId("education"),
		institution,
		degree,
		startDate,
		endDate,
		location: labels.Location ?? "",
		gpa: labels.GPA ?? "",
		description: markdownToHtml(content),
	};
}

function parseSkillGroup(
	entry: MarkdownEntry,
	nextId: ReturnType<typeof makeIdFactory>,
): SkillGroup {
	const { content } = splitLabelsAndContent(entry.body);
	return {
		id: nextId("skills"),
		category: entry.title,
		items: content.replace(/\n+/g, ", ").trim(),
	};
}

function parseProject(
	entry: MarkdownEntry,
	nextId: ReturnType<typeof makeIdFactory>,
): Project {
	const { labels, content } = splitLabelsAndContent(entry.body);
	return {
		id: nextId("projects"),
		name: entry.title,
		url: labels.URL ?? "",
		date: labels.Date ?? "",
		description: markdownToHtml(content),
	};
}

function parseCertification(
	entry: MarkdownEntry,
	nextId: ReturnType<typeof makeIdFactory>,
): Certification {
	const { labels } = splitLabelsAndContent(entry.body);
	const [name, issuer] = splitTitle(entry.title);
	return {
		id: nextId("certifications"),
		name,
		issuer,
		date: labels.Date ?? "",
	};
}

function parseLanguage(
	entry: MarkdownEntry,
	nextId: ReturnType<typeof makeIdFactory>,
): Language {
	const { labels } = splitLabelsAndContent(entry.body);
	return {
		id: nextId("languages"),
		language: entry.title,
		proficiency: labels.Proficiency ?? "",
	};
}

function splitLabelsAndContent(body: string) {
	const labels: Record<string, string> = {};
	const contentLines: string[] = [];
	let inContent = false;

	for (const line of body.split("\n")) {
		const match = line.match(/^([A-Za-z]+):\s*(.*)$/);
		if (!inContent && match) {
			labels[match[1]] = match[2].trim();
			continue;
		}
		if (line.trim()) inContent = true;
		contentLines.push(line);
	}

	return { labels, content: trimBlankLines(contentLines).join("\n") };
}

function parseLabels(body: string) {
	const labels: Record<string, string> = {};
	for (const line of body.split("\n")) {
		const match = line.match(/^([A-Za-z]+):\s*(.*)$/);
		if (match) labels[match[1]] = match[2].trim();
	}
	return labels;
}

function buildSections(importedSectionIds: Set<SupportedSectionId>): Section[] {
	return SECTION_IDS.map((id) => ({
		id,
		name: SECTION_LABELS[id],
		visible: importedSectionIds.has(id),
	}));
}

function markdownToHtml(markdown: string): string {
	const lines = trimBlankLines(markdown.split("\n"));
	const html: string[] = [];
	let listItems: string[] = [];

	const flushList = () => {
		if (listItems.length === 0) return;
		html.push(
			`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`,
		);
		listItems = [];
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			flushList();
			continue;
		}
		const bullet = trimmed.match(/^[-*]\s+(.*)$/);
		if (bullet) {
			listItems.push(markdownInlineToHtml(bullet[1]));
			continue;
		}
		flushList();
		html.push(`<p>${markdownInlineToHtml(trimmed)}</p>`);
	}

	flushList();
	return html.join("");
}

function markdownInlineToHtml(value: string): string {
	return escapeHtml(value)
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function htmlToMarkdownLines(html?: string): string[] {
	if (!html) return [];
	let markdown = html
		.replace(/<\/p>\s*<p>/g, "\n\n")
		.replace(/^<p>/, "")
		.replace(/<\/p>$/, "")
		.replace(/<ul>\s*/g, "")
		.replace(/\s*<\/ul>/g, "")
		.replace(/<ol>\s*/g, "")
		.replace(/\s*<\/ol>/g, "")
		.replace(/<li>\s*/g, "- ")
		.replace(/\s*<\/li>/g, "\n")
		.replace(/<strong>(.*?)<\/strong>/g, "**$1**")
		.replace(/<b>(.*?)<\/b>/g, "**$1**")
		.replace(/<em>(.*?)<\/em>/g, "*$1*")
		.replace(/<i>(.*?)<\/i>/g, "*$1*")
		.replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
		.replace(/<br\s*\/?>/g, "\n")
		.replace(/<[^>]+>/g, "");

	markdown = decodeHtml(markdown);
	return trimBlankLines(markdown.split("\n"));
}

function addContactLine(lines: string[], label: string, value: string) {
	if (value.trim()) lines.push(`${label}: ${value.trim()}`);
}

function joinTitleParts(primary: string, secondary: string) {
	return [primary, secondary].filter(Boolean).join(", ");
}

function joinDateRange(startDate: string, endDate: string) {
	return [startDate, endDate].filter(Boolean).join(" - ");
}

function splitTitle(title: string): [string, string] {
	const [first = "", ...rest] = title.split(",");
	return [first.trim(), rest.join(",").trim()];
}

function splitDateRange(value: string): [string, string] {
	const [startDate = "", ...rest] = value.split(/\s+-\s+/);
	return [startDate.trim(), rest.join(" - ").trim()];
}

function trimBlankLines(lines: string[]) {
	const result = [...lines];
	while (result[0]?.trim() === "") result.shift();
	while (result[result.length - 1]?.trim() === "") result.pop();
	return result;
}

function normalizeLineEndings(value: string) {
	return value.replace(/\r\n?/g, "\n");
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function decodeHtml(value: string) {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&gt;/g, ">")
		.replace(/&lt;/g, "<")
		.replace(/&amp;/g, "&");
}
