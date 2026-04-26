import { useEffect, useRef, useState } from "react";
import DemoTemplate from "./DemoTemplate";

export default function ResumePreview() {
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	const [unscaledHeight, setUnscaledHeight] = useState<number | "auto">("auto");

	useEffect(() => {
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === containerRef.current) {
					// The available width inside the padded container
					const containerWidth = entry.contentRect.width;
					// A4 width in pixels at 96 DPI is approximately 794px
					const targetWidth = 794;
					// We don't want to scale up if there is plenty of room, only scale down
					const newScale = Math.min(1, containerWidth / targetWidth);
					setScale(newScale);
				} else if (entry.target === contentRef.current) {
					// Get the true unscaled height of the resume content
					setUnscaledHeight(entry.contentRect.height);
				}
			}
		});

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}
		if (contentRef.current) {
			observer.observe(contentRef.current);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={containerRef}
			className="print:p-0 print:overflow-visible w-full flex h-full justify-center items-start overflow-auto p-6"
		>
			<div
				className="resume-print-container"
				style={{
					width: `${794 * scale}px`,
					height: unscaledHeight === "auto" ? "auto" : unscaledHeight * scale,
					position: "relative",
				}}
			>
				<div
					className="origin-top-left absolute top-0 left-0 resume-print-container"
					style={{
						transform: `scale(${scale})`,
						width: "794px",
					}}
				>
					<div
						ref={contentRef}
						className="w-[210mm] min-h-[297mm] shrink-0 rounded-sm bg-white border-2 border-border shadow-shadow text-left resume-print-container"
					>
						<DemoTemplate />
					</div>
				</div>
			</div>
		</div>
	);
}
