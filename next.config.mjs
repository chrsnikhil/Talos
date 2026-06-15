/** @type {import('next').NextConfig} */
const nextConfig = {
  // StPageFlip initializes itself in an effect; StrictMode's double-invoke in dev
  // re-inits it and corrupts its layout. Disable to keep the flip-book stable.
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
