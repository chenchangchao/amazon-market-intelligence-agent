export async function callDeepSeek(prompt: string) {
  const apiKey = process.env.DEEPSEEK_API || process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    throw new Error("DEEPSEEK_API or DEEPSEEK_API_KEY is required");
  }

  const start = Date.now();

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个面向 Amazon 市场分析、跨境电商选品、AI Agent 和数据产品的专业分析助手。回答必须基于给定 evidence，不要编造真实品牌、ASIN、商品标题或卖家信息。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.25,
      max_tokens: 3500,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`DeepSeek request failed: ${res.status} ${text.slice(0, 1000)}`);
  }

  const data = JSON.parse(text);

  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage || null,
    latency_ms: Date.now() - start,
  };
}
