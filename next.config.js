/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      // Add Supabase storage domain here
      // e.g., 'your-project.supabase.co'
    ],
  },
  experimental: {
    // Enable Server Actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Redirect trailing slashes
  trailingSlash: false,
}

module.exports = nextConfig
