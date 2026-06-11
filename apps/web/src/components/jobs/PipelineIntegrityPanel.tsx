import { useJobApplicationStore } from "#/lib/job-application-store";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function PipelineIntegrityPanel() {
	const {
		jobApplications,
		validatePipeline,
		archiveIncompleteJob,
		associateSourceResume,
		clearStaleProposal,
	} = useJobApplicationStore();

	const resumes = useResumeIndexStore((state) => state.resumes);
	const [selectedResumes, setSelectedResumes] = useState<
		Record<string, string>
	>({});

	const warningsMap = validatePipeline();
	const appIdsWithWarnings = Object.keys(warningsMap);

	if (appIdsWithWarnings.length === 0) {
		return (
			<div className="mb-8 p-4 border-2 border-emerald-500 rounded-base bg-emerald-50 text-emerald-950 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]">
				<ShieldCheck className="size-5 text-emerald-600 shrink-0" />
				<span className="font-bold text-sm">
					Pipeline Integrity: All systems normal. No issues detected in your
					application pipeline.
				</span>
			</div>
		);
	}

	const findProposalIdForWarning = (app: any, warning: string) => {
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

	const handleClearAllProposals = (app: any) => {
		if (!app || !app.resumeEditProposals) return;
		const pending = app.resumeEditProposals.filter(
			(p: any) => p.status === "pending",
		);
		for (const p of pending) {
			clearStaleProposal(app.id, p.id);
		}
	};

	return (
		<div className="mb-8 border-2 border-black rounded-base bg-amber-50 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative overflow-hidden">
			{/* Top alert bar pattern */}
			<div className="absolute top-0 left-0 right-0 h-2 bg-yellow-400 border-b-2 border-black" />

			<div className="flex items-center gap-3 mb-4 mt-2">
				<div className="bg-yellow-400 p-2 border-2 border-black rounded-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
					<AlertTriangle className="size-6 text-black" />
				</div>
				<div>
					<h2 className="text-xl font-heading text-[#082F49]">
						Pipeline Integrity Warning
					</h2>
					<p className="text-xs font-bold text-gray-700 mt-0.5">
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
							className="border-2 border-black rounded-base p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#082F49]"
						>
							<div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
								<h3 className="font-heading text-lg truncate flex-1 mr-4">
									{app.title || "Untitled Job"}{" "}
									<span className="text-sm font-bold text-muted-foreground">
										at {app.company || "Unknown Company"}
									</span>
								</h3>
								<span className="text-xs px-2 py-0.5 border-2 border-black rounded-base bg-yellow-400 font-bold uppercase shrink-0">
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
												className="bg-rose-400 text-black border-2 border-black rounded-base px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer hover:bg-rose-500"
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
													className="border-2 border-black rounded-base px-2 py-1 bg-white text-xs font-bold focus:outline-hidden"
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
													className="bg-sky-400 disabled:opacity-50 disabled:pointer-events-none text-black border-2 border-black rounded-base px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer hover:bg-sky-500"
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
													className="bg-amber-400 text-black border-2 border-black rounded-base px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer hover:bg-amber-500"
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
												className="bg-zinc-400 text-black border-2 border-black rounded-base px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer hover:bg-zinc-500"
											>
												Clear Proposals
											</button>
										);
									}

									return (
										<li
											key={idx}
											className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-base text-sm"
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
