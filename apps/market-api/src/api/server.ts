import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  callMarketTool,
  getMarketMeta,
  marketToolSchemas,
} from "../tools/marketTools";
import { runMarketAgent } from "../agent/marketAgent";

const app = new Hono();

app.use("*", cors());

function q(c: any, name: string) {
  const v = c.req.query(name);
  return v && v !== "all" ? v : undefined;
}

app.get("/health", async (c) => {
  return c.json({
    status: "ok",
    service: "amazon-market-intelligence-api",
    time: new Date().toISOString(),
  });
});

app.get("/api/market/meta", async (c) => {
  return c.json(await getMarketMeta());
});

app.get("/api/market/overview", async (c) => {
  const result = await callMarketTool("get_market_overview", {
    marketplace: q(c, "marketplace"),
    product_line: q(c, "product_line"),
  });

  return c.json({
    count: result.rowCount,
    latency_ms: result.latency_ms,
    data: result.rows,
  });
});

app.get("/api/market/trend", async (c) => {
  const result = await callMarketTool("get_market_trend", {
    marketplace: q(c, "marketplace"),
    product_line: q(c, "product_line"),
  });

  return c.json({
    count: result.rowCount,
    latency_ms: result.latency_ms,
    data: result.rows,
  });
});

app.get("/api/market/price-band", async (c) => {
  const result = await callMarketTool("get_price_band", {
    marketplace: q(c, "marketplace"),
    product_line: q(c, "product_line"),
  });

  return c.json({
    count: result.rowCount,
    latency_ms: result.latency_ms,
    data: result.rows,
  });
});

app.get("/api/market/concentration", async (c) => {
  const result = await callMarketTool("get_concentration_summary", {
    marketplace: q(c, "marketplace"),
    product_line: q(c, "product_line"),
  });

  return c.json({
    count: result.rowCount,
    latency_ms: result.latency_ms,
    data: result.rows,
  });
});

app.get("/api/market/brand-ranking", async (c) => {
  const limit = Number(c.req.query("limit") || 20);

  const result = await callMarketTool("get_brand_ranking", {
    marketplace: q(c, "marketplace"),
    product_line: q(c, "product_line"),
    stat_month: q(c, "stat_month"),
    limit,
  });

  return c.json({
    count: result.rowCount,
    latency_ms: result.latency_ms,
    data: result.rows,
  });
});

app.post("/api/agent/market-report", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.question || typeof body.question !== "string") {
      return c.json(
        {
          error: "bad_request",
          message: "question is required",
        },
        400
      );
    }

    const result = await runMarketAgent({
      question: body.question,
      marketplace: body.marketplace,
      product_line: body.product_line || body.productLine,
    });

    return c.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: "market_agent_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
app.get("/api/market/disclaimer", async (c) => {
  return c.json({
    title: "数据安全与脱敏说明",
    items: [
      "公网 Demo 仅展示脱敏聚合样例数据。",
      "不展示真实 ASIN、真实品牌、商品标题、图片链接、品牌 URL、卖家名称或原始明细。",
      "品牌统一以 Brand 001、Brand 002 等匿名方式展示。",
      "深度查询和数据下载由私有数据服务提供，可能需要更长响应时间和权限控制。",
      "报告内容由 Agent 基于结构化 evidence 生成，仅供业务讨论和技术演示使用。"
    ]
  });
});

app.get("/api/mcp/tools/list", async (c) => {
  return c.json({
    tools: marketToolSchemas,
    note: "MCP-style tool list endpoint for demo. Tools are also compatible with Function Calling style schema.",
  });
});

app.post("/api/mcp/tools/call", async (c) => {
  try {
    const body = await c.req.json();
    const name = body.name || body.tool;
    const args = body.arguments || body.args || {};

    if (!name) {
      return c.json(
        {
          ok: false,
          error: "bad_request",
          message: "tool name is required",
        },
        400
      );
    }

    const result = await callMarketTool(name, args);

    return c.json({
      ok: true,
      tool: name,
      args,
      count: result.rowCount,
      latency_ms: result.latency_ms,
      data: result.rows,
    });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: "tool_call_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

const port = Number(process.env.PORT || 8091);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Amazon Market Intelligence API running on http://127.0.0.1:${port}`);
