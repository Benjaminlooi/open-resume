import type { EditorState, Resume } from "./resume-schema";

export const dummyResumeData: Omit<
	Resume,
	"id" | "name" | "activeSection" | "templateId"
> = {
	personalInfo: {
		fullName: "Benjamin Looi",
		email: "benjaminlooi97@gmail.com",
		phone: "+60 12-4065-711",
		location: "Based in Phnom Penh, Cambodia • From Malaysia",
		contactLinks: [
			{
				id: "contact-github",
				label: "GitHub",
				url: "github.com/benjaminlooi",
			},
			{
				id: "contact-website",
				label: "Website",
				url: "benjaminlooi.dev",
			},
		],
	},
	sections: [
		{ id: "summary", name: "Summary", visible: true },
		{ id: "education", name: "Education", visible: true },
		{ id: "experience", name: "Experience", visible: true },
		{ id: "projects", name: "Projects", visible: true },
		{ id: "skills", name: "Skills", visible: true },
		{ id: "certifications", name: "Certifications", visible: false },
		{ id: "languages", name: "Languages", visible: false },
	],
	summary:
		"<p>Product-minded Full Stack Engineer with 5+ years of experience shipping web and mobile applications for real businesses. Specializing in TypeScript, React/Next.js ecosystem, and Node.js. Proven track record of modernizing legacy systems, optimizing CI/CD pipelines, and building complex tools (like dual-currency POS systems and HRMS platforms) that solve actual user pain points.</p>",
	education: [
		{
			id: "edu-1",
			institution: "Uniten, University Tenaga National",
			degree: "Diploma, Computer Science",
			startDate: "Jun. 2017",
			endDate: "Sept. 2019",
			location: "Putrajaya, Malaysia",
			gpa: "3.94/4.0 CGPA",
			description:
				"<ul><li>Dean's List Honoree (All Semesters)</li><li>Introduced and integrated e-gaming initiatives within the educational environment and organized and ensured smooth execution of e-gaming events.</li></ul>",
		},
	],
	experience: [
		{
			id: "exp-1",
			company: "Sokha Tech",
			role: "Independent Consultant",
			startDate: "Jul. 2025",
			endDate: "Present",
			location: "Phnom Penh, Cambodia",
			description:
				"<ul><li>Architected and developed Baguette POS, a pre-launch point-of-sale system designed to solve regional pain points, featuring dual-currency (USD/KHR) handling and real-time table management.</li><li>Implemented offline-first ordering capabilities and designed a fully bilingual (English/Khmer) marketing platform from the ground up to support future client onboarding.</li></ul>",
		},
		{
			id: "exp-2",
			company: "TalentCloud AI",
			role: "Senior Full Stack Developer",
			startDate: "Jul. 2022",
			endDate: "Jul. 2025",
			location: "Remote • Kuala Lumpur",
			description:
				"<ul><li>Led the migration of a legacy HRMS front-end to a Nuxt.js monorepo (Turborepo), implementing a modular component library that slashed feature deployment time by 25% and reduced code redundancy by 40%.</li><li>Spearheaded the development of complex HR modules, including an Excel-like click-to-assign shift management system that reduced manual scheduling errors by 30%.</li><li>Standardized code quality by configuring ESLint/Prettier across 3+ projects and optimizing front-end performance, cutting code review time by 20% and production bugs by 30%.</li><li>Optimized the BitBucket CI/CD pipeline by removing redundant assets and refining the build process, enabling zero-downtime AWS deployments and boosting overall developer efficiency.</li><li>Resolved over 100 client-reported bugs and delivered 15+ tailored enterprise customisations (e.g., pre-planned Overtime engines), directly contributing to a 25% improvement in client retention.</li><li>Collaborated cross-functionally to integrate Laravel and Node.js backend systems, while actively mentoring junior developers to foster team growth.</li></ul>",
		},
		{
			id: "exp-3",
			company: "OpensoftHR",
			role: "Frontend Developer",
			startDate: "Jun. 2021",
			endDate: "Jul. 2022",
			location: "Remote • Kuala Lumpur",
			description:
				"<ul><li>Redesigned and modernized the legacy HRMS front-end using Angular, delivering the project ahead of schedule and significantly improving overall UX and performance.</li><li>Re-engineered core administrative pages, forms, and dashboards, ensuring seamless REST API interactions with existing backend architecture.</li><li>Introduced modern front-end tooling and development practices, successfully reducing technical debt and driving a surge in new client acquisition due to the platform's upgraded design and functionality.</li></ul>",
		},
		{
			id: "exp-4",
			company: "Platinum Code",
			role: "Full Stack Developer",
			startDate: "Aug. 2020",
			endDate: "Jun. 2021",
			location: "Remote • Kuala Lumpur",
			description:
				"<ul><li>Acted as the sole Front-End Developer to architect and build a large-scale Point-of-Sale (POS) system for the F&B industry using React.</li><li>Developed and launched multiple customized client applications, collaborating heavily with backend engineers to integrate Laravel RESTful APIs and real-time WebSockets.</li><li>Standardized the team's development environment by introducing Docker, completely eliminating cross-developer setup inconsistencies and accelerating onboarding.</li></ul>",
		},
		{
			id: "exp-5",
			company: "Plentisoft Sdn. Bhd",
			role: "Intern Software Developer",
			startDate: "Feb. 2019",
			endDate: "May. 2019",
			location: "Kuala Lumpur",
			description:
				"<ul><li>Developed, documented, and deployed over 50 news media web applications using Angular and Firebase.</li><li>Maintained existing WordPress web applications, developing new pages and swiftly resolving critical UI/UX bugs.</li></ul>",
		},
	],
	skills: [
		{
			id: "skill-1",
			category: "Languages",
			items: "JavaScript, TypeScript, PHP",
		},
		{
			id: "skill-2",
			category: "Frontend",
			items:
				"React, Next.js, Vue.js, Nuxt.js, Angular, React Native, Tailwind CSS",
		},
		{
			id: "skill-3",
			category: "Backend",
			items: "Node.js, Laravel, MySQL",
		},
		{
			id: "skill-4",
			category: "Tools & DevOps",
			items: "AWS, Vercel, Firebase, Git, Docker, Turborepo, CI/CD Pipelines",
		},
	],
	projects: [
		{
			id: "proj-1",
			name: "Baguette POS",
			date: "",
			url: "pos.sokha.tech",
			description:
				"<p>A zero-hardware-lock-in POS system for Cambodian restaurants with dual-currency (USD/KHR) payments, offline-first ordering, and drag-and-drop table management. Built with React, Vite, TypeScript, Tailwind CSS and Laravel.</p>",
		},
		{
			id: "proj-2",
			name: "WOLE",
			date: "",
			url: "github.com/Benjaminlooi/WOLE",
			description:
				"<p>An Android app that transforms a phone into a persistent Wake-on-LAN relay via foreground service, with a built-in web dashboard for device management. Built with Expo, React Native, and native Java modules.</p>",
		},
	],
	certifications: [],
	languages: [],
};

export const blankResumeState: EditorState = {
	id: "dummy",
	name: "Template Preview",
	activeSection: "personalInfo",
	templateId: "demo",
	...dummyResumeData,
};
