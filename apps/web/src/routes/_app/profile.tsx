import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	Award,
	Briefcase,
	Check,
	DollarSign,
	FileText,
	Globe,
	Link as LinkIcon,
	Plus,
	RefreshCw,
	Save,
	Trash2,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import {
	type CandidateProfile,
	getProfile,
	syncResume,
	type TargetRoleArchetype,
	updateProfile,
} from "#/lib/local-companion-client";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { getResumeData } from "#/lib/resume-store";

export const Route = createFileRoute("/_app/profile")({
	component: ProfileDashboard,
});

const initialProfileState: CandidateProfile = {
	candidate: {
		fullName: "",
		email: "",
		phone: "",
		location: "",
		linkedin: "",
		portfolioUrl: "",
		github: "",
		twitter: "",
	},
	targetRoles: {
		primary: [],
		archetypes: [],
	},
	narrative: {
		headline: "",
		exitStory: "",
		superpowers: [],
		proofPoints: [],
	},
	compensation: {
		targetRange: "",
		currency: "USD",
		minimum: "",
		preferred: "",
		locationFlexibility: "",
	},
	location: {
		country: "",
		city: "",
		timezone: "",
		visaStatus: "",
		onsiteAvailability: "",
		remotePolicy: "",
	},
};

type TabId = "contact" | "roles" | "narrative" | "proof" | "comp";

function ProfileDashboard() {
	const [profile, setProfile] = useState<CandidateProfile>(initialProfileState);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [loadError, setLoadError] = useState("");
	const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
		"idle",
	);

	// Resume sync states
	const [syncStatus, setSyncStatus] = useState<
		"idle" | "syncing" | "success" | "error"
	>("idle");
	const [syncError, setSyncError] = useState("");

	const [activeTab, setActiveTab] = useState<TabId>("contact");

	// Default resume info
	const defaultResumeId = useResumeIndexStore((state) => state.defaultResumeId);
	const resumes = useResumeIndexStore((state) => state.resumes);
	const defaultResume = resumes.find((r) => r.id === defaultResumeId);

	// Temp state for list editors
	const [newPrimaryRole, setNewPrimaryRole] = useState("");
	const [newSuperpower, setNewSuperpower] = useState("");

	// Archetype temp inputs
	const [newArchetypeName, setNewArchetypeName] = useState("");
	const [newArchetypeLevel, setNewArchetypeLevel] = useState("");
	const [newArchetypeFit, setNewArchetypeFit] =
		useState<TargetRoleArchetype["fit"]>("primary");

	// Proof point temp inputs
	const [newProofName, setNewProofName] = useState("");
	const [newProofUrl, setNewProofUrl] = useState("");
	const [newProofMetric, setNewProofMetric] = useState("");

	const fetchProfileData = async () => {
		setIsLoading(true);
		setLoadError("");
		try {
			const data = await getProfile();
			setProfile(data);
		} catch (err) {
			console.error(err);
			setLoadError(
				err instanceof Error
					? err.message
					: "Failed to load candidate profile.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSyncResume = async () => {
		if (!defaultResumeId) return;
		setSyncStatus("syncing");
		setSyncError("");
		try {
			const resumeData = await getResumeData(defaultResumeId);
			if (!resumeData) {
				throw new Error("Default resume contents could not be retrieved.");
			}
			const { id, name, activeSection, templateId, ...cleanData } = resumeData;
			await syncResume(cleanData as Record<string, unknown>);
			setSyncStatus("success");
		} catch (err) {
			console.error(err);
			setSyncStatus("error");
			setSyncError(
				err instanceof Error ? err.message : "Failed to sync resume.",
			);
		}
	};

	// Load profile on mount
	useEffect(() => {
		fetchProfileData();
	}, []);

	// Auto-sync resume on mount if defaultResumeId exists
	useEffect(() => {
		if (defaultResumeId) {
			handleSyncResume();
		}
	}, [defaultResumeId]);

	const handleSaveProfile = async () => {
		setIsSaving(true);
		setSaveStatus("idle");
		try {
			await updateProfile(profile);
			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 3000);
		} catch (err) {
			console.error(err);
			setSaveStatus("error");
		} finally {
			setIsSaving(false);
		}
	};

	const updateField = (
		section: "candidate" | "compensation" | "location",
		field: string,
		value: string,
	) => {
		setProfile((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[field]: value,
			},
		}));
	};

	const updateNarrativeField = (
		field: "headline" | "exitStory",
		value: string,
	) => {
		setProfile((prev) => ({
			...prev,
			narrative: {
				...prev.narrative,
				[field]: value,
			},
		}));
	};

	// List modifiers
	const addPrimaryRole = () => {
		if (!newPrimaryRole.trim()) return;
		setProfile((prev) => ({
			...prev,
			targetRoles: {
				...prev.targetRoles,
				primary: [...prev.targetRoles.primary, newPrimaryRole.trim()],
			},
		}));
		setNewPrimaryRole("");
	};

	const removePrimaryRole = (index: number) => {
		setProfile((prev) => ({
			...prev,
			targetRoles: {
				...prev.targetRoles,
				primary: prev.targetRoles.primary.filter((_, i) => i !== index),
			},
		}));
	};

	const addSuperpower = () => {
		if (!newSuperpower.trim()) return;
		setProfile((prev) => ({
			...prev,
			narrative: {
				...prev.narrative,
				superpowers: [...prev.narrative.superpowers, newSuperpower.trim()],
			},
		}));
		setNewSuperpower("");
	};

	const removeSuperpower = (index: number) => {
		setProfile((prev) => ({
			...prev,
			narrative: {
				...prev.narrative,
				superpowers: prev.narrative.superpowers.filter((_, i) => i !== index),
			},
		}));
	};

	const addArchetype = () => {
		if (!newArchetypeName.trim() || !newArchetypeLevel.trim()) return;
		setProfile((prev) => ({
			...prev,
			targetRoles: {
				...prev.targetRoles,
				archetypes: [
					...prev.targetRoles.archetypes,
					{
						name: newArchetypeName.trim(),
						level: newArchetypeLevel.trim(),
						fit: newArchetypeFit,
					},
				],
			},
		}));
		setNewArchetypeName("");
		setNewArchetypeLevel("");
		setNewArchetypeFit("primary");
	};

	const removeArchetype = (index: number) => {
		setProfile((prev) => ({
			...prev,
			targetRoles: {
				...prev.targetRoles,
				archetypes: prev.targetRoles.archetypes.filter((_, i) => i !== index),
			},
		}));
	};

	const addProofPoint = () => {
		if (!newProofName.trim() || !newProofMetric.trim()) return;
		setProfile((prev) => ({
			...prev,
			narrative: {
				...prev.narrative,
				proofPoints: [
					...prev.narrative.proofPoints,
					{
						name: newProofName.trim(),
						url: newProofUrl.trim(),
						heroMetric: newProofMetric.trim(),
					},
				],
			},
		}));
		setNewProofName("");
		setNewProofUrl("");
		setNewProofMetric("");
	};

	const removeProofPoint = (index: number) => {
		setProfile((prev) => ({
			...prev,
			narrative: {
				...prev.narrative,
				proofPoints: prev.narrative.proofPoints.filter((_, i) => i !== index),
			},
		}));
	};

	const tabs = [
		{ id: "contact" as const, label: "Contact", icon: User },
		{ id: "roles" as const, label: "Target Roles", icon: Briefcase },
		{
			id: "narrative" as const,
			label: "Narrative & Superpowers",
			icon: FileText,
		},
		{ id: "proof" as const, label: "Proof Points", icon: Award },
		{ id: "comp" as const, label: "Comp & Location", icon: DollarSign },
	];

	return (
		<main className="container mx-auto p-8 text-[#082F49] max-w-[1300px]">
			{/* Top Hero Heading */}
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-4xl font-heading">My Profile</h1>
						<p className="text-muted-foreground mt-1">
							Manage candidate profile blueprints used for job matching and fit
							evaluation.
						</p>
					</div>
					<div className="flex gap-4">
						{loadError && (
							<Button
								variant="neutral"
								onClick={fetchProfileData}
								className="flex gap-2"
							>
								<RefreshCw className="size-4 animate-spin-once" />
								Retry Load
							</Button>
						)}
						<Button
							onClick={handleSaveProfile}
							disabled={isLoading || isSaving || !!loadError}
							className="gap-2 bg-main text-main-foreground font-bold shadow-light"
						>
							<Save className="size-4" />
							{isSaving ? "Saving..." : "Save Profile"}
						</Button>
					</div>
				</div>

				{/* Save Status Notification Banner */}
				{saveStatus === "success" && (
					<div className="mb-6 rounded-base border-2 border-border bg-[#BBF7D0] p-4 font-bold text-green-900 text-sm flex items-center gap-2 shadow-light">
						<Check className="size-5 shrink-0" />
						Candidate profile saved successfully!
					</div>
				)}
				{saveStatus === "error" && (
					<div className="mb-6 rounded-base border-2 border-border bg-[#FECACA] p-4 font-bold text-red-900 text-sm flex items-center gap-2 shadow-light">
						<AlertCircle className="size-5 shrink-0" />
						Failed to save candidate profile. Make sure the local companion
						backend is running.
					</div>
				)}

				{/* General Load Error Card */}
				{loadError && (
					<div className="mb-8 rounded-base border-4 border-black bg-[#FECACA] p-6 text-[#7F1D1D] shadow-shadow">
						<h3 className="font-heading text-lg font-bold flex items-center gap-2 mb-2">
							<AlertCircle className="size-6 text-red-600" />
							Companion Backend Offline
						</h3>
						<p className="text-sm font-base leading-relaxed mb-4">
							Open Resume companion services are unreachable at{" "}
							<strong>http://127.0.0.1:47321</strong>. Please ensure you have
							started the backend using the command below, and then click
							reload.
						</p>
						<pre className="bg-white/50 p-2.5 rounded border border-red-300 font-mono text-xs mb-4">
							pnpm companion:dev
						</pre>
						<Button
							variant="neutral"
							onClick={fetchProfileData}
							className="font-bold"
						>
							Retry Connection
						</Button>
					</div>
				)}

				{!loadError && (
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
						{/* Left Side: Sync Status Panel */}
						<div className="lg:col-span-1 flex flex-col gap-6">
							<div className="rounded-base border-2 border-border bg-white p-5 shadow-shadow">
								<h3 className="font-heading text-lg mb-4 border-b border-border pb-2">
									Resume Sync
								</h3>
								<div className="flex flex-col gap-4">
									<div>
										<Label className="text-xs text-muted-foreground uppercase font-bold">
											Active Default Resume
										</Label>
										<p className="font-heading text-md mt-1 break-words">
											{defaultResume ? (
												defaultResume.name
											) : (
												<span className="text-red-500 font-base text-sm">
													No default resume selected
												</span>
											)}
										</p>
									</div>

									{defaultResume && (
										<>
											<div>
												<Label className="text-xs text-muted-foreground uppercase font-bold">
													Sync Status
												</Label>
												<div className="mt-1">
													{syncStatus === "syncing" && (
														<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#FEF08A] text-yellow-900 border border-yellow-400">
															<RefreshCw className="size-3 animate-spin" />
															Syncing...
														</span>
													)}
													{syncStatus === "success" && (
														<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#BBF7D0] text-green-900 border border-green-400">
															<Check className="size-3" />
															Synced
														</span>
													)}
													{syncStatus === "error" && (
														<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#FECACA] text-red-900 border border-red-400">
															<AlertCircle className="size-3" />
															Failed
														</span>
													)}
													{syncStatus === "idle" && (
														<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-750 border border-gray-300">
															Unsynced
														</span>
													)}
												</div>
												{syncError && (
													<p className="text-xs text-red-500 mt-1">
														{syncError}
													</p>
												)}
											</div>

											<Button
												onClick={handleSyncResume}
												disabled={syncStatus === "syncing"}
												className="w-full justify-center gap-2 mt-2"
											>
												<RefreshCw
													className={`size-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
												/>
												Sync Now
											</Button>
										</>
									)}
								</div>
							</div>
						</div>

						{/* Right Side: Profile Tab Form Editor */}
						<div className="lg:col-span-3 flex flex-col gap-6">
							{/* Neobrutalist Tab Buttons */}
							<div className="flex flex-wrap gap-2 border-b-2 border-border pb-3">
								{tabs.map((tab) => {
									const TabIcon = tab.icon;
									const isActive = activeTab === tab.id;
									return (
										<button
											key={tab.id}
											type="button"
											onClick={() => setActiveTab(tab.id)}
											className={`flex items-center gap-2 px-4 py-2.5 rounded-base font-heading text-sm border-2 border-border transition-all cursor-pointer ${
												isActive
													? "bg-main text-main-foreground shadow-light translate-x-none translate-y-none"
													: "bg-white hover:bg-main/10 shadow-none"
											}`}
										>
											<TabIcon className="size-4" />
											{tab.label}
										</button>
									);
								})}
							</div>

							{/* Tab Content Box */}
							<div className="rounded-base border-2 border-border bg-white p-6 shadow-shadow min-h-[400px]">
								{isLoading ? (
									<div className="flex flex-col items-center justify-center py-20 gap-3">
										<RefreshCw className="size-8 animate-spin text-main" />
										<p className="font-heading text-lg">
											Fetching Profile Blueprint...
										</p>
									</div>
								) : (
									<>
										{/* 1. CONTACT INFO TAB */}
										{activeTab === "contact" && (
											<div className="flex flex-col gap-6">
												<h3 className="font-heading text-xl border-b border-border pb-2">
													Contact Blueprint
												</h3>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-fullName">Full Name</Label>
														<Input
															id="c-fullName"
															placeholder="e.g. John Doe"
															value={profile.candidate.fullName}
															onChange={(e) =>
																updateField(
																	"candidate",
																	"fullName",
																	e.target.value,
																)
															}
														/>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-email">Email Address</Label>
														<Input
															id="c-email"
															type="email"
															placeholder="e.g. john@doe.com"
															value={profile.candidate.email}
															onChange={(e) =>
																updateField(
																	"candidate",
																	"email",
																	e.target.value,
																)
															}
														/>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-phone">Phone Number</Label>
														<Input
															id="c-phone"
															placeholder="e.g. +1 (555) 123-4567"
															value={profile.candidate.phone}
															onChange={(e) =>
																updateField(
																	"candidate",
																	"phone",
																	e.target.value,
																)
															}
														/>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-location">
															Candidate Location
														</Label>
														<Input
															id="c-location"
															placeholder="e.g. New York, USA"
															value={profile.candidate.location}
															onChange={(e) =>
																updateField(
																	"candidate",
																	"location",
																	e.target.value,
																)
															}
														/>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-linkedin">
															LinkedIn Username / URL
														</Label>
														<div className="relative">
															<span className="absolute left-3 top-2.5 text-muted-foreground">
																<LinkIcon className="size-4" />
															</span>
															<Input
																id="c-linkedin"
																className="pl-9"
																placeholder="linkedin.com/in/username"
																value={profile.candidate.linkedin}
																onChange={(e) =>
																	updateField(
																		"candidate",
																		"linkedin",
																		e.target.value,
																	)
																}
															/>
														</div>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-github">
															GitHub Username / URL
														</Label>
														<div className="relative">
															<span className="absolute left-3 top-2.5 text-muted-foreground">
																<LinkIcon className="size-4" />
															</span>
															<Input
																id="c-github"
																className="pl-9"
																placeholder="github.com/username"
																value={profile.candidate.github}
																onChange={(e) =>
																	updateField(
																		"candidate",
																		"github",
																		e.target.value,
																	)
																}
															/>
														</div>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-portfolio">
															Portfolio / Personal Website
														</Label>
														<div className="relative">
															<span className="absolute left-3 top-2.5 text-muted-foreground">
																<Globe className="size-4" />
															</span>
															<Input
																id="c-portfolio"
																className="pl-9"
																placeholder="https://portfolio.me"
																value={profile.candidate.portfolioUrl}
																onChange={(e) =>
																	updateField(
																		"candidate",
																		"portfolioUrl",
																		e.target.value,
																	)
																}
															/>
														</div>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="c-twitter">
															Twitter / X Username (Optional)
														</Label>
														<div className="relative">
															<span className="absolute left-3 top-2.5 text-muted-foreground">
																<LinkIcon className="size-4" />
															</span>
															<Input
																id="c-twitter"
																className="pl-9"
																placeholder="twitter.com/handle"
																value={profile.candidate.twitter || ""}
																onChange={(e) =>
																	updateField(
																		"candidate",
																		"twitter",
																		e.target.value,
																	)
																}
															/>
														</div>
													</div>
												</div>
											</div>
										)}

										{/* 2. TARGET ROLES TAB */}
										{activeTab === "roles" && (
											<div className="flex flex-col gap-8">
												{/* Primary Roles List Editor */}
												<div className="flex flex-col gap-4">
													<h3 className="font-heading text-xl border-b border-border pb-2">
														Primary Target Roles
													</h3>
													<div className="flex gap-2">
														<Input
															placeholder="e.g. Senior Frontend Engineer"
															value={newPrimaryRole}
															onChange={(e) =>
																setNewPrimaryRole(e.target.value)
															}
															onKeyDown={(e) =>
																e.key === "Enter" && addPrimaryRole()
															}
														/>
														<Button
															onClick={addPrimaryRole}
															className="shrink-0"
														>
															<Plus className="size-4" /> Add
														</Button>
													</div>
													<div className="flex flex-wrap gap-2 mt-2">
														{profile.targetRoles.primary.length === 0 ? (
															<p className="text-sm text-muted-foreground italic">
																No primary roles added yet.
															</p>
														) : (
															profile.targetRoles.primary.map((role, idx) => (
																<div
																	key={`${role}-${idx}`}
																	className="flex items-center gap-1.5 bg-[#FEF08A] border-2 border-border px-3 py-1 rounded-base font-bold text-sm shadow-light"
																>
																	<span>{role}</span>
																	<button
																		type="button"
																		onClick={() => removePrimaryRole(idx)}
																		className="text-red-700 hover:text-red-950 font-bold ml-1 cursor-pointer"
																	>
																		<Trash2 className="size-3.5" />
																	</button>
																</div>
															))
														)}
													</div>
												</div>

												{/* Archetypes List Editor */}
												<div className="flex flex-col gap-4">
													<h3 className="font-heading text-xl border-b border-border pb-2">
														Target Archetypes
													</h3>

													{/* Archetype Form Inputs */}
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-2 border-dashed border-border p-4 rounded-base bg-secondary-background/50">
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="a-name">Archetype Name</Label>
															<Input
																id="a-name"
																placeholder="e.g. Frontend Architect"
																value={newArchetypeName}
																onChange={(e) =>
																	setNewArchetypeName(e.target.value)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="a-level">Career Level</Label>
															<Input
																id="a-level"
																placeholder="e.g. Senior / Principal"
																value={newArchetypeLevel}
																onChange={(e) =>
																	setNewArchetypeLevel(e.target.value)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="a-fit">Fit Dimension</Label>
															<div className="flex gap-2">
																<select
																	id="a-fit"
																	value={newArchetypeFit}
																	onChange={(e) =>
																		setNewArchetypeFit(
																			e.target
																				.value as TargetRoleArchetype["fit"],
																		)
																	}
																	className="flex h-10 w-full rounded-base border-2 border-border bg-white px-3 py-2 text-sm font-base"
																>
																	<option value="primary">Primary</option>
																	<option value="secondary">Secondary</option>
																	<option value="adjacent">Adjacent</option>
																</select>
																<Button
																	onClick={addArchetype}
																	className="shrink-0"
																>
																	<Plus className="size-4" /> Add
																</Button>
															</div>
														</div>
													</div>

													{/* Archetypes List View */}
													<div className="mt-2 flex flex-col gap-3">
														{profile.targetRoles.archetypes.length === 0 ? (
															<p className="text-sm text-muted-foreground italic">
																No archetypes defined yet.
															</p>
														) : (
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																{profile.targetRoles.archetypes.map(
																	(arch, idx) => (
																		<div
																			key={`${arch.name}-${idx}`}
																			className="flex justify-between items-center bg-white border-2 border-border p-3 rounded-base shadow-light"
																		>
																			<div>
																				<div className="font-heading font-bold">
																					{arch.name}
																				</div>
																				<div className="text-xs text-muted-foreground mt-0.5">
																					Level:{" "}
																					<span className="font-bold">
																						{arch.level}
																					</span>{" "}
																					| Fit:
																					<span
																						className={`ml-1 font-bold ${
																							arch.fit === "primary"
																								? "text-green-600"
																								: arch.fit === "secondary"
																									? "text-yellow-600"
																									: "text-blue-600"
																						}`}
																					>
																						{arch.fit}
																					</span>
																				</div>
																			</div>
																			<button
																				type="button"
																				onClick={() => removeArchetype(idx)}
																				className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-base border border-transparent hover:border-red-200 transition-all cursor-pointer"
																			>
																				<Trash2 className="size-4" />
																			</button>
																		</div>
																	),
																)}
															</div>
														)}
													</div>
												</div>
											</div>
										)}

										{/* 3. NARRATIVE TAB */}
										{activeTab === "narrative" && (
											<div className="flex flex-col gap-6">
												<h3 className="font-heading text-xl border-b border-border pb-2">
													Narrative & Core Superpowers
												</h3>

												<div className="flex flex-col gap-1.5">
													<Label htmlFor="n-headline">
														Professional Headline
													</Label>
													<Input
														id="n-headline"
														placeholder="e.g. Product-minded Frontend Architect specializing in high performance React applications."
														value={profile.narrative.headline}
														onChange={(e) =>
															updateNarrativeField("headline", e.target.value)
														}
													/>
												</div>

												<div className="flex flex-col gap-1.5">
													<Label htmlFor="n-exitStory">
														Exit Story / Career Pivot Narrative
													</Label>
													<Textarea
														id="n-exitStory"
														className="min-h-[100px]"
														placeholder="Provide the story of your recent exit or current search motivation..."
														value={profile.narrative.exitStory}
														onChange={(e) =>
															updateNarrativeField("exitStory", e.target.value)
														}
													/>
												</div>

												{/* Superpowers List Editor */}
												<div className="flex flex-col gap-4 mt-4">
													<Label className="text-base font-heading">
														Candidate Superpowers
													</Label>
													<div className="flex gap-2">
														<Input
															placeholder="e.g. Rapid prototyping under constraint"
															value={newSuperpower}
															onChange={(e) => setNewSuperpower(e.target.value)}
															onKeyDown={(e) =>
																e.key === "Enter" && addSuperpower()
															}
														/>
														<Button
															onClick={addSuperpower}
															className="shrink-0"
														>
															<Plus className="size-4" /> Add
														</Button>
													</div>
													<div className="flex flex-wrap gap-2 mt-2">
														{profile.narrative.superpowers.length === 0 ? (
															<p className="text-sm text-muted-foreground italic">
																No superpowers added yet.
															</p>
														) : (
															profile.narrative.superpowers.map(
																(power, idx) => (
																	<div
																		key={`${power}-${idx}`}
																		className="flex items-center gap-1.5 bg-[#BBF7D0] border-2 border-border px-3 py-1 rounded-base font-bold text-sm shadow-light"
																	>
																		<span>{power}</span>
																		<button
																			type="button"
																			onClick={() => removeSuperpower(idx)}
																			className="text-green-800 hover:text-green-950 font-bold ml-1 cursor-pointer"
																		>
																			<Trash2 className="size-3.5" />
																		</button>
																	</div>
																),
															)
														)}
													</div>
												</div>
											</div>
										)}

										{/* 4. PROOF POINTS TAB */}
										{activeTab === "proof" && (
											<div className="flex flex-col gap-6">
												<h3 className="font-heading text-xl border-b border-border pb-2">
													Narrative Proof Points
												</h3>

												{/* Proof Point Input Fields */}
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-2 border-dashed border-border p-4 rounded-base bg-secondary-background/50">
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="pp-name">Achievement Name</Label>
														<Input
															id="pp-name"
															placeholder="e.g. Open Source Library Launch"
															value={newProofName}
															onChange={(e) => setNewProofName(e.target.value)}
														/>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="pp-url">Verification URL</Label>
														<Input
															id="pp-url"
															placeholder="e.g. https://github.com/my-lib"
															value={newProofUrl}
															onChange={(e) => setNewProofUrl(e.target.value)}
														/>
													</div>
													<div className="flex flex-col gap-1.5">
														<Label htmlFor="pp-metric">
															Hero Metric / Proof Indicator
														</Label>
														<div className="flex gap-2">
															<Input
																id="pp-metric"
																placeholder="e.g. 5,000+ GitHub Stars"
																value={newProofMetric}
																onChange={(e) =>
																	setNewProofMetric(e.target.value)
																}
															/>
															<Button
																onClick={addProofPoint}
																className="shrink-0"
															>
																<Plus className="size-4" /> Add
															</Button>
														</div>
													</div>
												</div>

												{/* Proof Points List */}
												<div className="mt-4 flex flex-col gap-4">
													{profile.narrative.proofPoints.length === 0 ? (
														<p className="text-sm text-muted-foreground italic">
															No proof points added yet.
														</p>
													) : (
														<div className="grid grid-cols-1 gap-4">
															{profile.narrative.proofPoints.map((pp, idx) => (
																<div
																	key={`${pp.name}-${idx}`}
																	className="flex justify-between items-center bg-white border-2 border-border p-4 rounded-base shadow-light"
																>
																	<div className="flex flex-col gap-1">
																		<div className="font-heading font-bold text-md">
																			{pp.name}
																		</div>
																		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
																			{pp.url && (
																				<a
																					href={pp.url}
																					target="_blank"
																					rel="noopener noreferrer"
																					className="text-main underline hover:text-black font-semibold"
																				>
																					{pp.url}
																				</a>
																			)}
																			<div>
																				Hero Metric:{" "}
																				<span className="font-bold text-[#082F49] bg-[#FEF08A] px-1.5 py-0.5 rounded border border-border shadow-none">
																					{pp.heroMetric}
																				</span>
																			</div>
																		</div>
																	</div>
																	<button
																		type="button"
																		onClick={() => removeProofPoint(idx)}
																		className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-base border border-transparent hover:border-red-200 transition-all cursor-pointer"
																	>
																		<Trash2 className="size-4" />
																	</button>
																</div>
															))}
														</div>
													)}
												</div>
											</div>
										)}

										{/* 5. COMP & LOCATION TAB */}
										{activeTab === "comp" && (
											<div className="flex flex-col gap-8">
												{/* Compensation Section */}
												<div className="flex flex-col gap-4">
													<h3 className="font-heading text-xl border-b border-border pb-2">
														Compensation Targets
													</h3>
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
														<div className="flex flex-col gap-1.5 col-span-1 md:col-span-3">
															<Label htmlFor="com-range">
																Target Compensation Range Description
															</Label>
															<Input
																id="com-range"
																placeholder="e.g. $120,000 - $150,000 USD Base Salary"
																value={profile.compensation.targetRange}
																onChange={(e) =>
																	updateField(
																		"compensation",
																		"targetRange",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="com-currency">Currency</Label>
															<Input
																id="com-currency"
																placeholder="e.g. USD, EUR, SGD"
																value={profile.compensation.currency}
																onChange={(e) =>
																	updateField(
																		"compensation",
																		"currency",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="com-minimum">
																Minimum Acceptable
															</Label>
															<Input
																id="com-minimum"
																placeholder="e.g. $100k"
																value={profile.compensation.minimum}
																onChange={(e) =>
																	updateField(
																		"compensation",
																		"minimum",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="com-preferred">
																Preferred Compensation
															</Label>
															<Input
																id="com-preferred"
																placeholder="e.g. $140k"
																value={profile.compensation.preferred}
																onChange={(e) =>
																	updateField(
																		"compensation",
																		"preferred",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5 col-span-1 md:col-span-3">
															<Label htmlFor="com-flex">
																Location Flexibility Details
															</Label>
															<Input
																id="com-flex"
																placeholder="e.g. Remote preferred, hybrid New York acceptable"
																value={profile.compensation.locationFlexibility}
																onChange={(e) =>
																	updateField(
																		"compensation",
																		"locationFlexibility",
																		e.target.value,
																	)
																}
															/>
														</div>
													</div>
												</div>

												{/* Location Section */}
												<div className="flex flex-col gap-4">
													<h3 className="font-heading text-xl border-b border-border pb-2">
														Geographic Profile
													</h3>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="loc-country">
																Target/Base Country
															</Label>
															<Input
																id="loc-country"
																placeholder="e.g. United States"
																value={profile.location.country}
																onChange={(e) =>
																	updateField(
																		"location",
																		"country",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="loc-city">City</Label>
															<Input
																id="loc-city"
																placeholder="e.g. New York"
																value={profile.location.city}
																onChange={(e) =>
																	updateField(
																		"location",
																		"city",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="loc-timezone">
																Timezone / Availability
															</Label>
															<Input
																id="loc-timezone"
																placeholder="e.g. EST (UTC-5)"
																value={profile.location.timezone}
																onChange={(e) =>
																	updateField(
																		"location",
																		"timezone",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="loc-visa">
																Visa Status / Work Authorization
															</Label>
															<Input
																id="loc-visa"
																placeholder="e.g. Citizen / Green Card / Requires Sponsorship"
																value={profile.location.visaStatus}
																onChange={(e) =>
																	updateField(
																		"location",
																		"visaStatus",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="loc-onsite">
																On-Site / Travel Availability
															</Label>
															<Input
																id="loc-onsite"
																placeholder="e.g. Fully Remote, 1-2 days/week hybrid"
																value={profile.location.onsiteAvailability}
																onChange={(e) =>
																	updateField(
																		"location",
																		"onsiteAvailability",
																		e.target.value,
																	)
																}
															/>
														</div>
														<div className="flex flex-col gap-1.5">
															<Label htmlFor="loc-remotePolicy">
																Ideal Remote Policy
															</Label>
															<Input
																id="loc-remotePolicy"
																placeholder="e.g. Remote first, async schedules supported"
																value={profile.location.remotePolicy}
																onChange={(e) =>
																	updateField(
																		"location",
																		"remotePolicy",
																		e.target.value,
																	)
																}
															/>
														</div>
													</div>
												</div>
											</div>
										)}
									</>
								)}
							</div>
						</div>
					</div>
			)}
		</main>
	);
}
