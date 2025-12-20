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
    ({ initialContent = "", editable = true, onKeyDown }, ref) => {
        const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);

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

                // Only update if content is meaningfully different to avoid cursor jumps
                if (currentHtml !== targetHtml && (editorInstance.isEmpty || !editable)) {
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

        return (
            <div className="w-full h-full min-h-[500px]">
                <EditorRoot>
                    <EditorContent
                        initialContent={parsedContent}
                        extensions={extensions as any}
                        editorProps={{
                            handleDOMEvents: {
                                keydown: (_view, event) => {
                                    if (onKeyDown) onKeyDown(event);
                                    return handleCommandNavigation(event);
                                },
                            },
                            attributes: {
                                class: "tiptap prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full min-h-[500px] px-8 py-12",
                            },
                        }}
                        onUpdate={({ editor }) => {
                            setEditorInstance(editor as EditorInstance);
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

    markdown = markdown.replace(/<p><\/p>/g, "\n");
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, "# $1\n");
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, "## $1\n");
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, "### $1\n");
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1**");
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, "*$1*");

    markdown = markdown.replace(/<ul>([\s\S]*?)<\/ul>/g, (_: string, content: string) => {
        return content.replace(/<li>(.*?)<\/li>/g, "- $1\n");
    });
    markdown = markdown.replace(/<ol>([\s\S]*?)<\/ol>/g, (_: string, content: string) => {
        let i = 1;
        return content.replace(/<li>(.*?)<\/li>/g, () => `${i++}. $1\n`);
    });

    markdown = markdown.replace(/<ul data-type="taskList">([\s\S]*?)<\/ul>/g, (_: string, content: string) => {
        return content.replace(/<li data-checked="(true|false)">(.*?)<\/li>/g, (_match: string, checked: string, text: string) => {
            const check = checked === "true" ? "x" : " ";
            return `- [${check}] ${text}\n`;
        });
    });

    markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, "```\n$1\n```\n");
    markdown = markdown.replace(/<code>(.*?)<\/code>/g, "`$1`");
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, "$1\n\n");
    markdown = markdown.replace(/<[^>]+>/g, "");
    markdown = markdown.replace(/\n{3,}/g, "\n\n");

    return markdown.trim();
}

// Simple Markdown to HTML converter
function markdownToHtml(markdown: string): string {
    if (!markdown) return "";
    let html = markdown;

    // Headings
    html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");
    html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
    html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Task Lists
    html = html.replace(/^- \[x\] (.*$)/gm, '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked><span></span></label><div>$1</div></li></ul>');
    html = html.replace(/^- \[ \] (.*$)/gm, '<ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"><span></span></label><div>$1</div></li></ul>');

    // Lists
    html = html.replace(/^- (.*$)/gm, "<ul><li>$1</li></ul>");
    html = html.replace(/^\d+\. (.*$)/gm, "<ol><li>$1</li></ol>");

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
