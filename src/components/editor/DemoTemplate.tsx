import { type EditorState, useResumeStore } from "#/lib/resume-store";

export default function DemoTemplate({ resume }: { resume?: EditorState }) {
	const globalPersonalInfo = useResumeStore((state) => state.personalInfo);
	const globalSections = useResumeStore((state) => state.sections);
	const globalExperience = useResumeStore((state) => state.experience);
	const globalEducation = useResumeStore((state) => state.education);
	const globalSkills = useResumeStore((state) => state.skills);
	const globalProjects = useResumeStore((state) => state.projects || []);
	const globalCertifications = useResumeStore(
		(state) => state.certifications || [],
	);
	const globalLanguages = useResumeStore((state) => state.languages || []);

	const personalInfo = resume ? resume.personalInfo : globalPersonalInfo;
	const sections = resume ? resume.sections : globalSections;
	const experience = resume ? resume.experience : globalExperience;
	const education = resume ? resume.education : globalEducation;
	const skills = resume ? resume.skills : globalSkills;
	const projects = resume ? resume.projects || [] : globalProjects;
	const certifications = resume
		? resume.certifications || []
		: globalCertifications;
	const languages = resume ? resume.languages || [] : globalLanguages;

	const renderSection = (id: string) => {
		switch (id) {
			case "experience":
				return (
					<section key={id} className="break-inside-avoid">
						<h2 className="text-xl font-bold uppercase border-b border-black/20 mb-3 pb-1 text-black/90">
							Experience
						</h2>
						<div className="flex flex-col gap-4">
							{experience.map((item) => (
								<div key={item.id}>
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-bold text-lg">{item.role}</h3>
										<span className="text-sm font-medium text-black/80">
											{item.startDate} - {item.endDate}
										</span>
									</div>
									<div className="flex justify-between items-baseline mb-2 text-black/80">
										<span className="text-md italic">{item.company}</span>
										<span className="text-sm">{item.location}</span>
									</div>
									{item.description && (
										<div
											className="prose prose-sm max-w-none text-black/80 mt-1 prose-resume"
											dangerouslySetInnerHTML={{ __html: item.description }}
										/>
									)}
								</div>
							))}
						</div>
					</section>
				);
			case "education":
				return (
					<section key={id} className="break-inside-avoid">
						<h2 className="text-xl font-bold uppercase border-b border-black/20 mb-3 pb-1 text-black/90">
							Education
						</h2>
						<div className="flex flex-col gap-4">
							{education.map((item) => (
								<div key={item.id}>
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-bold text-lg">{item.institution}</h3>
										<span className="text-sm font-medium text-black/80">
											{item.startDate
												? `${item.startDate} - ${item.endDate}`
												: item.endDate}
										</span>
									</div>
									<div className="flex justify-between items-baseline text-black/80">
										<span className="text-md italic">{item.degree}</span>
										<span className="text-sm">
											{item.location}
											{item.gpa && ` | GPA: ${item.gpa}`}
										</span>
									</div>
									{item.description && (
										<div
											className="prose prose-sm max-w-none text-black/80 mt-2 prose-resume"
											dangerouslySetInnerHTML={{ __html: item.description }}
										/>
									)}
								</div>
							))}
						</div>
					</section>
				);
			case "skills":
				return (
					<section key={id} className="break-inside-avoid">
						<h2 className="text-xl font-bold uppercase border-b border-black/20 mb-3 pb-1 text-black/90">
							Skills
						</h2>
						<div className="text-sm text-black/80 space-y-1">
							{skills.map((item) => (
								<p key={item.id}>
									<strong className="text-black">{item.category}:</strong>{" "}
									{item.items}
								</p>
							))}
						</div>
					</section>
				);
			case "projects":
				if (projects.length === 0) return null;
				return (
					<section key={id} className="break-inside-avoid">
						<h2 className="text-xl font-bold uppercase border-b border-black/20 mb-3 pb-1 text-black/90">
							Projects
						</h2>
						<div className="flex flex-col gap-4">
							{projects.map((item) => (
								<div key={item.id}>
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-bold text-lg">{item.name}</h3>
										<span className="text-sm font-medium text-black/80">
											{item.date}
										</span>
									</div>
									<div className="mb-2 text-black/80">
										{item.url && (
											<a href={item.url} className="text-sm italic underline">
												{item.url}
											</a>
										)}
									</div>
									{item.description && (
										<div
											className="prose prose-sm max-w-none text-black/80 mt-2 prose-resume"
											dangerouslySetInnerHTML={{ __html: item.description }}
										/>
									)}
								</div>
							))}
						</div>
					</section>
				);
			case "certifications":
				if (certifications.length === 0) return null;
				return (
					<section key={id} className="break-inside-avoid">
						<h2 className="text-xl font-bold uppercase border-b border-black/20 mb-3 pb-1 text-black/90">
							Certifications
						</h2>
						<div className="flex flex-col gap-3">
							{certifications.map((item) => (
								<div
									key={item.id}
									className="flex justify-between items-baseline"
								>
									<div>
										<span className="font-bold text-md">{item.name}</span>
										{item.issuer && (
											<span className="text-sm italic text-black/80">
												{" "}
												- {item.issuer}
											</span>
										)}
									</div>
									<span className="text-sm font-medium text-black/80">
										{item.date}
									</span>
								</div>
							))}
						</div>
					</section>
				);
			case "languages":
				if (languages.length === 0) return null;
				return (
					<section key={id} className="break-inside-avoid">
						<h2 className="text-xl font-bold uppercase border-b border-black/20 mb-3 pb-1 text-black/90">
							Languages
						</h2>
						<div className="flex flex-wrap gap-4 text-sm text-black/80">
							{languages.map((item) => (
								<div key={item.id}>
									<strong className="text-black">{item.language}</strong>
									{item.proficiency && `: ${item.proficiency}`}
								</div>
							))}
						</div>
					</section>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-6 p-8 min-h-full bg-white text-black font-sans">
			<header className="border-b-2 border-black pb-4">
				<h1 className="text-4xl font-bold uppercase tracking-tight">
					{personalInfo.fullName || "Your Name"}
				</h1>
				<div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-black/80">
					{personalInfo.email && (
						<>
							<span>{personalInfo.email}</span>
							<span>•</span>
						</>
					)}
					{personalInfo.phone && (
						<>
							<span>{personalInfo.phone}</span>
							<span>•</span>
						</>
					)}
					{personalInfo.location && (
						<>
							<span>{personalInfo.location}</span>
							<span>•</span>
						</>
					)}
					{personalInfo.website && (
						<a
							href={`https://${personalInfo.website.replace(/^https?:\/\//, "")}`}
							className="underline"
						>
							{personalInfo.website}
						</a>
					)}
				</div>
			</header>

			{sections.filter((s) => s.visible).map((s) => renderSection(s.id))}
		</div>
	);
}
