import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { resumeIndexStore, deleteResumeIndexEntry } from "#/lib/resume-index-store";
import NewResumeModal from "#/components/editor/NewResumeModal";

export const Route = createFileRoute("/resumes")({
	component: ResumesDashboard,
});

function ResumesDashboard() {
	const { resumes } = useStore(resumeIndexStore);
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<main className="container mx-auto p-8 pt-[100px]">
			<h1 className="text-4xl font-heading mb-8">My Resumes</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				
				<div 
					onClick={() => setIsModalOpen(true)}
					className="border-2 border-dashed border-border rounded-base h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-main/5 transition-colors bg-white"
				>
					<div className="text-4xl mb-2">+</div>
					<div className="font-heading text-xl">New Resume</div>
				</div>

				{resumes.map((resume) => (
					<div key={resume.id} className="border-2 border-border rounded-base h-64 flex flex-col bg-white overflow-hidden shadow-shadow hover:-translate-y-1 transition-transform">
						<div className="flex-1 bg-main/10 flex items-center justify-center border-b-2 border-border">
							<span className="text-muted-foreground uppercase tracking-widest font-bold">{resume.templateId}</span>
						</div>
						<div className="p-4 flex flex-col gap-2">
                            <div className="font-heading text-lg truncate">{resume.name}</div>
                            <div className="text-sm text-muted-foreground">Edited: {new Date(resume.lastModified).toLocaleDateString()}</div>
                            <div className="flex gap-2 mt-2">
                                <Link to="/editor/$id" params={{ id: resume.id }} className="flex-1 text-center bg-main text-main-foreground border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
                                    Edit
                                </Link>
                                <button onClick={() => deleteResumeIndexEntry(resume.id)} className="bg-red-200 text-red-900 border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
                                    Delete
                                </button>
                            </div>
                        </div>
					</div>
				))}
			</div>
			{isModalOpen && <NewResumeModal onClose={() => setIsModalOpen(false)} />}
		</main>
	);
}