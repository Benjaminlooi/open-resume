import { useStore } from "@tanstack/react-store";
import { Input } from "#/components/ui/input";
import { resumeStore, updatePersonalInfo } from "#/lib/resume-store";

export default function PersonalInfoForm() {
	const personalInfo = useStore(resumeStore, (state) => state.personalInfo);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		updatePersonalInfo(name as keyof typeof personalInfo, value);
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

			<div className="space-y-2">
				<label htmlFor="website" className="text-sm font-medium leading-none">
					Website / LinkedIn
				</label>
				<Input
					id="website"
					name="website"
					value={personalInfo.website}
					onChange={handleChange}
					placeholder="linkedin.com/in/janedoe"
				/>
			</div>
		</div>
	);
}
