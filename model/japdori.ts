import {Team} from "@/model/team";
import {User} from "@/model/user";

export type Japdori = {
  id: string;
  created_at: string;
  japdori_from: User;
  japdori_to: User;
  title: string;
  content: string;
  team: Team;
}