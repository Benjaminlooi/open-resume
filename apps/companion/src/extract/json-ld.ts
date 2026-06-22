interface StructuredJobPosting {
	title: string;
	company: string;
	location: string;
	description: string;
}

type JsonLdRecord = Record<string, unknown>;

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
				company: stringValue(getRecord(candidate.hiringOrganization)?.name),
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

function flattenJsonLd(value: unknown): JsonLdRecord[] {
	if (!value) return [];
	if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
	if (typeof value !== "object") return [];

	const record = value as JsonLdRecord;
	const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [];
	return [record, ...graph.flatMap(flattenJsonLd)];
}

function isJobPosting(value: JsonLdRecord): boolean {
	const type = value["@type"];
	if (Array.isArray(type)) return type.includes("JobPosting");
	return type === "JobPosting";
}

function extractLocation(value: unknown): string {
	if (Array.isArray(value)) {
		return value.map(extractLocation).filter(Boolean).join("; ");
	}

	if (!value || typeof value !== "object") return "";

	const record = value as JsonLdRecord;
	const address = record.address;

	if (typeof address === "string") return address;
	const addressRecord = getRecord(address);
	if (addressRecord) {
		return [
			stringValue(addressRecord.addressLocality),
			stringValue(addressRecord.addressRegion),
			stringValue(addressRecord.addressCountry),
		]
			.filter(Boolean)
			.join(", ");
	}

	return stringValue(record.name);
}

function getRecord(value: unknown): JsonLdRecord | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	return value as JsonLdRecord;
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
