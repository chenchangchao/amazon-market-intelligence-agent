module.exports = {
  apps: [
    {
      name: "market-dashboard",
      cwd: "/home/ubuntu/apps/market-dashboard",
      script: "bun",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
        NEXT_PUBLIC_MARKET_API_BASE_URL: "https://api-market.chenchangchao.com",
        MARKET_API_INTERNAL_BASE_URL: "http://127.0.0.1:8092",
        MARKET_API_INTERNAL_HOST: "api-market.chenchangchao.com"
      }
    }
  ]
};
