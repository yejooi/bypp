// 시그니처 캐릭터 (CLAUDE.md 8-2): 하단 바에서 목표까지 달리고, AI 판정 때는 말하는 화자가 된다.
// 한 캐릭터가 두 역할을 겸하고, 표정(mood)만 바뀐다.

export type MascotMood = "idle" | "thinking" | "happy";

// 치즈냥이: 앉아 있는 주황 태비. 표정(mood)만 바뀌고, 행복할 땐 꼬리가 더 높이 올라간다.
export function Mascot({ size = 32, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  const eyeY = mood === "thinking" ? 15.6 : 16.6;
  const O = "#8A4B1E"; // 외곽선
  return (
    <svg
      className={`shrink-0 drop-shadow-[0_2px_0_rgba(74,46,53,0.16)] ${className}`}
      style={{ width: size, height: size }}
      viewBox="0 0 48 48"
      aria-hidden
    >
      {/* 꼬리 (몸 뒤) */}
      <path
        d={mood === "happy" ? "M35 42 C46 42 47 30 41 25" : "M35 43 C46 44 47 36 43 32"}
        fill="none"
        stroke={O}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={mood === "happy" ? "M35 42 C46 42 47 30 41 25" : "M35 43 C46 44 47 36 43 32"}
        fill="none"
        stroke="#F2A24A"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* 몸 */}
      <path d="M13 44 C10 34 14 27 24 27 C34 27 38 34 35 44 Z" fill="#F8B45A" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 몸 줄무늬 */}
      <path d="M14.6 33 H18" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.8 37.5 H17.4" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M33.4 33 H30" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M34.2 37.5 H30.6" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      {/* 배 */}
      <ellipse cx="24" cy="37" rx="5.5" ry="6.5" fill="#FFF3DC" />
      {/* 앞발 */}
      <ellipse cx="19.5" cy="44" rx="4" ry="2.6" fill="#FFF3DC" stroke={O} strokeWidth="1.4" />
      <ellipse cx="28.5" cy="44" rx="4" ry="2.6" fill="#FFF3DC" stroke={O} strokeWidth="1.4" />
      {/* 귀 */}
      <path d="M11.5 14 L12 3.5 L20 8.5 Z" fill="#F2A24A" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M36.5 14 L36 3.5 L28 8.5 Z" fill="#F2A24A" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13.4 11 L13.6 6.6 L17 8.8 Z" fill="#FFB7B0" />
      <path d="M34.6 11 L34.4 6.6 L31 8.8 Z" fill="#FFB7B0" />
      {/* 머리 */}
      <ellipse cx="24" cy="18" rx="13" ry="11" fill="#F8B45A" stroke={O} strokeWidth="1.6" />
      {/* 이마 줄무늬 */}
      <path d="M24 8 V11.4" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19.8 9 L20.5 11.8" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M28.2 9 L27.5 11.8" stroke="#D97F2B" strokeWidth="1.8" strokeLinecap="round" />
      {/* 주둥이 */}
      <ellipse cx="24" cy="22.4" rx="5.4" ry="4" fill="#FFF3DC" />
      {/* 눈 */}
      {mood === "happy" ? (
        <>
          <path d="M14.6 16.4 q2.6-3 5.2 0" fill="none" stroke="#3B2314" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M28.2 16.4 q2.6-3 5.2 0" fill="none" stroke="#3B2314" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="17.2" cy={eyeY} rx="2.1" ry="2.7" fill="#3B2314" />
          <ellipse cx="30.8" cy={eyeY} rx="2.1" ry="2.7" fill="#3B2314" />
          <circle cx="17.9" cy={eyeY - 1} r="0.8" fill="#fff" />
          <circle cx="31.5" cy={eyeY - 1} r="0.8" fill="#fff" />
        </>
      )}
      {/* 코 + 입 */}
      <path d="M22.6 19.8 H25.4 L24 21.4 Z" fill="#F08A8A" stroke="#C25B5B" strokeWidth="0.5" strokeLinejoin="round" />
      {mood === "thinking" ? (
        <circle cx="24" cy="24.6" r="1" fill="#C25B5B" />
      ) : mood === "happy" ? (
        <path d="M21 23.2 q1.5 2.8 3 0 q1.5 2.8 3 0" fill="#FFB7B0" stroke={O} strokeWidth="1" strokeLinejoin="round" />
      ) : (
        <path d="M21.4 23.4 q1.3 1.6 2.6 0 q1.3 1.6 2.6 0" fill="none" stroke={O} strokeWidth="1.1" strokeLinecap="round" />
      )}
      {/* 수염 */}
      <path d="M8 20.5 L14.6 21.4" stroke={O} strokeWidth="0.8" strokeLinecap="round" />
      <path d="M8.4 24 L14.8 23.2" stroke={O} strokeWidth="0.8" strokeLinecap="round" />
      <path d="M40 20.5 L33.4 21.4" stroke={O} strokeWidth="0.8" strokeLinecap="round" />
      <path d="M39.6 24 L33.2 23.2" stroke={O} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
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
