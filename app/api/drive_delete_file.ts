export async function driveDeleteFile(fileId: string) {
  const res = await fetch("/api/drive/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileId: fileId, // 업로드할 공유드라이브 폴더 ID
    }),
  });

  const data = await res.json();
  console.log("업로드 완료:", data);
}