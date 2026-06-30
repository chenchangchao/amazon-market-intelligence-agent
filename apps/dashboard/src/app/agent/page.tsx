import { Suspense } from "react";
import AgentClientPage from "./AgentClientPage";

export default function AgentPage() {
  return (
    <Suspense fallback={<AgentLoading />}>
      <AgentClientPage />
    </Suspense>
  );
}

function AgentLoading() {
  return (
    <main className="page">
      <section className="card">
        <h2>Loading Agent...</h2>
        <p>正在加载 Market Agent 页面。</p>
      </section>
    </main>
  );
}
