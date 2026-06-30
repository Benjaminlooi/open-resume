import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: process.env.OPEN_RESUME_BACKEND_DB_PATH ?? ".open-resume-backend/jobs.sqlite",
	},
});
