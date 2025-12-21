"use client";

import React, { useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { PartialBlock } from "@blocknote/core";

// Define Props
interface BlockEditorProps {
    initialContent?: string; // Can be JSON string or Markdown
    onChange?: (jsonContent: string) => void;
    editable?: boolean;
}

// Define methods exposed via ref
export interface BlockEditorHandle {
    getMarkdown: () => Promise<string>;
    getJSON: () => string;
}

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
    ({ initialContent, onChange, editable = true }, ref) => {
        // 1. Memoize parsing of initial JSON content.
        const initialBlocks = useMemo(() => {
            if (!initialContent) return undefined;
            try {
                if (initialContent.trim().startsWith("[")) {
                    return JSON.parse(initialContent) as PartialBlock[];
                }
            } catch (e) {
                console.error("Failed to parse JSON content", e);
            }
            return undefined;
        }, []);

        // 2. Create the editor instance with initial blocks (if any)
        const editor = useCreateBlockNote({
            initialContent: initialBlocks,
        });

        // 3. Handle Markdown fallback via effect
        useEffect(() => {
            if (!editor) return;

            if (initialContent && !initialContent.trim().startsWith("[")) {
                const loadMarkdown = async () => {
                    const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
                    editor.replaceBlocks(editor.document, blocks);
                };
                loadMarkdown();
            }
        }, [editor]);

        // 4. Expose getMarkdown and getJSON methods via ref
        useImperativeHandle(ref, () => ({
            getMarkdown: async () => {
                const markdown = await editor.blocksToMarkdownLossy(editor.document);
                return markdown;
            },
            getJSON: () => {
                return JSON.stringify(editor.document);
            }
        }));

        return (
            <div className="w-full h-full min-h-[500px]">
                <BlockNoteView
                    editor={editor}
                    editable={editable}
                    theme={"light"}
                    onChange={() => {
                        if (onChange) {
                            onChange(JSON.stringify(editor.document));
                        }
                    }}
                    className=""
                />
            </div>
        );
    }
);

BlockEditor.displayName = "BlockEditor";

export default BlockEditor;
