import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketUrl(): string {
  const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (publicBackendUrl && publicBackendUrl.trim().length > 0) {
    return publicBackendUrl;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "http://127.0.0.1:3001";
}

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(getSocketUrl(), {
    path: "/socket.io",
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

