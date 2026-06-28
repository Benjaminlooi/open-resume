import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRootStore } from "#/lib/root-store";
import type { JobApplication, ResumeEditProposal } from "../job-application-schema";

export default function PipelineIntegrityPanel() {
	const jobApplications = useRootStore((s) => s.jobApplication.jobApplications);
	const validatePipeline = useRootStore((s) => s.jobApplication.validatePipeline);
	const archiveIncompleteJob = useRootStore(
		(s) => s.jobApplication.archiveIncompleteJob,
	);
	const associateSourceResume = useRootStore(
		(s) => s.jobApplication.associateSourceResume,
	);
	const clearStaleProposal = useRootStore(
		(s) => s.jobApplication.clearStaleProposal,
	);

	const resumes = useRootStore((state) => state.resumeIndex.resumes);
	useRootStore((state) => state.resumeIndex.defaultResumeId);
	const [selectedResumes, setSelectedResumes] = useState<
		Record<string, string>
	>({});

	const warningsMap = validatePipeline();
	const appIdsWithWarnings = Object.keys(warningsMap);

	if (appIdsWithWarnings.length === 0) {
		return (
			<div className="mb-8 p-4 border-2 border-emerald-200 rounded-base bg-emerald-50/50 text-[#082F49] flex items-center gap-3 shadow-shadow">
				<ShieldCheck className="size-5 text-emerald-600 shrink-0" />
				<span className="font-bold text-sm">
					Pipeline Integrity: All systems normal. No issues detected in your
					application pipeline.
				</span>
			</div>
		);
	}

	const findProposalIdForWarning = (app: JobApplication, warning: string) => {
		if (!app || !app.resumeEditProposals) return null;
		for (const prop of app.resumeEditProposals) {
			const { target } = prop;
			if (target.section === "experience") {
				if (warning.includes(`experience item ${target.itemId}`)) {
					return prop.id;
				}
			} else if (target.section === "skills") {
				if (warning.includes(`skill group ${target.itemId}`)) {
					return prop.id;
				}
			} else if (target.section === "projects") {
				if (warning.includes(`project item ${target.itemId}`)) {
					return prop.id;
				}
			}
		}
		return null;
	};

	const handleClearAllProposals = (app: JobApplication) => {
		if (!app || !app.resumeEditProposals) return;
		const pending = app.resumeEditProposals.filter(
			(p: ResumeEditProposal) => p.status === "pending",
		);
		for (const p of pending) {
			clearStaleProposal(app.id, p.id);
		}
	};

	return (
		<div className="mb-8 border-2 border-amber-200 rounded-base bg-amber-50/50 text-[#082F49] shadow-shadow p-6 relative overflow-hidden">
			<div className="flex items-center gap-3 mb-4 mt-2">
				<div className="bg-amber-100 p-2 border-2 border-amber-300 rounded-base shadow-light">
					<AlertTriangle className="size-6 text-amber-700" />
				</div>
				<div>
					<h2 className="text-xl font-heading text-[#082F49]">
						Pipeline Integrity Warning
					</h2>
					<p className="text-xs font-bold text-muted-foreground mt-0.5">
						Some of your job applications have inconsistencies. Resolve them
						below to keep your tailored resumes and proposals in sync.
					</p>
				</div>
			</div>

			<div className="space-y-4">
				{appIdsWithWarnings.map((appId) => {
					const app = jobApplications.find((a) => a.id === appId);
					if (!app) return null;

					const appWarnings = warningsMap[appId];

					return (
						<div
							key={appId}
							className="border-2 border-border rounded-base p-4 bg-white shadow-light text-[#082F49]"
						>
							<div className="flex items-center justify-between border-b-2 border-border pb-2 mb-3">
								<h3 className="font-heading text-lg truncate flex-1 mr-4">
									{app.title || "Untitled Job"}{" "}
									<span className="text-sm font-bold text-muted-foreground">
										at {app.company || "Unknown Company"}
									</span>
								</h3>
								<span className="text-xs px-2 py-0.5 border-2 border-amber-300 rounded-base bg-amber-100 text-amber-900 font-bold uppercase shrink-0">
									{appWarnings.length}{" "}
									{appWarnings.length === 1 ? "Warning" : "Warnings"}
								</span>
							</div>

							<ul className="space-y-3">
								{appWarnings.map((warning, idx) => {
									let recoveryAction = null;

									if (
										warning === "Job description is missing." ||
										warning === "Job title is missing." ||
										warning === "Company name is missing."
									) {
										recoveryAction = (
											<button
												type="button"
												onClick={() => archiveIncompleteJob(appId)}
												className="bg-rose-100 hover:bg-rose-250 text-rose-900 border-2 border-rose-300 rounded-base px-3 py-1 text-xs font-bold shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
											>
												Archive Job
											</button>
										);
									} else if (
										warning === "No source resume has been associated yet."
									) {
										const selectedId = selectedResumes[appId] || "";
										recoveryAction = (
											<div className="flex items-center gap-2 flex-wrap">
												<select
													value={selectedId}
													onChange={(e) =>
														setSelectedResumes((prev) => ({
															...prev,
															[appId]: e.target.value,
														}))
													}
													className="border-2 border-border rounded-base px-2 py-1 bg-white text-xs font-bold focus:outline-hidden"
												>
													<option value="">Select a resume...</option>
													{resumes.map((r) => (
														<option key={r.id} value={r.id}>
															{r.name}
														</option>
													))}
												</select>
												<button
													type="button"
													disabled={!selectedId}
													onClick={() =>
														associateSourceResume(appId, selectedId)
													}
													className="bg-[#38BDF8] disabled:opacity-50 disabled:pointer-events-none text-[#082F49] border-2 border-border rounded-base px-3 py-1 text-xs font-bold shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
												>
													Associate
												</button>
											</div>
										);
									} else if (warning.startsWith("Stale proposal target:")) {
										const proposalId = findProposalIdForWarning(app, warning);
										if (proposalId) {
											recoveryAction = (
												<button
													type="button"
													onClick={() => clearStaleProposal(appId, proposalId)}
													className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300 rounded-base px-3 py-1 text-xs font-bold shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
												>
													Clear Proposal
												</button>
											);
										}
									} else if (
										warning === "Archived job has pending proposals."
									) {
										recoveryAction = (
											<button
												type="button"
												onClick={() => handleClearAllProposals(app)}
												className="bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-300 rounded-base px-3 py-1 text-xs font-bold shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
											>
												Clear Proposals
											</button>
										);
									}

									return (
										<li
											key={idx}
											className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/30 border border-amber-200 rounded-base text-sm"
										>
											<div className="flex items-start gap-2">
												<span className="text-amber-600 font-bold shrink-0 mt-0.5">
													⚠️
												</span>
												<span className="font-bold text-gray-800">
													{warning}
												</span>
											</div>
											{recoveryAction && (
												<div className="shrink-0 flex items-center justify-end">
													{recoveryAction}
												</div>
											)}
										</li>
									);
								})}
							</ul>
						</div>
					);
				})}
			</div>
		</div>
	);
}
