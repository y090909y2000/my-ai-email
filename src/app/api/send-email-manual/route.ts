import { sendBriefEmail } from "@/lib/send-brief-email";

// 給網頁上的「寄到我的信箱」按鈕用（不需要 secret，secret 不能放在前端）
// 排程請改用需要 CRON_SECRET 的 /api/send-email
export async function POST() {
  try {
    return Response.json(await sendBriefEmail());
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知錯誤";
    return Response.json({ error: message }, { status: 500 });
  }
}
