import { connectDB } from "@/lib/mongodb";
import { SentEmail } from "@/models/SentEmail";

// GET /api/emails：讀取 MongoDB 中寄過的信（新到舊，最多 30 筆）
export async function GET() {
  try {
    await connectDB();
    const docs = await SentEmail.find().sort({ createdAt: -1 }).limit(30).lean();
    return Response.json({
      emails: docs.map((d) => ({
        id: String(d._id),
        from: d.from,
        to: d.to,
        subject: d.subject,
        resendId: d.resendId,
        sentAt: d.createdAt,
        brief: d.brief,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知錯誤";
    return Response.json({ error: message }, { status: 500 });
  }
}
