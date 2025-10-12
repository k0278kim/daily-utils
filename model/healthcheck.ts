import {Team} from "@/model/team";
import {User} from "@/model/user";
import {HealthcheckQuestions} from "@/model/healthcheckQuestions";

export type Healthcheck = {
  id: number;
  created_at: string;
  created_user: User;
  responses: HealthcheckResponse[];
  questions: string[];
  team: Team;
  date: string;
}

export type HealthcheckResponse = {
  question: string;
  answer: string;
  score: number;
}