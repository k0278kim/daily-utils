export type Team = {
  id: string,
  created_at: Date,
  session: number,
  name: string,
  is_active: boolean,
  admin: string,
  healthcheck_id: number,
}