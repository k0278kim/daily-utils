async function fetchVacationId(teamName: string) {
  const res = await fetch(`/api/vacation/fetch_vacation_id?team_name=${teamName}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();

  return result;
}

export default fetchVacationId;