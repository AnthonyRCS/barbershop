import { networkInterfaces } from "node:os";

function getAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const nets = networkInterfaces();

  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        hosts.add(net.address);
      }
    }
  }

  return Array.from(hosts);
}

const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  typedRoutes: true,
  async rewrites() {
    return [
      {
        source: "/socket.io",
        destination: `${backendUrl}/socket.io`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
