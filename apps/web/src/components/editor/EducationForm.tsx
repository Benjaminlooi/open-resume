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
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { RichTextEditor } from "#/components/ui/rich-text-editor";
import { useRootStore } from "#/lib/root-store";
import { InteractiveAIPromptModal } from "./InteractiveAIPromptModal";

function EducationFields({
	id,
	hideAITrigger = false,
}: {
	id: string;
	hideAITrigger?: boolean;
}) {
	const edu = useRootStore((state) =>
		state.resume.education.find((e) => e.id === id),
	);
	const updateEducation = useRootStore((state) => state.resume.updateEducation);

	if (!edu) return null;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		if (name === "bullets") {
			updateEducation(id, { bullets: (value as any).split("\n") });
		} else {
			updateEducation(id, { [name]: value });
		}
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2 col-span-2">
					<label
						htmlFor={`institution-${id}`}
						className="text-sm font-medium leading-none"
					>
						Institution
					</label>
					<Input
						id={`institution-${id}`}
						name="institution"
						value={edu.institution}
						onChange={handleChange}
						placeholder="University of Technology"
					/>
				</div>
				<div className="space-y-2 col-span-2">
					<label
						htmlFor={`degree-${id}`}
						className="text-sm font-medium leading-none"
					>
						Degree
					</label>
					<Input
						id={`degree-${id}`}
						name="degree"
						value={edu.degree}
						onChange={handleChange}
						placeholder="B.S. Computer Science"
					/>
				</div>
				<div className="space-y-2">
					<label
						htmlFor={`startDate-${id}`}
						className="text-sm font-medium leading-none"
					>
						Start Date
					</label>
					<Input
						id={`startDate-${id}`}
						name="startDate"
						value={edu.startDate}
						onChange={handleChange}
						placeholder="Aug 2015"
					/>
				</div>
				<div className="space-y-2">
					<label
						htmlFor={`endDate-${id}`}
						className="text-sm font-medium leading-none"
					>
						End Date
					</label>
					<Input
						id={`endDate-${id}`}
						name="endDate"
						value={edu.endDate}
						onChange={handleChange}
						placeholder="May 2019"
					/>
				</div>
				<div className="space-y-2">
					<label
						htmlFor={`location-${id}`}
						className="text-sm font-medium leading-none"
					>
						Location
					</label>
					<Input
						id={`location-${id}`}
						name="location"
						value={edu.location}
						onChange={handleChange}
						placeholder="New York, NY"
					/>
				</div>
				<div className="space-y-2">
					<label
						htmlFor={`gpa-${id}`}
						className="text-sm font-medium leading-none"
					>
						GPA (Optional)
					</label>
					<Input
						id={`gpa-${id}`}
						name="gpa"
						value={edu.gpa || ""}
						onChange={handleChange}
						placeholder="3.8/4.0"
					/>
				</div>
			</div>
			<div className="space-y-2">
				<div className="flex justify-between items-center">
					<label
						htmlFor={`description-${id}`}
						className="text-sm font-medium leading-none"
					>
						Description/Awards
					</label>
					{!hideAITrigger && (
						<InteractiveAIPromptModal
							context={edu}
							onApply={(newHtml) =>
								updateEducation(edu.id, { description: newHtml })
							}
						>
							<EducationFields id={id} hideAITrigger />
						</InteractiveAIPromptModal>
					)}
				</div>
				<RichTextEditor
					value={edu.description || ""}
					onChange={(val) => updateEducation(id, { description: val })}
					placeholder="Add awards, coursework, activities, or academic achievements."
				/>
			</div>
		</div>
	);
}

function EducationItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const edu = useRootStore((state) =>
		state.resume.education.find((e) => e.id === id),
	);
	const deleteEducation = useRootStore((state) => state.resume.deleteEducation);

	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!edu) return null;

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
					<EducationFields id={id} />
				</div>
			)}
		</div>
	);
}

export default function EducationForm() {
	const education = useRootStore((state) => state.resume.education);
	const reorderEducation = useRootStore((state) => state.resume.reorderEducation);
	const addEducation = useRootStore((state) => state.resume.addEducation);

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
