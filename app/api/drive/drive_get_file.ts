export async function driveGetFile(folderId: string) {
  const res = await fetch("/api/drive/" + folderId, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await res.json();
}