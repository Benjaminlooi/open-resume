import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import CertificationsForm from "#/components/editor/CertificationsForm";
import DemoTemplate from "#/components/editor/DemoTemplate";
import EditorToolbar from "#/components/editor/EditorToolbar";
import EducationForm from "#/components/editor/EducationForm";
import ExperienceForm from "#/components/editor/ExperienceForm";
import LanguagesForm from "#/components/editor/LanguagesForm";
import PersonalInfoForm from "#/components/editor/PersonalInfoForm";
import ProjectsForm from "#/components/editor/ProjectsForm";
import ResumePreview from "#/components/editor/ResumePreview";
import SectionList from "#/components/editor/SectionList";
import SkillsForm from "#/components/editor/SkillsForm";
import SummaryForm from "#/components/editor/SummaryForm";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";
import { useRootStore } from "#/lib/root-store";
import { useResumeAutoSave } from "#/lib/use-resume-auto-save";

export const Route = createFileRoute("/_app/editor/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const activeSection = useRootStore((state) => state.resume.activeSection);
	const loadResume = useRootStore((state) => state.resume.loadResume);
	const [isLoading, setIsLoading] = useState(true);
	const [isMobile, setIsMobile] = useState(false);
	const [activeTab, setActiveTab] = useState<"sections" | "fields" | "preview">(
		"sections",
	);

	useResumeAutoSave();

	useEffect(() => {
		if (typeof window === "undefined") return;
		const media = window.matchMedia("(max-width: 768px)");
		setIsMobile(media.matches);
		const listener = (e: MediaQueryListEvent) => {
			setIsMobile(e.matches);
		};
		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	}, []);

	// Auto-switch to "fields" tab on mobile when a section becomes active
	useEffect(() => {
		if (isMobile && activeSection) {
			setActiveTab("fields");
		}
	}, [activeSection, isMobile]);

	useEffect(() => {
		let isActive = true;

		async function load() {
			setIsLoading(true);
			const success = await loadResume(id);
			if (!isActive) return;
			if (!success) {
				// Initialize new resume state from the index if available
				const indexEntry = useRootStore
					.getState()
					.resumeIndex.resumes.find((r) => r.id === id);
				useRootStore
					.getState()
					.resume.initNewResume(
						id,
						indexEntry?.name || "My Resume",
						indexEntry?.templateId || "demo",
					);
			}
			setIsLoading(false);
		}

		load();

		return () => {
			isActive = false;
		};
	}, [id, loadResume]);

	if (isLoading)
		return (
			<div className="flex h-screen w-full items-center justify-center font-heading text-2xl">
				Loading...
			</div>
		);

	const renderActiveForm = () => {
		switch (activeSection) {
			case "personalInfo":
				return <PersonalInfoForm />;
			case "summary":
				return <SummaryForm />;
			case "experience":
				return <ExperienceForm />;
			case "education":
				return <EducationForm />;
			case "skills":
				return <SkillsForm />;
			case "projects":
				return <ProjectsForm />;
			case "certifications":
				return <CertificationsForm />;
			case "languages":
				return <LanguagesForm />;
			default:
				return (
					<div className="text-center text-muted-foreground mt-10">
						Select a section to edit
					</div>
				);
		}
	};

	const getActiveFormTitle = () => {
		switch (activeSection) {
			case "personalInfo":
				return "Personal Info";
			case "summary":
				return "Summary";
			case "experience":
				return "Experience";
			case "education":
				return "Education";
			case "skills":
				return "Skills";
			case "projects":
				return "Projects";
			case "certifications":
				return "Certifications";
			case "languages":
				return "Languages";
			default:
				return "Edit Section";
		}
	};

	if (isMobile) {
		return (
			<div className="flex h-[calc(100vh-70px)] w-full flex-col overflow-hidden">
				<EditorToolbar />

				{/* Mobile Tabs */}
				<div className="flex shrink-0 border-b-2 border-border bg-[#F0F9FF]">
					<button
						type="button"
						onClick={() => setActiveTab("sections")}
						className={`flex-1 py-3 text-center font-heading text-sm border-r-2 border-border transition-all ${
							activeTab === "sections"
								? "bg-main text-main-foreground font-bold shadow-[inset_0_-2px_0_0_#000]"
								: "hover:bg-main/10"
						}`}
					>
						Sections
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("fields")}
						className={`flex-1 py-3 text-center font-heading text-sm border-r-2 border-border transition-all whitespace-nowrap overflow-hidden text-ellipsis px-1 ${
							activeTab === "fields"
								? "bg-main text-main-foreground font-bold shadow-[inset_0_-2px_0_0_#000]"
								: "hover:bg-main/10"
						}`}
					>
						{getActiveFormTitle()}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("preview")}
						className={`flex-1 py-3 text-center font-heading text-sm transition-all ${
							activeTab === "preview"
								? "bg-main text-main-foreground font-bold shadow-[inset_0_-2px_0_0_#000]"
								: "hover:bg-main/10"
						}`}
					>
						Preview
					</button>
				</div>

				{/* Tab content area */}
				<main className="flex-1 min-h-0 w-full overflow-y-auto p-4 bg-background">
					{activeTab === "sections" && (
						<div className="rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow p-5">
							<SectionList />
						</div>
					)}
					{activeTab === "fields" && (
						<div className="rounded-base border-2 border-border bg-secondary-background text-foreground shadow-shadow p-5">
							{renderActiveForm()}
						</div>
					)}
					{activeTab === "preview" && (
						<div className="h-full rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow overflow-hidden">
							<ResumePreview />
						</div>
					)}
				</main>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-70px)] w-full flex-col overflow-hidden">
			<EditorToolbar />
			<main className="flex flex-1 min-h-0 w-full flex-col overflow-hidden print:hidden">
				<div className="flex-1 min-h-0 overflow-hidden p-4 md:p-6 lg:p-8">
					<ResizablePanelGroup
						direction="horizontal"
						className="h-full w-full rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow"
					>
						{/* Left sidebar - Section list */}
						<ResizablePanel
							defaultSize="20%"
							minSize="15%"
							maxSize="30%"
							className="bg-secondary-background"
						>
							<div className="flex h-full flex-col overflow-y-auto p-6">
								<h2 className="font-heading text-2xl mb-4">Sections</h2>
								<div className="flex-1">
									<SectionList />
								</div>
							</div>
						</ResizablePanel>

						<ResizableHandle withHandle />

						{/* Left sidebar - Editor form */}
						<ResizablePanel
							defaultSize="30%"
							minSize="20%"
							maxSize="40%"
							className="bg-secondary-background border-l-2 border-r-2 border-border"
						>
							<div className="flex h-full flex-col overflow-y-auto p-6">
								<h2 className="font-heading text-2xl mb-4">
									{getActiveFormTitle()}
								</h2>
								<div className="flex-1">{renderActiveForm()}</div>
							</div>
						</ResizablePanel>

						<ResizableHandle withHandle />

						{/* Right main area - Resume preview */}
						<ResizablePanel defaultSize="50%" className="bg-main">
							<ResumePreview />
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
			</main>
			<div className="hidden print:block w-[210mm] bg-white">
				<DemoTemplate />
			</div>
		</div>
	);
}
