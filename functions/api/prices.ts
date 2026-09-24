// Cloudflare Pages Function: /api/prices
// Serverless edge price lookup & catalog sync endpoint

interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>
  }
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const url = new URL(context.request.url)
  const q = url.searchParams.get('q')?.toLowerCase().trim()
  const barcode = url.searchParams.get('barcode')?.trim()
  const category = url.searchParams.get('category')?.toUpperCase().trim()

  try {
    // Fetch static master prices.json from Cloudflare Pages ASSETS binding
    const assetUrl = new URL('/api/prices.json', url.origin)
    const assetRes = await context.env.ASSETS.fetch(assetUrl.toString())

    if (!assetRes.ok) {
      return new Response(JSON.stringify({ error: 'Price catalog not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const catalog: any = await assetRes.json()
    let items = catalog.items || []

    // 1. Barcode exact lookup
    if (barcode) {
      items = items.filter((item: any) => item.barcode === barcode)
      return new Response(JSON.stringify({
        match: items.length > 0 ? items[0] : null,
        source: 'Cloudflare Pages Edge',
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

    // 2. Query filter
    if (q) {
      items = items.filter((item: any) => {
        const text = `${item.product_name} ${item.brand} ${item.variant || ''} ${item.category || ''}`.toLowerCase()
        return text.includes(q)
      })
    }

    // 3. Category filter
    if (category && category !== 'ALL') {
      items = items.filter((item: any) => item.category === category)
    }

    return new Response(JSON.stringify({
      version: catalog.version,
      updated_at: catalog.updated_at,
      total_items: items.length,
      source: 'Cloudflare Pages Serverless Edge API',
      items
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800'
      }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({
      error: 'Failed to process price lookup',
      details: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}
