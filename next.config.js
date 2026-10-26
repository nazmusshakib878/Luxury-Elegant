/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pg'],
  reactStrictMode: false,
};

module.exports = nextConfig;
