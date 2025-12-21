import { createBrowserClient } from "@supabase/ssr";

const getSupabaseClient = () => {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

export const uploadImage = async (file: File): Promise<string | null> => {
    try {
        const supabase = getSupabaseClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('editor-uploads')
            .upload(filePath, file);

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
