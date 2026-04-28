import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
	const [isHovering, setIsHovering] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const data = getResumeData(resumeIndex.id);
		if (data) {
			setFullResume(data);
		}
	}, [resumeIndex.id]);

	const handleMouseMove = (e: React.MouseEvent) => {
		if (popoverRef.current) {
			const target = e.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();

			// Calculate mouse position relative to the center of the thumbnail
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			// Distance from center (-1 to 1)
			const percentX = (e.clientX - centerX) / (rect.width / 2);
			const percentY = (e.clientY - centerY) / (rect.height / 2);

			// Rotate up to 15 degrees based on mouse position
			const rotateX = percentY * -15;
			const rotateY = percentX * 15;

			const popoverWidth = 280;
			const popoverHeight = 396;
			const margin = 20;
			const scale = 1.5; // Matches the scale applied in transform

			// Base position: offset slightly to the right of cursor and centered vertically
			let x = e.clientX + margin;
			let y = e.clientY - popoverHeight / 2;

			// Account for CSS transform scale expanding the element from its center
			const overflowX = (popoverWidth * scale - popoverWidth) / 2;
			const overflowY = (popoverHeight * scale - popoverHeight) / 2;

			// Prevent overflow on the right side
			if (x + popoverWidth + overflowX + margin > window.innerWidth) {
				// Flip to the left side of the cursor
				x = e.clientX - popoverWidth - margin;
			}
			// Prevent overflow on the left side
			if (x - overflowX < margin) {
				x = margin + overflowX;
			}

			// Prevent overflow on the bottom
			if (y + popoverHeight + overflowY + margin > window.innerHeight) {
				y = window.innerHeight - popoverHeight - overflowY - margin;
			}
			// Prevent overflow on the top
			if (y - overflowY < margin) {
				y = margin + overflowY;
			}

			// Add perspective, rotation, and slight scale for a 3D float effect
			popoverRef.current.style.transform = `translate(${x}px, ${y}px) perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
		}
	};

	const handleMouseEnter = (e: React.MouseEvent) => {
		setIsHovering(true);
		handleMouseMove(e);
	};

	const handleMouseLeave = () => {
		setIsHovering(false);
	};

	return (
		<div className="relative">
			<div className="border-2 border-border rounded-base h-64 flex flex-col bg-white overflow-hidden shadow-shadow hover:-translate-y-1 transition-transform relative z-10">
				{/* Top Half: Thumbnail with fallback */}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: Visual effect only */}
				<div
					className="flex-1 border-b-2 border-border relative overflow-hidden bg-main/10 cursor-default"
					onMouseMove={handleMouseMove}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
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
			{fullResume &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={popoverRef}
						className={`${isHovering ? "block" : "hidden"} fixed top-0 left-0 z-[100] border-2 border-border bg-white shadow-shadow rounded-base overflow-hidden w-[280px] h-[396px] pointer-events-none transition-transform duration-75 ease-out`}
					>
						<ResumeThumbnail
							templateId={resumeIndex.templateId}
							resume={fullResume}
							scale={0.35}
						/>
					</div>,
					document.body,
				)}
		</div>
	);
}
