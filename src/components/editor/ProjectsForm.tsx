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
import { Textarea } from "#/components/ui/textarea";
import {
	addProject,
	deleteProject,
	reorderProjects,
	resumeStore,
	updateProject,
} from "#/lib/resume-store";

function ProjectItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const project = useStore(resumeStore, (state) =>
		(state.projects || []).find((p) => p.id === id),
	);

	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!project) return null;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		if (name === "bullets") {
			updateProject(id, { bullets: value.split("\n") });
		} else {
			updateProject(id, { [name]: value });
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
							{project.name || "Untitled Project"}
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
							deleteProject(id);
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
							<label className="text-sm font-medium leading-none">Name</label>
							<Input
								name="name"
								value={project.name}
								onChange={handleChange}
								placeholder="Project Name"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">URL</label>
							<Input
								name="url"
								value={project.url}
								onChange={handleChange}
								placeholder="https://example.com"
							/>
						</div>
						<div className="space-y-2 col-span-2">
							<label className="text-sm font-medium leading-none">Date</label>
							<Input
								name="date"
								value={project.date}
								onChange={handleChange}
								placeholder="Jan 2023 - Present"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium leading-none">
							Description (one bullet per line)
						</label>
						<Textarea
							name="bullets"
							value={project.bullets.join("\n")}
							onChange={handleChange}
							placeholder="Built a feature..."
							className="min-h-[120px]"
						/>
					</div>
				</div>
			)}
		</div>
	);
}

export default function ProjectsForm() {
	const projects = useStore(resumeStore, (state) => state.projects || []);

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
			const oldIndex = projects.findIndex((item) => item.id === active.id);
			const newIndex = projects.findIndex((item) => item.id === over.id);
			reorderProjects(oldIndex, newIndex);
		}
	}

	const handleAdd = () => {
		addProject({
			id: `proj-${Date.now()}`,
			name: "",
			url: "",
			date: "",
			bullets: [],
		});
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Manage your projects here. Click an item to edit its details.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={projects.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{projects.map((proj) => (
							<ProjectItem key={proj.id} id={proj.id} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button variant="neutral" className="w-full mt-2" onClick={handleAdd}>
				+ Add Project
			</Button>
		</div>
	);
}
