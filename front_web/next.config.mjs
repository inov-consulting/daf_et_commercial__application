/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'storage.manage.inov-consulting.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.manage.inov-consulting.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
