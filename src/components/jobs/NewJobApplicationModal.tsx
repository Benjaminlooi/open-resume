import { useNavigate } from "@tanstack/react-router";
import { BriefcaseBusiness, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useJobApplicationStore } from "#/lib/job-application-store";

interface NewJobApplicationModalProps {
	onClose: () => void;
}

export function NewJobApplicationModal({
	onClose,
}: NewJobApplicationModalProps) {
	const navigate = useNavigate();
	const createJobApplication = useJobApplicationStore(
		(state) => state.createJobApplication,
	);
	const [company, setCompany] = useState("");
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [sourceUrl, setSourceUrl] = useState("");
	const [description, setDescription] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const id = createJobApplication({
			company,
			title,
			location,
			sourceUrl,
			description,
		});
		onClose();
		navigate({ to: "/jobs/$id", params: { id } });
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader className="flex flex-row items-center justify-between">
					<DialogTitle className="flex items-center gap-2">
						<BriefcaseBusiness className="size-5" aria-hidden="true" />
						New job application
					</DialogTitle>
					<Button type="button" size="icon" variant="neutral" onClick={onClose}>
						<X className="size-4" aria-hidden="true" />
						<span className="sr-only">Close</span>
					</Button>
				</DialogHeader>
				<form className="grid gap-4" onSubmit={handleSubmit}>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="company">Company</Label>
							<Input
								id="company"
								value={company}
								onChange={(event) => setCompany(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="title">Title</Label>
							<Input
								id="title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
							/>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="location">Location</Label>
							<Input
								id="location"
								value={location}
								onChange={(event) => setLocation(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="sourceUrl">Source URL</Label>
							<Input
								id="sourceUrl"
								value={sourceUrl}
								onChange={(event) => setSourceUrl(event.target.value)}
							/>
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="description">Job description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							className="min-h-48"
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="neutral" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Create job</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
