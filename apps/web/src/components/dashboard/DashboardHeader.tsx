import { Link } from "@tanstack/react-router";
import { GlobalSettingsModal } from "#/components/editor/GlobalSettingsModal";

export default function DashboardHeader() {
	return (
		<header className="fixed left-0 top-0 z-20 mx-auto flex h-[70px] w-full items-center border-b-4 border-border bg-secondary-background px-5 print:hidden">
			<div className="mx-auto flex w-[1300px] text-foreground max-w-full items-center justify-between">
				<div className="flex items-center gap-6 md:gap-10">
					<Link
						className="text-[22px] px-3 rounded-base flex bg-main text-main-foreground border-2 border-border items-center justify-center font-heading hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-light dark:shadow-dark"
						to="/"
					>
						Open Resume
					</Link>
					<nav className="flex items-center gap-2 md:gap-4 font-base text-sm">
						<Link
							to="/resumes"
							activeProps={{
								className: "bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
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
								className: "bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
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
								className: "bg-main text-main-foreground border-2 border-border shadow-light translate-x-none translate-y-none",
							}}
							inactiveProps={{
								className: "border-2 border-transparent",
							}}
							className="font-bold hover:bg-main/10 py-1.5 px-3 rounded-base transition-colors"
						>
							My Profile
						</Link>
					</nav>
				</div>
				<div className="flex items-center gap-4">
					<GlobalSettingsModal />
				</div>
			</div>
		</header>
	);
}
