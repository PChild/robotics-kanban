import type { NextConfig } from "next";

// Repo name is used as the base path since GitHub Pages serves project
// sites from https://<user>.github.io/<repo>/ rather than the domain root.
// Set this to match your actual repo name.
const repoName = "ops";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export", // static export — no server, works on GitHub Pages
  basePath: isGithubActions ? `/${repoName}` : "",
  images: { unoptimized: true }, // next/image optimization needs a server; disable it
  trailingSlash: true, // avoids GitHub Pages 404s on nested routes
};

export default nextConfig;
