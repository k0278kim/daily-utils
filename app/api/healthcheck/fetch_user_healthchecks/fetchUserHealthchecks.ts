async function fetchTeamHealthchecks(teamName: string, userId: string, startDate: string, endDate: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/healthcheck/fetch_user_healthchecks?team_name=${teamName}&user_id=${userId}&start_date=${startDate}&end_date=${endDate}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  return await res.json();
}

export default fetchTeamHealthchecks;