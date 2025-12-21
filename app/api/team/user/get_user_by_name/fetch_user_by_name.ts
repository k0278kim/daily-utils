async function fetchUserByName(userName: string, teamName: string) {
  const res = await fetch(`/api/team/user/get_user_by_name?user_name=${userName}&team_name=${teamName}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();
  console.log("서버 응답:", result);

  return result;
}

export default fetchUserByName;