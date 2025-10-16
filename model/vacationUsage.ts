import {Team} from "@/model/team";
import {User} from "@/model/user";

export type VacationUsage = {
  id: number;
  created_at: string;
  team: Team;
  user_id: User;
  vacation_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  usage_day: number;
}