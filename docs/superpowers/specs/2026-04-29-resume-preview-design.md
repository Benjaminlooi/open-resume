# Resume Preview Design Specification

## Overview
This feature implements a visual preview system for saved resumes on the `ResumesDashboard`. Users will see a permanent thumbnail of their resume on the card itself, and hovering over the card will reveal a larger, floating popover preview.

## Architecture & Refactoring

### Reusable Templates
Currently, `DemoTemplate` and `ModernTemplate` are tightly coupled to the global `resumeStore`. To render previews of saved resumes without altering the active editor state, these components must become pure (or semi-pure).

- Update `DemoTemplate` and `ModernTemplate` to accept an optional `resume` prop of type `EditorState` (or the relevant subset of it).
- If the `resume` prop is provided, the component will use its data.
- If the `resume` prop is not provided, the component will fall back to using `useStore(resumeStore, ...)` to maintain existing functionality in the editor.

### Data Loading
The `/resumes` route currently relies on `resumeIndexStore`, which only contains metadata (id, name, templateId, lastModified).
To render previews, we need the full resume data.
- Create a helper function `getResumeData(id: string): EditorState | null` in `src/lib/resume-store.ts` that retrieves and parses a specific resume from `localStorage` without loading it into the global store.
- The `ResumesDashboard` (or individual card components) will use this helper to fetch the data needed for the preview components.

## Visual Implementation

### Card Thumbnail
The placeholder div at the top of each resume card (which currently just displays the `templateId`) will be replaced.
- Create a `ResumeThumbnail` component.
- This component will render the appropriate template component (`DemoTemplate` or `ModernTemplate`) based on the resume's `templateId`.
- The template will be wrapped in a container that scales it down using CSS `transform: scale(X)` (e.g., `scale(0.15)` or `scale(0.2)`).
- The container must enforce the correct aspect ratio (A4 proportions) and clip overflow (`overflow: hidden`).

### Hover Popover
A larger preview will appear when the user hovers over a resume card.
- Implement a floating popover mechanism (likely using standard CSS hover states and absolute positioning relative to a parent container, or integrating a Shadcn UI Tooltip/Popover if applicable and suitable for hover).
- Inside the popover, render the same template component but with a larger scale factor (e.g., `scale(0.35)` or `scale(0.5)`).
- The popover should be positioned near the card (e.g., to the right or left, depending on available space) and should have a higher `z-index`, a border, and a shadow to distinguish it from the background.
- It must ensure the scaled A4 document is fully visible within the popover container.

## Error Handling
- If `getResumeData` fails to parse or find the data, the card should gracefully fall back to displaying the `templateId` placeholder as it does currently.

## Testing Strategy
- Verify that `DemoTemplate` and `ModernTemplate` render correctly when provided with a `resume` prop.
- Verify that the editor still functions correctly when the `resume` prop is omitted.
- Verify the layout and scaling of the thumbnails on the dashboard across different screen sizes.
- Verify the positioning and visibility of the hover popovers.
