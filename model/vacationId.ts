import {Team} from "@/model/team";

export type VacationId = {
  id: number;
  team: Team;
  created_at: string;
  enabled: boolean;
  title: string;
  description: string;
  initial_days: number;
}