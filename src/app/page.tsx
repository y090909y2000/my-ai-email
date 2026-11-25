"use client";

import { useEffect, useState } from "react";
import type { Brief } from "@/lib/brief";

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "ok"; to: string }
  | { status: "error"; message: string };

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-base font-medium tabular-nums text-stone-800">
        {value}
      </dd>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [send, setSend] = useState<SendState>({ status: "idle" });

  useEffect(() => {
    fetch("/api/daily-brief")
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? `錯誤 ${res.status}`);
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function sendEmail() {
    setSend({ status: "sending" });
    try {
      const res = await fetch("/api/send-email-manual", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `錯誤 ${res.status}`);
      setSend({ status: "ok", to: j.to });
    } catch (e) {
      setSend({
        status: "error",
        message: e instanceof Error ? e.message : "寄信失敗",
      });
    }
  }

  const shell = "mx-auto w-full max-w-2xl px-5 py-12 sm:py-16";

  if (error)
    return (
      <main className={shell}>
        <p className="rounded-xl bg-red-50 p-4 text-red-700">
          載入失敗：{error}
        </p>
      </main>
    );

  if (!data)
    return (
      <main className={shell}>
        <p className="animate-pulse text-stone-500">
          正在整理今天的資訊，約需幾秒鐘…
        </p>
      </main>
    );

  const { summary, raw } = data;
  const { weather, stock, news } = raw;
  const up = (stock.change ?? 0) >= 0;
  const stockColor = up ? "text-red-600" : "text-green-600"; // 台股：紅漲綠跌

  return (
    <main className={`${shell} flex flex-col gap-5`}>
      <header className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{data.date}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            每日晨報
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={sendEmail}
            disabled={send.status === "sending"}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {send.status === "sending" ? "寄送中…" : "✉ 寄到我的信箱"}
          </button>
          {send.status === "ok" && (
            <p className="text-xs text-green-700">已寄出至 {send.to}</p>
          )}
          {send.status === "error" && (
            <p className="max-w-xs text-right text-xs text-red-600">
              寄信失敗：{send.message}
            </p>
          )}
        </div>
      </header>

      <section className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200/70 sm:p-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          給你的一句話
        </h2>
        <p className="font-serif text-xl leading-relaxed text-stone-800">
          {summary.encouragement}
        </p>
      </section>

      <Section label={`天氣 · ${weather.city}`}>
        <p className="leading-relaxed text-stone-700">{summary.weather}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-100 pt-5 sm:grid-cols-4">
          <Stat label="現在" value={`${weather.currentTemp}°C`} />
          <Stat label="體感" value={`${weather.feelsLike}°C`} />
          <Stat label="高 / 低" value={`${weather.tempMax}° / ${weather.tempMin}°`} />
          <Stat label="降雨機率" value={`${weather.rainProbability}%`} />
        </dl>
      </Section>

      <Section label={`${stock.name} · ${stock.symbol}`}>
        <p className="leading-relaxed text-stone-700">{summary.stock}</p>
        <p className={`mt-5 text-4xl font-bold tabular-nums ${stockColor}`}>
          {stock.close}
          {stock.change != null && (
            <span className="ml-3 text-lg font-medium">
              {up ? "▲" : "▼"} {Math.abs(stock.change)}（{stock.changePercent}%）
            </span>
          )}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-100 pt-5 sm:grid-cols-4">
          <Stat label="交易日" value={stock.date} />
          <Stat label="開盤" value={stock.open} />
          <Stat label="最高 / 最低" value={`${stock.high} / ${stock.low}`} />
          <Stat label="成交量" value={stock.volume.toLocaleString()} />
        </dl>
      </Section>

      <Section label="科技新聞">
        <p className="leading-relaxed text-stone-700">{summary.news}</p>
        <ul className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
          {news.map((n) => (
            <li key={n.link} className="py-4">
              <a
                href={n.link}
                target="_blank"
                rel="noreferrer"
                className="font-medium leading-snug text-stone-900 underline-offset-4 hover:text-blue-700 hover:underline"
              >
                {n.title}
              </a>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                {n.summary}…
              </p>
              <p className="mt-1 text-xs text-stone-400">{n.publishedAt}</p>
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-center text-xs text-stone-400">
        由 AI 自動整理，資訊僅供參考
      </p>
    </main>
  );
}
