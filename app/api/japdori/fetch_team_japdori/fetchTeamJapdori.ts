async function fetchTeamJapdori(teamName: string) {
  const res = await fetch("/api/japdori/fetch_team_japdori?team_name=" + teamName, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();
  console.log("서버 응답:", result);

  return result;
}

export default fetchTeamJapdori;