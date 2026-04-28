import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createResumeIndexEntry } from "#/lib/resume-index-store";
import { AVAILABLE_TEMPLATES } from "#/lib/resume-store";

interface NewResumeModalProps {
	onClose: () => void;
}

export default function NewResumeModal({ onClose }: NewResumeModalProps) {
	const navigate = useNavigate();
	const [name, setName] = useState("My New Resume");
	const [templateId, setTemplateId] = useState("demo");

	const handleCreate = () => {
		const id = crypto.randomUUID();
		createResumeIndexEntry(id, name, templateId);
		navigate({ to: "/editor/$id", params: { id } });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white border-2 border-border rounded-base p-6 w-full max-w-md shadow-shadow">
				<h2 className="text-2xl font-heading mb-4">Create New Resume</h2>
				
				<div className="mb-4">
					<label className="block text-sm font-bold mb-2">Resume Name</label>
					<input 
						type="text" 
						value={name} 
						onChange={(e) => setName(e.target.value)}
						className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main"
					/>
				</div>

				<div className="mb-6">
					<label className="block text-sm font-bold mb-2">Starting Template</label>
					<div className="grid grid-cols-2 gap-4">
						{AVAILABLE_TEMPLATES.map((tpl) => (
							<button
								key={tpl.id}
								onClick={() => setTemplateId(tpl.id)}
								className={`border-2 rounded-base p-4 text-center font-bold ${templateId === tpl.id ? 'bg-main text-main-foreground border-border shadow-shadow' : 'border-border/50 text-muted-foreground hover:border-border'}`}
							>
								{tpl.name}
							</button>
						))}
					</div>
				</div>

				<div className="flex justify-end gap-4">
					<button onClick={onClose} className="px-4 py-2 border-2 border-border rounded-base font-bold hover:bg-main/5">
						Cancel
					</button>
					<button onClick={handleCreate} className="px-4 py-2 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
						Create
					</button>
				</div>
			</div>
		</div>
	);
}