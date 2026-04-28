# Visual Grid Template Selection

## Objective
Update the "Create New Resume" modal (`NewResumeModal.tsx`) to replace text-based template selection buttons with a visual grid of selectable template preview cards. This helps users understand the structure of the template before they create their resume.

## UI Changes (`src/components/editor/NewResumeModal.tsx`)
1.  **Modal Width Expansion**: Increase the modal's width (e.g., `max-w-3xl`) to accommodate the new grid layout.
2.  **Grid Layout for Templates**: Change the current `grid-cols-2` button container into a responsive grid of selectable cards (`grid-cols-2 sm:grid-cols-3 gap-4`).
3.  **Template Preview Cards**: For each template in `AVAILABLE_TEMPLATES`, render a card.
    *   **Content**: Each card will contain a `ResumeThumbnail` to show an accurate, scaled-down visual representation of the template structure, along with the template name below it.
    *   **Selected State**: Highlight the selected template card with a strong border (`border-2 border-border`), active background color (`bg-main`), bold shadow (`shadow-shadow`), and an optional checkmark indicator.
    *   **Unselected/Hover State**: Unselected cards will use muted borders (`border-border/50`). On hover, they will display the bold border and shadow (`hover:border-border hover:shadow-shadow`) to encourage interaction.
    *   **Click Handler**: The entire card area should be clickable and trigger `setTemplateId(tpl.id)`.

## Data Requirements
*   **Resume Thumbnail Props**: The `ResumeThumbnail` component (`src/components/dashboard/ResumeThumbnail.tsx`) expects a valid `resume: EditorState` object to render the preview. 
*   **Dummy State Generation**: Within the modal, we need to create or import a minimal "dummy" or "blank" `EditorState` object to pass into the thumbnails. This allows the template components (`DemoTemplate`, `ModernTemplate`) to render their structural layout without causing undefined errors.

## Implementation Steps
1.  Define a constant `blankResumeState` (matching the `EditorState` structure) inside the modal or in a utility file to feed the previews.
2.  Import `ResumeThumbnail` into `NewResumeModal.tsx`.
3.  Refactor the template selection mapping in the modal to render the new interactive cards with embedded thumbnails instead of the simple `<button>` text elements.
4.  Adjust the modal container styling to ensure the grid fits comfortably and looks polished.