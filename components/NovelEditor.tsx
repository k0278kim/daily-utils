"use client";

import React, { useImperativeHandle, forwardRef, useState } from "react";
import {
    EditorRoot,
    EditorContent,
    EditorCommand,
    EditorCommandItem,
    EditorCommandEmpty,
    EditorCommandList,
    EditorInstance,
    Command,
    renderItems,
    handleCommandNavigation,
    JSONContent,
} from "novel";
import { suggestionItems } from "./slash-command";

// Tiptap Extensions
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Typography from "@tiptap/extension-typography";
// import Image from "@tiptap/extension-image";
import Image from "@tiptap/extension-image";
import { uploadImage, deleteImage, extractImagesFromContent } from "@/lib/upload_image";
import { createBrowserClient } from "@supabase/ssr";


// Define Props
interface NovelEditorProps {
    initialContent?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    onKeyDown?: (event: KeyboardEvent) => boolean | void;
    suggestionText?: string;
}

// Define methods exposed via ref
export interface NovelEditorHandle {
    getMarkdown: () => string;
    getHTML: () => string;
    getJSON: () => string;
    setContent: (content: string) => void;
    insertContent: (content: string) => void;
    isEmpty: () => boolean;
    isComposing: () => boolean;
}

// Slash Command Config
const slashCommand = Command.configure({
    suggestion: {
        items: () => suggestionItems,
        render: renderItems,
    },
});

const extensions = [
    StarterKit,
    Placeholder.configure({
        placeholder: "",
        emptyEditorClass: "is-editor-empty",
    }),
    Typography,
    TaskList,
    TaskItem.configure({
        nested: true,
    }),
    HorizontalRule,
    slashCommand,
    Image.configure({
        allowBase64: true, // Allow for immediate preview/pasting if we want? No, let's stick to uploading.
    }),
];

const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(
    ({ initialContent = "", onChange, editable = true, onKeyDown, suggestionText }, ref) => {
        const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
        const [isEmpty, setIsEmpty] = useState(true);

        // Track all images that have ever been part of this session to detect deletions
        const knownImageUrls = React.useRef<Set<string>>(new Set());

        // Better Strategy:
        // maintain 'lastContentJson' ref to robustly track image nodes
        const lastContentJsonRef = React.useRef<JSONContent | null>(null);

        // Store access token for authenticated deletion on unmount
        const accessTokenRef = React.useRef<string | undefined>(undefined);

        // Fetch session on mount and keep token updated
        React.useEffect(() => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Initial get
            supabase.auth.getSession().then(({ data }) => {
                if (data.session?.access_token) {
                    accessTokenRef.current = data.session.access_token;
                }
            });

            // Listen for changes (refreshes, sign-outs)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.access_token) {
                    accessTokenRef.current = session.access_token;
                } else {
                    accessTokenRef.current = undefined;
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        }, []);


        // Cleanup on unmount/unload: Find orphaned images and delete them
        React.useEffect(() => {
            let isCleanedUp = false;

            const cleanup = () => {
                if (isCleanedUp) return;
                isCleanedUp = true;

                // console.log("[NovelEditor] Cleanup Triggered");
                try {
                    const finalJson = lastContentJsonRef.current;
                    if (!finalJson) {
                        // console.log("[NovelEditor] No final JSON to cleanup");
                        return;
                    }

                    const finalImages = extractImagesFromContent(finalJson);
                    // console.log("[NovelEditor] Final Images:", Array.from(finalImages));
                    // console.log("[NovelEditor] Known Images:", Array.from(knownImageUrls.current));

                    // Identify orphaned images
                    const orphaned = Array.from(knownImageUrls.current).filter(url => !finalImages.has(url));

                    if (orphaned.length > 0) {
                        console.log("[NovelEditor] Cleaning up orphaned images:", orphaned);
                        const token = accessTokenRef.current;
                        orphaned.forEach(url => {
                            console.log(`[NovelEditor] Deleting: ${url}`);
                            // Fire and forget; custom fetch with keepalive handles the rest
                            deleteImage(url, token).catch(e => console.error("[NovelEditor] Delete failed:", e));
                        });
                    } else {
                        // console.log("[NovelEditor] No orphaned images found.");
                    }
                } catch (e) {
                    console.error("[NovelEditor] Failed to cleanup images:", e);
                }
            };

            // Handle Component Unmount (SPA navigation)
            const onUnmount = () => {
                // console.log("[NovelEditor] Component Unmount");
                cleanup();
            };

            // Handle Tab/Window Close (Browser exit/Refresh)
            const onBeforeUnload = () => {
                // console.log("[NovelEditor] Window Before Unload");
                cleanup();
            };

            window.addEventListener('beforeunload', onBeforeUnload);

            return () => {
                window.removeEventListener('beforeunload', onBeforeUnload);
                onUnmount();
            };
        }, []);

        // Keep onChange stable via ref
        const onChangeRef = React.useRef(onChange);
        React.useEffect(() => {
            onChangeRef.current = onChange;
        }, [onChange]);

        const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

        // Reactively update editable state
        React.useEffect(() => {
            if (editorInstance) {
                editorInstance.setEditable(editable);
            }
        }, [editorInstance, editable]);

        // Reactively update content from initialContent prop
        React.useEffect(() => {
            if (editorInstance && initialContent !== undefined) {
                const currentHtml = editorInstance.getHTML();
                const targetHtml = markdownToHtml(initialContent);

                // Only update if content is meaningfully different to avoid cursor jumps.
                // CRITICAL: Skip while composing to avoid character disappearance (IME issue).
                if (currentHtml !== targetHtml && editorInstance.isEmpty && !isComposingRef.current) {
                    editorInstance.commands.setContent(targetHtml);
                }
            }
        }, [editorInstance, initialContent, editable]);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            getMarkdown: () => {
                if (!editorInstance) return "";
                return htmlToMarkdown(editorInstance.getHTML());
            },
            getHTML: () => {
                if (!editorInstance) return "";
                return editorInstance.getHTML();
            },
            getJSON: () => {
                if (!editorInstance) return "";
                return JSON.stringify(editorInstance.getJSON());
            },
            setContent: (content: string) => {
                if (!editorInstance) return;
                try {
                    editorInstance.commands.setContent(JSON.parse(content));
                } catch (e) {
                    editorInstance.commands.setContent(markdownToHtml(content));
                }
            },
            insertContent: (content: string) => {
                if (!editorInstance) return;
                try {
                    editorInstance.commands.insertContent(JSON.parse(content));
                } catch (e) {
                    editorInstance.commands.insertContent(markdownToHtml(content));
                }
            },
            isEmpty: () => {
                if (!editorInstance) return true;
                return editorInstance.isEmpty;
            },
            isComposing: () => {
                return isComposingRef.current;
            }
        }));

        // Handle string initial content (HTML or Markdown)
        const parsedContent = React.useMemo(() => {
            if (!initialContent) return undefined;
            try {
                return JSON.parse(initialContent);
            } catch (e) {
                return markdownToHtml(initialContent);
            }
        }, [initialContent]);

        const isComposingRef = React.useRef(false);

        // Convert suggestionText to HTML for display if needed (though we might just display text)
        // Use local state 'isEmpty' to reactively hide suggestion
        const showSuggestion = isEmpty && suggestionText && !initialContent;

        return (
            <div className="w-full h-full min-h-[500px] relative group">
                {showSuggestion && (
                    <div className="absolute top-[48px] left-[32px] right-[32px] pointer-events-none z-10 text-muted-foreground/50 select-none font-default prose prose-lg dark:prose-invert">
                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-blue-500/70">
                            <span>Tab으로 자동완성</span>
                        </div>
                        {/* Display suggestion text preserving newlines */}
                        <div className="whitespace-pre-wrap">{suggestionText}</div>
                    </div>
                )}
                <EditorRoot>
                    <EditorContent
                        initialContent={parsedContent}
                        extensions={extensions as any}
                        editorProps={{
                            handleDOMEvents: {
                                paste: (view, event) => {
                                    if (event.clipboardData && event.clipboardData.files.length > 0) {
                                        const file = event.clipboardData.files[0];
                                        if (file.type.startsWith("image/")) {
                                            event.preventDefault(); // Prevent default paste behavior

                                            // Optional: Insert a placeholder or loading state? 
                                            // For simplicity, we just upload and then insert.
                                            // Ideally we show a loading toast.

                                            uploadImage(file).then((url) => {
                                                if (url) {
                                                    // Track this new image
                                                    // console.log('[NovelEditor] New image tracked:', url);
                                                    knownImageUrls.current.add(url);

                                                    // Use ProseMirror transaction directly to avoid stale editorInstance issues
                                                    // and ensure we are operating on the current view state.
                                                    const { schema } = view.state;
                                                    const imageNode = schema.nodes.image?.create({ src: url });
                                                    if (imageNode) {
                                                        const transaction = view.state.tr.replaceSelectionWith(imageNode);
                                                        view.dispatch(transaction);
                                                    }
                                                }
                                            });
                                            return true; // We handled it
                                        }
                                    }
                                    return false; // Let default handler proceed
                                },
                                keydown: (_view, event) => {
                                    // 0. Handle Tab for Suggestion
                                    if (event.key === 'Tab' && editorInstance?.isEmpty && suggestionText && !event.isComposing) {
                                        event.preventDefault();
                                        editorInstance.commands.setContent(markdownToHtml(suggestionText));
                                        setIsEmpty(false); // Force update to hide placeholder immediately
                                        return true;
                                    }

                                    // 1. Guard: If IME is composing, allow the browser/editor to handle it normally.
                                    // We return false to allow the default newline behavior and character commit.
                                    if (event.isComposing || event.keyCode === 229) {
                                        return false;
                                    }

                                    // 2. Prevent custom onKeyDown and handleCommandNavigation during composition
                                    // (including the brief cooldown period after compositionend).
                                    if (isComposingRef.current) {
                                        return false;
                                    }

                                    if (onKeyDown) onKeyDown(event);
                                    return handleCommandNavigation(event);
                                },
                                compositionstart: () => {
                                    isComposingRef.current = true;
                                    return false;
                                },
                                compositionend: (view) => {
                                    // Delay resetting the ref to cover the trailing 'Enter' keydown (keyCode 13)
                                    // which often happens immediately after compositionend.
                                    setTimeout(() => {
                                        isComposingRef.current = false;
                                    }, 150);

                                    // Trigger a final update after composition ends
                                    if (debounceTimerRef.current) {
                                        clearTimeout(debounceTimerRef.current);
                                    }
                                    debounceTimerRef.current = setTimeout(() => {
                                        if (onChangeRef.current) {
                                            const html = view.dom.innerHTML;
                                            onChangeRef.current(htmlToMarkdown(html));
                                        }
                                    }, 400);
                                    return false;
                                }
                            },
                            attributes: {
                                class: "tiptap prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full min-h-[500px] px-8 py-12",
                            },
                        }}
                        onUpdate={({ editor }) => {
                            // Update local empty state
                            setIsEmpty(editor.isEmpty);

                            // Update last content ref immediately to catch deletions before unmount
                            const json = editor.getJSON();
                            lastContentJsonRef.current = json;

                            // Trigger onChange with debouncing
                            if (debounceTimerRef.current) {
                                clearTimeout(debounceTimerRef.current);
                            }
                            debounceTimerRef.current = setTimeout(() => {
                                if (onChangeRef.current) {
                                    const html = editor.getHTML(); // Keep using HTML for outside change prop if needed, or use Markdown
                                    const markdown = htmlToMarkdown(html);
                                    onChangeRef.current(markdown);
                                }
                            }, 400);
                        }}
                        onCreate={({ editor }) => {
                            setEditorInstance(editor as unknown as EditorInstance);
                            setIsEmpty(editor.isEmpty);

                            // Initialize known images from initial content
                            const json = editor.getJSON();
                            lastContentJsonRef.current = json;

                            const initialImages = extractImagesFromContent(json);
                            console.log("[NovelEditor] Initial Images Tracked:", Array.from(initialImages));
                            initialImages.forEach(url => knownImageUrls.current.add(url));
                        }}
                    >
                        <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
                            <EditorCommandEmpty className="px-2 text-muted-foreground">
                                결과가 없습니다
                            </EditorCommandEmpty>
                            <EditorCommandList>
                                {suggestionItems.map((item) => (
                                    <EditorCommandItem
                                        value={item.title}
                                        onCommand={(val) => item.command?.(val)}
                                        className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent cursor-pointer"
                                        key={item.title}
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background text-foreground">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.description}
                                            </p>
                                        </div>
                                    </EditorCommandItem>
                                ))}
                            </EditorCommandList>
                        </EditorCommand>
                    </EditorContent>
                </EditorRoot>
            </div>
        );
    }
);

NovelEditor.displayName = "NovelEditor";

// Simple HTML to Markdown converter
function htmlToMarkdown(html: string): string {
    let markdown = html;

    // Task Lists (Very robust regex to handle any attribute order or extra attributes)
    markdown = markdown.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/g, (_: string, content: string) => {
        return content.replace(/<li[^>]*data-checked="(true|false)"[^>]*>([\s\S]*?)<\/li>/g, (_match: string, checked: string, inner: string) => {
            const check = checked === "true" ? "x" : " ";
            const taskText = inner
                .replace(/<label>[\s\S]*?<\/label>/, "") // Strip checkbox UI
                .replace(/<div.*?>([\s\S]*?)<\/div>/, "$1") // Unwrap div
                .replace(/<p.*?>([\s\S]*?)<\/p>/g, "$1\n") // Unwrap p and add newline for multi-line
                .trim();
            return `- [${check}] ${taskText}\n`;
        });
    });

    // Lists (Grouped, handling any attributes on ul/li)
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (_: string, content: string) => {
        // Skip if this content was already processed as a task list (though it should be replaced by now)
        if (content.includes("- [ ]") || content.includes("- [x]")) return content;

        return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, inner) => {
            const text = inner.replace(/<p.*?>([\s\S]*?)<\/p>/g, "$1").trim();
            return `- ${text}\n`;
        }) + "\n";
    });
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (_: string, content: string) => {
        let i = 1;
        return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, inner) => {
            const text = inner.replace(/<p.*?>([\s\S]*?)<\/p>/g, "$1").trim();
            return `${i++}. ${text}\n`;
        }) + "\n";
    });

    // Basic tags
    markdown = markdown.replace(/<h1.*?>([\s\S]*?)<\/h1>/g, "# $1\n");
    markdown = markdown.replace(/<h2.*?>([\s\S]*?)<\/h2>/g, "## $1\n");
    markdown = markdown.replace(/<h3.*?>([\s\S]*?)<\/h3>/g, "### $1\n");
    markdown = markdown.replace(/<strong.*?>([\s\S]*?)<\/strong>/g, "**$1**");
    markdown = markdown.replace(/<em.*?>([\s\S]*?)<\/em>/g, "*$1*");
    markdown = markdown.replace(/<code.*?>([\s\S]*?)<\/code>/g, "`$1`");
    markdown = markdown.replace(/<p.*?>([\s\S]*?)<\/p>/g, "$1\n");
    markdown = markdown.replace(/<br\s*\/?>/g, "\n");
    markdown = markdown.replace(/&nbsp;/g, " ");

    return markdown.trim();
};

// Simple Markdown to HTML converter
const markdownToHtml = (markdown: string): string => {
    if (!markdown) return "";
    let html = markdown;

    // Headings
    html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");
    html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
    html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Task Lists (Grouped, Tiptap-aligned HTML)
    html = html.replace(/(^([- ]+)\[(x| )\] (.*$)\n?)+/gm, (match) => {
        const items = match.trim().split("\n").map(line => {
            const isChecked = line.includes("[x]");
            const text = line.replace(/^([- ]+)\[(x| )\] /, "");
            return `<li data-checked="${isChecked}" data-type="taskItem"><label><input type="checkbox"${isChecked ? ' checked="checked"' : ""}><span></span></label><div><p>${text}</p></div></li>`;
        }).join("");
        return `<ul data-type="taskList">${items}</ul>`;
    });

    // Lists (Grouped)
    html = html.replace(/(^[ \t]*[-*] (?!\\[[ x]\])(.*$)\n?)+/gm, (match) => {
        const items = match.trim().split("\n").map(line => `<li><p>${line.replace(/^[ \t]*[-*] /, "")}</p></li>`).join("");
        return `<ul>${items}</ul>`;
    });
    html = html.replace(/(^[ \t]*\d+\. (.*$)\n?)+/gm, (match) => {
        const items = match.trim().split("\n").map(line => `<li><p>${line.replace(/^[ \t]*\d+\. /, "")}</p></li>`).join("");
        return `<ol>${items}</ol>`;
    });

    // Code Blocks
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");

    // Horizontal Rule
    html = html.replace(/^---$/gm, "<hr>");

    // Paragraphs (Wrap non-tag lines)
    const lines = html.split("\n");
    html = lines
        .filter(line => line.trim() !== "") // Tight spacing: remove empty lines
        .map(line => {
            if (line.startsWith("<")) return line;
            return `<p>${line}</p>`;
        }).join("");

    // Cleanup nested lists (very basic)
    html = html.replace(/<\/ul><ul>/g, "");
    html = html.replace(/<\/ol><ol>/g, "");

    return html;
}

export default NovelEditor;
