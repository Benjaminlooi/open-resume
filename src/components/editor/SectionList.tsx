import {
	closestCenter,
	DndContext,
	type DragEndEvent,
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
import { Eye, EyeOff, GripVertical, Trash2, User } from "lucide-react";
import { AVAILABLE_SECTIONS, useResumeStore } from "#/lib/resume-store";
import { cn } from "#/lib/utils";

function SortableItem(props: {
	id: string;
	name: string;
	visible: boolean;
	isActive: boolean;
}) {
	const { setActiveSection, toggleSectionVisibility, removeSection } =
		useResumeStore();
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: props.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			onClick={() => setActiveSection(props.id)}
			className={cn(
				"flex items-center justify-between p-3 mb-2 bg-white border border-border rounded-md shadow-sm cursor-pointer transition-colors",
				props.isActive
					? "border-black ring-1 ring-black"
					: "hover:border-black/50",
			)}
		>
			<div className="flex items-center gap-3">
				<button
					type="button"
					{...attributes}
					{...listeners}
					onClick={(e) => e.stopPropagation()}
					className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
				>
					<GripVertical size={16} />
				</button>
				<span className="font-medium text-sm select-none">{props.name}</span>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						toggleSectionVisibility(props.id);
					}}
					className="text-muted-foreground hover:text-foreground"
				>
					{props.visible ? <Eye size={16} /> : <EyeOff size={16} />}
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						removeSection(props.id);
					}}
					className="text-muted-foreground hover:text-destructive transition-colors"
				>
					<Trash2 size={16} />
				</button>
			</div>
		</div>
	);
}

export default function SectionList() {
	const {
		sections,
		activeSection,
		reorderSections,
		addSection,
		setActiveSection,
	} = useResumeStore();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5, // Requires 5px movement before drag starts, allows normal clicks
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = sections.findIndex((item) => item.id === active.id);
			const newIndex = sections.findIndex((item) => item.id === over.id);
			reorderSections(oldIndex, newIndex);
		}
	}

	const availableToAdd = AVAILABLE_SECTIONS.filter(
		(s) => !sections.find((active) => active.id === s.id),
	);

	return (
		<div className="w-full flex flex-col gap-6">
			{/* Static Sections */}
			<div>
				<h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 px-1">
					Core
				</h3>
				<div
					onClick={() => setActiveSection("personalInfo")}
					className={cn(
						"flex items-center gap-3 p-3 bg-white border border-border rounded-md shadow-sm cursor-pointer transition-colors",
						activeSection === "personalInfo"
							? "border-black ring-1 ring-black"
							: "hover:border-black/50",
					)}
				>
					<div className="text-muted-foreground flex items-center justify-center w-[16px]">
						<User size={16} />
					</div>
					<span className="font-medium text-sm select-none">Personal Info</span>
				</div>
			</div>

			{/* Draggable Sections */}
			<div>
				<h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 px-1">
					Sections
				</h3>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={sections.map((s) => s.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="w-full">
							{sections.map((section) => (
								<SortableItem
									key={section.id}
									id={section.id}
									name={section.name}
									visible={section.visible}
									isActive={activeSection === section.id}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
				{availableToAdd.length > 0 && (
					<div className="mt-4">
						<select
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							onChange={(e) => {
								if (e.target.value) {
									const section = availableToAdd.find(
										(s) => s.id === e.target.value,
									);
									if (section) addSection(section.id, section.name);
									e.target.value = "";
								}
							}}
							defaultValue=""
						>
							<option value="" disabled>
								+ Add Section
							</option>
							{availableToAdd.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</div>
				)}
			</div>
		</div>
	);
}
