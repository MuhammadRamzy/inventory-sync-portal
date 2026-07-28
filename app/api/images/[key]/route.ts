import { getImagesBucket } from "@/lib/cloudflare";

// `caches` (the Workers Cache API) exists on the real deployed Worker, but
// isn't polyfilled by OpenNext's local dev shim — guard it so image serving
// still works (just without edge-caching) under `next dev`.
function getEdgeCache(): Cache | null {
  return typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cache = getEdgeCache();

  // Edge-cache hit: skip R2 + Worker logic entirely on repeat reads.
  // Cache by URL string, not the Request object itself — Next's route-handler
  // Request isn't a native workerd Request, and the Cache API rejects it.
  if (cache) {
    const cached = await cache.match(request.url);
    if (cached) return cached;
  }

  const bucket = await getImagesBucket();
  const object = await bucket.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  // Built from plain properties rather than object.writeHttpMetadata(headers)
  // — that method call doesn't survive the devalue RPC boundary OpenNext's
  // local dev shim uses to talk to the simulated Workers runtime.
  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }
  headers.set("content-length", object.size.toString());
  headers.set("etag", object.httpEtag);
  // Keys are unique per upload (timestamp + random suffix) and never reused,
  // so the object at this key is effectively immutable.
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const response = new Response(object.body, { headers });
  if (cache) {
    await cache.put(request.url, response.clone());
  }
  return response;
}
