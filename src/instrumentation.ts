// Runs once at server startup (Node.js runtime only).
// Probes IPv6 connectivity to the database host. If IPv6 addresses exist for
// the host but the TCP connection times out or is refused, switches Node's DNS
// resolver to prefer IPv4. This handles environments where IPv6 routing is
// broken (e.g. a misconfigured VPN) without requiring any code changes or
// environment variable hacks.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { default: dns } = await import(/* webpackIgnore: true */ "dns");
  const { default: net } = await import(/* webpackIgnore: true */ "net");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  let hostname: string;
  try {
    // DATABASE_URL uses postgresql:// scheme — swap to https:// so URL can parse it
    hostname = new URL(dbUrl.replace(/^postgresql:\/\//, "https://")).hostname;
  } catch {
    return;
  }

  // Check whether the host even has an IPv6 address
  const ipv6Address = await new Promise<string | null>((resolve) => {
    dns.lookup(hostname, { family: 6 }, (err, addr) =>
      resolve(err ? null : addr)
    );
  });

  if (!ipv6Address) return; // No AAAA record — IPv4 is already the only option

  // Attempt a real TCP connection over IPv6 with a 3-second timeout
  const ipv6Works = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: ipv6Address, port: 5432 });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 3000);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });

  if (!ipv6Works) {
    dns.setDefaultResultOrder("ipv4first");
    console.warn(
      "[db] IPv6 connectivity probe failed — DNS result order switched to ipv4first"
    );
  }
}
