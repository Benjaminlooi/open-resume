export async function generateExperienceBullets(
	role: string,
	company: string,
): Promise<string> {
	// Simulate an API call delay
	await new Promise((resolve) => setTimeout(resolve, 1500));

	if (!role && !company) {
		return "<ul><li>Generated bullet point 1</li><li>Generated bullet point 2</li><li>Generated bullet point 3</li></ul>";
	}

	return `<ul>
<li>Spearheaded initiatives at ${company || "the company"} as a ${
		role || "professional"
	}, increasing operational efficiency by 25%.</li>
<li>Collaborated with cross-functional teams to deliver key objectives ahead of schedule.</li>
<li>Mentored junior team members and fostered a culture of continuous learning.</li>
</ul>`;
}
