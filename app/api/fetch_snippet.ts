async function fetchSnippet(dateFrom: string, dateTo: string) {
  const res = await fetch("https://notion-daily.onrender.com/fetch_snippet?date_from=" + dateFrom + "&date_to=" + dateTo, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  return await res.json();
}

export default fetchSnippet;