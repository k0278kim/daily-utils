"use client";

import React, { useEffect, useMemo } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { PartialBlock } from "@blocknote/core";

// Define Props
interface BlockEditorProps {
    initialContent?: string; // Can be JSON string or Markdown
    onChange: (jsonContent: string) => void;
    editable?: boolean;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ initialContent, onChange, editable = true }) => {
    // 1. Memoize parsing of initial JSON content.
    // This ensures we pass a stable object (or stable undefined) to useCreateBlockNote on mount.
    // We intentionally have NO dependency on initialContent to prevent re-parsing on every render.
    // We only want to parse INITIAL content once.
    const initialBlocks = useMemo(() => {
        if (!initialContent) return undefined;
        try {
            if (initialContent.trim().startsWith("[")) {
                return JSON.parse(initialContent) as PartialBlock[];
            }
        } catch (e) {
            console.error("Failed to parse JSON content", e);
        }
        return undefined; // If not JSON, we'll handle as Markdown in effect
    }, []); // Empty dependency array = run once on mount

    // 2. Create the editor instance with initial blocks (if any)
    const editor = useCreateBlockNote({
        initialContent: initialBlocks,
    });

    // 3. Handle Markdown fallback via effect
    // This only runs if we have initialContent but it wasn't valid JSON (i.e., legacy Markdown)
    useEffect(() => {
        if (!editor) return;

        // If initialBlocks resulted in valid blocks, standard initialization is done.
        // We check if we need to load markdown.
        if (initialContent && !initialContent.trim().startsWith("[")) {
            const loadMarkdown = async () => {
                const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
                editor.replaceBlocks(editor.document, blocks);
            };
            loadMarkdown();
        }
    }, [editor]); // Run once when editor is created

    // console.log("BlockEditor Rendered"); // Debug log

    return (
        <div className="w-full h-full min-h-[500px]">
            <BlockNoteView
                editor={editor}
                editable={editable}
                onChange={() => {
                    // Save as JSON string
                    const json = JSON.stringify(editor.document);
                    onChange(json);
                }}
                theme={"light"}
                className=""
            />
        </div>
    );
};

export default BlockEditor;
