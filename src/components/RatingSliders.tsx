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
    <>
      {/* 좁은 화면: 접어 두고, 펼치면 항목마다 드롭다운 (물건이 여러 개여도 화면이 길어지지 않게) */}
      <details className="sm:hidden rounded-2xl border-2 border-[#E3D6BC] bg-[#FFFBF2] px-3 py-2">
        <summary className="cursor-pointer text-sm font-black text-[#6F523A] flex items-center justify-between">
          <span>세부 평가 (선택)</span>
          <span className="text-xs font-bold opacity-70">
            {value.urgency} · {value.desire} · {value.longevity}
          </span>
        </summary>
        <div className="flex flex-col gap-2 pt-2.5">
          {ROWS.map(([key, label, lo, hi]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm font-bold text-[#7A5B3E]">
          <span>{label}</span>
          <select
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
            className="w-44 rounded-xl border-2 border-[#D6C2A5] bg-white px-3 py-2 text-sm font-black text-[#4A3324] focus:outline-none focus:border-[#6FAE4A]"
          >
            <option value={1}>1 · {lo}</option>
            <option value={2}>2</option>
            <option value={3}>3 · 보통</option>
            <option value={4}>4</option>
            <option value={5}>5 · {hi}</option>
          </select>
            </label>
          ))}
        </div>
      </details>

      {/* 넓은 화면: 눈금 5개 */}
      <div className="hidden sm:flex flex-col gap-1.5">
        {ROWS.map(([key, label, lo, hi]) => (
          <div key={key}>
        <div className="flex items-center gap-2 text-xs font-bold text-[#7A5B3E]">
          <span className="w-32 shrink-0">{label}</span>
          <span className="w-16 text-right text-[11px] font-medium opacity-80">{lo}</span>
          <div className="relative flex-1 h-6 mx-2" role="group" aria-label={label}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#DCCFB4]" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#7CB955]"
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
                      ? "w-4 h-4 bg-[#4F8B33] border-white shadow-[0_1px_0_rgba(74,46,53,0.25)] ring-1 ring-[#BEE88A]"
                      : n < value[key]
                        ? "w-2 h-2 bg-[#7CB955] border-[#E9F5DC] hover:scale-150"
                        : "w-2 h-2 bg-[#F5EEDD] border-[#C9B390] hover:scale-150"
                  }`}
                  style={{ left: `${((n - 1) / 4) * 100}%` }}
                />
              );
            })}
          </div>
          <span className="w-20 text-[11px] font-medium opacity-80">{hi}</span>
          <span className="w-4 text-center">{value[key]}</span>
        </div>
          </div>
        ))}
      </div>
    </>
  );
}
