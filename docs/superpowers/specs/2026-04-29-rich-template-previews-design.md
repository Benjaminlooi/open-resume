# Rich Template Previews

## Problem
The `blankResumeState` object used for template previews in the new resume dialog is mostly empty. As a result, the template previews appear barren.

## Solution
We will extract the rich dummy data currently found in `initialResume` within the main resume store and share it. This way, both the first-time user experience and the template selection modal previews utilize the same complete dataset.

## Implementation Details

1. **Extract Data (`src/lib/dummy-resume.ts`)**:
   - Create a new exported constant `dummyResumeData` containing `personalInfo`, `sections`, `experience`, `education`, `skills`, `projects`, `certifications`, and `languages` arrays from the existing `initialResume` object.

2. **Update Preview State (`src/lib/dummy-resume.ts`)**:
   - Modify `blankResumeState` to spread `dummyResumeData`. It should retain its unique `id` ("dummy"), `name` ("Template Preview"), and default `templateId` ("demo").

3. **Update Initial Store State (`src/lib/resume-store.ts`)**:
   - Modify `initialResume` to spread `dummyResumeData` rather than hardcoding the content. It will maintain its unique `id` ("default"), `name` ("My Resume"), etc.
