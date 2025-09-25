'use client'

import {useEffect, useState} from "react";

const DashboardPage = () => {

  const [snippets, setSnippets] = useState(null);

  useEffect(() => {
    fetch("https://notion-daily.onrender.com/fetch_snippet?date_from=2025-09-22&date_to=2025-09-22")
      .then((res) => res.json())
      .then((json) => setSnippets(json))
      .catch((err) => console.error(err));
  }, []);

  return <div className={""}>
    <div className={""}>{JSON.stringify(snippets, null, 2)}</div>
  </div>
}

export default DashboardPage;