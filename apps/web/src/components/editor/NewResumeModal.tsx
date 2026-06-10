import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import ResumeThumbnail from "#/components/dashboard/ResumeThumbnail";
import { blankResumeState } from "#/lib/dummy-resume";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { AVAILABLE_TEMPLATES } from "#/lib/resume-store";

interface NewResumeModalProps {
	onClose: () => void;
}

export default function NewResumeModal({ onClose }: NewResumeModalProps) {
	const navigate = useNavigate();
	const [name, setName] = useState("My New Resume");
	const [templateId, setTemplateId] = useState("demo");
	const { createResumeIndexEntry } = useResumeIndexStore();

	const handleCreate = () => {
		const id = crypto.randomUUID();
		createResumeIndexEntry(id, name, templateId);
		navigate({ to: "/editor/$id", params: { id } });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white border-2 border-border rounded-base p-6 w-full max-w-3xl shadow-shadow flex flex-col gap-6">
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
					<label className="block text-sm font-bold mb-2">
						Starting Template
					</label>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
						{AVAILABLE_TEMPLATES.map((tpl) => {
							const isSelected = templateId === tpl.id;
							return (
								<button
									key={tpl.id}
									onClick={() => setTemplateId(tpl.id)}
									className={`relative flex flex-col items-center justify-between border-2 rounded-base p-2 transition-all h-64 overflow-hidden text-left ${
										isSelected
											? "bg-main/10 border-border shadow-shadow hover:bg-main/20"
											: "border-border/50 text-muted-foreground hover:border-border hover:shadow-shadow"
									}`}
								>
									<div
										className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 z-10 ${
											isSelected
												? "bg-main border-border"
												: "bg-white border-border/50"
										}`}
									>
										{isSelected && (
											<svg
												className="w-3 h-3 text-black"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="3"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</div>

									<div
										className={`w-full flex-1 flex flex-col gap-2 mt-2 mb-2 overflow-hidden pointer-events-none relative ${!isSelected && "opacity-70"}`}
									>
										<ResumeThumbnail
											templateId={tpl.id}
											resume={{ ...blankResumeState, templateId: tpl.id }}
											scale={0.25}
										/>
									</div>

									<span
										className={`font-bold text-sm w-full text-center mt-2 ${isSelected ? "text-black" : "text-gray-500"}`}
									>
										{tpl.name}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex justify-end gap-4">
					<button
						onClick={onClose}
						className="px-4 py-2 border-2 border-border rounded-base font-bold hover:bg-main/5"
					>
						Cancel
					</button>
					<button
						onClick={handleCreate}
						className="px-4 py-2 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
					>
						Create
					</button>
				</div>
			</div>
		</div>
	);
}
