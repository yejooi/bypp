// 시그니처 캐릭터 (CLAUDE.md 8-2): 하단 바에서 목표까지 달리고, AI 판정 때는 말하는 화자가 된다.
// 한 캐릭터가 두 역할을 겸하고, 표정(mood)만 바뀐다.

export type MascotMood = "idle" | "thinking" | "happy";

// 치즈냥이: 주황 태비 얼굴. 표정(mood)만 바뀐다.
export function Mascot({ size = 32, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  const eyeY = mood === "thinking" ? 17 : 18;
  return (
    <svg
      className={`shrink-0 drop-shadow-[0_2px_0_rgba(74,46,53,0.18)] ${className}`}
      style={{ width: size, height: size }}
      viewBox="0 0 40 40"
      aria-hidden
    >
      {/* 귀 */}
      <path d="M6 16 L7 4 L17 10 Z" fill="#F2A24A" stroke="#8A4B1E" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M34 16 L33 4 L23 10 Z" fill="#F2A24A" stroke="#8A4B1E" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.6 12.5 L8.9 7.6 L13 10 Z" fill="#FFB7B0" />
      <path d="M31.4 12.5 L31.1 7.6 L27 10 Z" fill="#FFB7B0" />
      {/* 얼굴 */}
      <ellipse cx="20" cy="22" rx="16" ry="14" fill="#F8B45A" stroke="#8A4B1E" strokeWidth="1.6" />
      {/* 이마 줄무늬 */}
      <path d="M20 9 V13" stroke="#D97F2B" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 10.5 L16.3 13.5" stroke="#D97F2B" strokeWidth="2" strokeLinecap="round" />
      <path d="M24.5 10.5 L23.7 13.5" stroke="#D97F2B" strokeWidth="2" strokeLinecap="round" />
      {/* 볼 무늬 */}
      <path d="M4.6 22 H8.4" stroke="#D97F2B" strokeWidth="2" strokeLinecap="round" />
      <path d="M35.4 22 H31.6" stroke="#D97F2B" strokeWidth="2" strokeLinecap="round" />
      {/* 주둥이 */}
      <ellipse cx="20" cy="26.5" rx="6.5" ry="5" fill="#FFF3DC" />
      {/* 눈 */}
      {mood === "happy" ? (
        <>
          <path d="M9.5 19 q3-3.4 6 0" fill="none" stroke="#3B2314" strokeWidth="2" strokeLinecap="round" />
          <path d="M24.5 19 q3-3.4 6 0" fill="none" stroke="#3B2314" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="12.5" cy={eyeY} rx="2.4" ry="3" fill="#3B2314" />
          <ellipse cx="27.5" cy={eyeY} rx="2.4" ry="3" fill="#3B2314" />
          <circle cx="13.3" cy={eyeY - 1.1} r="0.9" fill="#fff" />
          <circle cx="28.3" cy={eyeY - 1.1} r="0.9" fill="#fff" />
        </>
      )}
      {/* 코 + 입 */}
      <path d="M18.4 23.6 H21.6 L20 25.4 Z" fill="#F08A8A" stroke="#C25B5B" strokeWidth="0.6" strokeLinejoin="round" />
      {mood === "thinking" ? (
        <circle cx="20" cy="29" r="1.1" fill="#C25B5B" />
      ) : mood === "happy" ? (
        <path d="M16.6 27.4 q1.7 3 3.4 0 q1.7 3 3.4 0" fill="#FFB7B0" stroke="#8A4B1E" strokeWidth="1.1" strokeLinejoin="round" />
      ) : (
        <path d="M17 27.6 q1.5 1.8 3 0 q1.5 1.8 3 0" fill="none" stroke="#8A4B1E" strokeWidth="1.2" strokeLinecap="round" />
      )}
      {/* 수염 */}
      <path d="M2.5 25 L9.5 26" stroke="#8A4B1E" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M2.8 29 L9.8 28" stroke="#8A4B1E" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M37.5 25 L30.5 26" stroke="#8A4B1E" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M37.2 29 L30.2 28" stroke="#8A4B1E" strokeWidth="0.9" strokeLinecap="round" />
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
