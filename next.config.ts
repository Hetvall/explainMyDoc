import type { NextConfig } from "next";
import path from "node:path";

// Next's proxy layer (src/proxy.ts) caps request bodies at 10MB by default,
// independent of and *before* our own MAX_FILE_SIZE_MB check in
// src/app/api/documents/route.ts ever runs. Without raising it here, any
// upload over 10MB fails with a generic "Invalid upload request." instead
// of the size-specific message the route already returns — even though the
// UI advertises "up to {MAX_FILE_SIZE_MB}MB". A few MB of headroom above
// MAX_FILE_SIZE_MB covers multipart/form-data overhead (boundary, headers).
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 20;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    proxyClientMaxBodySize: `${maxFileSizeMb + 5}mb`,
  },
};

export default nextConfig;
