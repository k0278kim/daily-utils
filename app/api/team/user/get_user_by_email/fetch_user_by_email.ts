async function fetchUserByEmail(email: string) {
  const res = await fetch(`api/team/user/get_user_by_email?email=${email}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();

  return result;
}

export default fetchUserByEmail;