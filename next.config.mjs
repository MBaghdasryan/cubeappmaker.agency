const config = {
  output: "standalone",
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { cpus: 2 },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
    ] }];
  },
};
export default config;
