# Design Specification: Saved Resumes Page & Multi-Resume Support

## Overview
A new page (e.g., `/dashboard` or `/resumes`) will be created to serve as the entry point for the application. It will display a grid of currently saved resumes, allowing users to select an existing resume to edit or initiate the creation of a new one.

## 1. Storage & State Management
To support multiple resumes efficiently, the data layer will be separated into two components:
- **Resume Index Store (`localStorage: resume-index`):** A new lightweight store that maintains metadata for all saved resumes. It will store an array of objects containing `id`, `name`, `lastModified`, and `templateId`. This allows the dashboard to render quickly without loading the full content of every resume.
- **Individual Resume Storage (`localStorage: resume-[id]`):** The full content of each resume will be stored in its own key. The existing `resume-store.ts` will be updated so that when a resume is selected from the dashboard, its specific data is loaded into the editor state.

## 2. Dashboard UI (`/resumes` or similar route)
The page will be styled to match the existing application (Tailwind CSS + Shadcn UI).
- **Layout:** A responsive Grid of Cards (Option A).
- **Cards:** Each card will represent a saved resume, displaying its title, last edited date, and an action menu (Edit, Duplicate, Delete). A visual thumbnail or placeholder will represent the template.
- **"New Resume" Card:** The first card in the grid will be a distinct, actionable area (e.g., dashed border, large "+" icon) to create a new resume.

## 3. "Create New Resume" Flow
- **Interaction:** Clicking the "+ New" card opens a Modal Dialog (Option A).
- **Modal Content:**
  - An input field for the resume's name (required).
  - A visual selection area displaying the available templates (Classic, Modern, etc.).
- **Action:** Upon confirming the details in the modal:
  1. A new unique ID is generated.
  2. The new resume's metadata is added to the Index Store.
  3. The initial state (with the chosen template and name) is saved to the new Individual Resume Storage key.
  4. The user is navigated to the `/editor` route, which will load the newly created resume's data.

## 4. Routing Changes
- The root route `/` will likely redirect to the new dashboard page if resumes exist, or act as the dashboard itself.
- The `/editor` route will need to accept an `id` parameter (e.g., `/editor/$id`) or rely on a state variable to know which resume to load from storage.

## 5. Error Handling & Edge Cases
- **No Resumes:** If the index is empty, the dashboard will display an empty state prominently featuring the "Create New" action.
- **Missing Data:** If a resume listed in the index cannot be found in its individual storage key, a fallback or error message will be shown, and the index entry can be flagged or removed.
- **Storage Limits:** Standard `localStorage` limits apply. While unlikely to be hit quickly with separated storage, robust try/catch blocks will be needed during save operations.