export function fileToBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 1. 파일을 Base64 데이터 URL로 읽기 시작
    reader.readAsDataURL(file);

    // 2. 읽기가 성공적으로 완료되면
    reader.onload = () => {
      resolve(reader.result); // reader.result에 Base64 문자열이 담겨 있음
    };

    // 3. 읽기 실패 시
    reader.onerror = (error) => {
      reject(error);
    };
  });
}