import {Snippet} from "next/dist/compiled/@next/font/dist/google";

async function fetchNotionSnippet(date: null | string) {
  const res = await fetch("https://notion-daily.onrender.com/fetch_notion_snippet?date=" + date, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();
  console.log("서버 응답:", result);

  return result;
}

export default fetchNotionSnippet;