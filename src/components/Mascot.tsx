// 시그니처 캐릭터 (CLAUDE.md 8-2): 하단 바에서 목표까지 달리고, AI 판정 때는 말하는 화자가 된다.
// 한 캐릭터가 두 역할을 겸하고, 표정(mood)만 바뀐다.

export type MascotMood = "idle" | "thinking" | "happy";

export function Mascot({ size = 32, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-full bg-[#FFF0D4] border-2 border-[#69421A] shadow-[0_3px_0_rgba(74,46,53,0.16)] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg style={{ width: size * 0.62, height: size * 0.62 }} viewBox="0 0 24 24">
        <circle cx="12" cy="12" fill="#FFDFBA" r="9" />
        {mood === "happy" ? (
          <>
            <path d="M7.6 11.2c.6-1 2-1 2.6 0" fill="none" stroke="#4A2810" strokeLinecap="round" strokeWidth="1.4" />
            <path d="M13.8 11.2c.6-1 2-1 2.6 0" fill="none" stroke="#4A2810" strokeLinecap="round" strokeWidth="1.4" />
          </>
        ) : (
          <>
            <circle cx="9" cy={mood === "thinking" ? 10 : 11} fill="#4A2810" r="1.5" />
            <circle cx="15" cy={mood === "thinking" ? 10 : 11} fill="#4A2810" r="1.5" />
          </>
        )}
        {mood === "thinking" ? (
          <circle cx="12" cy="16" fill="#B85D3B" r="1.1" />
        ) : (
          <path d={mood === "happy" ? "M9.5 14.5c.8 1.8 4.2 1.8 5 0" : "M10 15c.6 1 3.4 1 4 0"} fill="none" stroke="#B85D3B" strokeLinecap="round" strokeWidth="1.5" />
        )}
        <circle cx="7" cy="13" fill="#FF8C94" r="1.2" />
        <circle cx="17" cy="13" fill="#FF8C94" r="1.2" />
      </svg>
    </div>
  );
}

// 캐릭터가 하는 말풍선. 왼쪽에 꼬리가 달린다.
export function SpeechBubble({ children, tone = "cream", className = "" }: { children: React.ReactNode; tone?: "cream" | "green" | "amber"; className?: string }) {
  const palette =
    tone === "green"
      ? "bg-[#E5F5D4] border-[#AED48C] text-[#2D6C2A]"
      : tone === "amber"
        ? "bg-[#FFF1D6] border-[#F0C77A] text-[#8A5A00]"
        : "bg-[#FFF9EC] border-[#D6C2A5] text-[#5B3E29]";
  return (
    <div className={`relative rounded-2xl border-2 px-3 py-1.5 text-xs font-black leading-snug ${palette} ${className}`}>
      <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-inherit border-l-2 border-b-2 border-inherit" />
      {children}
    </div>
  );
}
