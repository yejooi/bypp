"use client";

// 장바구니 스크린샷 -> Claude 이미지 인식으로 상품명/가격 추출 -> 일괄 등록.
// 로그인 필요/JS 렌더링 문제로 장바구니 자동 스크래핑이 불가능해서 나온 대안 (사이트 무관하게 동작).
// 상품 사진은 스크린샷 픽셀일 뿐이라 URL로는 못 뽑는다 -> 이 경로로 추가한 항목은 이미지 없음.

import { useRef, useState } from "react";
import { RatingSliders, DEFAULT_RATINGS, type Ratings } from "@/components/RatingSliders";
import { useApp, REASON_CODE_LABEL, type ReasonCode } from "@/lib/store";

type Draft = {
  key: string;
  name: string;
  price: string;
  reasonCode: ReasonCode;
  customReason: string;
  ratings: Ratings;
};

const MAX_WIDTH = 1200;

async function resizeToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_WIDTH / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { base64: jpegDataUrl.split(",")[1], mediaType: "image/jpeg" };
}

export function ScreenshotImportForm() {
  const { addItem } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const { base64, mediaType } = await resizeToBase64(file);
      const res = await fetch("/api/parse-screenshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (!res.ok) throw new Error("parse_failed");
      const data: { items: { name: string; price: number | null }[] } = await res.json();
      if (!data.items?.length) {
        setError("이미지에서 상품을 못 찾았어요. 더 선명한 스크린샷으로 다시 시도해주세요.");
        setDrafts(null);
        return;
      }
      setDrafts(
        data.items.map((it, i) => ({
          key: `${Date.now()}-${i}`,
          name: it.name,
          price: it.price ? String(it.price) : "",
          reasonCode: "long_wanted" as ReasonCode,
          customReason: "",
          ratings: DEFAULT_RATINGS,
        }))
      );
    } catch {
      setError("스크린샷 분석에 실패했어요. 다시 시도해주세요.");
      setDrafts(null);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev?.map((d) => (d.key === key ? { ...d, ...patch } : d)) ?? null);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev?.filter((d) => d.key !== key) ?? null);
  }

  function addAll() {
    if (!drafts) return;
    for (const d of drafts) {
      if (!d.name || !d.price) continue;
      addItem({
        name: d.name,
        price: Number(d.price),
        reasonCode: d.reasonCode,
        customReason: d.reasonCode === "other" ? d.customReason.trim() : null,
        ...d.ratings,
        imageUrl: null,
      });
    }
    setDrafts(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const inputCls =
    "border-2 rounded-xl px-2 py-1.5 text-sm bg-[var(--surface)] focus:outline-none focus:border-[var(--primary)]";
  const inputStyle = { borderColor: "var(--border)" } as const;

  if (!drafts) {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
        <button
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="self-start flex items-center gap-2 px-4 py-2 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-30 active:translate-y-0.5"
          style={{ backgroundColor: "#4F8B33", boxShadow: "0 3px 0 0 rgba(74,46,53,0.16)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{loading ? "읽는 중..." : "사진 추가"}</span>
        </button>
        <p className="text-xs font-bold text-[#7A5B3E]">장바구니 스크린샷을 넣으면 상품들의 정보가 자동으로 채워져요</p>
        {error && (
          <p className="text-xs" style={{ color: "var(--accent)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-3.5 flex flex-col gap-2.5 border-2"
      style={{ backgroundColor: "var(--surface-alt)", borderColor: "var(--border)" }}
    >
      <p className="text-xs text-[var(--text-sub)]">
        {drafts.length}개 찾았어요. 확인하고 필요하면 고치거나 지운 다음 한 번에 담아주세요. (사진은
        스크린샷에서 못 뽑아서 이미지 없이 등록돼요.)
      </p>
      {drafts.map((d) => (
        <div
          key={d.key}
          className="flex flex-wrap gap-2 items-center border-t pt-2"
          style={{ borderColor: "var(--border)" }}
        >
          <input
            value={d.name}
            onChange={(e) => updateDraft(d.key, { name: e.target.value })}
            className={`${inputCls} flex-1 min-w-[120px]`}
            style={inputStyle}
          />
          <input
            value={d.price}
            onChange={(e) => updateDraft(d.key, { price: e.target.value })}
            type="number"
            placeholder="가격"
            className={`${inputCls} w-24`}
            style={inputStyle}
          />
          <select
            value={d.reasonCode}
            onChange={(e) => updateDraft(d.key, { reasonCode: e.target.value as ReasonCode })}
            className={inputCls}
            style={inputStyle}
          >
            {Object.entries(REASON_CODE_LABEL).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          {d.reasonCode === "other" && (
            <input
              value={d.customReason}
              onChange={(e) => updateDraft(d.key, { customReason: e.target.value })}
              placeholder="이유 직접 입력"
              className={`${inputCls} flex-1 min-w-[140px]`}
              style={inputStyle}
            />
          )}
          <button onClick={() => removeDraft(d.key)} className="text-xs underline text-[var(--text-sub)]">
            제외
          </button>
          <div className="w-full">
            <RatingSliders value={d.ratings} onChange={(ratings) => updateDraft(d.key, { ratings })} />
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          onClick={addAll}
          className="px-4 py-2 text-white font-bold text-sm rounded-xl transition-all active:translate-y-0.5"
          style={{ backgroundColor: "var(--primary)", boxShadow: "0 3px 0 0 var(--primary-hover)" }}
        >
          전체 장바구니에 담기
        </button>
        <button onClick={() => setDrafts(null)} className="text-xs underline text-[var(--text-sub)]">
          취소
        </button>
      </div>
    </div>
  );
}
