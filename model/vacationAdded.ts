import {Team} from "@/model/team";
import {User} from "@/model/user";

export type VacationAdded = {
  id: number;
  created_at: string;
  team: Team;
  user_id: User;
  vacation_id: number;
  giver_id: User;
  reason: string;
  vacation_days: number;
}