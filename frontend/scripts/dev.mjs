import { networkInterfaces } from "os";
import { spawn } from "child_process";

function getNetworkIP() {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const ip = getNetworkIP();
const port = 3000;

console.log("");
console.log("  ┌─────────────────────────────────────────┐");
console.log("  │       Barbershop App — Frontend          │");
console.log("  ├─────────────────────────────────────────┤");
console.log(`  │  Local    →  http://localhost:${port}       │`);
console.log(`  │  Network  →  http://${ip}:${port}    │`);
console.log("  └─────────────────────────────────────────┘");
console.log("");

const next = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", String(port)], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

function forwardStream(stream, target) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (/Network:\s+http:\/\/0\.0\.0\.0:\d+/.test(line)) {
        continue;
      }
      target.write(`${line}\n`);
    }
  });

  stream.on("end", () => {
    if (pending && !/Network:\s+http:\/\/0\.0\.0\.0:\d+/.test(pending)) {
      target.write(pending);
    }
  });
}

forwardStream(next.stdout, process.stdout);
forwardStream(next.stderr, process.stderr);

next.on("exit", (code) => process.exit(code ?? 0));
