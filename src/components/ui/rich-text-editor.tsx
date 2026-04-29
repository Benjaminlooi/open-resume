import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Unlink } from "lucide-react";
import { useCallback, useEffect } from "react";
import { cn } from "#/lib/utils";

interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

export function RichTextEditor({
	value,
	onChange,
	className,
}: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({
				openOnClick: false,
			}),
		],
		content: value,
		editorProps: {
			attributes: {
				class: cn(
					"prose prose-sm max-w-none w-full border-2 border-border bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] rounded-b-base",
					className,
				),
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	// Keep editor content in sync if value changes externally (e.g. DND reorder)
	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			// Only update if the editor is NOT focused to prevent cursor jumping
			// while typing lists, which can temporarily desync HTML strings.
			if (!editor.isFocused) {
				editor.commands.setContent(value);
			}
		}
	}, [editor, value]);

	const setLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	if (!editor) return null;

	return (
		<div className="flex flex-col w-full">
			<div className="flex flex-wrap items-center gap-1 border-2 border-b-0 border-border bg-main/10 p-1 rounded-t-base">
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						editor.chain().focus().toggleBold().run();
					}}
					className={cn(
						"p-1.5 rounded hover:bg-main/20 text-black",
						editor.isActive("bold") && "bg-main/20 font-bold",
					)}
				>
					<Bold size={16} />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						editor.chain().focus().toggleItalic().run();
					}}
					className={cn(
						"p-1.5 rounded hover:bg-main/20 text-black",
						editor.isActive("italic") && "bg-main/20",
					)}
				>
					<Italic size={16} />
				</button>
				<div className="w-[2px] h-5 bg-border mx-1" />
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						editor.chain().focus().toggleBulletList().run();
					}}
					className={cn(
						"p-1.5 rounded hover:bg-main/20 text-black",
						editor.isActive("bulletList") && "bg-main/20",
					)}
				>
					<List size={16} />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						editor.chain().focus().toggleOrderedList().run();
					}}
					className={cn(
						"p-1.5 rounded hover:bg-main/20 text-black",
						editor.isActive("orderedList") && "bg-main/20",
					)}
				>
					<ListOrdered size={16} />
				</button>
				<div className="w-[2px] h-5 bg-border mx-1" />
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						setLink();
					}}
					className={cn(
						"p-1.5 rounded hover:bg-main/20 text-black",
						editor.isActive("link") && "bg-main/20",
					)}
				>
					<LinkIcon size={16} />
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						editor.chain().focus().unsetLink().run();
					}}
					disabled={!editor.isActive("link")}
					className="p-1.5 rounded hover:bg-main/20 disabled:opacity-50 text-black"
				>
					<Unlink size={16} />
				</button>
			</div>
			<EditorContent editor={editor} className="overflow-hidden" />
		</div>
	);
}
