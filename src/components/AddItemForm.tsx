"use client";

// §5: 링크 붙여넣기 -> 리다이렉트 -> OG 파싱 -> (실패시) 수동 입력 폴백 -> 이유 객관식.

import { useState } from "react";
import { RatingSliders, DEFAULT_RATINGS } from "@/components/RatingSliders";
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

const inputCls =
  "border-2 rounded-xl px-3 py-2 text-sm bg-[var(--surface)] focus:outline-none focus:border-[var(--primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

export function AddItemForm() {
  const { addItem } = useApp();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"link" | "draft">("link");
  const [failReason, setFailReason] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [reasonCode, setReasonCode] = useState<ReasonCode>("long_wanted");
  const [customReason, setCustomReason] = useState("");
  const [ratings, setRatings] = useState(DEFAULT_RATINGS);

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
    setCustomReason("");
    setRatings(DEFAULT_RATINGS);
    setStage("link");
  }

  if (stage === "link") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="상품 링크 붙여넣기"
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
          <button
            disabled={!url || loading}
            onClick={handleFetch}
            className="px-6 py-2 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-30 active:translate-y-0.5"
            style={{ backgroundColor: "#4F8B33", boxShadow: "0 3px 0 0 rgba(74,46,53,0.16)" }}
          >
            {loading ? "가져오는 중..." : "가져오기"}
          </button>
        </div>
        <p className="text-xs font-bold text-[#7A5B3E]">상품의 링크를 넣으면 상품 정보가 자동으로 채워져요</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-3.5 flex flex-col gap-2.5 border-2"
      style={{ backgroundColor: "var(--surface-alt)", borderColor: "var(--border)" }}
    >
      {failReason && (
        <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>
          링크에서 정보를 못 가져왔어요 ({failReason}) — 직접 입력해주세요.
        </p>
      )}
      {draft.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.imageUrl} alt="" className="w-16 h-16 object-cover rounded-2xl" />
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="상품명"
          className={`${inputCls} flex-1 min-w-[120px]`}
          style={inputStyle}
        />
        <input
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          type="number"
          placeholder="가격"
          className={`${inputCls} w-28`}
          style={inputStyle}
        />
      </div>
      {(draft.category || draft.brand || draft.saleRate) && (
        <p className="text-xs text-[var(--text-sub)]">
          {draft.brand && `브랜드: ${draft.brand} · `}
          {draft.category && `카테고리: ${draft.category} · `}
          {draft.saleRate && `할인율: ${draft.saleRate}%`}
        </p>
      )}
      <RatingSliders value={ratings} onChange={setRatings} />
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
          className={inputCls}
          style={inputStyle}
        >
          {Object.entries(REASON_CODE_LABEL).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        {reasonCode === "other" && (
          <input
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="어떤 이유인지 직접 적어주세요"
            className={`${inputCls} flex-1 min-w-[160px]`}
            style={inputStyle}
          />
        )}
        <button
          disabled={!draft.name || !draft.price || (reasonCode === "other" && !customReason.trim())}
          onClick={() => {
            addItem({
              name: draft.name,
              price: Number(draft.price),
              reasonCode,
              customReason: reasonCode === "other" ? customReason.trim() : null,
              ...ratings,
              imageUrl: draft.imageUrl,
              category: draft.category,
              brand: draft.brand,
              normalPrice: draft.normalPrice,
              saleRate: draft.saleRate,
              sourceUrl: draft.sourceUrl,
            });
            reset();
          }}
          className="px-4 py-2 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-30 active:translate-y-0.5"
          style={{ backgroundColor: "var(--primary)", boxShadow: "0 3px 0 0 var(--primary-hover)" }}
        >
          장바구니에 추가
        </button>
        <button onClick={reset} className="text-xs underline text-[var(--text-sub)]">
          취소
        </button>
      </div>
    </div>
  );
}
