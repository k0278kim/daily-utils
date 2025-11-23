"use server";

import { createClient } from "@supabase/supabase-js";
import { User } from "@/model/user";
import {requireAuth} from "@/utils/supabase/auth";

export async function addJapdori(japdoriFrom: User, japdoriTo: User, title: string, content: string, teamId: string) {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase.from("japdori").insert([{ title, content, japdori_from: japdoriFrom.id, japdori_to: japdoriTo.id, team: teamId }]);
  if (error) throw new Error(error.message);
  return data;
}
