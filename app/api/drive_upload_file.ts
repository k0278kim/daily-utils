export async function driveUploadFile(folderId: string, name: string, content: string) {
  const res = await fetch("/api/drive/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folderId: folderId, // 업로드할 공유드라이브 폴더 ID
      name: name,
      content: content,
    }),
  });

  const data = await res.json();
  console.log("업로드 완료:", data);
}