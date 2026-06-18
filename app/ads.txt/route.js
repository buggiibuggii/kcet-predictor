// Serves /ads.txt for Google AdSense verification.
// https://www.kcetpredictor.in/ads.txt

export const dynamic = 'force-static'
export const revalidate = false

const ADS_TXT = 'google.com, pub-3790135808930134, DIRECT, f08c47fec0942fa0\n'

export async function GET() {
  return new Response(ADS_TXT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
