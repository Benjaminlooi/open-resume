import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import ApplicationTrackerStep from "#/features/jobs/components/ApplicationTrackerStep";
import CoverLetterStep from "#/features/jobs/components/CoverLetterStep";
import FitBriefStep from "#/features/jobs/components/FitBriefStep";
import JobDetailsStep from "#/features/jobs/components/JobDetailsStep";
import ResumeTailoringStep from "#/features/jobs/components/ResumeTailoringStep";
import type { JobApplicationStatus } from "#/features/jobs/job-application-schema";
import { useJobApplicationStore } from "#/features/jobs/job-application-store";

export const Route = createFileRoute("/jobs/$id")({
	component: JobWorkspace,
});

const STEPS = [
	{ name: "Job Details", component: JobDetailsStep },
	{ name: "Fit Analysis", component: FitBriefStep },
	{ name: "Resume Tailoring", component: ResumeTailoringStep },
	{ name: "Cover Letter", component: CoverLetterStep },
	{ name: "Final Tracker", component: ApplicationTrackerStep },
];

const getStatusBadgeStyle = (status: JobApplicationStatus) => {
	switch (status) {
		case "saved":
			return "bg-slate-100 text-slate-800 border-slate-300";
		case "analyzing":
			return "bg-purple-100 text-purple-800 border-purple-300";
		case "tailoring":
			return "bg-amber-100 text-amber-800 border-amber-300";
		case "applied":
			return "bg-blue-100 text-blue-800 border-blue-300";
		case "interviewing":
			return "bg-emerald-100 text-emerald-800 border-emerald-300";
		case "offer":
			return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
		case "rejected":
			return "bg-red-100 text-red-800 border-red-300";
		case "archived":
			return "bg-zinc-100 text-zinc-800 border-zinc-300";
		default:
			return "bg-gray-100 text-gray-800 border-gray-300";
	}
};

const formatStatus = (status: JobApplicationStatus) => {
	return status.charAt(0).toUpperCase() + status.slice(1);
};

function JobWorkspace() {
	const { id } = Route.useParams();
	const { jobApplications, validatePipeline, loadJobApplications } =
		useJobApplicationStore();
	const [activeStep, setActiveStep] = useState(0);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (isMounted) {
			loadJobApplications().catch((err) =>
				console.error("Failed to load job applications", err),
			);
		}
	}, [isMounted, loadJobApplications]);

	const application = jobApplications.find((app) => app.id === id);

	if (!isMounted) {
		return null;
	}

	if (!application) {
		return (
			<main className="container mx-auto p-8 pt-[100px] text-[#082F49]">
				<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-6 text-sm font-bold flex flex-col gap-4 max-w-xl mx-auto shadow-shadow">
					<div className="flex gap-2 items-center text-lg font-heading">
						<AlertCircle className="size-6 shrink-0" />
						<span>Job application not found</span>
					</div>
					<p>
						The job application with ID "{id}" could not be found. It may have
						been deleted.
					</p>
					<Link
						to="/jobs"
						className="inline-flex w-fit items-center gap-1.5 border-2 border-border bg-white p-2 rounded-base font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
					>
						<ArrowLeft className="size-4" />
						Back to Jobs list
					</Link>
				</div>
			</main>
		);
	}

	const warnings = validatePipeline();
	const jobWarnings = warnings[id] || [];

	const getNextActionMessage = () => {
		if (!application.fitBrief) {
			return "Next Action: Generate Fit Analysis (Step 2)";
		}
		if (!application.tailoredResume) {
			return "Next Action: Start Tailoring (Step 3)";
		}
		if (application.resumeEditProposals.length === 0) {
			return "Next Action: Generate Tailoring Proposals (Step 3)";
		}
		if (!application.coverLetterDraft) {
			return "Next Action: Generate Cover Letter (Step 4)";
		}
		return "Next Action: Submit Application & Update Status (Step 5)";
	};

	const ActiveStepComponent = STEPS[activeStep].component;

	return (
		<main className="container mx-auto p-4 md:p-8 pt-[100px] text-[#082F49] flex flex-col gap-6 max-w-6xl">
			{/* Back Link */}
			<div>
				<Link
					to="/jobs"
					className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
				>
					<ArrowLeft className="size-4" />
					Back to Jobs
				</Link>
			</div>

			{/* Header */}
			<div className="border-2 border-border rounded-base p-5 bg-white shadow-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-3xl font-heading">{application.title}</h1>
					<p className="text-lg font-bold text-muted-foreground mt-0.5">
						{application.company}
						{application.location && ` • ${application.location}`}
					</p>
				</div>
				<span
					className={`text-xs px-3 py-1.5 rounded-base border-2 font-bold uppercase tracking-wider ${getStatusBadgeStyle(
						application.status,
					)}`}
				>
					{formatStatus(application.status)}
				</span>
			</div>

			{/* Warnings Banner */}
			{jobWarnings.length > 0 && (
				<div className="bg-amber-100 border-2 border-amber-300 rounded-base p-4 text-amber-950 font-bold text-sm shadow-light">
					<div className="font-heading text-md mb-1.5 flex items-center gap-1.5 text-amber-950">
						⚠️ Pipeline Warnings for this Job:
					</div>
					<ul className="list-disc pl-5 font-normal flex flex-col gap-1">
						{jobWarnings.map((warn, index) => (
							<li key={index}>{warn}</li>
						))}
					</ul>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Navigation sidebar */}
				<div className="lg:col-span-1 flex flex-col gap-2">
					{STEPS.map((step, index) => {
						const isActive = activeStep === index;
						return (
							<button
								key={index}
								type="button"
								onClick={() => setActiveStep(index)}
								className={`w-full text-left px-4 py-3 rounded-base border-2 font-bold text-sm transition-all cursor-pointer ${
									isActive
										? "bg-[#38BDF8] text-[#082F49] border-border shadow-shadow"
										: "bg-white text-muted-foreground border-border/60 hover:border-border hover:shadow-light"
								}`}
							>
								<span className="mr-2 text-xs opacity-65">{index + 1}.</span>
								{step.name}
							</button>
						);
					})}
				</div>

				{/* Active Step Panel */}
				<div className="lg:col-span-3">
					<ActiveStepComponent applicationId={id} />
				</div>
			</div>

			{/* Bottom Bar Navigation */}
			<div className="border-2 border-border rounded-base p-4 bg-white shadow-shadow flex flex-col sm:flex-row justify-between items-center gap-4">
				<div className="text-sm font-bold text-[#082F49] bg-main/10 border-2 border-main/20 px-3 py-1.5 rounded-base">
					{getNextActionMessage()}
				</div>

				<div className="flex gap-3">
					<button
						type="button"
						disabled={activeStep === 0}
						onClick={() => setActiveStep((prev) => prev - 1)}
						className="inline-flex h-10 items-center gap-1.5 border-2 border-border bg-white px-4 py-2 font-bold text-sm rounded-base shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<ChevronLeft className="size-4" />
						Previous Step
					</button>

					<button
						type="button"
						disabled={activeStep === STEPS.length - 1}
						onClick={() => setActiveStep((prev) => prev + 1)}
						className="inline-flex h-10 items-center gap-1.5 border-2 border-border bg-white px-4 py-2 font-bold text-sm rounded-base shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Next Step
						<ChevronRight className="size-4" />
					</button>
				</div>
			</div>
		</main>
	);
}
