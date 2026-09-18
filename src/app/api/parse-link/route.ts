// §5: 링크 붙여넣기 -> 리다이렉트 따라가기(필수) -> OG 태그 파싱.
// 서버 라우트에서만 호출 (클라이언트가 임의 URL로 직접 fetch하면 CORS에 막힌다).

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export type ParsedProduct = {
  success: true;
  finalUrl: string;
  name: string | null;
  imageUrl: string | null;
  price: number | null;
  normalPrice: number | null;
  saleRate: number | null;
  brand: string | null;
  category: string | null;
};

export type ParseFailure = { success: false; reason: string };

function meta($: cheerio.CheerioAPI, property: string): string | null {
  const content = $(`meta[property="${property}"]`).attr("content");
  return content ?? null;
}

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json<ParseFailure>({ success: false, reason: "no_url" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow", // 딥링크가 실제 상품 페이지로 리다이렉트되는 경우가 많다 (§5)
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json<ParseFailure>({ success: false, reason: "fetch_failed" }, { status: 200 });
  }

  if (!res.ok) {
    return NextResponse.json<ParseFailure>({ success: false, reason: `http_${res.status}` }, { status: 200 });
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const name = meta($, "og:title");
  if (!name) {
    // OG 태그가 없으면 파싱 실패로 간주 -> 클라이언트가 수동 입력 폼으로 전환 (§5 폴백)
    return NextResponse.json<ParseFailure>({ success: false, reason: "no_og_tags" }, { status: 200 });
  }

  const imageUrl = meta($, "og:image");
  const price = toNumber(meta($, "product:price:amount"));
  const normalPrice = toNumber(meta($, "product:price:normal_price"));
  const saleRate = toNumber(meta($, "product:price:sale_rate"));
  const brand = meta($, "product:brand");
  const category = meta($, "product:category") ?? meta($, "og:type");

  return NextResponse.json<ParsedProduct>({
    success: true,
    finalUrl: res.url,
    name,
    imageUrl,
    price,
    normalPrice,
    saleRate,
    brand,
    category,
  });
}
