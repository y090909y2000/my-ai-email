// 每日晨報的資料來源：天氣、台積電股價、科技新聞，再交給 OpenAI 統整

const TZ = "Asia/Taipei";
const RSS_URL = "https://www.ithome.com.tw/rss"; // iThome 科技新聞 RSS

// 取得台北時區的 YYYY-MM-DD
function taipeiDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

// 天氣：Open-Meteo（免 token），鎖定桃園
async function getWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=24.993&longitude=121.301" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    `&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`天氣 API 失敗：${res.status}`);
  const j = await res.json();
  return {
    city: "桃園",
    date: j.daily.time[0],
    currentTemp: j.current.temperature_2m,
    feelsLike: j.current.apparent_temperature,
    humidity: j.current.relative_humidity_2m,
    weatherCode: j.current.weather_code,
    tempMax: j.daily.temperature_2m_max[0],
    tempMin: j.daily.temperature_2m_min[0],
    rainProbability: j.daily.precipitation_probability_max[0],
  };
}

// 股價：Yahoo Finance chart API（免 token），取「今天以前」最近一個交易日
async function getTsmcStock() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/2330.TW?range=10d&interval=1d";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`股價 API 失敗：${res.status}`);
  const j = await res.json();
  const r = j.chart.result[0];
  const q = r.indicators.quote[0];
  const today = taipeiDate(new Date());

  const bars = (r.timestamp as number[])
    .map((t, i) => ({
      date: taipeiDate(new Date(t * 1000)),
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i],
    }))
    .filter((b) => b.close != null && b.date < today);

  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  if (!last) throw new Error("查無股價資料");
  const change = prev ? last.close - prev.close : null;
  return {
    symbol: "2330.TW",
    name: "台積電",
    ...last, // date 是最近一個已收盤的交易日（週末/假日會是更早的日子）
    change: change == null ? null : Number(change.toFixed(2)),
    changePercent:
      change == null ? null : Number(((change / prev.close) * 100).toFixed(2)),
  };
}

// 科技新聞：抓 RSS 並用簡單的正規表達式解析前 5 則
function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function getTechNews() {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RSS 失敗：${res.status}`);
  const xml = await res.text();
  const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return m ? decode(m[1]) : "";
  };
  return items.slice(0, 5).map((it) => ({
    title: pick(it, "title"),
    link: pick(it, "link"),
    summary: pick(it, "description").slice(0, 150),
    publishedAt: pick(it, "pubDate"),
  }));
}

// OpenAI：統整資訊並產出鼓勵的話
async function summarize(data: {
  weather: unknown;
  stock: unknown;
  news: unknown;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("缺少 OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是貼心的晨間助理，用繁體中文回答。根據使用者提供的天氣、台積電股價、科技新聞資料，" +
            '只輸出 JSON：{"weather":"一句話天氣摘要與穿著建議","stock":"一句話股價摘要（只陳述事實，不給投資建議）",' +
            '"news":"一段話科技新聞重點","encouragement":"2~3 句溫暖真誠的鼓勵話"}',
        },
        { role: "user", content: JSON.stringify(data) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI 失敗：${res.status}`);
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

// 整合三份資料 + OpenAI 統整，供 API 與寄信共用
export async function getBrief() {
  const [weather, stock, news] = await Promise.all([
    getWeather(),
    getTsmcStock(),
    getTechNews(),
  ]);
  const summary = await summarize({ weather, stock, news });
  return { date: taipeiDate(new Date()), summary, raw: { weather, stock, news } };
}

export type Brief = Awaited<ReturnType<typeof getBrief>>;
