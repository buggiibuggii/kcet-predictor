export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kcetpredictor.in'
  const now = new Date()
  const routes = ['', '/faq', '/about', '/contact', '/login', '/privacy', '/terms', '/disclaimer']
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: r === '' ? 1 : 0.7,
  }))
}
