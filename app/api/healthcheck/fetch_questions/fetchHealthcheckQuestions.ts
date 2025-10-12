import {HealthcheckQuestions} from "@/model/healthcheckQuestions";

async function fetchHealthcheckQuestions(teamName: string, id?: number) {
  const res = await fetch("api/healthcheck/fetch_questions?team_name=" + teamName, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string, },
  });
  const result = await res.json();

  console.log(result);

  if (result.length == 1) {
    console.log("서버 응답:", result[0]);
    return result[0];
  } else if (result.length > 1 && id) {
    console.log("서버 응답:", result);
    return result.filter((item: HealthcheckQuestions) => item.id === id)[0];
  } else {
    return new Error("헬스체크 질문이 없어요.");
  }
}

export default fetchHealthcheckQuestions;