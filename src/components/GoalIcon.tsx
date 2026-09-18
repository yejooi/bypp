// 목표 종류별 심플한 머티리얼 스타일 아이콘 (이모지 대신). 직접 입력한 목표는 깃발.
const PATHS = {
  flight: "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  paid: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z",
  flag: "M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z",
} as const;

const BY_GOAL: Record<string, keyof typeof PATHS> = { "여행 자금": "flight", 내집마련: "home", "1억 모으기": "paid" };

export function GoalIcon({ goal, className = "w-4 h-4" }: { goal: string | null; className?: string }) {
  const path = PATHS[BY_GOAL[goal ?? ""] ?? "flag"];
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  );
}
