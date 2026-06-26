import { Plus, Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useRootStore } from "#/lib/root-store";

export default function PersonalInfoForm() {
	const personalInfo = useRootStore((state) => state.resume.personalInfo);
	const updatePersonalInfo = useRootStore(
		(state) => state.resume.updatePersonalInfo,
	);
	const addContactLink = useRootStore((state) => state.resume.addContactLink);
	const updateContactLink = useRootStore(
		(state) => state.resume.updateContactLink,
	);
	const deleteContactLink = useRootStore(
		(state) => state.resume.deleteContactLink,
	);
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		updatePersonalInfo(
			name as Exclude<keyof typeof personalInfo, "contactLinks">,
			value,
		);
	};

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label htmlFor="fullName" className="text-sm font-medium leading-none">
					Full Name
				</label>
				<Input
					id="fullName"
					name="fullName"
					value={personalInfo.fullName}
					onChange={handleChange}
					placeholder="Jane Doe"
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor="email" className="text-sm font-medium leading-none">
					Email
				</label>
				<Input
					id="email"
					name="email"
					type="email"
					value={personalInfo.email}
					onChange={handleChange}
					placeholder="jane.doe@example.com"
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor="phone" className="text-sm font-medium leading-none">
					Phone
				</label>
				<Input
					id="phone"
					name="phone"
					type="tel"
					value={personalInfo.phone}
					onChange={handleChange}
					placeholder="(555) 123-4567"
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor="location" className="text-sm font-medium leading-none">
					Location
				</label>
				<Input
					id="location"
					name="location"
					value={personalInfo.location}
					onChange={handleChange}
					placeholder="San Francisco, CA"
				/>
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<div className="text-sm font-medium leading-none">Contact Links</div>
					<Button
						type="button"
						variant="neutral"
						size="sm"
						onClick={addContactLink}
					>
						<Plus />
						Add
					</Button>
				</div>

				{personalInfo.contactLinks.map((link, index) => (
					<div
						key={link.id}
						className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_2.5rem] gap-2 items-end"
					>
						<div className="space-y-2">
							<label
								htmlFor={`contact-label-${link.id}`}
								className="text-xs font-medium leading-none"
							>
								Label
							</label>
							<Input
								id={`contact-label-${link.id}`}
								value={link.label}
								onChange={(event) =>
									updateContactLink(link.id, { label: event.target.value })
								}
								placeholder={index === 0 ? "Website" : "GitHub"}
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor={`contact-url-${link.id}`}
								className="text-xs font-medium leading-none"
							>
								URL
							</label>
							<Input
								id={`contact-url-${link.id}`}
								value={link.url}
								onChange={(event) =>
									updateContactLink(link.id, { url: event.target.value })
								}
								placeholder={index === 0 ? "janedoe.com" : "github.com/janedoe"}
							/>
						</div>
						<Button
							type="button"
							variant="neutral"
							size="icon"
							onClick={() => deleteContactLink(link.id)}
							aria-label={`Remove ${link.label || "contact link"}`}
							title={`Remove ${link.label || "contact link"}`}
						>
							<Trash2 />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
