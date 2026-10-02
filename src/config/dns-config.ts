import dns from "node:dns";

const initDNS = (): void => {
  const dnsServers = process.env.DNS_SERVERS?.split(",").map((server) =>
    server.trim(),
  );

  if (!dnsServers || dnsServers.length === 0) {
    throw new Error("DNS_SERVERS environment variable is not configured");
  }

  dns.setServers(dnsServers);
};

export default initDNS;
