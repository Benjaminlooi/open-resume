import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import DemoTemplate from "#/components/editor/DemoTemplate";
import EditorHeader from "#/components/editor/EditorHeader";
import EducationForm from "#/components/editor/EducationForm";
import ExperienceForm from "#/components/editor/ExperienceForm";
import PersonalInfoForm from "#/components/editor/PersonalInfoForm";
import SectionList from "#/components/editor/SectionList";
import SkillsForm from "#/components/editor/SkillsForm";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";
import { resumeStore } from "#/lib/resume-store";

export const Route = createFileRoute("/editor/")({
	component: RouteComponent,
});

function RouteComponent() {
	const activeSection = useStore(resumeStore, (state) => state.activeSection);

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
			default:
				return "Edit Section";
		}
	};

	return (
		<>
			<EditorHeader />
			<main className="flex h-screen w-full flex-col overflow-hidden pt-[70px]">
				<div className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
					<ResizablePanelGroup
						direction="horizontal"
						className="h-full w-full rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow"
					>
						{/* Left sidebar - Section list */}
						<ResizablePanel
							defaultSize="25%"
							minSize="15%"
							maxSize="35%"
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
							defaultSize="25%"
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
							<div className="flex h-full items-start justify-center p-6 overflow-auto">
								<div className="aspect-[210/297] w-full max-w-[794px] shrink-0 rounded-sm bg-white border-2 border-border shadow-shadow overflow-hidden text-left">
									<DemoTemplate />
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
			</main>
		</>
	);
}
