import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ResumeCard from "#/components/dashboard/ResumeCard";
import NewResumeModal from "#/components/editor/NewResumeModal";
import {
	useResumeIndexStore,
} from "#/lib/resume-index-store";

export const Route = createFileRoute("/resumes")({
	component: ResumesDashboard,
});

function ResumesDashboard() {
	const { resumes, deleteResumeIndexEntry } = useResumeIndexStore();
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<main className="container mx-auto p-8 pt-[100px]">
			<h1 className="text-4xl font-heading mb-8">My Resumes</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="border-2 border-dashed border-border rounded-base h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-main/5 transition-colors bg-white w-full"
				>
					<div className="text-4xl mb-2">+</div>
					<div className="font-heading text-xl">New Resume</div>
				</button>

				{resumes.map((resume) => (
					<ResumeCard
						key={resume.id}
						resumeIndex={resume}
						onDelete={deleteResumeIndexEntry}
					/>
				))}
			</div>
			{isModalOpen && <NewResumeModal onClose={() => setIsModalOpen(false)} />}
		</main>
	);
}
