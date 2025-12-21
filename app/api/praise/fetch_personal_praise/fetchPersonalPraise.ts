async function fetchPersonalPraise(uuid: string) {
  const res = await fetch("/api/praise/fetch_personal_praise?uuid=" + uuid, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();
  console.log("서버 응답:", result);

  return result;
}

export default fetchPersonalPraise;