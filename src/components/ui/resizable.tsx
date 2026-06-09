import { GripVertical } from "lucide-react";
import type * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import type { GroupProps, SeparatorProps } from "react-resizable-panels";

import { cn } from "#/lib/utils";

type ResizablePanelGroupProps = Omit<GroupProps, "orientation"> & {
	direction?: GroupProps["orientation"];
};

function ResizablePanelGroup({
	className,
	direction,
	...props
}: ResizablePanelGroupProps) {
	return (
		<ResizablePrimitive.Group
			data-slot="resizable-panel-group"
			orientation={direction}
			className={cn(
				"flex h-full w-full font-base data-[panel-group-direction=vertical]:flex-col",
				className,
			)}
			{...props}
		/>
	);
}

function ResizablePanel({
	className,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
	return (
		<ResizablePrimitive.Panel
			data-slot="resizable-panel"
			className={cn(className)}
			{...props}
		/>
	);
}

function ResizableHandle({
	withHandle,
	className,
	...props
}: SeparatorProps & {
	withHandle?: boolean;
}) {
	return (
		<ResizablePrimitive.Separator
			data-slot="resizable-handle"
			className={cn(
				"relative flex w-0.5 items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-0.5 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
				className,
			)}
			{...props}
		>
			{withHandle && (
				<div className="z-10 flex h-4 w-3 items-center justify-center rounded-base border bg-border">
					<GripVertical className="size-2.5" />
				</div>
			)}
		</ResizablePrimitive.Separator>
	);
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
