import { createBrowserClient } from "@supabase/ssr";

const getSupabaseClient = () => {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

// Image compression configuration
const COMPRESSION_CONFIG = {
    maxWidth: 1200, // Reasonable max width for editor content
    maxHeight: 1200,
    quality: 0.8,
    type: 'image/webp' as const
};

export const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Caclulate new dimensions properly maintaining aspect ratio
                if (width > height) {
                    if (width > COMPRESSION_CONFIG.maxWidth) {
                        height = Math.round(height * (COMPRESSION_CONFIG.maxWidth / width));
                        width = COMPRESSION_CONFIG.maxWidth;
                    }
                } else {
                    if (height > COMPRESSION_CONFIG.maxHeight) {
                        width = Math.round(width * (COMPRESSION_CONFIG.maxHeight / height));
                        height = COMPRESSION_CONFIG.maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    COMPRESSION_CONFIG.type,
                    COMPRESSION_CONFIG.quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const uploadImage = async (file: File): Promise<string | null> => {
    try {
        // Compress image before upload
        // If it's not an image (e.g. SVG/GIF that we might want to preserve, or if compression fails),
        // we could fallback to original. But user asked for compression.
        // Let's wrap compression in try/catch to be safe, or just enforce it.
        const encodedBlob = await compressImage(file);

        // Re-create a file-like object or upload blob directly
        const fileExt = 'webp'; // We convert to webp
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const supabase = getSupabaseClient();
        const { error: uploadError } = await supabase.storage
            .from('editor-uploads')
            .upload(filePath, encodedBlob, {
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            return null;
        }

        const { data } = supabase.storage
            .from('editor-uploads')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error in uploadImage:', error);
        return null;
    }
};

export const deleteImage = async (url: string, accessToken?: string): Promise<boolean> => {
    try {
        if (!url) return false;

        // Extract file path from public URL
        // Format: .../storage/v1/object/public/editor-uploads/FILE_PATH
        const bucketPath = '/editor-uploads/';
        const pathIndex = url.indexOf(bucketPath);
        if (pathIndex === -1) {
            console.warn('Invalid image URL for deletion (bucket not found):', url);
            return false;
        }

        const filePath = url.substring(pathIndex + bucketPath.length);
        if (!filePath) return false;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Construct the full API URL for deletion
        // DELETE https://[project].supabase.co/storage/v1/object/editor-uploads/[path]
        const apiUrl = `${supabaseUrl}/storage/v1/object/editor-uploads/${filePath}`;

        console.log(`[deleteImage] Sending raw DELETE to ${apiUrl}`);

        const headers: HeadersInit = {
            'apikey': anonKey,
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
            console.warn("[deleteImage] No access token provided! Deletion may fail if RLS requires auth.");
        }

        // Use raw fetch with keepalive to ensure request survives page unload
        // This bypasses the Supabase client wrapper which might lose context
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: headers,
            keepalive: true, // Critical for unload
        });

        if (!response.ok) {
            // Treat 404 as success (idempotent)
            if (response.status === 404 || response.status === 400) {
                // Note: Supabase sometimes returns 400 with "Object not found" for invalid paths or already deleted objects
                const errorText = await response.text();
                if (errorText.includes("not_found") || errorText.includes("not found")) {
                    console.log(`[deleteImage] Image already deleted or not found (treated as success): ${url}`);
                    return true;
                }
                console.error(`[deleteImage] Fetch failed: ${response.status} ${response.statusText}`, errorText);
                return false;
            }
            const errorText = await response.text();
            console.error(`[deleteImage] Fetch failed: ${response.status} ${response.statusText}`, errorText);
            return false;
        }

        console.log(`[deleteImage] Success: ${response.status}`);
        return true;
    } catch (error) {
        console.error('Error in deleteImage:', error);
        return false;
    }
};

export const extractImagesFromContent = (content: any): Set<string> => {
    const images = new Set<string>();

    if (typeof content === 'string') {
        // 1. Try to parse as JSON first (in case it's a stringified JSON object)
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object') {
                return extractImagesFromContent(parsed);
            }
        } catch (e) {
            // Not JSON, continue as string
        }

        // 2. Extract from HTML (e.g. <img src="...">)
        const htmlRegex = /<img[^>]+src=["']([^"']+)["']/g;
        let match;
        while ((match = htmlRegex.exec(content)) !== null) {
            images.add(match[1]);
        }

        // 3. Extract from Markdown (e.g. ![alt](src))
        const markdownRegex = /!\[.*?\]\((.*?)\)/g;
        while ((match = markdownRegex.exec(content)) !== null) {
            images.add(match[1]);
        }
    } else if (typeof content === 'object' && content !== null) {
        // Traverse JSON structure (TipTap)
        const traverse = (node: any) => {
            if (node.type === 'image' && node.attrs?.src) {
                images.add(node.attrs.src);
            }
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach(traverse);
            }
        };
        traverse(content);
    }

    return images;
};
