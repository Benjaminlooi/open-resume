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
import { useRootStore } from "#/lib/root-store";

function CertificationItem({ id }: { id: string }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const cert = useRootStore((state) =>
		(state.resume.certifications || []).find((c) => c.id === id),
	);
	const updateCertification = useRootStore(
		(state) => state.resume.updateCertification,
	);
	const deleteCertification = useRootStore(
		(state) => state.resume.deleteCertification,
	);

	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	if (!cert) return null;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		updateCertification(id, { [name]: value });
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
							{cert.name || "Untitled Certification"}
						</span>
						<span className="text-xs text-muted-foreground truncate">
							{cert.issuer || "Issuer"}
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
							deleteCertification(id);
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
								value={cert.name}
								onChange={handleChange}
								placeholder="Certification Name"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium leading-none">Issuer</label>
							<Input
								name="issuer"
								value={cert.issuer}
								onChange={handleChange}
								placeholder="Issuing Organization"
							/>
						</div>
						<div className="space-y-2 col-span-2">
							<label className="text-sm font-medium leading-none">Date</label>
							<Input
								name="date"
								value={cert.date}
								onChange={handleChange}
								placeholder="Issue Date"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function CertificationsForm() {
	const certifications = useRootStore((state) => state.resume.certifications || []);
	const reorderCertifications = useRootStore(
		(state) => state.resume.reorderCertifications,
	);
	const addCertification = useRootStore((state) => state.resume.addCertification);

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
			const oldIndex = certifications.findIndex(
				(item) => item.id === active.id,
			);
			const newIndex = certifications.findIndex((item) => item.id === over.id);
			reorderCertifications(oldIndex, newIndex);
		}
	}

	const handleAdd = () => {
		addCertification({
			id: `cert-${Date.now()}`,
			name: "",
			issuer: "",
			date: "",
		});
	};

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Manage your certifications here. Click an item to edit its details.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={certifications.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{certifications.map((cert) => (
							<CertificationItem key={cert.id} id={cert.id} />
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button variant="neutral" className="w-full mt-2" onClick={handleAdd}>
				+ Add Certification
			</Button>
		</div>
	);
}
