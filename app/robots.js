export default function robots() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kcetpredictor.in'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/auth'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
