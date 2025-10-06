export async function driveGetFile(accessToken: string | undefined, fileId: string) {
  if (accessToken) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return await res.text();
  }
  return "";
}