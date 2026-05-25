/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
