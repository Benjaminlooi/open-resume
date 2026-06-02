import { RichTextEditor } from "#/components/ui/rich-text-editor";
import { useResumeStore } from "#/lib/resume-store";

export default function SummaryForm() {
	const summary = useResumeStore((state) => state.summary);
	const updateSummary = useResumeStore((state) => state.updateSummary);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="text-sm font-medium leading-none">
					Introduction Summary
				</div>
				<RichTextEditor
					value={summary}
					onChange={updateSummary}
				/>
			</div>
		</div>
	);
}
