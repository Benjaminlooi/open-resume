import { describe, expect, it } from "vitest";
import { extractReadableText } from "./html.js";

describe("extractReadableText", () => {
	it("removes scripts, styles, and repeated whitespace", () => {
		const text = extractReadableText(`
			<html>
				<style>.hidden { display: none; }</style>
				<script>window.secret = true;</script>
				<body>
					<main>
						<h1>Backend Engineer</h1>
						<p>Build crawler services.</p>
					</main>
				</body>
			</html>
		`);

		expect(text).toContain("Backend Engineer");
		expect(text).toContain("Build crawler services.");
		expect(text).not.toContain("window.secret");
		expect(text).not.toContain("display: none");
	});
});
