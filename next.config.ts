import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["oracledb", "typeorm"],
};

export default nextConfig;