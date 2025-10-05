export async function addSnippet(email: string, date: string, content: string) {
  const data = {
    user_email: email,
    snippet_date: date,
    content: content
  };
  const res = await fetch("/api/snippet/add_snippet", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
    body: JSON.stringify(data)
  });

  return await res.json();
}