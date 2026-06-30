"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { runMarketAgent } from "@/lib/market-api";
import { marked } from "marked";

const EXAMPLE_QUESTIONS = [
  {
    title: "品牌集中度",
    badge: "单工具问答",
    marketplace: "US",
    product_line: "video_doorbell",
    question: "查询美国站 video_doorbell 的品牌集中度 CR3、CR5、CR10。",
    description: "验证 Planner 是否只调用 get_concentration_summary。",
  },
  {
    title: "市场机会分析",
    badge: "完整报告",
    marketplace: "US",
    product_line: "video_doorbell",
    question: "分析美国站 video_doorbell 还有没有市场机会？",
    description: "调用总览、趋势、价格带、集中度、品牌排名，生成完整机会报告。",
  },
  {
    title: "跨市场对比",
    badge: "对比分析",
    marketplace: "CA",
    product_line: "video_doorbell",
    question: "对比 CA 站和 US 站 video_doorbell 哪个更适合新品进入？",
    description: "展示跨站点机会判断，后续可升级为 multi-market planner。",
  },
  {
    title: "价格带机会",
    badge: "单工具问答",
    marketplace: "DE",
    product_line: "dash_cam",
    question: "分析 dash_cam 在 DE 站的价格带机会。",
    description: "验证 Planner 是否聚焦 get_price_band。",
  },
];

export default function AgentClientPage() {
  const searchParams = useSearchParams();
  const initialMarketplace = searchParams.get("marketplace") || "US";
  const initialProductLine = searchParams.get("product_line") || "video_doorbell";

  const [marketplace, setMarketplace] = useState(initialMarketplace);
  const [productLine, setProductLine] = useState(initialProductLine);
  const [question, setQuestion] = useState(
    `分析${initialMarketplace}站 ${initialProductLine} 还有没有市场机会？`
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const reportHtml = useMemo(() => {
    const report = result?.report || "";
    return marked.parse(report, {
      async: false,
      breaks: true,
      gfm: true,
    }) as string;
  }, [result]);

  function applyExample(example: (typeof EXAMPLE_QUESTIONS)[number]) {
    setMarketplace(example.marketplace);
    setProductLine(example.product_line);
    setQuestion(example.question);
    setResult(null);
    setError("");
  }

  async function submit() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await runMarketAgent({
        question,
        marketplace,
        product_line: productLine,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const isQuickQuestion =
    question.includes("CR3") ||
    question.includes("CR5") ||
    question.includes("CR10") ||
    question.includes("集中度") ||
    question.includes("品牌集中") ||
    question.includes("价格带") ||
    question.includes("品牌排名") ||
    question.includes("趋势");

  return (
    <main className="page">
      <nav className="nav">
        <Link href="/" className="logo">
          <span className="logo-title">Amazon Market Intelligence Agent</span>
          <span className="logo-subtitle">Agent Trace · Tool Calls · Evidence</span>
        </Link>

        <div className="nav-links">
          <Link className="nav-link" href="/">
            Dashboard
          </Link>
          <Link className="nav-link" href="/agent">
            Agent
          </Link>
          <a
            className="nav-link"
            href="https://api-market.chenchangchao.com/api/mcp/tools/list"
            target="_blank"
          >
            MCP Tools
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-card">
          <div className="badge">Planner → Tools → Evidence → Report</div>
          <h1>Ask Market Agent</h1>
          <p className="hero-text">
            输入市场问题，Agent 会根据问题意图选择工具，调用市场总览、趋势、价格带、
            集中度、品牌排名等能力，并基于脱敏聚合 evidence 生成分析结果。
          </p>

          <div className="controls">
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
            >
              {["US", "DE", "UK", "CA", "FR", "IT", "ES"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={productLine}
              onChange={(e) => setProductLine(e.target.value)}
            >
              {["video_doorbell", "dash_cam", "ipc"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <div className="controls">
            <button onClick={submit} disabled={loading}>
              {loading
                ? "Agent Running..."
                : isQuickQuestion
                  ? "Ask Agent"
                  : "Generate Market Report"}
            </button>
          </div>

          {error ? <div className="notice">{error}</div> : null}
        </div>

        <div className="card">
          <h2>How it works</h2>
          <p>
            这一页用于展示 Agent 工程化链路：问题解析、工具规划、Function
            Calling、证据汇总、LLM 报告生成和 Trace 可观测性。
          </p>
          <div className="notice">
            报告基于脱敏聚合数据生成，不展示真实 ASIN、真实品牌、商品标题、图片链接或卖家信息。
          </div>
        </div>
      </section>

      <section className="card section">
        <div className="section-title-row">
          <div>
            <h2>Example Questions</h2>
            <p className="muted">
              点击下面的典型问题，可以快速演示单工具问答、完整市场报告、跨市场对比和价格带机会分析。
            </p>
          </div>
        </div>

        <div className="example-grid">
          {EXAMPLE_QUESTIONS.map((item) => (
            <button
              key={item.question}
              type="button"
              className="example-card"
              onClick={() => applyExample(item)}
            >
              <div className="example-card-top">
                <span className="example-title">{item.title}</span>
                <span className="example-badge">{item.badge}</span>
              </div>
              <p className="example-question">{item.question}</p>
              <p className="example-desc">{item.description}</p>
              <div className="example-meta">
                {item.marketplace} · {item.product_line}
              </div>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="card section">
          <h2>Agent is working...</h2>
          <p>
            正在调用工具并生成报告。DeepSeek 报告生成通常需要 20-40 秒，请稍等。
          </p>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="grid grid-2 section">
            <div className="card">
              <h2>Agent Plan</h2>
              <div className="grid">
                {result.plan?.map((p: any, idx: number) => (
                  <div className="trace-item" key={`${p.step || idx}-${p.tool}`}>
                    <strong>
                      Step {p.step ?? idx + 1}: {p.tool || p.name}
                    </strong>
                    <p>{p.reason || p.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>Tool Calls</h2>
              <div className="grid">
                {result.tool_calls?.map((t: any, idx: number) => (
                  <div className="trace-item" key={`${t.tool}-${idx}`}>
                    <strong>{t.tool}</strong>
                    <p>
                      rows: {t.rows} · latency: {t.latency_ms}ms · status:{" "}
                      {t.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card section">
            <h2>Final Report</h2>
            <article
              className="markdown-report"
              dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
          </section>

          <section className="card section">
            <h2>Evidence JSON Preview</h2>
            <pre className="code">
              {JSON.stringify(result.evidence, null, 2)}
            </pre>
          </section>

          <section className="card section">
            <h2>Token & Latency</h2>
            <div className="grid grid-3">
              <div className="metric">
                <div className="metric-label">Prompt Tokens</div>
                <div className="metric-value">
                  {result.usage?.prompt_tokens ?? "-"}
                </div>
              </div>
              <div className="metric">
                <div className="metric-label">Completion Tokens</div>
                <div className="metric-value">
                  {result.usage?.completion_tokens ?? "-"}
                </div>
              </div>
              <div className="metric">
                <div className="metric-label">LLM Latency</div>
                <div className="metric-value">
                  {result.llm_latency_ms
                    ? `${(result.llm_latency_ms / 1000).toFixed(1)}s`
                    : "-"}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
