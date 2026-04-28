import DemoTemplate from "#/components/editor/DemoTemplate";
import ModernTemplate from "#/components/editor/ModernTemplate";
import type { EditorState } from "#/lib/resume-store";

interface ResumeThumbnailProps {
	templateId: string;
	resume?: EditorState | null;
	scale?: number;
}

export default function ResumeThumbnail({ templateId, resume, scale = 0.35 }: ResumeThumbnailProps) {
	const TemplateComponent = templateId === "modern" ? ModernTemplate : DemoTemplate;
	
	if (!resume) return null;

	return (
		<div className="w-full h-full relative overflow-hidden bg-white">
			<div 
				className="origin-top-left absolute top-0 left-0 bg-white" 
				style={{ 
					transform: `scale(${scale})`, 
					width: "794px",
					minHeight: "1122px" 
				}}
			>
				<TemplateComponent resume={resume} />
			</div>
		</div>
	);
}