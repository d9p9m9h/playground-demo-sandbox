import { buildVendorBundle } from "@/lib/playground/vendor";

export function GET() {
  return new Response(buildVendorBundle(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';",
    },
  });
}
