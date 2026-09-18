"use client";

// §5: 링크 붙여넣기 -> 리다이렉트 -> OG 파싱 -> (실패시) 수동 입력 폴백 -> 이유 객관식.

import { useState } from "react";
import { useApp, REASON_CODE_LABEL, type ReasonCode } from "@/lib/store";
import type { ParsedProduct } from "@/app/api/parse-link/route";

type Draft = {
  name: string;
  price: string;
  imageUrl: string | null;
  category: string | null;
  brand: string | null;
  normalPrice: number | null;
  saleRate: number | null;
  sourceUrl: string | null;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  price: "",
  imageUrl: null,
  category: null,
  brand: null,
  normalPrice: null,
  saleRate: null,
  sourceUrl: null,
};

export function AddItemForm() {
  const { addItem } = useApp();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"link" | "draft">("link");
  const [failReason, setFailReason] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [reasonCode, setReasonCode] = useState<ReasonCode>("long_wanted");

  async function handleFetch() {
    if (!url) return;
    setLoading(true);
    setFailReason(null);
    try {
      const res = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: ParsedProduct | { success: false; reason: string } = await res.json();
      if (data.success) {
        setDraft({
          name: data.name ?? "",
          price: data.price ? String(data.price) : "",
          imageUrl: data.imageUrl,
          category: data.category,
          brand: data.brand,
          normalPrice: data.normalPrice,
          saleRate: data.saleRate,
          sourceUrl: data.finalUrl,
        });
      } else {
        // 폴백: 파싱 실패해도 빈 수동 입력 폼으로 전환 (§5 필수 폴백)
        setFailReason(data.reason);
        setDraft({ ...EMPTY_DRAFT, sourceUrl: url });
      }
    } catch {
      setFailReason("network_error");
      setDraft({ ...EMPTY_DRAFT, sourceUrl: url });
    } finally {
      setLoading(false);
      setStage("draft");
    }
  }

  function reset() {
    setUrl("");
    setDraft(EMPTY_DRAFT);
    setFailReason(null);
    setStage("link");
  }

  if (stage === "link") {
    return (
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="상품 링크를 붙여넣으세요"
          className="border border-gray-300 rounded px-2 py-1 flex-1"
        />
        <button
          disabled={!url || loading}
          onClick={handleFetch}
          className="bg-black text-white rounded px-3 py-1 disabled:opacity-30"
        >
          {loading ? "가져오는 중..." : "가져오기"}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded p-3 flex flex-col gap-2">
      {failReason && (
        <p className="text-xs text-orange-500">
          링크에서 정보를 못 가져왔어요 ({failReason}) — 직접 입력해주세요.
        </p>
      )}
      {draft.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="상품명"
          className="border border-gray-300 rounded px-2 py-1 flex-1 min-w-[120px]"
        />
        <input
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          type="number"
          placeholder="가격"
          className="border border-gray-300 rounded px-2 py-1 w-28"
        />
      </div>
      {(draft.category || draft.brand || draft.saleRate) && (
        <p className="text-xs text-gray-400">
          {draft.brand && `브랜드: ${draft.brand} · `}
          {draft.category && `카테고리: ${draft.category} · `}
          {draft.saleRate && `할인율: ${draft.saleRate}%`}
        </p>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {Object.entries(REASON_CODE_LABEL).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <button
          disabled={!draft.name || !draft.price}
          onClick={() => {
            addItem({
              name: draft.name,
              price: Number(draft.price),
              reasonCode,
              imageUrl: draft.imageUrl,
              category: draft.category,
              brand: draft.brand,
              normalPrice: draft.normalPrice,
              saleRate: draft.saleRate,
              sourceUrl: draft.sourceUrl,
            });
            reset();
          }}
          className="bg-black text-white rounded px-3 py-1 disabled:opacity-30"
        >
          장바구니에 추가
        </button>
        <button onClick={reset} className="text-xs text-gray-400 underline">
          취소
        </button>
      </div>
    </div>
  );
}
