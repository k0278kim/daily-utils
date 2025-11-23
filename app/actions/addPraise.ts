"use server";

import { createClient } from "@supabase/supabase-js";
import { User } from "@/model/user";
import {requireAuth} from "@/utils/supabase/auth";

export async function addPraise(praiseFrom: User, praiseTo: User, title: string, content: string, teamId: string) {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase.from("praise").insert([{ title, content, praise_from: praiseFrom.id, praise_to: praiseTo.id, team: teamId }]);
  if (error) throw new Error(error.message);
  return data;
}
