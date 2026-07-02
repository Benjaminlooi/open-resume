import { Minus, Plus, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRootStore } from "#/lib/root-store";
import { Button } from "../ui/button";
import DemoTemplate from "./DemoTemplate";
import ModernTemplate from "./ModernTemplate";

export default function ResumePreview() {
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [autoScale, setAutoScale] = useState(1);
	const [userScale, setUserScale] = useState<number | null>(null);
	const [unscaledHeight, setUnscaledHeight] = useState<number | "auto">("auto");
	const [pageBreaks, setPageBreaks] = useState<number[]>([]);
	const templateId = useRootStore((state) => state.resume.templateId);

	const scale = userScale ?? autoScale;

	const TemplateComponent =
		templateId === "modern" ? ModernTemplate : DemoTemplate;

	const calculateBreaks = useCallback(() => {
		if (!contentRef.current) return;
		const container = contentRef.current;
		const elements = container.querySelectorAll(".break-inside-avoid");

		const breaks: number[] = [];
		// 1mm = 3.7795px. 12mm = 45.35px. 273mm = 1031.81px.
		const pageHeight = 1031.81;
		const topMargin = 45.35;

		let currentBreakTarget = topMargin + pageHeight;
		const containerRect = container.getBoundingClientRect();

		// Convert NodeList to array and sort by vertical position to ensure correct processing
		const sortedElements = Array.from(elements)
			.map((el) => {
				const rect = el.getBoundingClientRect();
				return {
					top: rect.top - containerRect.top,
					bottom: rect.bottom - containerRect.top,
				};
			})
			.sort((a, b) => a.top - b.top);

		for (const el of sortedElements) {
			if (el.bottom > currentBreakTarget) {
				if (el.top < currentBreakTarget) {
					// Element crosses the boundary, push it to next page
					breaks.push(el.top);
					currentBreakTarget = el.top + pageHeight;
				} else {
					// Element is completely past the boundary, add standard breaks until we catch up
					while (el.top > currentBreakTarget) {
						breaks.push(currentBreakTarget);
						currentBreakTarget += pageHeight;
					}
					// Check again after catching up
					if (el.bottom > currentBreakTarget) {
						breaks.push(el.top);
						currentBreakTarget = el.top + pageHeight;
					}
				}
			}
		}

		// Fill in any remaining breaks for content after the last break-inside-avoid element
		const totalHeight = container.scrollHeight;
		while (totalHeight > currentBreakTarget) {
			breaks.push(currentBreakTarget);
			currentBreakTarget += pageHeight;
		}

		setPageBreaks(breaks);
	}, []);

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
					setAutoScale(newScale);
					// Reset user scale when container resizes (e.g., panel resize)
					setUserScale(null);
				} else if (entry.target === contentRef.current) {
					// Get the true unscaled height of the resume content
					setUnscaledHeight(entry.contentRect.height);
					// Also recalculate page breaks when content height changes
					calculateBreaks();
				}
			}
		});

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}
		if (contentRef.current) {
			observer.observe(contentRef.current);
		}

		// Initial calculation
		setTimeout(calculateBreaks, 100);

		return () => observer.disconnect();
	}, [calculateBreaks]);

	const handleZoomIn = () => {
		setUserScale((prev) => Math.min(2, (prev ?? autoScale) + 0.1));
	};

	const handleZoomOut = () => {
		setUserScale((prev) => Math.max(0.3, (prev ?? autoScale) - 0.1));
	};

	const handleFitToWidth = () => {
		setUserScale(null);
	};

	return (
		<div className="flex flex-col h-full print:p-0">
			{/* Zoom Controls */}
			<div className="flex items-center justify-end gap-1 px-3 py-2 border-b border-border/50 print:hidden shrink-0">
				<Button
					variant="noShadow"
					size="icon"
					className="h-7 w-7"
					onClick={handleZoomOut}
					title="Zoom out"
				>
					<Minus className="size-3" />
				</Button>
				<span className="text-xs text-muted-foreground min-w-[3rem] text-center font-mono">
					{Math.round(scale * 100)}%
				</span>
				<Button
					variant="noShadow"
					size="icon"
					className="h-7 w-7"
					onClick={handleZoomIn}
					title="Zoom in"
				>
					<Plus className="size-3" />
				</Button>
				<div className="w-px h-4 bg-border mx-1" />
				<Button
					variant="noShadow"
					size="icon"
					className="h-7 w-7"
					onClick={handleFitToWidth}
					title="Fit to width"
				>
					<Maximize2 className="size-3" />
				</Button>
			</div>

			{/* Preview Area */}
			<div
				ref={containerRef}
				className="print:p-0 print:overflow-visible flex-1 min-h-0 flex justify-center items-start overflow-auto p-6"
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
							className="w-[210mm] min-h-[297mm] shrink-0 rounded-sm bg-white border-2 border-border shadow-shadow text-left resume-print-container relative"
						>
							<TemplateComponent />
							{/* Page break indicators */}
							{pageBreaks.map((y, i) => (
								<div
									key={i}
									className="absolute w-full border-b-2 border-dashed border-indigo-400 opacity-70 z-50 pointer-events-none print:hidden"
									style={{ top: `${y}px` }}
								>
									<span className="absolute -top-3 left-2 text-indigo-500 font-medium text-xs bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-sm">
										Page Break
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
