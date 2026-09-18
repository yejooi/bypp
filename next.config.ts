import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 폰 등 같은 와이파이의 다른 기기에서 dev 서버에 접속할 때 Next 16이 막지 않도록 허용한다.
  allowedDevOrigins: ["10.121.162.128", "10.*.*.*", "192.168.*.*", "172.16.*.*", "*.local"],
};

export default nextConfig;
