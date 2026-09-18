"use client";

// 사용자가 직접 매기는 1~5 단계 (기본 3 = 중립). 링크/스크린샷 등록 폼이 함께 쓴다.

export type Ratings = { urgency: number; desire: number; longevity: number };
export const DEFAULT_RATINGS: Ratings = { urgency: 3, desire: 3, longevity: 3 };

const ROWS = [
  ["urgency", "급한 정도", "여유 있음", "당장 필요"],
  ["desire", "갖고 싶은 정도", "그냥 그래", "너무 갖고 싶어"],
  ["longevity", "오래 쓸 것 같은 정도", "잠깐", "오래오래"],
] as const;

export function RatingSliders({ value, onChange }: { value: Ratings; onChange: (next: Ratings) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {ROWS.map(([key, label, lo, hi]) => (
        <label key={key} className="flex items-center gap-2 text-xs font-bold text-[#7A5B3E]">
          <span className="w-32 shrink-0">{label}</span>
          <span className="w-14 text-right text-[10px] font-medium opacity-70">{lo}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
            className="flex-1 accent-[#4F8B33]"
          />
          <span className="w-14 text-[10px] font-medium opacity-70">{hi}</span>
          <span className="w-4 text-center">{value[key]}</span>
        </label>
      ))}
    </div>
  );
}
