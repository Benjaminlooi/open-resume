import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import CertificationsForm from "#/components/editor/CertificationsForm";
import DemoTemplate from "#/components/editor/DemoTemplate";
import EditorHeader from "#/components/editor/EditorHeader";
import EducationForm from "#/components/editor/EducationForm";
import ExperienceForm from "#/components/editor/ExperienceForm";
import LanguagesForm from "#/components/editor/LanguagesForm";
import PersonalInfoForm from "#/components/editor/PersonalInfoForm";
import ProjectsForm from "#/components/editor/ProjectsForm";
import ResumePreview from "#/components/editor/ResumePreview";
import SectionList from "#/components/editor/SectionList";
import SkillsForm from "#/components/editor/SkillsForm";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { useResumeStore } from "#/lib/resume-store";

export const Route = createFileRoute("/editor/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { activeSection, loadResume } = useResumeStore();
	const [isLoading, setIsLoading] = useState(true);
	const _navigate = useNavigate();

	useEffect(() => {
		const success = loadResume(id);
		if (!success) {
			// Initialize new resume state from the index if available
			const indexEntry = useResumeIndexStore
				.getState()
				.resumes.find((r) => r.id === id);
			useResumeStore
				.getState()
				.initNewResume(
					id,
					indexEntry?.name || "My Resume",
					indexEntry?.templateId || "demo",
				);
		}
		setIsLoading(false);
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

	return (
		<>
			<div className="print:hidden">
				<EditorHeader />
			</div>
			<main className="flex h-screen w-full flex-col overflow-hidden pt-[70px] print:hidden">
				<div className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
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
		</>
	);
}
