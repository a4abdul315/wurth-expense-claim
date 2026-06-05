/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Netlify deployment
  output: "standalone",

  // Allow images from any source (receipt uploads use blob: URLs)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
