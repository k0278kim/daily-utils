async function addSnippet(email: string, date: string, content: string) {
  console.log("addSnippet");
  const data = {
    user_email: email,
    snippet_date: date,
    content: content
  };
  const res = await fetch("https://notion-daily.onrender.com/add_snippet", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  console.log("서버 응답:", result);

  return result;
}

export default addSnippet;