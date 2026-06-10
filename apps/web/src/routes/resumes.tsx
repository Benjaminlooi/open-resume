import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileUp } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import ResumeCard from "#/components/dashboard/ResumeCard";
import NewResumeModal from "#/components/editor/NewResumeModal";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { parseResumeMarkdown } from "#/lib/resume-markdown";
import type { EditorState } from "#/lib/resume-store";

export const Route = createFileRoute("/resumes")({
	component: ResumesDashboard,
});

function ResumesDashboard() {
	const navigate = useNavigate();
	const importInputRef = useRef<HTMLInputElement>(null);
	const { resumes, createResumeIndexEntry, deleteResumeIndexEntry } =
		useResumeIndexStore();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleImportMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const parsed = parseResumeMarkdown(await file.text());
		const id = crypto.randomUUID();
		const name = parsed.resume.personalInfo.fullName || "Imported Resume";
		const importedResume: EditorState = {
			id,
			name,
			activeSection: "personalInfo",
			templateId: "demo",
			...parsed.resume,
		};

		localStorage.setItem(`resume-${id}`, JSON.stringify(importedResume));
		createResumeIndexEntry(id, name, importedResume.templateId);
		if (parsed.warnings.length > 0) {
			window.alert(`Imported with warnings:\n${parsed.warnings.join("\n")}`);
		}
		navigate({ to: "/editor/$id", params: { id } });
	};

	return (
		<main className="container mx-auto p-8 pt-[100px]">
			<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-4xl font-heading">My Resumes</h1>
				<input
					ref={importInputRef}
					type="file"
					accept=".md,.markdown,text/markdown,text/plain"
					className="hidden"
					onChange={handleImportMarkdown}
				/>
				<button
					type="button"
					onClick={() => importInputRef.current?.click()}
					className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-main px-4 py-2 font-base text-main-foreground text-sm shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:shadow-dark"
				>
					<FileUp className="size-4" />
					Import Markdown
				</button>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="border-2 border-dashed border-border rounded-base h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-main/5 transition-colors bg-white w-full"
				>
					<div className="text-4xl mb-2">+</div>
					<div className="font-heading text-xl">New Resume</div>
				</button>

				{isMounted &&
					resumes.map((resume) => (
						<ResumeCard
							key={resume.id}
							resumeIndex={resume}
							onDelete={deleteResumeIndexEntry}
						/>
					))}
			</div>
			{isModalOpen && <NewResumeModal onClose={() => setIsModalOpen(false)} />}
		</main>
	);
}
