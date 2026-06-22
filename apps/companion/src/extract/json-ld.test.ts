import { describe, expect, it } from "vitest";
import { extractJobPostingJsonLd } from "./json-ld.js";

describe("extractJobPostingJsonLd", () => {
	it("extracts schema.org JobPosting data", () => {
		const html = `
			<html>
				<head>
					<script type="application/ld+json">
						{
							"@context": "https://schema.org",
							"@type": "JobPosting",
							"title": "Frontend Engineer",
							"description": "Build React interfaces.",
							"hiringOrganization": { "name": "Acme" },
							"jobLocation": {
								"address": { "addressLocality": "Singapore" }
							}
						}
					</script>
				</head>
			</html>
		`;

		expect(extractJobPostingJsonLd(html)).toEqual({
			title: "Frontend Engineer",
			company: "Acme",
			location: "Singapore",
			description: "Build React interfaces.",
		});
	});

	it("returns null when no JobPosting data exists", () => {
		expect(extractJobPostingJsonLd("<html></html>")).toBeNull();
	});
});
