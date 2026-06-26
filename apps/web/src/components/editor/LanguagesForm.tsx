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
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useRootStore } from "#/lib/root-store";

function LanguageItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const updateLanguage = useRootStore((state) => state.resume.updateLanguage);
	const deleteLanguage = useRootStore((state) => state.resume.deleteLanguage);
	const lang = useRootStore((state) =>
		(state.resume.languages || []).find((l) => l.id === id),
	);
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!lang) return null;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		updateLanguage(id, { [name]: value });
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
							{lang.language || "Untitled Language"}
						</span>
						<span className="text-xs text-muted-foreground truncate">
							{lang.proficiency || "Proficiency"}
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
							deleteLanguage(id);
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
							<label className="text-sm font-medium leading-none">
								Language
							</label>
							<Input
								name="language"
								value={lang.language}
								onChange={handleChange}
								placeholder="e.g. English, Spanish"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">
								Proficiency
							</label>
							<Input
								name="proficiency"
								value={lang.proficiency}
								onChange={handleChange}
								placeholder="e.g. Native, Fluent, Beginner"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function LanguagesForm() {
	const languages = useRootStore((state) => state.resume.languages);
	const addLanguage = useRootStore((state) => state.resume.addLanguage);
	const reorderLanguages = useRootStore((state) => state.resume.reorderLanguages);
	const langItems = languages || [];

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
			const oldIndex = langItems.findIndex((item) => item.id === active.id);
			const newIndex = langItems.findIndex((item) => item.id === over.id);
			reorderLanguages(oldIndex, newIndex);
		}
	}

	const handleAdd = () => {
		addLanguage({
			id: `lang-${Date.now()}`,
			language: "",
			proficiency: "",
		});
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Manage your languages here. Click an item to edit its details.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={langItems.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{langItems.map((lang) => (
							<LanguageItem key={lang.id} id={lang.id} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button variant="neutral" className="w-full mt-2" onClick={handleAdd}>
				+ Add Language
			</Button>
		</div>
	);
}
