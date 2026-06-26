import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Check,
	ChevronLeft,
	ChevronRight,
	Dot,
	Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	formatStatus,
	getStatusBadgeStyle,
} from "#/features/job-postings/job-application-status";
import { useRootStore } from "#/lib/root-store";
import { computePipelineProgress } from "#/features/job-postings/pipeline-progress";
import {
	DEFAULT_STEP_ID,
	type PipelineStepId,
	PIPELINE_STEPS,
	normaliseStepId,
	stepIdToIndex,
	stepIndexToId,
} from "#/features/job-postings/pipeline-steps";


export const Route = createFileRoute("/_app/jobs/$id")({
	validateSearch: (search: Record<string, unknown>): {
		step?: PipelineStepId;
	} => ({
		step: normaliseStepId(search.step),
	}),
	component: JobWorkspace,
});

function JobWorkspace() {
	const { id } = Route.useParams();
	const { step } = Route.useSearch();
	const navigate = useNavigate();

	const jobApplications = useRootStore((s) => s.jobApplication.jobApplications);
	const validatePipeline = useRootStore((s) => s.jobApplication.validatePipeline);
	const loadJobApplications = useRootStore(
		(s) => s.jobApplication.loadJobApplications,
	);
	const defaultResumeId = useRootStore((s) => s.resumeIndex.defaultResumeId);
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
			<main className="mx-auto max-w-[1300px] p-8 text-[#082F49]">
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

	const activeStepId: PipelineStepId = step ?? DEFAULT_STEP_ID;
	const activeStepIndex = stepIdToIndex(activeStepId);
	const ActiveStepComponent = PIPELINE_STEPS[activeStepIndex].component;

	const goToStep = (index: number) => {
		navigate({
			to: "/jobs/$id",
			params: { id },
			search: { step: stepIndexToId(index) },
		});
	};

	// Single source of truth for progress: sidebar badges + next-action bar both
	// read from this. Display only — does not write the persisted `status`.
	const progress = computePipelineProgress(
		application,
		defaultResumeId !== null,
	);

	const warnings = validatePipeline();
	const jobWarnings = warnings[id] || [];

	return (
		<main className="mx-auto max-w-[1300px] p-4 md:p-8 text-[#082F49] flex flex-col gap-6">
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
					{PIPELINE_STEPS.map((pipelineStep, index) => {
						const isActive = activeStepIndex === index;
						const stepProgress = progress.steps[pipelineStep.id];
						return (
							<button
								key={pipelineStep.id}
								type="button"
								onClick={() => goToStep(index)}
								className={`w-full text-left px-4 py-3 rounded-base border-2 font-bold text-sm transition-all cursor-pointer flex items-center justify-between gap-2 ${
									isActive
										? "bg-[#38BDF8] text-[#082F49] border-border shadow-shadow"
										: "bg-white text-muted-foreground border-border/60 hover:border-border hover:shadow-light"
								}`}
							>
								<span className="flex items-center gap-1.5 min-w-0">
									<span className="text-xs opacity-65">{index + 1}.</span>
									<span className="truncate">{pipelineStep.name}</span>
								</span>
								<StepStatusGlyph status={stepProgress.status} />
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
					Next Action: {progress.nextAction}
				</div>

				<div className="flex gap-3">
					<button
						type="button"
						disabled={activeStepIndex === 0}
						onClick={() => goToStep(activeStepIndex - 1)}
						className="inline-flex h-10 items-center gap-1.5 border-2 border-border bg-white px-4 py-2 font-bold text-sm rounded-base shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<ChevronLeft className="size-4" />
						Previous Step
					</button>

					<button
						type="button"
						disabled={activeStepIndex === PIPELINE_STEPS.length - 1}
						onClick={() => goToStep(activeStepIndex + 1)}
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

/**
 * Compact progress indicator rendered at the trailing edge of each sidebar
 * nav button. Conveys at a glance which steps are done, in-flight, or blocked.
 */
function StepStatusGlyph({
	status,
}: {
	status: "pending" | "blocked" | "in-progress" | "complete";
}) {
	switch (status) {
		case "complete":
			return (
				<Check
					className="size-4 text-emerald-700 shrink-0"
					title="Complete"
				/>
			);
		case "in-progress":
			return (
				<Dot
					className="size-5 text-amber-500 shrink-0"
					title="In progress"
				/>
			);
		case "blocked":
			return (
				<Lock
					className="size-3.5 text-slate-400 shrink-0"
					title="Blocked by a previous step"
				/>
			);
		default:
			return null;
	}
}
