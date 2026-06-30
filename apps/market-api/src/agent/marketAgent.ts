import { callMarketTool } from "../tools/marketTools";
import { callDeepSeek } from "./deepseek";
import { buildMarketReportPrompt } from "./prompts";

function inferMarketplace(question: string) {
  const q = question.toLowerCase();

  const rules: Array<[string[], string]> = [
    [["美国", "us", "usa"], "US"],
    [["德国", "de", "germany"], "DE"],
    [["英国", "uk"], "UK"],
    [["加拿大", "ca", "canada"], "CA"],
    [["法国", "fr", "france"], "FR"],
    [["意大利", "it", "italy"], "IT"],
    [["西班牙", "es", "spain"], "ES"],
  ];

  for (const [keys, value] of rules) {
    if (keys.some((k) => q.includes(k))) return value;
  }

  return undefined;
}

function inferProductLine(question: string) {
  const q = question.toLowerCase();

  if (q.includes("dash") || q.includes("行车") || q.includes("记录仪")) {
    return "dash_cam";
  }

  if (q.includes("doorbell") || q.includes("门铃")) {
    return "video_doorbell";
  }

  if (
    q.includes("ipc") ||
    q.includes("camera") ||
    q.includes("摄像机") ||
    q.includes("监控")
  ) {
    return "ipc";
  }

  return undefined;
}

function inferIntent(question: string) {
  const q = question.toLowerCase();

  const isConcentration =
    q.includes("cr3") ||
    q.includes("cr5") ||
    q.includes("cr10") ||
    q.includes("集中度") ||
    q.includes("品牌集中") ||
    q.includes("头部集中") ||
    q.includes("concentration");

  const isPriceBand =
    q.includes("价格带") ||
    q.includes("price band") ||
    q.includes("price_band") ||
    q.includes("价格区间");

  const isTrend =
    q.includes("趋势") ||
    q.includes("trend") ||
    q.includes("月度") ||
    q.includes("增长") ||
    q.includes("下滑");

  const isBrandRanking =
    q.includes("品牌排名") ||
    q.includes("brand ranking") ||
    q.includes("top brand") ||
    q.includes("头部品牌") ||
    q.includes("匿名品牌");

  const isOverview =
    q.includes("市场规模") ||
    q.includes("总览") ||
    q.includes("基本盘") ||
    q.includes("overview");

  if (isConcentration && !isPriceBand && !isTrend && !isBrandRanking) {
    return "concentration_only";
  }

  if (isPriceBand && !isConcentration && !isTrend && !isBrandRanking) {
    return "price_band_only";
  }

  if (isTrend && !isConcentration && !isPriceBand && !isBrandRanking) {
    return "trend_only";
  }

  if (isBrandRanking && !isConcentration && !isPriceBand && !isTrend) {
    return "brand_ranking_only";
  }

  if (isOverview && !isConcentration && !isPriceBand && !isTrend && !isBrandRanking) {
    return "overview_only";
  }

  return "full_report";
}

type AgentPlanItem = {
  step: number;
  tool: string;
  reason: string;
  args: Record<string, any>;
};

function buildPlan(intent: string, args: Record<string, any>): AgentPlanItem[] {
  if (intent === "concentration_only") {
    return [
      {
        step: 1,
        tool: "get_concentration_summary",
        reason: "用户只询问品牌集中度，因此只调用 CR3、CR5、CR10 集中度工具。",
        args,
      },
    ];
  }

  if (intent === "price_band_only") {
    return [
      {
        step: 1,
        tool: "get_price_band",
        reason: "用户只询问价格带机会，因此只调用价格带分析工具。",
        args,
      },
    ];
  }

  if (intent === "trend_only") {
    return [
      {
        step: 1,
        tool: "get_market_trend",
        reason: "用户只询问趋势变化，因此只调用月度趋势工具。",
        args,
      },
    ];
  }

  if (intent === "brand_ranking_only") {
    return [
      {
        step: 1,
        tool: "get_brand_ranking",
        reason: "用户只询问品牌排名，因此只调用匿名品牌排名工具。",
        args: {
          ...args,
          limit: 10,
        },
      },
    ];
  }

  if (intent === "overview_only") {
    return [
      {
        step: 1,
        tool: "get_market_overview",
        reason: "用户只询问市场基本盘，因此只调用市场总览工具。",
        args,
      },
    ];
  }

  return [
    {
      step: 1,
      tool: "get_market_overview",
      reason: "获取市场规模、销量、品牌数、价格和评分基本盘。",
      args,
    },
    {
      step: 2,
      tool: "get_market_trend",
      reason: "获取月度销售额和销量趋势。",
      args,
    },
    {
      step: 3,
      tool: "get_price_band",
      reason: "分析不同价格带的机会。",
      args,
    },
    {
      step: 4,
      tool: "get_concentration_summary",
      reason: "分析 CR3、CR5、CR10 品牌集中度。",
      args,
    },
    {
      step: 5,
      tool: "get_brand_ranking",
      reason: "获取匿名品牌排名，判断头部竞争格局。",
      args: {
        ...args,
        limit: 10,
      },
    },
  ];
}

function buildOutputInstruction(intent: string) {
  if (intent === "concentration_only") {
    return `
额外输出要求：
用户只询问品牌集中度。请只输出一个简洁的 CR3/CR5/CR10 分析，不要生成完整市场报告。

输出结构：
## 品牌集中度结论
直接给出 CR3、CR5、CR10 数值和一句话判断。

## 数值解释
解释 CR3、CR5、CR10 分别代表什么，以及当前市场是分散、适中集中，还是高度集中。

## 竞争格局判断
基于 evidence 判断头部品牌控制力、长尾品牌空间和新品牌进入难度。

## 对新进入者的含义
给出 2-4 条简洁建议。

约束：
- 必须基于 evidence。
- 不要编造真实品牌名、真实 ASIN、商品标题、图片链接或卖家信息。
- 品牌只能称为匿名品牌或 Brand 001 这类别名。
`;
  }

  if (intent === "price_band_only") {
    return `
额外输出要求：
用户只询问价格带。请聚焦价格带机会，不要生成完整市场报告。

输出结构：
## 价格带结论
## 各价格带表现
## 机会价格带
## 风险与建议
`;
  }

  if (intent === "trend_only") {
    return `
额外输出要求：
用户只询问趋势。请聚焦月度销售额、销量和品牌数变化，不要生成完整市场报告。

输出结构：
## 趋势结论
## 月度变化
## 增长/下滑判断
## 后续观察点
`;
  }

  if (intent === "brand_ranking_only") {
    return `
额外输出要求：
用户只询问品牌排名。请聚焦匿名品牌排名和头部竞争格局，不要生成完整市场报告。

输出结构：
## 品牌排名结论
## Top 匿名品牌表现
## 头部竞争格局
## 对新进入者的含义
`;
  }

  if (intent === "overview_only") {
    return `
额外输出要求：
用户只询问市场基本盘。请聚焦市场规模、销量、品牌数、均价和评分，不要生成完整市场报告。
`;
  }

  return `
额外输出要求：
请生成完整市场机会分析报告，包括结论摘要、市场概况、趋势判断、价格带机会、竞争格局、风险点和 GTM 建议。
`;
}

export async function runMarketAgent(input: {
  question: string;
  marketplace?: string;
  product_line?: string;
}) {
  const marketplace = input.marketplace || inferMarketplace(input.question);
  const product_line = input.product_line || inferProductLine(input.question);

  const args = {
    marketplace,
    product_line,
  };

  const intent = inferIntent(input.question);
  const plan = buildPlan(intent, args);
  const toolCalls: any[] = [];
  const evidence: Record<string, any> = {};

  async function runTool(name: string, toolArgs: any) {
    const start = Date.now();
    const result = await callMarketTool(name, toolArgs);

    toolCalls.push({
      tool: name,
      args: toolArgs,
      rows: result.rowCount,
      latency_ms: result.latency_ms ?? Date.now() - start,
      status: "success",
    });

    return result.rows;
  }

  for (const item of plan) {
    const rows = await runTool(item.tool, item.args);

    if (item.tool === "get_market_overview") {
      evidence.overview = rows;
    }

    if (item.tool === "get_market_trend") {
      evidence.trend = rows.slice(-12);
    }

    if (item.tool === "get_price_band") {
      evidence.price_band = rows;
    }

    if (item.tool === "get_concentration_summary") {
      evidence.concentration_summary = rows;
    }

    if (item.tool === "get_brand_ranking") {
      evidence.brand_ranking_top10 = rows;
    }
  }

  const basePrompt = buildMarketReportPrompt({
    question: input.question,
    inferred: {
      marketplace,
      product_line,
      intent,
    },
    evidence,
  });

  const prompt = `${basePrompt}

${buildOutputInstruction(intent)}
`;

  const llm = await callDeepSeek(prompt);

  return {
    question: input.question,
    inferred: {
      marketplace: marketplace || null,
      product_line: product_line || null,
      intent,
    },
    plan,
    tool_calls: toolCalls,
    evidence,
    report: llm.content,
    usage: llm.usage,
    llm_latency_ms: llm.latency_ms,
    data_note: process.env.PUBLIC_DATA_NOTE,
  };
}
