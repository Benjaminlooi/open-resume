import type { Resume } from "#/lib/resume-schema";
import type { ResumeEditTarget } from "./job-application-schema";

/**
 * Extracts bullet items from description HTML (<li> tags).
 * Falls back to returning the description itself if no <li> tags exist.
 */
export function parseBulletsFromHtml(description?: string): string[] {
	if (!description) return [];
	const bullets: string[] = [];
	const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
	let match = regex.exec(description);
	while (match) {
		bullets.push(match[1].trim());
		match = regex.exec(description);
	}
	if (bullets.length === 0 && description.trim() !== "") {
		return [description];
	}
	return bullets;
}

/**
 * Applies a single suggested resume edit proposal to the resume.
 */
export function applyProposalToResume(
	resume: Resume,
	target: ResumeEditTarget,
	suggestedText: string,
): Resume {
	const updated = JSON.parse(JSON.stringify(resume)) as Resume;

	if (target.section === "summary") {
		updated.summary = suggestedText;
	} else if (target.section === "experience") {
		const exp = updated.experience?.find((item) => item.id === target.itemId);
		if (exp) {
			if (target.field === "role" || target.field === "description") {
				exp[target.field] = suggestedText;
			} else if (target.field === "bullet") {
				const bulletsList = parseBulletsFromHtml(exp.description);
				while (bulletsList.length <= target.bulletIndex) {
					bulletsList.push("");
				}
				bulletsList[target.bulletIndex] = suggestedText;

				exp.description = `<ul>${bulletsList
					.map((b) => `<li>${b}</li>`)
					.join("")}</ul>`;
				exp.bullets = bulletsList;
			}
		}
	} else if (target.section === "skills") {
		const skill = updated.skills?.find((item) => item.id === target.itemId);
		if (skill && target.field === "items") {
			skill.items = suggestedText;
		}
	} else if (target.section === "projects") {
		const proj = updated.projects?.find((item) => item.id === target.itemId);
		if (proj && target.field === "description") {
			proj.description = suggestedText;
		}
	}

	return updated;
}
export function getStaleProposalWarning(
	resume: Resume,
	target: ResumeEditTarget,
): string | null {
	if (target.section === "experience") {
		const exists = resume.experience?.find((item) => item.id === target.itemId);
		if (!exists) {
			return `Stale proposal target: experience item ${target.itemId} is no longer present.`;
		}
		if (target.field === "bullet") {
			const bulletsList = parseBulletsFromHtml(exists.description);
			const idx = target.bulletIndex;
			if (idx === undefined || idx < 0 || idx >= bulletsList.length) {
				return `Stale proposal target: experience item ${target.itemId} bullet index ${idx} is out of bounds.`;
			}
		}
	} else if (target.section === "skills") {
		const exists = resume.skills?.some((item) => item.id === target.itemId);
		if (!exists) {
			return `Stale proposal target: skill group ${target.itemId} is no longer present.`;
		}
	} else if (target.section === "projects") {
		const exists = resume.projects?.some((item) => item.id === target.itemId);
		if (!exists) {
			return `Stale proposal target: project item ${target.itemId} is no longer present.`;
		}
	}
	return null;
}
