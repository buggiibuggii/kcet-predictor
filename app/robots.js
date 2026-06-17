export default function robots() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://kcetpredictor.com'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/auth'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
