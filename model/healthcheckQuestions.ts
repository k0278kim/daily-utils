import {Team} from "@/model/team";

export type HealthcheckQuestions = {
  id: number;
  questions: string[];
  team: Team;
}