/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost", "res.cloudinary.com"],
    formats: ["image/webp", "image/avif"],
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@prisma/client", "bcryptjs"],
  },
};

module.exports = nextConfig;
