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
	addExperience,
	deleteExperience,
	reorderExperience,
	resumeStore,
	updateExperience,
} from "#/lib/resume-store";

function ExperienceItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const exp = useStore(resumeStore, (state) =>
		state.experience.find((e) => e.id === id),
	);

	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!exp) return null;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const { name, value } = e.target;
		updateExperience(id, { [name]: value });
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
							{exp.role || "Untitled Role"}
						</span>
						<span className="text-xs text-muted-foreground truncate">
							{exp.company || "Company"}
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
							deleteExperience(id);
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
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">Role</label>
							<Input
								name="role"
								value={exp.role}
								onChange={handleChange}
								placeholder="Software Engineer"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								Company
							</label>
							<Input
								name="company"
								value={exp.company}
								onChange={handleChange}
								placeholder="Acme Corp"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								Start Date
							</label>
							<Input
								name="startDate"
								value={exp.startDate}
								onChange={handleChange}
								placeholder="Jan 2020"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								End Date
							</label>
							<Input
								name="endDate"
								value={exp.endDate}
								onChange={handleChange}
								placeholder="Present"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium leading-none">Location</label>
						<Input
							name="location"
							value={exp.location}
							onChange={handleChange}
							placeholder="New York, NY"
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-sm font-medium leading-none">
								Description
							</label>
							<InteractiveAIPromptModal 
							        role={exp.role || ""} 
							        company={exp.company || ""} 
							        currentDescription={exp.description || ""}
							        onApply={(newHtml) => {
							                updateExperience(id, { description: newHtml });
							        }}
							/>						</div>
						<RichTextEditor
							value={exp.description || ""}
							onChange={(val) => updateExperience(id, { description: val })}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

export default function ExperienceForm() {
	const experience = useStore(resumeStore, (state) => state.experience);

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
			const oldIndex = experience.findIndex((item) => item.id === active.id);
			const newIndex = experience.findIndex((item) => item.id === over.id);
			reorderExperience(oldIndex, newIndex);
		}
	}

	const handleAdd = () => {
		addExperience({
			id: `exp-${Date.now()}`,
			company: "",
			role: "",
			startDate: "",
			endDate: "",
			location: "",
			description: "",
		});
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Manage your work experience here. Click an item to edit its details.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={experience.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{experience.map((exp) => (
							<ExperienceItem key={exp.id} id={exp.id} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button variant="neutral" className="w-full mt-2" onClick={handleAdd}>
				+ Add Experience
			</Button>
		</div>
	);
}
eAdd}>
				+ Add Experience
			</Button>
		</div>
	);
}
