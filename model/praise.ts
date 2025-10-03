import {Team} from "@/model/team";
import {User} from "@/model/user";

export type Praise = {
  id: string;
  created_at: string;
  praise_from: User;
  praise_to: User;
  title: string;
  content: string;
  team: Team;
}