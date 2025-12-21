async function fetchVacationAdded(userId: string) {
  const res = await fetch(`/api/vacation/fetch_vacation_added?user_id=${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();

  return result;
}

export default fetchVacationAdded;