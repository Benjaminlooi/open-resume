# Scrollable Job Workspace Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the job workspace layout so that the overall page fits in the viewport without scrolling, pinning the header, back link, and bottom controls, and making only the sidebar list and the active step panel scrollable.

**Architecture:** Use a Flexbox column layout on the main container with `h-[calc(100vh-74px)]` and `overflow-hidden`. Pin static containers with `shrink-0`. Set the middle workspace grid to `flex-1 min-h-0` with `overflow-y-auto` and row tracking on mobile (`grid-rows-[auto_1fr]`), letting the active step component scroll internally.

**Tech Stack:** React 19, Tailwind CSS v4, TanStack Router.

## Global Constraints
- Target workspace path: `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder`
- Conventional commit messages required.
- Do not skip `pnpm verify` before handing off feature work.

---

### Task 1: Redesign Layout in $id.tsx

**Files:**
- Modify: `apps/web/src/routes/_app/jobs/$id.tsx`

**Interfaces:**
- Consumes: Existing layout structure of `JobWorkspace`.
- Produces: Height-constrained layout structure with scrollable middle grid and fixed header/controls.

- [ ] **Step 1: Write code modifications to `apps/web/src/routes/_app/jobs/$id.tsx`**

Make the following layout adjustments in the component render function:
```tsx
	return (
		<main className="mx-auto w-full max-w-[1300px] h-[calc(100vh-74px)] p-4 md:p-6 lg:p-8 text-[#082F49] flex flex-col gap-4 md:gap-6 overflow-hidden">
			{/* Back Link */}
			<div className="shrink-0">
				<Link
					to="/jobs"
					className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
				>
					<ArrowLeft className="size-4" />
					Back to Jobs
				</Link>
			</div>

			{/* Header */}
			<div className="shrink-0 border-2 border-border rounded-base p-5 bg-white shadow-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
				<div className="shrink-0 bg-amber-100 border-2 border-amber-300 rounded-base p-4 text-amber-950 font-bold text-sm shadow-light">
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

			<div className="grid grid-cols-1 grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-4 gap-4 md:gap-6 flex-1 min-h-0">
				{/* Navigation sidebar */}
				<div className="lg:col-span-1 flex flex-col gap-2 overflow-y-auto shrink-0 max-h-[160px] lg:max-h-none pr-1">
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
				<div className="lg:col-span-3 min-h-0 overflow-y-auto pr-1">
					<ActiveStepComponent applicationId={id} />
				</div>
			</div>

			{/* Bottom Bar Navigation */}
			<div className="shrink-0 border-2 border-border rounded-base p-4 bg-white shadow-shadow flex flex-col sm:flex-row justify-between items-center gap-4">
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
```

- [ ] **Step 2: Run verification**

Run `pnpm verify` to check type safety, format rules, and tests across the workspace:
Run: `pnpm verify`
Expected: Zero type errors, all tests pass, and builds successfully.

- [ ] **Step 3: Commit the changes**

Run:
```bash
git add apps/web/src/routes/_app/jobs/$id.tsx
git commit -m "feat: make job workspace layout viewport-scrollable and pin controls"
```
