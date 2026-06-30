const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_MARKET_API_BASE_URL ||
  "https://api-market.chenchangchao.com";

const SERVER_API_BASE =
  process.env.MARKET_API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_MARKET_API_BASE_URL ||
  "https://api-market.chenchangchao.com";

function apiBase() {
  // Server Component / Node.js SSR 阶段走内部地址，避免 Cloudflare 525
  if (typeof window === "undefined") {
    return SERVER_API_BASE.replace(/\/$/, "");
  }

  // 浏览器端走公网 HTTPS
  return PUBLIC_API_BASE.replace(/\/$/, "");
}

export type MarketFilter = {
  marketplace?: string;
  product_line?: string;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      sp.set(key, String(value));
    }
  }

  const query = sp.toString();
  return query ? `?${query}` : "";
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${apiBase()}${path}`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API request failed: ${res.status} ${path} ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${apiBase()}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API request failed: ${res.status} ${text.slice(0, 500)}`);
  }

  return res.json();
}

export async function getMeta() {
  return getJson<{
    marketplaces: string[];
    product_lines: string[];
    first_month: string;
    last_month: string;
    data_note: string;
  }>("/api/market/meta");
}

export async function getOverview(filter: MarketFilter = {}) {
  return getJson<{
    count: number;
    latency_ms: number;
    data: any[];
  }>(
    `/api/market/overview${buildQuery({
      marketplace: filter.marketplace,
      product_line: filter.product_line,
    })}`
  );
}

export async function getTrend(filter: MarketFilter = {}) {
  return getJson<{
    count: number;
    latency_ms: number;
    data: any[];
  }>(
    `/api/market/trend${buildQuery({
      marketplace: filter.marketplace,
      product_line: filter.product_line,
    })}`
  );
}

export async function getPriceBand(filter: MarketFilter = {}) {
  return getJson<{
    count: number;
    latency_ms: number;
    data: any[];
  }>(
    `/api/market/price-band${buildQuery({
      marketplace: filter.marketplace,
      product_line: filter.product_line,
    })}`
  );
}

export async function getConcentration(filter: MarketFilter = {}) {
  return getJson<{
    count: number;
    latency_ms: number;
    data: any[];
  }>(
    `/api/market/concentration${buildQuery({
      marketplace: filter.marketplace,
      product_line: filter.product_line,
    })}`
  );
}

export async function getBrandRanking(
  filter: MarketFilter & { stat_month?: string; limit?: number } = {}
) {
  return getJson<{
    count: number;
    latency_ms: number;
    data: any[];
  }>(
    `/api/market/brand-ranking${buildQuery({
      marketplace: filter.marketplace,
      product_line: filter.product_line,
      stat_month: filter.stat_month,
      limit: filter.limit ?? 10,
    })}`
  );
}

export async function runMarketAgent(input: {
  question: string;
  marketplace?: string;
  product_line?: string;
}) {
  return postJson<any>("/api/agent/market-report", input);
}

export function formatMoney(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";

  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;

  return `$${n.toFixed(2)}`;
}

export function formatNumber(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";

  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;

  return n.toLocaleString();
}
