import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/jobs/$id")({
	component: JobWorkspaceStub,
});

function JobWorkspaceStub() {
	const { id } = Route.useParams();

	return (
		<main className="container mx-auto p-8 pt-[100px] text-[#082F49]">
			<h1 className="text-3xl font-heading mb-4">Job Workspace</h1>
			<p>
				Workspace for job application ID:{" "}
				<span className="font-mono font-bold bg-slate-100 p-1 rounded-base border border-slate-300">
					{id}
				</span>
			</p>
			<p className="mt-4 text-muted-foreground">
				This workspace will be implemented in Task 5.
			</p>
		</main>
	);
}
