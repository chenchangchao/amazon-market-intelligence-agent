# Amazon Market Intelligence Agent

An AI Data Agent demo for Amazon market intelligence, product opportunity analysis, and evidence-based market reports.

## Features

- Desensitized Amazon market analytics dashboard
- Market overview, monthly trend, price band, brand concentration, anonymous brand ranking
- Agentic workflow: planner → tool calls → evidence → LLM report
- MCP-style tools list and tool call endpoint
- Public demo without exposing raw ASIN, brand, title, image URL, seller name, or raw detail data

## Architecture

```text
Browser
  ↓
market.chenchangchao.com
  ↓
AWS Nginx
  ↓
AWS Next.js Dashboard :3100
  ↓ SSR fetch
AWS 127.0.0.1:8092
  ↓ Reverse SSH Tunnel
Tencent Cloud market-api :8091
  ↓
Tencent Cloud PostgreSQL
```

## Apps
apps/dashboard   Next.js dashboard deployed on AWS
apps/market-api  Bun/Hono API deployed on Tencent Cloud
Agent Tools
get_market_overview
get_market_trend
get_price_band
get_concentration_summary
get_brand_ranking
Data Boundary

The public demo only exposes desensitized and aggregated results. It does not expose raw ASIN, real brand names, product titles, image URLs, seller names, or raw review/detail data.

Demo Questions
查询美国站 video_doorbell 的品牌集中度 CR3、CR5、CR10。
分析美国站 video_doorbell 还有没有市场机会？
对比 CA 站和 US 站 video_doorbell 哪个更适合新品进入？
分析 dash_cam 在 DE 站的价格带机会。

