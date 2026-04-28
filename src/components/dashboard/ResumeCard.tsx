import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { type EditorState, getResumeData } from "#/lib/resume-store";
import ResumeThumbnail from "./ResumeThumbnail";

interface ResumeCardProps {
	resumeIndex: {
		id: string;
		name: string;
		templateId: string;
		lastModified: number;
	};
	onDelete: (id: string) => void;
}

export default function ResumeCard({ resumeIndex, onDelete }: ResumeCardProps) {
	const [fullResume, setFullResume] = useState<EditorState | null>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const data = getResumeData(resumeIndex.id);
		if (data) {
			setFullResume(data);
		}
	}, [resumeIndex.id]);

	const handleMouseMove = (e: React.MouseEvent) => {
		if (popoverRef.current) {
			// Smooth magnetic effect: offset slightly from the cursor
			// and use a bit of transform to center the magnetic pull
			const x = e.clientX + 20;
			const y = e.clientY - 198; // Half the height (396/2) to center it vertically relative to mouse

			popoverRef.current.style.transform = `translate(${x}px, ${y}px)`;
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Visual effect only
		<div className="relative group" onMouseMove={handleMouseMove}>
			<div className="border-2 border-border rounded-base h-64 flex flex-col bg-white overflow-hidden shadow-shadow hover:-translate-y-1 transition-transform relative z-10">
				{/* Top Half: Thumbnail with fallback */}
				<div className="flex-1 border-b-2 border-border relative overflow-hidden bg-main/10">
					{fullResume ? (
						<ResumeThumbnail
							templateId={resumeIndex.templateId}
							resume={fullResume}
							scale={0.35}
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<span className="text-muted-foreground uppercase tracking-widest font-bold">
								{resumeIndex.templateId}
							</span>
						</div>
					)}
				</div>

				{/* Bottom Half: Info and Actions */}
				<div className="p-4 flex flex-col gap-2 bg-white relative z-20 h-[116px]">
					<div className="font-heading text-lg truncate">
						{resumeIndex.name}
					</div>
					<div className="text-sm text-muted-foreground">
						Edited: {new Date(resumeIndex.lastModified).toLocaleDateString()}
					</div>
					<div className="flex gap-2 mt-2">
						<Link
							to="/editor/$id"
							params={{ id: resumeIndex.id }}
							className="flex-1 text-center bg-main text-main-foreground border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow"
						>
							Edit
						</Link>
						<button
							type="button"
							onClick={() => onDelete(resumeIndex.id)}
							className="bg-red-200 text-red-900 border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow"
						>
							Delete
						</button>
					</div>
				</div>
			</div>

			{/* Hover Popover */}
			{fullResume && (
				<div
					ref={popoverRef}
					className="hidden group-hover:block fixed top-0 left-0 z-50 border-2 border-border bg-white shadow-shadow rounded-base overflow-hidden w-[280px] h-[396px] pointer-events-none transition-transform duration-75 ease-out"
				>
					<ResumeThumbnail
						templateId={resumeIndex.templateId}
						resume={fullResume}
						scale={0.35}
					/>
				</div>
			)}
		</div>
	);
}
