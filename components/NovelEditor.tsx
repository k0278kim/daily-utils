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
} from "novel";
import { suggestionItems } from "./slash-command";

// Tiptap Extensions
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Typography from "@tiptap/extension-typography";

// Define Props
interface NovelEditorProps {
    initialContent?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    onKeyDown?: (event: KeyboardEvent) => boolean | void;
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
        placeholder: "이곳에 오늘의 기록을 남겨보세요...",
        emptyEditorClass: "is-editor-empty",
    }),
    Typography,
    TaskList,
    TaskItem.configure({
        nested: true,
    }),
    HorizontalRule,
    slashCommand,
];

const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(
    ({ initialContent = "", onChange, editable = true, onKeyDown }, ref) => {
        const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);

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
                if (currentHtml !== targetHtml && (editorInstance.isEmpty || !editable) && !isComposingRef.current) {
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

        return (
            <div className="w-full h-full min-h-[500px]">
                <EditorRoot>
                    <EditorContent
                        initialContent={parsedContent}
                        extensions={extensions as any}
                        editorProps={{
                            handleDOMEvents: {
                                keydown: (_view, event) => {
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
                            // Skip while composing to avoid character disappearance (IME issue)
                            if (isComposingRef.current) return;

                            // Trigger onChange with debouncing
                            if (debounceTimerRef.current) {
                                clearTimeout(debounceTimerRef.current);
                            }
                            debounceTimerRef.current = setTimeout(() => {
                                if (onChangeRef.current) {
                                    const markdown = htmlToMarkdown(editor.getHTML());
                                    onChangeRef.current(markdown);
                                }
                            }, 400);
                        }}
                        onCreate={({ editor }) => {
                            setEditorInstance(editor as EditorInstance);
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
