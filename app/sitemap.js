export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://kcetpredictor.com'
  const now = new Date()
  const routes = ['', '/faq', '/about', '/contact', '/login']
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: r === '' ? 1 : 0.7,
  }))
}
