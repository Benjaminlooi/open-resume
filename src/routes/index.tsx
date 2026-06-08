import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Bot,
	BriefcaseBusiness,
	Check,
	FileText,
	LayoutTemplate,
	Lock,
	Sparkles,
	WandSparkles,
} from "lucide-react";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

const features = [
	{
		icon: WandSparkles,
		title: "AI-guided writing",
		description:
			"Turn rough notes into clear, role-specific bullets without leaving the editor.",
	},
	{
		icon: LayoutTemplate,
		title: "Polished templates",
		description:
			"Choose structured layouts that keep content readable for recruiters and ATS tools.",
	},
	{
		icon: Lock,
		title: "Local-first control",
		description:
			"Draft, revise, and manage resumes in a private workspace built for iteration.",
	},
];

const steps = [
	"Add your role target and experience",
	"Refine sections with focused AI prompts",
	"Preview, adjust, and export a resume that reads cleanly",
];

const resumeBullets = [
	"Reduced onboarding time by 34% with reusable workflow templates",
	"Led cross-functional launch planning for a customer analytics platform",
	"Built reporting dashboards used by sales, support, and operations teams",
];

function LandingPage() {
	return (
		<main className="min-h-screen overflow-hidden bg-[#F0F9FF] text-[#0C4A6E]">
			<header className="border-[#BAE6FD] border-b bg-white/85 backdrop-blur">
				<nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
					<Link
						to="/"
						className="flex items-center gap-2 font-heading text-[#075985] text-lg transition-colors hover:text-[#0EA5E9]"
					>
						<span className="flex size-9 items-center justify-center rounded-base border-2 border-[#082F49] bg-[#38BDF8] text-[#082F49] shadow-[3px_3px_0_#082F49]">
							<FileText className="size-5" aria-hidden="true" />
						</span>
						Open Resume
					</Link>
					<div className="hidden items-center gap-8 text-[#075985] text-sm font-semibold md:flex">
						<a
							className="transition-colors hover:text-[#0EA5E9]"
							href="#features"
						>
							Features
						</a>
						<a
							className="transition-colors hover:text-[#0EA5E9]"
							href="#workflow"
						>
							Workflow
						</a>
						<Link className="transition-colors hover:text-[#0EA5E9]" to="/jobs">
							Jobs
						</Link>
					</div>
					<Button asChild className="cursor-pointer bg-[#F97316]">
						<Link to="/resumes">
							Start building
							<ArrowRight aria-hidden="true" />
						</Link>
					</Button>
				</nav>
			</header>

			<section className="relative">
				<div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
					<div className="max-w-3xl">
						<div className="mb-6 inline-flex items-center gap-2 rounded-base border-2 border-[#082F49] bg-white px-3 py-2 font-semibold text-[#075985] text-sm shadow-[3px_3px_0_#082F49]">
							<Sparkles className="size-4 text-[#F97316]" aria-hidden="true" />
							Resume builder for focused job searches
						</div>
						<h1 className="max-w-4xl text-balance font-heading text-5xl text-[#082F49] leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
							Open Resume
						</h1>
						<p className="mt-6 max-w-2xl text-lg text-[#075985] leading-8 sm:text-xl">
							Create targeted resumes faster with structured editing, live
							previews, and AI prompts that help each bullet sound specific,
							measurable, and human.
						</p>
						<div className="mt-9 flex flex-col gap-3 sm:flex-row">
							<Button
								asChild
								size="lg"
								className="h-12 cursor-pointer bg-[#F97316] px-6 text-base"
							>
								<Link to="/resumes">
									Build a resume
									<ArrowRight aria-hidden="true" />
								</Link>
							</Button>
							<Button
								asChild
								size="lg"
								variant="neutral"
								className="h-12 cursor-pointer border-[#082F49] bg-white px-6 text-base"
							>
								<Link to="/jobs">
									<BriefcaseBusiness aria-hidden="true" />
									Track jobs
								</Link>
							</Button>
						</div>
						<div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-[#BAE6FD] border-t pt-6">
							<Metric label="Templates" value="2+" />
							<Metric label="AI modes" value="4" />
							<Metric label="Setup" value="Local" />
						</div>
					</div>

					<div className="relative min-h-[520px]">
						<div className="absolute top-4 right-0 left-8 hidden h-[92%] rounded-base border-2 border-[#082F49] bg-[#38BDF8] shadow-[8px_8px_0_#082F49] lg:block" />
						<div className="relative rounded-base border-2 border-[#082F49] bg-white p-4 shadow-[8px_8px_0_#082F49] sm:p-6">
							<div className="mb-5 flex items-center justify-between border-[#E0F2FE] border-b pb-4">
								<div>
									<p className="font-heading text-[#082F49] text-lg">
										Product Manager Resume
									</p>
									<p className="text-[#0369A1] text-sm">Live preview</p>
								</div>
								<div className="rounded-base border-2 border-[#082F49] bg-[#F97316] px-3 py-1.5 font-heading text-[#082F49] text-sm">
									ATS ready
								</div>
							</div>
							<div className="grid gap-5 lg:grid-cols-[0.72fr_1fr]">
								<div className="rounded-base border-2 border-[#082F49] bg-[#F8FAFC] p-4">
									<div className="mb-4 flex items-center gap-2">
										<Bot className="size-5 text-[#0EA5E9]" aria-hidden="true" />
										<p className="font-heading text-[#082F49]">AI prompt</p>
									</div>
									<p className="text-[#075985] text-sm leading-6">
										Rewrite this project section for a senior product role and
										make the business impact clearer.
									</p>
									<div className="mt-5 space-y-3">
										<div className="h-3 rounded-full bg-[#BAE6FD]" />
										<div className="h-3 w-5/6 rounded-full bg-[#BAE6FD]" />
										<div className="h-3 w-2/3 rounded-full bg-[#BAE6FD]" />
									</div>
								</div>
								<div className="min-h-[420px] rounded-base border-2 border-[#082F49] bg-white p-7 text-[#082F49] shadow-[4px_4px_0_#082F49]">
									<div className="border-[#0C4A6E] border-b pb-4">
										<p className="font-heading text-2xl">Alex Morgan</p>
										<p className="mt-1 text-[#0369A1] text-sm">
											Senior Product Manager | SaaS Growth
										</p>
									</div>
									<div className="mt-5">
										<p className="font-heading text-[#0C4A6E] text-sm uppercase">
											Experience
										</p>
										<div className="mt-3 space-y-3">
											{resumeBullets.map((bullet) => (
												<div className="flex gap-3" key={bullet}>
													<span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#F97316]" />
													<p className="text-sm leading-6">{bullet}</p>
												</div>
											))}
										</div>
									</div>
									<div className="mt-7 grid grid-cols-2 gap-3">
										<Tag label="Roadmaps" />
										<Tag label="Lifecycle" />
										<Tag label="SQL" />
										<Tag label="Experimentation" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="features" className="bg-white py-16 sm:py-20">
				<div className="mx-auto max-w-7xl px-5 sm:px-8">
					<div className="max-w-2xl">
						<p className="font-heading text-[#F97316] text-sm uppercase">
							Why it works
						</p>
						<h2 className="mt-3 font-heading text-3xl text-[#082F49] sm:text-4xl">
							A resume workflow that keeps momentum
						</h2>
					</div>
					<div className="mt-10 grid gap-5 md:grid-cols-3">
						{features.map((feature) => (
							<article
								className="rounded-base border-2 border-[#082F49] bg-[#F0F9FF] p-6 shadow-[4px_4px_0_#082F49]"
								key={feature.title}
							>
								<div className="mb-5 flex size-11 items-center justify-center rounded-base border-2 border-[#082F49] bg-white">
									<feature.icon
										className="size-5 text-[#0EA5E9]"
										aria-hidden="true"
									/>
								</div>
								<h3 className="font-heading text-[#082F49] text-xl">
									{feature.title}
								</h3>
								<p className="mt-3 text-[#075985] leading-7">
									{feature.description}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section id="workflow" className="py-16 sm:py-20">
				<div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.75fr_1fr]">
					<div>
						<p className="font-heading text-[#F97316] text-sm uppercase">
							Workflow
						</p>
						<h2 className="mt-3 font-heading text-3xl text-[#082F49] sm:text-4xl">
							From blank page to tailored draft
						</h2>
						<p className="mt-4 text-[#075985] leading-8">
							Start with the details you already have. Open Resume keeps the
							editing loop tight so each version can match a role, company, or
							seniority level.
						</p>
					</div>
					<div className="grid gap-4">
						{steps.map((step, index) => (
							<div
								className="flex gap-4 rounded-base border-2 border-[#082F49] bg-white p-5 shadow-[4px_4px_0_#082F49]"
								key={step}
							>
								<div className="flex size-9 shrink-0 items-center justify-center rounded-base border-2 border-[#082F49] bg-[#38BDF8] font-heading text-[#082F49]">
									{index + 1}
								</div>
								<p className="self-center font-semibold text-[#082F49]">
									{step}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section
				id="workspace"
				className="bg-[#082F49] py-16 text-white sm:py-20"
			>
				<div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_0.85fr]">
					<div>
						<p className="font-heading text-[#7DD3FC] text-sm uppercase">
							Open workspace
						</p>
						<h2 className="mt-3 max-w-3xl font-heading text-3xl sm:text-4xl">
							Keep every resume version focused on the role.
						</h2>
						<p className="mt-4 max-w-2xl text-[#BAE6FD] leading-8">
							Use the dashboard, templates, and AI-assisted editing flow to
							create a practical versioning system for your job search.
						</p>
					</div>
					<div className="rounded-base border-2 border-white bg-[#F0F9FF] p-6 text-[#082F49] shadow-[6px_6px_0_#38BDF8]">
						<p className="font-heading text-2xl">Build in your workspace</p>
						<p className="mt-2 text-[#075985]">
							Draft, compare, and refine resumes without turning the process
							into scattered files.
						</p>
						<ul className="mt-5 space-y-3">
							{[
								"Saved resume dashboard",
								"Modern preview templates",
								"Interactive AI writing prompts",
							].map((item) => (
								<li className="flex items-center gap-3" key={item}>
									<Check className="size-5 text-[#F97316]" aria-hidden="true" />
									<span className="font-semibold">{item}</span>
								</li>
							))}
						</ul>
						<Button
							asChild
							size="lg"
							className="mt-6 h-12 w-full cursor-pointer bg-[#F97316] text-base"
						>
							<Link to="/resumes">
								Open dashboard
								<ArrowRight aria-hidden="true" />
							</Link>
						</Button>
					</div>
				</div>
			</section>
		</main>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="font-heading text-2xl text-[#082F49]">{value}</p>
			<p className="mt-1 text-[#075985] text-sm">{label}</p>
		</div>
	);
}

function Tag({ label }: { label: string }) {
	return (
		<div className="rounded-base border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-2 font-semibold text-[#075985] text-xs">
			{label}
		</div>
	);
}
