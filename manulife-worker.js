// Cloudflare Worker — Manulife MPF/ILAS Fund Price Proxy
// Deploy at: https://workers.cloudflare.com
// This worker fetches Manulife fund data server-side (no CORS issues)
// and returns it with permissive CORS headers.

const ENDPOINTS = {
  mpf: 'https://www.manulife.com.hk/zh-hk/individual/fund-price/mpf.html/v2/fundlist?product=%E5%AE%8F%E5%88%A9%E7%92%B0%E7%90%83%E7%B2%BE%E9%81%B8(%E5%BC%B7%E7%A9%8D%E9%87%91)%E8%A8%88%E5%8A%83&productId=8',
  ila: 'https://www.manulife.com.hk/zh-hk/individual/fund-price/investment-linked-assurance-scheme.html/v2/fundlist?product=%E5%AE%8F%E5%88%A9%E6%8A%95%E8%B3%87%E8%A8%88%E5%8A%832&productId=21',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const scheme = url.searchParams.get('scheme') || 'mpf';
    const target = ENDPOINTS[scheme] || ENDPOINTS.mpf;

    try {
      const res = await fetch(target, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.manulife.com.hk/zh-hk/individual/fund-price/mpf.html',
          'Origin': 'https://www.manulife.com.hk',
        },
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: CORS_HEADERS,
      });
    }
  },
};
