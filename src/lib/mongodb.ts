import mongoose from "mongoose";
import { Resolver } from "node:dns/promises";

// 本機預設 DNS 可能不回應 SRV 查詢（querySrv ECONNREFUSED），
// 所以自己用 8.8.8.8 / 1.1.1.1 查 SRV + TXT，組成一般 mongodb:// 連線字串
async function resolveSrvUri(uri: string) {
  if (!uri.startsWith("mongodb+srv://")) return uri;
  const u = new URL(uri.replace("mongodb+srv://", "mongodb://"));
  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const srv = await resolver.resolveSrv(`_mongodb._tcp.${u.hostname}`);
  const hosts = srv.map((r) => `${r.name}:${r.port}`).join(",");

  const params = new URLSearchParams(u.search);
  try {
    const txt = await resolver.resolveTxt(u.hostname);
    new URLSearchParams(txt.flat().join("")).forEach((v, k) => {
      if (!params.has(k)) params.set(k, v);
    });
  } catch {}
  if (!params.has("tls") && !params.has("ssl")) params.set("tls", "true");

  const auth = u.username ? `${u.username}:${u.password}@` : "";
  return `mongodb://${auth}${hosts}${u.pathname}?${params.toString()}`;
}

// 開發模式下把連線快取在 global，避免 HMR 重複建立連線
const g = globalThis as unknown as {
  _mongoose?: Promise<typeof mongoose>;
};

export function connectDB() {
  if (!g._mongoose) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("缺少 MONGODB_URI");
    g._mongoose = resolveSrvUri(uri)
      .then((resolved) =>
        mongoose.connect(resolved, { dbName: "my-ai-email" }),
      )
      .catch((e) => {
        g._mongoose = undefined; // 失敗時不要快取，下次重試
        throw e;
      });
  }
  return g._mongoose;
}
