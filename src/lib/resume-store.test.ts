import { describe, it, expect } from "vitest";
import { resumeStore } from "./resume-store";

describe("resumeStore", () => {
	it("initializes with the correct dummy data", () => {
		const state = resumeStore.state;
		
		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("John Doe");
		expect(state.sections.length).toBeGreaterThan(0);
		expect(state.experience.length).toBeGreaterThan(0);
	});
});
