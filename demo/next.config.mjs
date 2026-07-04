/** @type {import('next').NextConfig} */
const noirPackages = [
  "@noir-lang/noir_js",
  "@noir-lang/noirc_abi",
  "@noir-lang/acvm_js",
  "@aztec/bb.js",
];

const nextConfig = {
  output: "standalone",
  transpilePackages: ["@safetrust/zk-sdk"],
  // Route handlers must load Noir/bb from node_modules (nodejs WASM), not webpack's web bundle.
  experimental: {
    serverComponentsExternalPackages: noirPackages,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), ...noirPackages];
    }
    return config;
  },
};

export default nextConfig;