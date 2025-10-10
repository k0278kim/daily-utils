"use server";

import { createClient } from "@supabase/supabase-js";
import { User } from "@/model/user";

export async function addJapdori(japdoriFrom: User, japdoriTo: User, title: string, content: string, teamId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 서버에서는 서비스 키 사용 가능
  );

  const { data, error } = await supabase.from("japdori").insert([{ title, content, japdori_from: japdoriFrom.uuid, japdori_to: japdoriTo.uuid, team: teamId }]);
  if (error) throw new Error(error.message);
  return data;
}
