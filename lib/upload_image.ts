import { createBrowserClient } from "@supabase/ssr";

export const uploadImage = async (file: File): Promise<string | null> => {
    try {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

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
