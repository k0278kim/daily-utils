async function fetchTeamHealthchecks(teamName: string, startDate: string, endDate: string) {
  const res = await fetch(`api/healthcheck/fetch_team_healthchecks?team_name=${teamName}&start_date=${startDate}&end_date=${endDate}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  return await res.json();
}

export default fetchTeamHealthchecks;