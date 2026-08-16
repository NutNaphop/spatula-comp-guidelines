import type { NextConfig } from "next";

/** Static export only: the app is a set of files on a CDN, consumed by the
 * browser, the Android WebView shell, and (later) the iOS host app. There is
 * no server, so nothing here may depend on one.
 *
 * Set NEXT_PUBLIC_BASE_PATH=/repo-name when serving from a GitHub Pages
 * project sub-path. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactCompiler: true,
};

export default nextConfig;
