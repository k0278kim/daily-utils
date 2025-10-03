"use server";

import { createClient } from "@supabase/supabase-js";
import { User } from "@/model/user";

export async function addPraise(praiseFrom: User, praiseTo: User, title: string, content: string, teamId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 서버에서는 서비스 키 사용 가능
  );

  const { data, error } = await supabase.from("praise").insert([{ title, content, praise_from: praiseFrom.uuid, praise_to: praiseTo.uuid, team: teamId }]);
  if (error) throw new Error(error.message);
  return data;
}
