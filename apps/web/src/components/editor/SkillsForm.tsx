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
import { Textarea } from "#/components/ui/textarea";
import { useRootStore } from "#/lib/root-store";

function SkillItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const updateSkillGroup = useRootStore((state) => state.resume.updateSkillGroup);
	const deleteSkillGroup = useRootStore((state) => state.resume.deleteSkillGroup);
	const skill = useRootStore((state) =>
		state.resume.skills.find((s) => s.id === id),
	);

	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!skill) return null;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		updateSkillGroup(id, { [name]: value });
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group border-2 border-border rounded-base bg-white shadow-sm overflow-hidden flex flex-col"
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
							{skill.category || "Untitled Category"}
						</span>
						<span className="text-xs text-muted-foreground truncate">
							{skill.items || "No skills listed"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						variant="noShadow"
						size="icon"
						className="h-8 w-8 bg-white opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={(e) => {
							e.stopPropagation();
							deleteSkillGroup(id);
						}}
					>
						<Trash2 className="size-4 text-red-500" />
					</Button>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</div>

			{isExpanded && (
				<div className="p-4 space-y-4 border-t-2 border-border bg-white">
					<div className="space-y-2">
						<label className="text-sm font-medium leading-none">Category</label>
						<Input
							name="category"
							value={skill.category}
							onChange={handleChange}
							placeholder="Languages, Frameworks, etc."
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium leading-none">
							Skills (comma separated)
						</label>
						<Textarea
							name="items"
							value={skill.items}
							onChange={handleChange}
							placeholder="JavaScript, TypeScript, React..."
							className="min-h-[80px]"
						/>
					</div>
				</div>
			)}
		</div>
	);
}

export default function SkillsForm() {
	const skills = useRootStore((state) => state.resume.skills);
	const reorderSkills = useRootStore((state) => state.resume.reorderSkills);
	const addSkillGroup = useRootStore((state) => state.resume.addSkillGroup);
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
			const oldIndex = skills.findIndex((item) => item.id === active.id);
			const newIndex = skills.findIndex((item) => item.id === over.id);
			reorderSkills(oldIndex, newIndex);
		}
	}

	const handleAdd = () => {
		addSkillGroup({
			id: `skill-${Date.now()}`,
			category: "",
			items: "",
		});
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Manage your skills here. Group them by category.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={skills.map((s) => s.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{skills.map((skill) => (
							<SkillItem key={skill.id} id={skill.id} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button variant="neutral" className="w-full mt-2" onClick={handleAdd}>
				+ Add Skill Group
			</Button>
		</div>
	);
}
