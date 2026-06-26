import { RichTextEditor } from "#/components/ui/rich-text-editor";
import { useRootStore } from "#/lib/root-store";

export default function SummaryForm() {
	const summary = useRootStore((state) => state.resume.summary);
	const updateSummary = useRootStore((state) => state.resume.updateSummary);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="text-sm font-medium leading-none">
					Introduction Summary
				</div>
				<RichTextEditor
					value={summary}
					onChange={updateSummary}
					placeholder="Write a concise introduction that highlights your role, strengths, and career focus."
				/>
			</div>
		</div>
	);
}
