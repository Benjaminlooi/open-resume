import { Download, FileDown, FileUp } from "lucide-react";
import { type ChangeEvent, useRef } from "react";
import {
	exportResumeToMarkdown,
	parseResumeMarkdown,
} from "#/lib/resume-markdown";
import { AVAILABLE_TEMPLATES, useRootStore } from "#/lib/root-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

/**
 * Document-action toolbar for the resume editor.
 *
 * Sits in a slim second row beneath the shared `<AppHeader />` on the editor
 * route only. Holds the controls that depend on `useRootStore`'s resume slice
 * — which only carries real data while editing a specific resume on
 * `/editor/$id` — so it must not be rendered on other routes. The resume-name
 * field, template picker, and import/export/PDF actions all live here.
 *
 * `print:hidden` so PDF export (which prints a separate `<DemoTemplate />`
 * node) is not cluttered by the toolbar.
 */
export default function EditorToolbar() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const resumeName = useRootStore((state) => state.resume.name);
	const templateId = useRootStore((state) => state.resume.templateId);
	const setTemplateId = useRootStore((state) => state.resume.setTemplateId);
	const updateResumeName = useRootStore((state) => state.resume.updateResumeName);
	const replaceResumeContent = useRootStore(
		(state) => state.resume.replaceResumeContent,
	);

	const handleDownloadPdf = () => {
		window.print();
	};

	const handleExportMarkdown = () => {
		const state = useRootStore.getState().resume;
		const resumeContent = {
			personalInfo: state.personalInfo,
			summary: state.summary,
			sections: state.sections,
			experience: state.experience,
			education: state.education,
			skills: state.skills,
			projects: state.projects,
			certifications: state.certifications,
			languages: state.languages,
		};
		const markdown = exportResumeToMarkdown(resumeContent);
		const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${toFilename(resumeName)}.md`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleImportMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const markdown = await file.text();
		const parsed = parseResumeMarkdown(markdown);
		replaceResumeContent(parsed.resume);
		if (parsed.warnings.length > 0) {
			window.alert(`Imported with warnings:\n${parsed.warnings.join("\n")}`);
		}
	};

	return (
		<div className="print:hidden flex h-[52px] shrink-0 items-center justify-between gap-4 border-b-2 border-border bg-secondary-background px-5">
			<Input
				type="text"
				value={resumeName}
				onChange={(e) => updateResumeName(e.target.value)}
				className="max-w-[220px]"
			/>
			<div className="flex items-center justify-end gap-3">
				<select
					value={templateId}
					onChange={(e) => setTemplateId(e.target.value)}
					className="h-9 rounded-base border-2 border-border bg-secondary-background px-3 py-1.5 text-sm font-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-light dark:shadow-dark"
				>
					{AVAILABLE_TEMPLATES.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</select>
				<input
					ref={fileInputRef}
					type="file"
					accept=".md,.markdown,text/markdown,text/plain"
					className="hidden"
					onChange={handleImportMarkdown}
				/>
				<Button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="h-9 gap-2 px-3"
				>
					<FileUp className="size-4" />
					<span className="hidden sm:inline">Import MD</span>
				</Button>
				<Button
					type="button"
					onClick={handleExportMarkdown}
					className="h-9 gap-2 px-3"
				>
					<FileDown className="size-4" />
					<span className="hidden sm:inline">Export MD</span>
				</Button>
				<Button
					type="button"
					onClick={handleDownloadPdf}
					className="h-9 gap-2 px-3"
				>
					<Download className="size-4" />
					<span className="hidden sm:inline">Download PDF</span>
				</Button>
			</div>
		</div>
	);
}

function toFilename(value: string) {
	const filename = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return filename || "resume";
}
