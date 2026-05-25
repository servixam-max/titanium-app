/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  basePath: '/titanium',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;