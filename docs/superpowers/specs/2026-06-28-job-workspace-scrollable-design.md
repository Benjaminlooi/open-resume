# Design Spec: Scrollable Job Workspace Layout

**Date:** 2026-06-28
**Author:** Antigravity

## Overview
Redesign the job application workspace page (`apps/web/src/routes/_app/jobs/$id.tsx`) to fit exactly within the viewport, ensuring that the navigation controls (next/previous steps) and top/back links are always visible. Only the active step content (and the sidebar if on mobile) should be scrollable.

## Proposed Changes
We constrain the height of the `<main>` container to `h-[calc(100vh-74px)]` and utilize standard CSS flex and grid layout features to manage spacing.

### Layout Hierarchy
1. **Header & Backlink**: Flex items with `shrink-0` to remain fixed at the top.
2. **Warnings Banner (Conditional)**: Flex item with `shrink-0` to prevent shrinking.
3. **Workspace Middle Section**:
   - Class: `grid grid-cols-1 grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-4 gap-4 md:gap-6 flex-1 min-h-0`
   - **Sidebar Column**: `lg:col-span-1 flex flex-col gap-2 overflow-y-auto shrink-0 max-h-[160px] lg:max-h-none pr-1`
   - **Active Step Panel Column**: `lg:col-span-3 min-h-0 overflow-y-auto pr-1`
4. **Bottom Controls Bar**: Flex item with `shrink-0` to stay fixed at the bottom.

## Verification
- Run the dev server `pnpm web:dev` and visually inspect the layout on both desktop and mobile viewports.
- Verify that steps with long content (e.g., Job Details, Resume Tailoring) scroll within their container, leaving the header and footer controls visible.
- Verify that navigation controls remain fully functional.
