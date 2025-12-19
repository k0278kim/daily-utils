import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import { google } from "googleapis";
import { requireAuth } from "@/utils/supabase/auth";

export async function POST(req: NextRequest) {
    try {
        const { supabase, user } = await requireAuth();
        const body = await req.json();
        const { title, content } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const oauth2Client = await getAuthenticatedGoogleClient();
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Detect if content is JSON (BlockNote) or Markdown
        const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial; font-size: 11pt; color: #000000; }
                    h1 { font-size: 20pt; font-weight: bold; margin-bottom: 6px; margin-top: 20px; }
                    h2 { font-size: 16pt; font-weight: bold; margin-bottom: 6px; margin-top: 18px; }
                    h3 { font-size: 14pt; font-weight: bold; margin-bottom: 4px; margin-top: 14px; }
                    p { margin-bottom: 8pt; line-height: 1.5; }
                    ul, ol { margin-bottom: 8pt; padding-left: 20px; }
                    li { margin-bottom: 4pt; }
                    code { background-color: #f1f1f1; padding: 2px 4px; font-family: monospace; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <hr/>
                ${convertContentToHtml(content || "")}
            </body>
            </html>
        `;

        const fileMetadata = {
            name: title,
            mimeType: "application/vnd.google-apps.document", // Convert to Google Doc
        };

        const media = {
            mimeType: "text/html",
            body: htmlContent,
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id, webViewLink",
        });

        return NextResponse.json(file.data);

    } catch (err: any) {
        console.error("Drive API Error:", err);
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        return NextResponse.json({ error: message }, { status });
    }
}

// Helper to process inline content array (text + styles)
function processInlineContent(contentArray: any[]): string {
    if (!contentArray) return "";
    return contentArray.map((item: any) => {
        if (item.type === 'link') {
            return `<a href="${item.href}">${item.content.map((c: any) => c.text).join('')}</a>`;
        }
        let text = item.text || "";
        // Basic escaping
        text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (item.styles) {
            if (item.styles.bold) text = `<b>${text}</b>`;
            if (item.styles.italic) text = `<i>${text}</i>`;
            if (item.styles.underline) text = `<u>${text}</u>`;
            if (item.styles.strike) text = `<s>${text}</s>`;
            if (item.styles.code) text = `<code>${text}</code>`;
        }
        return text;
    }).join("");
}

function convertContentToHtml(content: string): string {
    // 1. Try to parse as JSON (BlockNote)
    try {
        const blocks = JSON.parse(content);
        if (Array.isArray(blocks)) {
            let html = "";
            let listStack: string[] = []; // Track nested lists if needed, simplified here

            // Helper to close list if type changes
            const closeList = () => {
                if (listStack.length > 0) {
                    const type = listStack.pop();
                    html += type === 'ul' ? "</ul>" : "</ol>";
                }
            };

            blocks.forEach((block: any, index: number) => {
                const type = block.type;
                const prevType = index > 0 ? blocks[index - 1]?.type : null;

                // List Handling
                const isList = type === 'bulletListItem' || type === 'numberedListItem';
                if (isList) {
                    const listTag = type === 'bulletListItem' ? 'ul' : 'ol';
                    // If starting new list
                    if (listStack.length === 0 || listStack[listStack.length - 1] !== listTag) {
                        // Close previous if different
                        if (listStack.length > 0) closeList();
                        html += `<${listTag}>`;
                        listStack.push(listTag);
                    }
                } else {
                    while (listStack.length > 0) closeList();
                }

                // Content generation
                const innerHtml = processInlineContent(block.content);

                switch (type) {
                    case "heading":
                        const level = block.props?.level || 1;
                        html += `<h${level}>${innerHtml}</h${level}>`;
                        break;
                    case "paragraph":
                        // Empty paragraph is new line
                        if (!innerHtml) html += "<p><br/></p>";
                        else html += `<p>${innerHtml}</p>`;
                        break;
                    case "bulletListItem":
                    case "numberedListItem":
                        html += `<li>${innerHtml}</li>`;
                        break;
                    case "checkListItem":
                        const checked = block.props?.checked ? "☑" : "☐";
                        html += `<p>${checked} ${innerHtml}</p>`;
                        break;
                    default:
                        if (innerHtml) html += `<p>${innerHtml}</p>`;
                        break;
                }
            });
            while (listStack.length > 0) closeList();

            return html;
        }
    } catch (e) {
        // Not JSON, fall back to Markdown regex
    }

    // 2. Markdown Fallback
    let html = content
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*?)\*/gim, '<i>$1</i>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/gim, '</p><p>')
        .replace(/\n/gim, '<br />');

    return `<p>${html}</p>`;
}
