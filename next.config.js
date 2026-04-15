module.exports = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  experimental: { serverActions: { bodySizeLimit: '10mb' } }
}
