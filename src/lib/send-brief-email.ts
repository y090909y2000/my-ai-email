import { getBrief } from "@/lib/brief";
import { buildEmailHtml } from "@/lib/email-template";
import { connectDB } from "@/lib/mongodb";
import { SentEmail } from "@/models/SentEmail";

// 寄件人（Resend 預設）與收件人，依需求寫死在程式碼中
const FROM = "每日晨報 <onboarding@resend.dev>";
const TO = "y090909y2000@gmail.com";

// 產生今日晨報、用 Resend 寄出 HTML 信件，並存進 MongoDB
export async function sendBriefEmail() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("缺少 RESEND_API_KEY");

  const brief = await getBrief();
  const subject = `每日晨報 ${brief.date}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject,
      html: buildEmailHtml(brief),
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.message ?? `Resend 失敗：${res.status}`);

  // 寄信成功後，把這次的晨報存進 MongoDB（sentemails collection）
  // 存檔失敗不影響信已寄出，只回報 saved: false
  let saved = false;
  try {
    await connectDB();
    await SentEmail.create({
      from: FROM,
      to: TO,
      subject,
      resendId: j.id,
      brief, // 包含 date、AI 統整 summary、原始 raw 資料
    });
    saved = true;
  } catch (e) {
    console.error("寫入 MongoDB 失敗：", e);
  }

  return { ok: true, id: j.id as string, to: TO, saved };
}
