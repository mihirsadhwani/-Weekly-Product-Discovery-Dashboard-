/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.flixcart.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.flipkart.com', pathname: '/**' },
    ],
    unoptimized: true,
  },
}

export default nextConfig
