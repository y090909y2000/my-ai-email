import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { sendBriefEmail } from "@/lib/send-brief-email";

// 背景工作（抓資料 + OpenAI + 寄信 + 存檔）最長可執行的秒數
// 部署平台（如 Vercel）才會用到；Hobby 方案上限為 60 秒
export const maxDuration = 60;

// 驗證 CRON_SECRET：cronjob.org 要帶 header「Authorization: Bearer <CRON_SECRET>」
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 沒設定 secret 一律拒絕，不會變成沒驗證
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// 驗證通過後立刻回應，寄信在回應送出後才在背景執行（after），
// 這樣 cronjob.org 不用等待，也不會因為逾時而判定失敗
async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await sendBriefEmail();
      console.log("[cron] 寄信完成：", result);
    } catch (e) {
      console.error("[cron] 寄信失敗：", e);
    }
  });

  return Response.json({ ok: true, message: "已接收，寄信將在背景執行" });
}

// cronjob.org 預設用 GET，也支援 POST
export const GET = handle;
export const POST = handle;
