import { z } from "zod";
import { query } from "../lib/db";

export const MarketFilterSchema = z.object({
  marketplace: z.string().optional(),
  product_line: z.string().optional(),
});

export const BrandRankingSchema = MarketFilterSchema.extend({
  stat_month: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

function buildFilter(args: { marketplace?: string; product_line?: string }, startIndex = 1) {
  const where: string[] = [];
  const params: any[] = [];
  let i = startIndex;

  if (args.marketplace) {
    where.push(`marketplace = $${i++}`);
    params.push(args.marketplace);
  }

  if (args.product_line) {
    where.push(`product_line = $${i++}`);
    params.push(args.product_line);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
    nextIndex: i,
  };
}

export async function getMarketMeta() {
  const marketplaces = await query<{ marketplace: string }>(`
    SELECT DISTINCT marketplace
    FROM public.amazon_market_overview_safe
    ORDER BY marketplace
  `);

  const productLines = await query<{ product_line: string }>(`
    SELECT DISTINCT product_line
    FROM public.amazon_market_overview_safe
    ORDER BY product_line
  `);

  const months = await query<{ first_month: string; last_month: string }>(`
    SELECT MIN(first_month) AS first_month, MAX(last_month) AS last_month
    FROM public.amazon_market_overview_safe
  `);

  return {
    marketplaces: marketplaces.rows.map((r) => r.marketplace),
    product_lines: productLines.rows.map((r) => r.product_line),
    first_month: months.rows[0]?.first_month ?? null,
    last_month: months.rows[0]?.last_month ?? null,
    data_note: process.env.PUBLIC_DATA_NOTE,
  };
}

export async function getMarketOverview(args: z.infer<typeof MarketFilterSchema>) {
  const parsed = MarketFilterSchema.parse(args);
  const { whereSql, params } = buildFilter(parsed);

  return query(
    `
    SELECT
      marketplace,
      product_line,
      first_month,
      last_month,
      asin_count,
      parent_count,
      brand_count,
      deal_amt,
      deal_cnt,
      avg_price,
      avg_profit,
      avg_rating,
      avg_ratings
    FROM public.amazon_market_overview_safe
    ${whereSql}
    ORDER BY deal_amt DESC
    `,
    params
  );
}

export async function getMarketTrend(args: z.infer<typeof MarketFilterSchema>) {
  const parsed = MarketFilterSchema.parse(args);
  const { whereSql, params } = buildFilter(parsed);

  return query(
    `
    SELECT
      marketplace,
      product_line,
      stat_month,
      brand_count,
      deal_amt,
      deal_cnt
    FROM public.amazon_market_monthly_trend_safe
    ${whereSql}
    ORDER BY marketplace, product_line, stat_month
    `,
    params
  );
}

export async function getPriceBand(args: z.infer<typeof MarketFilterSchema>) {
  const parsed = MarketFilterSchema.parse(args);
  const { whereSql, params } = buildFilter(parsed);

  return query(
    `
    SELECT
      marketplace,
      product_line,
      price_band,
      item_count,
      brand_count,
      deal_amt,
      deal_cnt,
      avg_price,
      avg_profit,
      avg_rating,
      avg_ratings
    FROM public.amazon_market_price_band_safe
    ${whereSql}
    ORDER BY
      marketplace,
      product_line,
      CASE price_band
        WHEN '0-30' THEN 1
        WHEN '30-60' THEN 2
        WHEN '60-100' THEN 3
        WHEN '100-200' THEN 4
        WHEN '200+' THEN 5
        ELSE 9
      END
    `,
    params
  );
}

export async function getConcentrationSummary(args: z.infer<typeof MarketFilterSchema>) {
  const parsed = MarketFilterSchema.parse(args);
  const { whereSql, params } = buildFilter(parsed);

  return query(
    `
    SELECT
      marketplace,
      product_line,
      cr3_pct,
      cr5_pct,
      cr10_pct
    FROM public.amazon_market_concentration_summary_safe
    ${whereSql}
    ORDER BY marketplace, product_line
    `,
    params
  );
}

export async function getBrandRanking(args: z.infer<typeof BrandRankingSchema>) {
  const parsed = BrandRankingSchema.parse(args);

  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (parsed.marketplace) {
    where.push(`marketplace = $${i++}`);
    params.push(parsed.marketplace);
  }

  if (parsed.product_line) {
    where.push(`product_line = $${i++}`);
    params.push(parsed.product_line);
  }

  if (parsed.stat_month) {
    where.push(`stat_month = $${i++}`);
    params.push(parsed.stat_month);
  }

  params.push(parsed.limit);

  return query(
    `
    SELECT
      marketplace,
      product_line,
      stat_month,
      brand_alias,
      brand_rank,
      deal_amt,
      deal_cnt
    FROM public.amazon_market_brand_monthly_safe
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY marketplace, product_line, stat_month, brand_rank
    LIMIT $${i}
    `,
    params
  );
}

export const marketToolSchemas = [
  {
    name: "get_market_meta",
    description: "获取 Amazon 市场数据支持的站点、产品线和月份范围。",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_market_overview",
    description: "查询市场总览，包括销售额、销量、品牌数、均价、评分等。",
    parameters: {
      type: "object",
      properties: {
        marketplace: { type: "string", description: "Amazon 站点，例如 US、DE、UK、CA、FR、IT、ES" },
        product_line: { type: "string", description: "产品线，例如 dash_cam、ipc、video_doorbell" },
      },
      required: [],
    },
  },
  {
    name: "get_market_trend",
    description: "查询月度销售额、销量和品牌数趋势。",
    parameters: {
      type: "object",
      properties: {
        marketplace: { type: "string" },
        product_line: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "get_price_band",
    description: "查询价格带表现，包括销售额、销量、均价、利润率、评分等。",
    parameters: {
      type: "object",
      properties: {
        marketplace: { type: "string" },
        product_line: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "get_concentration_summary",
    description: "查询品牌集中度 CR3、CR5、CR10。",
    parameters: {
      type: "object",
      properties: {
        marketplace: { type: "string" },
        product_line: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "get_brand_ranking",
    description: "查询匿名品牌月度销售额和销量排名。",
    parameters: {
      type: "object",
      properties: {
        marketplace: { type: "string" },
        product_line: { type: "string" },
        stat_month: { type: "string", description: "统计月份，例如 202605" },
        limit: { type: "number", description: "返回数量，默认 20，最大 100" },
      },
      required: [],
    },
  },
];

export async function callMarketTool(name: string, args: any = {}) {
  switch (name) {
    case "get_market_meta":
      return { rows: [await getMarketMeta()], rowCount: 1, latency_ms: 0 };
    case "get_market_overview":
      return getMarketOverview(args);
    case "get_market_trend":
      return getMarketTrend(args);
    case "get_price_band":
      return getPriceBand(args);
    case "get_concentration_summary":
      return getConcentrationSummary(args);
    case "get_brand_ranking":
      return getBrandRanking(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
