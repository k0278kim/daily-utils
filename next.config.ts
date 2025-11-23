import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cidvmndhyobkxulbgztr.supabase.co', // 에러에 뜬 호스트네임
        port: '',
        pathname: '/storage/v1/object/public/**', // 스토리지 경로 허용
      },
    ],
  },
};

export default nextConfig;
