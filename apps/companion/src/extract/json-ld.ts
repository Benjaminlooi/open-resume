interface StructuredJobPosting {
	title: string;
	company: string;
	location: string;
	description: string;
}

const scriptRegex =
	/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function extractJobPostingJsonLd(
	html: string,
): StructuredJobPosting | null {
	const matches = [...html.matchAll(scriptRegex)];

	for (const match of matches) {
		const rawJson = decodeHtmlEntities(match[1] ?? "").trim();
		const parsed = parseJsonSafely(rawJson);
		const candidates = flattenJsonLd(parsed);

		for (const candidate of candidates) {
			if (!isJobPosting(candidate)) continue;

			return {
				title: stringValue(candidate.title),
				company: stringValue(candidate.hiringOrganization?.name),
				location: extractLocation(candidate.jobLocation),
				description: stripHtml(stringValue(candidate.description)),
			};
		}
	}

	return null;
}

function parseJsonSafely(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function flattenJsonLd(value: unknown): Record<string, any>[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
	if (typeof value !== "object") return [];

	const record = value as Record<string, any>;
	const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [];
	return [record, ...graph.flatMap(flattenJsonLd)];
}

function isJobPosting(value: Record<string, any>): boolean {
	const type = value["@type"];
	if (Array.isArray(type)) return type.includes("JobPosting");
	return type === "JobPosting";
}

function extractLocation(value: unknown): string {
	if (Array.isArray(value)) {
		return value.map(extractLocation).filter(Boolean).join("; ");
	}

	if (!value || typeof value !== "object") return "";

	const record = value as Record<string, any>;
	const address = record.address;

	if (typeof address === "string") return address;
	if (address && typeof address === "object") {
		return [
			stringValue(address.addressLocality),
			stringValue(address.addressRegion),
			stringValue(address.addressCountry),
		]
			.filter(Boolean)
			.join(", ");
	}

	return stringValue(record.name);
}

function stringValue(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function stripHtml(value: string): string {
	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#34;/g, '"')
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}
