import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

/**
 * Shared app-wide header.
 *
 * Rendered once from the root layout (`__root.tsx`), so every route inherits
 * consistent navigation (My Resumes / Jobs Tracker / My Profile / Settings).
 * The landing page (`/`) keeps its own marketing hero below this header; the
 * resume editor adds a second `<EditorToolbar />` row.
 *
 * Uses `sticky top-0` so the header is in normal flow (reserves its own height,
 * no magic padding-top offsets anywhere) while still pinning on scroll.
 */
export default function AppHeader() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<header className="sticky top-0 z-20 mx-auto flex h-[70px] w-full items-center border-b-4 border-border bg-secondary-background px-5 print:hidden">
			<div className="mx-auto flex w-[1300px] text-foreground max-w-full items-center justify-between">
				<div className="flex w-full items-center justify-between md:justify-start md:gap-10">
					<div className="flex items-center gap-6 md:gap-10">
						<Link
							className="text-[22px] px-3 rounded-base flex bg-main text-main-foreground border-2 border-border items-center justify-center font-heading hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-light dark:shadow-dark"
							to="/"
							onClick={() => setIsOpen(false)}
						>
							Open Resume
						</Link>
						<nav className="hidden md:flex items-center gap-2 md:gap-4 font-base text-sm">
							<Link
								to="/resumes"
								activeProps={{
									className:
										"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
								}}
								inactiveProps={{
									className: "border-2 border-transparent",
								}}
								className="font-bold hover:bg-main/10 py-1.5 px-3 rounded-base transition-colors"
							>
								My Resumes
							</Link>
							<Link
								to="/jobs"
								activeProps={{
									className:
										"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
								}}
								inactiveProps={{
									className: "border-2 border-transparent",
								}}
								className="font-bold hover:bg-main/10 py-1.5 px-3 rounded-base transition-colors"
							>
								Jobs Tracker
							</Link>
							<Link
								to="/profile"
								activeProps={{
									className:
										"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
								}}
								inactiveProps={{
									className: "border-2 border-transparent",
								}}
								className="font-bold hover:bg-main/10 py-1.5 px-3 rounded-base transition-colors"
							>
								My Profile
							</Link>
							<Link
								to="/settings"
								activeProps={{
									className:
										"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
								}}
								inactiveProps={{
									className: "border-2 border-transparent",
								}}
								className="font-bold hover:bg-main/10 py-1.5 px-3 rounded-base transition-colors"
							>
								Settings
							</Link>
						</nav>
					</div>

					{/* Mobile Menu Button */}
					<button
						type="button"
						onClick={() => setIsOpen(!isOpen)}
						className="flex md:hidden items-center justify-center p-2 rounded-base border-2 border-border bg-main text-main-foreground shadow-light dark:shadow-dark hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
						aria-label="Toggle navigation menu"
					>
						{isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
					</button>
				</div>
			</div>

			{/* Mobile Dropdown Menu */}
			{isOpen && (
				<nav className="absolute top-[66px] left-0 z-30 flex w-full flex-col gap-3 border-b-4 border-border bg-secondary-background p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:hidden animate-fade-in-slide-up">
					<Link
						to="/resumes"
						onClick={() => setIsOpen(false)}
						activeProps={{
							className:
								"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
						}}
						inactiveProps={{
							className: "border-2 border-transparent hover:bg-main/10",
						}}
						className="font-bold py-2.5 px-4 rounded-base transition-colors text-center text-base"
					>
						My Resumes
					</Link>
					<Link
						to="/jobs"
						onClick={() => setIsOpen(false)}
						activeProps={{
							className:
								"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
						}}
						inactiveProps={{
							className: "border-2 border-transparent hover:bg-main/10",
						}}
						className="font-bold py-2.5 px-4 rounded-base transition-colors text-center text-base"
					>
						Jobs Tracker
					</Link>
					<Link
						to="/profile"
						onClick={() => setIsOpen(false)}
						activeProps={{
							className:
								"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
						}}
						inactiveProps={{
							className: "border-2 border-transparent hover:bg-main/10",
						}}
						className="font-bold py-2.5 px-4 rounded-base transition-colors text-center text-base"
					>
						My Profile
					</Link>
					<Link
						to="/settings"
						onClick={() => setIsOpen(false)}
						activeProps={{
							className:
								"bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
						}}
						inactiveProps={{
							className: "border-2 border-transparent hover:bg-main/10",
						}}
						className="font-bold py-2.5 px-4 rounded-base transition-colors text-center text-base"
					>
						Settings
					</Link>
				</nav>
			)}
		</header>
	);
}
