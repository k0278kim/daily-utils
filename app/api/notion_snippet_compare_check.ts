async function fetchNotionSnippetCompareCheck(date: null | string) {
  const res = await fetch("http://127.0.0.1:8000/fetch_notion_snippet_compare_check?date=" + date, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();
  console.log("서버 응답:", result);

  return result;
}

export default fetchNotionSnippetCompareCheck;