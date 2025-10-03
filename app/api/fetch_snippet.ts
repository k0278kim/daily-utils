async function fetchSnippet(dateFrom: string, dateTo: string) {
  const data = await fetch("https://n8n.1000.school/webhook/ae38a67a-6dbd-4404-8a54-74c565b1868e?api_id="+process.env.NEXT_PUBLIC_SNIPPET_API_ID as string + "&date_from=" + dateFrom + "&date_to=" + dateTo, {
    method: "GET",
  })
  return (await data.json())[0].snippets;
}

export default fetchSnippet;