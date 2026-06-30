import Link from "next/link";
import {
  formatMoney,
  formatNumber,
  getBrandRanking,
  getConcentration,
  getMeta,
  getOverview,
  getPriceBand,
  getTrend,
} from "@/lib/market-api";

type PageProps = {
  searchParams?: Promise<{
    marketplace?: string;
    product_line?: string;
  }>;
};

function pct(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(1)}%`;
}

function maxOf(rows: any[], key: string) {
  return Math.max(...rows.map((r) => Number(r[key]) || 0), 1);
}

export default async function Home({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  const marketplace = sp.marketplace || "US";
  const product_line = sp.product_line || "video_doorbell";

  const [meta, overviewRes, trendRes, priceBandRes, concentrationRes, brandRes] =
    await Promise.all([
      getMeta(),
      getOverview({ marketplace, product_line }),
      getTrend({ marketplace, product_line }),
      getPriceBand({ marketplace, product_line }),
      getConcentration({ marketplace, product_line }),
      getBrandRanking({
        marketplace,
        product_line,
        stat_month: metaLastMonthFallback(),
        limit: 10,
      }).catch(() =>
        getBrandRanking({
          marketplace,
          product_line,
          limit: 10,
        })
      ),
    ]);

  function metaLastMonthFallback() {
    return undefined;
  }

  const overview = overviewRes.data[0] || {};
  const trend = trendRes.data.slice(-12);
  const priceBand = priceBandRes.data;
  const concentration = concentrationRes.data[0] || {};
  const brands = brandRes.data;

  const trendMax = maxOf(trend, "deal_amt");
  const priceMax = maxOf(priceBand, "deal_amt");
  const brandMax = maxOf(brands, "deal_amt");

  return (
    <main className="page">
      <nav className="nav">
        <Link href="/" className="logo">
          <span className="logo-title">Amazon Market Intelligence Agent</span>
          <span className="logo-subtitle">
            AI Data Agent Lab · Market SaaS MVP
          </span>
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
          <div className="badge">脱敏聚合数据 · Function Calling · MCP-style Tools</div>
          <h1>Amazon Market Intelligence Agent</h1>
          <p className="hero-text">
            基于脱敏后的 Amazon 市场大盘数据，分析不同站点、产品线、价格带和匿名品牌竞争格局，
            并通过 Agent 生成市场机会报告、GTM 建议和数据证据链。
          </p>

          <form className="controls">
            <select name="marketplace" defaultValue={marketplace}>
              {meta.marketplaces.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select name="product_line" defaultValue={product_line}>
              {meta.product_lines.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <button type="submit">Apply Filter</button>

            <Link
              className="nav-link"
              href={`/agent?marketplace=${marketplace}&product_line=${product_line}`}
            >
              Ask Agent
            </Link>
          </form>
        </div>

        <div className="card">
          <h2>Data Boundary</h2>
          <p>{meta.data_note}</p>
          <div className="notice">
            公网 Demo 仅展示聚合结果。真实 ASIN、真实品牌、商品标题、图片链接、
            卖家名称和原始明细均不展示。深度查询可转发到私有数据服务。
          </div>
        </div>
      </section>

      <section className="grid grid-4 section">
        <div className="metric">
          <div className="metric-label">Market Size</div>
          <div className="metric-value">{formatMoney(overview.deal_amt)}</div>
          <div className="metric-note">
            {overview.first_month} - {overview.last_month}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Units</div>
          <div className="metric-value">{formatNumber(overview.deal_cnt)}</div>
          <div className="metric-note">deduped business logic</div>
        </div>

        <div className="metric">
          <div className="metric-label">Anonymous Brands</div>
          <div className="metric-value">{formatNumber(overview.brand_count)}</div>
          <div className="metric-note">Brand 001 / Brand 002 ...</div>
        </div>

        <div className="metric">
          <div className="metric-label">Avg Rating</div>
          <div className="metric-value">
            {Number(overview.avg_rating || 0).toFixed(2)}
          </div>
          <div className="metric-note">
            avg reviews {formatNumber(overview.avg_ratings)}
          </div>
        </div>
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h2>Monthly Trend</h2>
          <div className="bar-list">
            {trend.map((r) => (
              <div className="bar-row" key={`${r.stat_month}`}>
                <div>{r.stat_month}</div>
                <div className="bar-bg">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(
                        2,
                        (Number(r.deal_amt) / trendMax) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div>{formatMoney(r.deal_amt)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Price Band</h2>
          <div className="bar-list">
            {priceBand.map((r) => (
              <div className="bar-row" key={`${r.price_band}`}>
                <div>{r.price_band}</div>
                <div className="bar-bg">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(
                        2,
                        (Number(r.deal_amt) / priceMax) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div>{formatMoney(r.deal_amt)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h2>Brand Concentration</h2>
          <div className="grid grid-3">
            <div className="metric">
              <div className="metric-label">CR3</div>
              <div className="metric-value">{pct(concentration.cr3_pct)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">CR5</div>
              <div className="metric-value">{pct(concentration.cr5_pct)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">CR10</div>
              <div className="metric-value">{pct(concentration.cr10_pct)}</div>
            </div>
          </div>
          <p>
            CR 指标用于评估头部品牌集中度。数值越高，说明市场越接近“头部品牌 + 长尾品牌”的格局。
          </p>
        </div>

        <div className="card">
          <h2>Anonymous Brand Ranking</h2>
          <div className="bar-list">
            {brands.map((r) => (
              <div className="bar-row" key={`${r.brand_alias}-${r.stat_month}`}>
                <div>{r.brand_alias}</div>
                <div className="bar-bg">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(
                        2,
                        (Number(r.deal_amt) / brandMax) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div>{formatMoney(r.deal_amt)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card section">
        <h2>Price Band Detail</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Price Band</th>
                <th>Items</th>
                <th>Brands</th>
                <th>Deal Amt</th>
                <th>Deal Cnt</th>
                <th>Avg Price</th>
                <th>Avg Profit</th>
                <th>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {priceBand.map((r) => (
                <tr key={r.price_band}>
                  <td>{r.price_band}</td>
                  <td>{formatNumber(r.item_count)}</td>
                  <td>{formatNumber(r.brand_count)}</td>
                  <td>{formatMoney(r.deal_amt)}</td>
                  <td>{formatNumber(r.deal_cnt)}</td>
                  <td>{formatMoney(r.avg_price)}</td>
                  <td>{formatMoney(r.avg_profit)}</td>
                  <td>{Number(r.avg_rating || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">
        API: https://api-market.chenchangchao.com · Data: desensitized aggregated
        Amazon market sample · No raw ASIN/brand/title exposed.
      </footer>
    </main>
  );
}
