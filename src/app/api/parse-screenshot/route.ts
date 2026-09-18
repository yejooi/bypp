// 장바구니/위시리스트 스크린샷에서 상품명·가격을 추출한다.
// 로그인/JS렌더링 문제로 장바구니 자동 스크래핑이 막혀서(무신사/지그재그/쿠팡/네이버 다 확인함) 나온 대안:
// 사용자가 이미 가진 스크린샷을 Claude 이미지 인식으로 읽는다. 상품 사진은 URL이 없으니 각 상품 썸네일의 위치(image_box)를 함께 받아 클라이언트에서 잘라 쓴다.
// §9-2: JSON 파싱 실패 시 1회 재시도.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, withinRateLimit } from "@/lib/apiAuth";

const MODEL = "claude-sonnet-5";

type ImageBox = { x: number; y: number; w: number; h: number };

function buildPrompt(width: number, height: number) {
  return `이 이미지는 쇼핑몰 장바구니 또는 위시리스트 화면 캡처다. 이미지 크기는 가로 ${width}px, 세로 ${height}px이다.
사용자가 실제로 장바구니에 담은 상품만 아래 JSON 스키마로 출력해라 (설명 문장 없이).

실제 담은 상품의 특징: 선택 체크박스가 있고, 옵션·수량(예: "navy / free 1개")이나 "옵션 변경", "상품 금액" 같은 줄이 붙어 있다.
반드시 제외할 것: "코디상품", "추천 상품", "함께 보면 좋은", "이 상품과 비슷한", 광고, 배너, 가로로 넘겨 보는 추천 카드 목록.
체크박스나 옵션/수량 줄이 없는 카드는 추천/광고이므로 넣지 마라.

- name: 상품명 (보이는 텍스트 그대로. 브랜드가 따로 있으면 상품명만)
- price: 그 상품의 판매가/결제금액 (숫자만, 원화). 할인 전 취소선 가격이 아니라 실제 가격. 화면에 안 보이면 null
- image_box: 그 상품의 대표 사진(상품명 왼쪽의 정사각형 상품 사진)이 차지하는 사각형을 이 이미지 기준 **픽셀 좌표**로.
  {"x": 왼쪽, "y": 위쪽, "w": 너비, "h": 높이}. 로고, 배송 배지, 아이콘, 배너가 아니라 상품 자체 사진이어야 한다.
  사진이 화면에 없거나 잘려서 확실하지 않으면 null.

상품이 하나도 안 보이면 items를 빈 배열로 둔다.

출력 스키마:
{"items": [{"name": "...", "price": number | null, "image_box": {"x": number, "y": number, "w": number, "h": number} | null}]}`;
}

async function callClaudeOnce(
  imageBase64: string,
  mediaType: string,
  width: number,
  height: number
): Promise<{ items: { name: string; price: number | null; image_box?: ImageBox | null }[] } | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: buildPrompt(width, height) },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const textBlock = data.content.find((b: { type: string }) => b.type === "text");
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const uid = await requireUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!withinRateLimit(`screenshot:${uid}`, 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { imageBase64, mediaType, width, height } = (await req.json()) as {
    imageBase64: string;
    mediaType: string;
    width?: number;
    height?: number;
  };
  const w = Number.isFinite(width) && width! > 0 ? Math.round(width!) : 1000;
  const h = Number.isFinite(height) && height! > 0 ? Math.round(height!) : 1000;
  if (imageBase64 && imageBase64.length > 8_000_000) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  if (!imageBase64) {
    return NextResponse.json({ error: "no_image" }, { status: 400 });
  }

  let parsed = await callClaudeOnce(imageBase64, mediaType, w, h);
  if (!parsed) {
    parsed = await callClaudeOnce(imageBase64, mediaType, w, h); // 1회 재시도
  }

  if (!parsed) {
    return NextResponse.json({ error: "llm_call_failed" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
