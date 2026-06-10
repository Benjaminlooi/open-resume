import type { JobExtractionResult } from "../schema.js";

type ExtractionMethod = JobExtractionResult["extractionMethod"];

interface StructuredFields {
	title: string;
	company: string;
	location: string;
	description: string;
}

interface NormalizeExtractionInput {
	sourceUrl: string;
	rawText: string;
	method: ExtractionMethod;
	structured: StructuredFields | null;
}

export function normalizeExtraction(
	input: NormalizeExtractionInput,
): JobExtractionResult {
	return {
		sourceUrl: input.sourceUrl,
		title: input.structured?.title ?? "",
		company: input.structured?.company ?? "",
		location: input.structured?.location ?? "",
		description: input.structured?.description || input.rawText,
		rawText: input.rawText,
		extractionMethod: input.method,
		extractedAt: Date.now(),
	};
}
