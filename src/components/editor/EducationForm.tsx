import type { DragEndEvent } from "@dnd-kit/core";
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@tanstack/react-store";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { RichTextEditor } from "#/components/ui/rich-text-editor";
import { AIPromptModal } from "./AIPromptModal";
import {
	addEducation,
	deleteEducation,
	reorderEducation,
	resumeStore,
	updateEducation,
} from "#/lib/resume-store";

function EducationItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const edu = useStore(resumeStore, (state) =>
		state.education.find((e) => e.id === id),
	);

	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!edu) return null;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		if (name === "bullets") {
			updateEducation(id, { bullets: value.split("\n") });
		} else {
			updateEducation(id, { [name]: value });
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="border-2 border-border rounded-base bg-white shadow-sm overflow-hidden flex flex-col"
		>
			<div
				className="flex items-center justify-between p-3 cursor-pointer bg-secondary-background hover:bg-main/5 transition-colors"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center gap-3 overflow-hidden">
					<button
						type="button"
						{...attributes}
						{...listeners}
						onClick={(e) => e.stopPropagation()}
						className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
					>
						<GripVertical size={16} />
					</button>
					<div className="flex flex-col gap-1 truncate pr-4">
						<span className="font-bold text-sm truncate">
							{edu.degree || "Untitled Degree"}
						</span>
						<span className="text-xs text-muted-foreground truncate">
							{edu.institution || "Institution"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						variant="noShadow"
						size="icon"
						className="h-8 w-8 bg-white"
						onClick={(e) => {
							e.stopPropagation();
							deleteEducation(id);
						}}
					>
						<Trash2 className="size-4 text-red-500" />
					</Button>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</div>

			{isExpanded && (
				<div className="p-4 space-y-4 border-t-2 border-border bg-white">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2 col-span-2">
							<label className="text-sm font-medium leading-none">
								Institution
							</label>
							<Input
								name="institution"
								value={edu.institution}
								onChange={handleChange}
								placeholder="University of Technology"
							/>
						</div>
						<div className="space-y-2 col-span-2">
							<label className="text-sm font-medium leading-none">Degree</label>
							<Input
								name="degree"
								value={edu.degree}
								onChange={handleChange}
								placeholder="B.S. Computer Science"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								Start Date
							</label>
							<Input
								name="startDate"
								value={edu.startDate}
								onChange={handleChange}
								placeholder="Aug 2015"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								End Date
							</label>
							<Input
								name="endDate"
								value={edu.endDate}
								onChange={handleChange}
								placeholder="May 2019"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								Location
							</label>
							<Input
								name="location"
								value={edu.location}
								onChange={handleChange}
								placeholder="New York, NY"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								GPA (Optional)
							</label>
							<Input
								name="gpa"
								value={edu.gpa || ""}
								onChange={handleChange}
								placeholder="3.8/4.0"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-sm font-medium leading-none">
								Description/Awards
							</label>
							<AIPromptModal 
								role={edu.degree || ""} 
								company={edu.institution || ""} 
								onGenerate={(newBullets) => {
									const currentDesc = edu.description || "";
									const merged = currentDesc ? `${currentDesc}<br/>${newBullets}` : newBullets;
									updateEducation(id, { description: merged });
								}}
							/>
						</div>
						<RichTextEditor
							value={edu.description || ""}
							onChange={(val) => updateEducation(id, { description: val })}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

export default function EducationForm() {
	const education = useStore(resumeStore, (state) => state.education);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = education.findIndex((item) => item.id === active.id);
			const newIndex = education.findIndex((item) => item.id === over.id);
			reorderEducation(oldIndex, newIndex);
		}
	}

	const handleAdd = () => {
		addEducation({
			id: `edu-${Date.now()}`,
			institution: "",
			degree: "",
			startDate: "",
			endDate: "",
			location: "",
			gpa: "",
			description: "",
		});
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Manage your education history here.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={education.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{education.map((edu) => (
							<EducationItem key={edu.id} id={edu.id} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button variant="neutral" className="w-full mt-2" onClick={handleAdd}>
				+ Add Education
			</Button>
		</div>
	);
}
