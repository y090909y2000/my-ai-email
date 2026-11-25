import { getBrief } from "@/lib/brief";

// GET /api/daily-brief：回傳天氣、股價、新聞與 AI 統整的 JSON
export async function GET() {
  try {
    return Response.json(await getBrief());
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知錯誤";
    return Response.json({ error: message }, { status: 500 });
  }
}
