import { useStore } from "@tanstack/react-store";
import { resumeStore } from "#/lib/resume-store";

export default function ModernTemplate() {
	const personalInfo = useStore(resumeStore, (state) => state.personalInfo);
	const sections = useStore(resumeStore, (state) => state.sections);
	const experience = useStore(resumeStore, (state) => state.experience);
	const education = useStore(resumeStore, (state) => state.education);
	const skills = useStore(resumeStore, (state) => state.skills);
	const projects = useStore(resumeStore, (state) => state.projects || []);
	const certifications = useStore(
		resumeStore,
		(state) => state.certifications || [],
	);
	const languages = useStore(resumeStore, (state) => state.languages || []);

	const renderSection = (id: string) => {
		switch (id) {
			case "experience":
				return (
					<section key={id} className="break-inside-avoid mb-6">
						<h2 className="text-xl font-extrabold uppercase text-indigo-700 tracking-wider mb-4 flex items-center gap-4">
							Experience
							<div className="flex-1 h-px bg-indigo-200"></div>
						</h2>
						<div className="flex flex-col gap-5">
							{experience.map((item) => (
								<div key={item.id} className="relative pl-4 border-l-2 border-indigo-200">
									<div className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -left-[6px] top-1.5"></div>
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-bold text-lg text-gray-900">{item.role}</h3>
										<span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
											{item.startDate} - {item.endDate}
										</span>
									</div>
									<div className="flex justify-between items-baseline mb-2 text-gray-700">
										<span className="text-md font-medium">{item.company}</span>
										<span className="text-sm text-gray-500">{item.location}</span>
									</div>
									{item.description && (
										<div
											className="prose prose-sm max-w-none text-gray-700 mt-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-ul:ml-4 prose-ol:my-1 prose-ol:ml-4"
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
					<section key={id} className="break-inside-avoid mb-6">
						<h2 className="text-xl font-extrabold uppercase text-indigo-700 tracking-wider mb-4 flex items-center gap-4">
							Education
							<div className="flex-1 h-px bg-indigo-200"></div>
						</h2>
						<div className="flex flex-col gap-4">
							{education.map((item) => (
								<div key={item.id} className="bg-gray-50 rounded-lg p-4">
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-bold text-lg text-gray-900">{item.institution}</h3>
										<span className="text-sm font-semibold text-indigo-600">
											{item.startDate
												? `${item.startDate} - ${item.endDate}`
												: item.endDate}
										</span>
									</div>
									<div className="flex justify-between items-baseline text-gray-700">
										<span className="text-md italic">{item.degree}</span>
										<span className="text-sm">
											{item.location}
											{item.gpa && ` | GPA: ${item.gpa}`}
										</span>
									</div>
									{item.description && (
										<div
											className="prose prose-sm max-w-none text-gray-700 mt-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-ul:ml-4 prose-ol:my-1 prose-ol:ml-4"
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
					<section key={id} className="break-inside-avoid mb-6">
						<h2 className="text-xl font-extrabold uppercase text-indigo-700 tracking-wider mb-4 flex items-center gap-4">
							Skills
							<div className="flex-1 h-px bg-indigo-200"></div>
						</h2>
						<div className="grid grid-cols-1 gap-3">
							{skills.map((item) => (
								<div key={item.id}>
									<div className="font-semibold text-gray-900 mb-1.5">{item.category}</div>
									<div className="flex flex-wrap gap-2">
										{item.items.split(',').map((skill, i) => (
											<span key={i} className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm shadow-sm">
												{skill.trim()}
											</span>
										))}
									</div>
								</div>
							))}
						</div>
					</section>
				);
			case "projects":
				if (projects.length === 0) return null;
				return (
					<section key={id} className="break-inside-avoid mb-6">
						<h2 className="text-xl font-extrabold uppercase text-indigo-700 tracking-wider mb-4 flex items-center gap-4">
							Projects
							<div className="flex-1 h-px bg-indigo-200"></div>
						</h2>
						<div className="flex flex-col gap-4">
							{projects.map((item) => (
								<div key={item.id}>
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
										<span className="text-sm font-semibold text-gray-600">
											{item.date}
										</span>
									</div>
									<div className="mb-2 text-indigo-600">
										{item.url && (
											<a href={item.url} className="text-sm hover:underline">
												{item.url}
											</a>
										)}
									</div>
									{item.description && (
										<div
											className="prose prose-sm max-w-none text-gray-700 mt-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-ul:ml-4 prose-ol:my-1 prose-ol:ml-4"
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
					<section key={id} className="break-inside-avoid mb-6">
						<h2 className="text-xl font-extrabold uppercase text-indigo-700 tracking-wider mb-4 flex items-center gap-4">
							Certifications
							<div className="flex-1 h-px bg-indigo-200"></div>
						</h2>
						<div className="flex flex-col gap-3">
							{certifications.map((item) => (
								<div
									key={item.id}
									className="flex justify-between items-baseline"
								>
									<div>
										<span className="font-bold text-md text-gray-900">{item.name}</span>
										{item.issuer && (
											<span className="text-sm text-gray-600">
												{" "}
												• {item.issuer}
											</span>
										)}
									</div>
									<span className="text-sm font-semibold text-gray-600">
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
					<section key={id} className="break-inside-avoid mb-6">
						<h2 className="text-xl font-extrabold uppercase text-indigo-700 tracking-wider mb-4 flex items-center gap-4">
							Languages
							<div className="flex-1 h-px bg-indigo-200"></div>
						</h2>
						<div className="flex flex-wrap gap-4 text-sm">
							{languages.map((item) => (
								<div key={item.id} className="flex items-center gap-2">
									<strong className="text-gray-900">{item.language}</strong>
									{item.proficiency && <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-sm">{item.proficiency}</span>}
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
		<div className="flex flex-col p-8 min-h-full bg-white text-gray-800 font-sans">
			<header className="mb-8 text-center">
				<h1 className="text-4xl font-black uppercase tracking-tight text-indigo-900 mb-3">
					{personalInfo.fullName || "Your Name"}
				</h1>
				<div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600 font-medium">
					{personalInfo.email && (
						<span className="flex items-center gap-1">
							{personalInfo.email}
						</span>
					)}
					{personalInfo.phone && (
						<span className="flex items-center gap-1 border-l pl-4 border-gray-300">
							{personalInfo.phone}
						</span>
					)}
					{personalInfo.location && (
						<span className="flex items-center gap-1 border-l pl-4 border-gray-300">
							{personalInfo.location}
						</span>
					)}
					{personalInfo.website && (
						<span className="flex items-center gap-1 border-l pl-4 border-gray-300">
							<a
								href={`https://${personalInfo.website.replace(/^https?:\/\//, "")}`}
								className="text-indigo-600 hover:underline"
							>
								{personalInfo.website}
							</a>
						</span>
					)}
				</div>
			</header>

			{sections.filter((s) => s.visible).map((s) => renderSection(s.id))}
		</div>
	);
}
