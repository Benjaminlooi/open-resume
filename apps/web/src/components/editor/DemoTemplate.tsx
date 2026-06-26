import type { EditorState } from "#/lib/resume-schema";
import { useRootStore } from "#/lib/root-store";

export default function DemoTemplate({ resume }: { resume?: EditorState }) {
	const globalPersonalInfo = useRootStore((state) => state.resume.personalInfo);
	const globalSummary = useRootStore((state) => state.resume.summary);
	const globalSections = useRootStore((state) => state.resume.sections);
	const globalExperience = useRootStore((state) => state.resume.experience);
	const globalEducation = useRootStore((state) => state.resume.education);
	const globalSkills = useRootStore((state) => state.resume.skills);
	const globalProjects = useRootStore((state) => state.resume.projects || []);
	const globalCertifications = useRootStore(
		(state) => state.resume.certifications || [],
	);
	const globalLanguages = useRootStore((state) => state.resume.languages || []);

	const personalInfo = resume ? resume.personalInfo : globalPersonalInfo;
	const summary = resume ? resume.summary : globalSummary;
	const sections = resume ? resume.sections : globalSections;
	const experience = resume ? resume.experience : globalExperience;
	const education = resume ? resume.education : globalEducation;
	const skills = resume ? resume.skills : globalSkills;
	const projects = resume ? resume.projects || [] : globalProjects;
	const certifications = resume
		? resume.certifications || []
		: globalCertifications;
	const languages = resume ? resume.languages || [] : globalLanguages;
	const contactItems = [
		{ id: "email", type: "text" as const, value: personalInfo.email },
		{ id: "phone", type: "text" as const, value: personalInfo.phone },
		{ id: "location", type: "text" as const, value: personalInfo.location },
		...personalInfo.contactLinks.map((link) => ({
			id: link.id,
			type: "link" as const,
			value: link.url,
		})),
	].filter((item) => item.value.trim());

	const renderSection = (id: string) => {
		switch (id) {
			case "summary":
				if (!summary) return null;
				return (
					<section key={id} className="break-inside-avoid">
						<RichText
							html={summary}
							className="border-t border-[#8a8a8a] pt-1.5 text-[15px] font-semibold leading-[1.42] text-black [&_p]:m-0"
						/>
					</section>
				);
			case "experience":
				return (
					<ResumeSection key={id} title="WORK EXPERIENCE">
						<div className="space-y-6">
							{experience.map((item) => (
								<div key={item.id}>
									<div className="break-inside-avoid break-after-avoid">
										<div className="grid grid-cols-[1fr_auto] gap-6">
											<div className="text-[16px] font-bold leading-tight">
												{item.company}
											</div>
											<div className="whitespace-nowrap text-right text-[16px] font-bold leading-tight">
												{item.startDate} - {item.endDate}
											</div>
										</div>
										<div className="mt-0.5 grid grid-cols-[1fr_auto] gap-6 text-[14px] italic leading-tight">
											<div>{item.role}</div>
											<div className="whitespace-nowrap text-right">
												{item.location}
											</div>
										</div>
									</div>
									{item.description && (
										<RichText
											html={item.description}
											className="mt-1 text-[15px] leading-[1.35] text-black [&_li]:pl-1 [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-8"
										/>
									)}
								</div>
							))}
						</div>
					</ResumeSection>
				);
			case "education":
				return (
					<ResumeSection key={id} title="EDUCATION">
						<div className="space-y-1">
							{education.map((item) => (
								<div key={item.id} className="break-inside-avoid">
									<div className="grid grid-cols-[1fr_auto] gap-6">
										<div className="text-[16px] font-bold leading-tight">
											{item.degree}
											{item.gpa && <span> | {item.gpa}</span>}
										</div>
										<div className="whitespace-nowrap text-right text-[16px] font-bold leading-tight">
											{item.startDate} - {item.endDate}
										</div>
									</div>
									<div className="mt-0.5 grid grid-cols-[1fr_auto] gap-6 text-[14px] italic leading-tight">
										<div>{item.institution}</div>
										<div className="whitespace-nowrap text-right">
											{item.location}
										</div>
									</div>
									{item.description && (
										<RichText
											html={item.description}
											className="mt-1 text-[15px] leading-[1.35] text-black [&_li]:pl-1 [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-8"
										/>
									)}
								</div>
							))}
						</div>
					</ResumeSection>
				);
			case "skills":
				return (
					<ResumeSection key={id} title="SKILLS">
						<div className="space-y-1 text-[15px] leading-[1.4]">
							{skills.map((item) => (
								<p key={item.id}>
									<strong>{item.category}:</strong> {item.items}
								</p>
							))}
						</div>
					</ResumeSection>
				);
			case "projects":
				if (projects.length === 0) return null;
				return (
					<ResumeSection key={id} title="PROJECTS">
						<div className="space-y-3">
							{projects.map((item) => (
								<div key={item.id} className="break-inside-avoid text-[15px]">
									<p className="leading-[1.35]">
										<strong>{item.name}</strong>
										{item.url && (
											<>
												{" "}
												—{" "}
												<a
													href={formatContactHref(item.url)}
													className="text-[#1155cc] underline"
												>
													{item.url}
												</a>
											</>
										)}
										{item.date && <> — {item.date}</>}
									</p>
									{item.description && (
										<RichText
											html={item.description}
											className="mt-0.5 leading-[1.35] text-black [&_p]:m-0"
										/>
									)}
								</div>
							))}
						</div>
					</ResumeSection>
				);
			case "certifications":
				if (certifications.length === 0) return null;
				return (
					<ResumeSection key={id} title="CERTIFICATIONS">
						<div className="space-y-1 text-[15px]">
							{certifications.map((item) => (
								<div key={item.id} className="grid grid-cols-[1fr_auto] gap-6">
									<div>
										<strong>{item.name}</strong>
										{item.issuer && <span> - {item.issuer}</span>}
									</div>
									<div>{item.date}</div>
								</div>
							))}
						</div>
					</ResumeSection>
				);
			case "languages":
				if (languages.length === 0) return null;
				return (
					<ResumeSection key={id} title="LANGUAGES">
						<div className="flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
							{languages.map((item) => (
								<div key={item.id}>
									<strong>{item.language}</strong>
									{item.proficiency && `: ${item.proficiency}`}
								</div>
							))}
						</div>
					</ResumeSection>
				);
			default:
				return null;
		}
	};

	return (
		<div className="min-h-full bg-white px-[12mm] py-[17mm] font-sans text-black print:py-0">
			<header className="mb-7 text-left">
				<h1 className="text-[32px] font-extrabold leading-tight tracking-normal">
					{personalInfo.fullName || "Your Name"}
				</h1>
				<div className="mt-3 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[15px] leading-[1.35]">
					{contactItems.map((item, index) => (
						<span key={item.id} className="contents">
							{item.type === "link" ? (
								<a
									href={formatContactHref(item.value)}
									className="text-[#1155cc] underline"
								>
									{item.value}
								</a>
							) : (
								<span>{item.value}</span>
							)}
							{index < contactItems.length - 1 && <span>•</span>}
						</span>
					))}
				</div>
			</header>

			<div className="space-y-7">
				{sections
					.filter((section) => section.visible)
					.map((s) => renderSection(s.id))}
			</div>
		</div>
	);
}

function ResumeSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section>
			<h2 className="mb-3 border-b border-[#8a8a8a] pb-3 text-[21px] font-extrabold leading-tight tracking-normal">
				{title}
			</h2>
			{children}
		</section>
	);
}

function formatContactHref(value: string) {
	return `https://${value.replace(/^https?:\/\//, "")}`;
}

function RichText({ html, className }: { html: string; className: string }) {
	// biome-ignore lint/security/noDangerouslySetInnerHtml: Resume content is generated by the local rich text editor.
	return (
		<div className={className} dangerouslySetInnerHTML={{ __html: html }} />
	);
}
