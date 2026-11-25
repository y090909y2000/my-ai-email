import type { Brief } from "./brief";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// 信件用 table + inline style，相容各家信箱
function section(title: string, body: string) {
  return `
  <tr><td style="padding:0 0 16px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:13px;font-weight:600;letter-spacing:1px;color:#78716c;margin-bottom:10px;">${title}</div>
        ${body}
      </td></tr>
    </table>
  </td></tr>`;
}

export function buildEmailHtml(b: Brief) {
  const { summary: s, raw } = b;
  const { weather: w, stock: st, news } = raw;
  const up = (st.change ?? 0) >= 0;
  const color = up ? "#dc2626" : "#16a34a"; // 台股紅漲綠跌
  const p = "margin:0;font-size:15px;line-height:1.7;color:#292524;";
  const meta = "margin:10px 0 0;font-size:13px;color:#78716c;line-height:1.6;";

  const newsHtml = news
    .map(
      (n) => `
      <div style="padding:10px 0;border-top:1px solid #f5f5f4;">
        <a href="${esc(n.link)}" style="font-size:15px;font-weight:600;color:#1d4ed8;text-decoration:none;">${esc(n.title)}</a>
        <div style="font-size:13px;color:#78716c;margin-top:4px;line-height:1.6;">${esc(n.summary)}…</div>
      </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-Hant"><body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,'Segoe UI','Noto Sans TC','Microsoft JhengHei',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding:0 0 20px 0;">
    <div style="font-size:13px;color:#78716c;">${esc(b.date)}</div>
    <div style="font-size:26px;font-weight:700;color:#1c1917;margin-top:4px;">每日晨報</div>
  </td></tr>
  ${section("給你的一句話", `<p style="${p}font-size:16px;">${esc(s.encouragement)}</p>`)}
  ${section(
    `天氣 · ${esc(w.city)}`,
    `<p style="${p}">${esc(s.weather)}</p>
     <p style="${meta}">現在 ${w.currentTemp}°C（體感 ${w.feelsLike}°C）・${w.tempMin}° ~ ${w.tempMax}°・濕度 ${w.humidity}%・降雨機率 ${w.rainProbability}%</p>`,
  )}
  ${section(
    `${esc(st.name)} ${esc(st.symbol)}`,
    `<p style="${p}">${esc(s.stock)}</p>
     <p style="margin:12px 0 0;font-size:28px;font-weight:700;color:${color};">${st.close}
       <span style="font-size:15px;">${st.change != null ? `${up ? "▲" : "▼"} ${Math.abs(st.change)}（${st.changePercent}%）` : ""}</span></p>
     <p style="${meta}">交易日 ${esc(st.date)}・開 ${st.open}・高 ${st.high}・低 ${st.low}</p>`,
  )}
  ${section(
    "科技新聞",
    `<p style="${p}margin-bottom:8px;">${esc(s.news)}</p>${newsHtml}`,
  )}
  <tr><td style="text-align:center;font-size:12px;color:#a8a29e;padding-top:8px;">由 AI 自動整理，資訊僅供參考</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
