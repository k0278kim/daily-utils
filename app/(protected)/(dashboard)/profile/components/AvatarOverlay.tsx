import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Image from "next/image";
import { useSupabaseClient, useUser } from "@/context/SupabaseProvider";
import { User } from "@/model/user";
import { useRouter } from "next/navigation";

type AvatarOverlayProps = {
  setAvatarUrl: Dispatch<SetStateAction<string>>;
}

const AvatarOverlay = ({ setAvatarUrl }: AvatarOverlayProps) => {
  const { user } = useUser();
  const [defaultAvatars, setDefaultAvatars] = useState<string[]>([]);
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("default_avatar_image")
        .select("url");
      if (data) {
        const urls: string[] = data.map((item) => item.url);
        setDefaultAvatars(urls);
      }
    })();
  }, []);

  const updateAvatar = async (url: string) => {
    setAvatarUrl(url);
    const { data, error } = await supabase.from("profiles")
      .update({
        avatar_url: url
      })
      .eq("email", user?.user_metadata.email);
    window.location.reload();
  }

  return <div className={"w-full h-full bg-black/20 z-50 fixed top-0 left-0 flex items-center justify-center"}>
    <div className={"w-[60%] h-fit p-10 rounded-2xl bg-white"}>
      <p className={"text-xl font-bold mb-5"}>라이브러리에서 사진 선택</p>
      <div className={"flex gap-2"}>
        <div className={"w-32 aspect-square relative"} onClick={async () => {
          await updateAvatar(user?.user_metadata?.avatar_url);
        }}>
          <Image src={user?.user_metadata.avatar_url} alt={""} fill className={"object-cover"} />
        </div>
        {
          defaultAvatars.map((url, index) => <div key={index} className={"w-32 aspect-square relative"} onClick={async () => {
            await updateAvatar(url);
          }}>
            <Image src={url} alt={""} fill className={"object-cover"} />
          </div>)
        }
      </div>
    </div>
  </div>;
}

export default AvatarOverlay;