"use client";

import React, { useEffect, useMemo, useImperativeHandle, forwardRef, memo, useRef } from "react";
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

const BlockEditor = memo(forwardRef<BlockEditorHandle, BlockEditorProps>(
    ({ initialContent, onChange, editable = true }, ref) => {
        // Use a ref for onChange to keep the dependency stable for the editor listener
        const onChangeRef = useRef(onChange);
        useEffect(() => {
            onChangeRef.current = onChange;
        }, [onChange]);

        // Debounce timer ref
        const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
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
                        // Clear existing timer
                        if (debounceTimerRef.current) {
                            clearTimeout(debounceTimerRef.current);
                        }

                        // Set a new timer to debounce the state update in parent. 
                        // This gives the IME (Input Method Editor) time to finish character composition 
                        // before the parent triggers a re-render.
                        debounceTimerRef.current = setTimeout(() => {
                            if (onChangeRef.current) {
                                onChangeRef.current(JSON.stringify(editor.document));
                            }
                        }, 400); // 400ms is usually enough for Korean composition
                    }}
                    className=""
                />
            </div>
        );
    }
));

BlockEditor.displayName = "BlockEditor";

export default BlockEditor;
