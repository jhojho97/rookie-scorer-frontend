/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // firebase-admin is server-only; keep it out of the client bundle.
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
