import { describe, it, expect, beforeEach } from "vitest";
import {
	resumeStore,
	updatePersonalInfo,
	setActiveSection,
	toggleSectionVisibility,
} from "./resume-store";

// Deep clone the initial state so we can reset the singleton between tests
const initialState = JSON.parse(JSON.stringify(resumeStore.state));

describe("resumeStore", () => {
	beforeEach(() => {
		resumeStore.setState(() => JSON.parse(JSON.stringify(initialState)));
	});

	it("initializes with the correct dummy data", () => {
		const state = resumeStore.state;

		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("John Doe");
		expect(state.sections.length).toBeGreaterThan(0);
		expect(state.experience.length).toBeGreaterThan(0);
	});

	it("updates personal info correctly", () => {
		updatePersonalInfo("fullName", "Pickle Rick");
		updatePersonalInfo("email", "rick@citadel.com");

		const state = resumeStore.state;
		expect(state.personalInfo.fullName).toBe("Pickle Rick");
		expect(state.personalInfo.email).toBe("rick@citadel.com");
		// Ensure other state is intact
		expect(state.personalInfo.phone).toBe(initialState.personalInfo.phone);
	});

	it("sets active section correctly", () => {
		setActiveSection("education");

		const state = resumeStore.state;
		expect(state.activeSection).toBe("education");
	});

	it("toggles section visibility correctly", () => {
		const experienceSection = resumeStore.state.sections.find(
			(s) => s.id === "experience",
		);
		expect(experienceSection?.visible).toBe(true);

		toggleSectionVisibility("experience");

		const state = resumeStore.state;
		const toggledSection = state.sections.find((s) => s.id === "experience");
		expect(toggledSection?.visible).toBe(false);

		// Toggle back
		toggleSectionVisibility("experience");
		expect(
			resumeStore.state.sections.find((s) => s.id === "experience")?.visible,
		).toBe(true);
	});
});
