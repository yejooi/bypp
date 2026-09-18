// 장바구니/위시리스트 스크린샷에서 상품명·가격을 추출한다.
// 로그인/JS렌더링 문제로 장바구니 자동 스크래핑이 막혀서(무신사/지그재그/쿠팡/네이버 다 확인함) 나온 대안:
// 사용자가 이미 가진 스크린샷을 Claude 이미지 인식으로 읽는다. 상품 사진 URL은 못 뽑는다 (픽셀일 뿐).

import { NextRequest, NextResponse } from "next/server";

const MODEL = "claude-sonnet-5";

const PROMPT = `이 이미지는 쇼핑몰 장바구니 또는 위시리스트 화면 캡처다.
보이는 상품들을 전부 찾아서 아래 JSON 스키마로만 출력해라 (설명 문장 없이).

- name: 상품명 (보이는 텍스트 그대로)
- price: 가격 (숫자만, 원화 단위. 안 보이면 null)

여러 상품이 있으면 전부 items 배열에 넣어라. 상품이 하나도 안 보이면 items를 빈 배열로 둔다.

출력 스키마:
{"items": [{"name": "...", "price": number | null}]}`;

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType } = (await req.json()) as {
    imageBase64: string;
    mediaType: string;
  };
  if (!imageBase64) {
    return NextResponse.json({ error: "no_image" }, { status: 400 });
  }

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
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "llm_call_failed", detail: await res.text() }, { status: 502 });
  }

  const data = await res.json();
  const textBlock = data.content.find((b: { type: string }) => b.type === "text");
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "no_json_in_response" }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "json_parse_failed" }, { status: 502 });
  }
}
