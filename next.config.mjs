/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure data dir works in standalone-ish deploys; API uses process.cwd()/data
  experimental: {},
};

export default nextConfig;
