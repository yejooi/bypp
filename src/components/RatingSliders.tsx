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
        <div key={key} className="flex items-center gap-2 text-xs font-bold text-[#7A5B3E]">
          <span className="w-32 shrink-0">{label}</span>
          <span className="w-16 text-right text-[11px] font-medium opacity-80">{lo}</span>
          <div className="relative flex-1 h-7 mx-2.5" role="group" aria-label={label}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#DCCFB4]" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#7CB955]"
              style={{ width: `${((value[key] - 1) / 4) * 100}%` }}
            />
            {[1, 2, 3, 4, 5].map((n) => {
              const on = value[key] === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ ...value, [key]: n })}
                  aria-label={`${label} ${n}`}
                  aria-pressed={on}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                    on
                      ? "w-6 h-6 bg-[#4F8B33] border-white shadow-[0_2px_0_rgba(74,46,53,0.25)] ring-2 ring-[#BEE88A]"
                      : n < value[key]
                        ? "w-3.5 h-3.5 bg-[#7CB955] border-[#E9F5DC] hover:scale-125"
                        : "w-3.5 h-3.5 bg-[#F5EEDD] border-[#C9B390] hover:scale-125"
                  }`}
                  style={{ left: `${((n - 1) / 4) * 100}%` }}
                />
              );
            })}
          </div>
          <span className="w-20 text-[11px] font-medium opacity-80">{hi}</span>
          <span className="w-4 text-center">{value[key]}</span>
        </div>
      ))}
    </div>
  );
}
