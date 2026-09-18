// 시그니처 캐릭터 (CLAUDE.md 8-2): 하단 바에서 목표까지 달리고, AI 판정 때는 말하는 화자가 된다.
// 한 캐릭터가 두 역할을 겸하고, 표정(mood)만 바뀐다.

export type MascotMood = "idle" | "thinking" | "happy";

// 치즈냥이: 앉아 있는 주황 태비. 가는 선, 갸름한 얼굴, 뾰족한 귀. 표정(mood)만 바뀌고 행복할 땐 꼬리가 올라간다.
export function Mascot({ size = 32, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  const eyeY = mood === "thinking" ? 15.2 : 16;
  const O = "#9A5A26"; // 얇은 외곽선
  const tail = mood === "happy" ? "M31.5 43 C44 44 45 30 39 23" : "M31.5 43.5 C43 45 45 37 41 31";
  return (
    <svg
      className={`shrink-0 drop-shadow-[0_1px_0_rgba(74,46,53,0.14)] ${className}`}
      style={{ width: size, height: size }}
      viewBox="0 0 48 48"
      aria-hidden
    >
      {/* 꼬리 (몸 뒤) */}
      <path d={tail} fill="none" stroke={O} strokeWidth="4.4" strokeLinecap="round" />
      <path d={tail} fill="none" stroke="#F4A94F" strokeWidth="3" strokeLinecap="round" />
      {/* 몸 */}
      <path d="M16.5 44.5 C14.5 35 18 28 24 28 C30 28 33.5 35 31.5 44.5 Z" fill="#F7B15A" stroke={O} strokeWidth="1" strokeLinejoin="round" />
      {/* 몸 줄무늬 */}
      <path d="M17 33 H19.6 M16.4 37 H19.2 M31 33 H28.4 M31.6 37 H28.8" stroke="#E08A30" strokeWidth="1.1" strokeLinecap="round" />
      {/* 배 */}
      <path d="M21 44.5 C20 38 21.5 33 24 33 C26.5 33 28 38 27 44.5 Z" fill="#FFF4DE" />
      {/* 앞발 */}
      <path d="M18.6 44.5 C18.3 42.4 21 42.2 21.6 44.5 Z" fill="#FFF4DE" stroke={O} strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M26.4 44.5 C27 42.2 29.7 42.4 29.4 44.5 Z" fill="#FFF4DE" stroke={O} strokeWidth="0.9" strokeLinejoin="round" />
      {/* 귀 */}
      <path d="M13.6 14.5 L13 1.8 L22 8.6 Z" fill="#F4A94F" stroke={O} strokeWidth="1" strokeLinejoin="round" />
      <path d="M34.4 14.5 L35 1.8 L26 8.6 Z" fill="#F4A94F" stroke={O} strokeWidth="1" strokeLinejoin="round" />
      <path d="M14.8 11.6 L14.6 5.6 L19.4 9 Z" fill="#FFB9B2" />
      <path d="M33.2 11.6 L33.4 5.6 L28.6 9 Z" fill="#FFB9B2" />
      {/* 머리: 살짝 갸름하게 */}
      <path
        d="M12.4 17 C12.4 11 17.4 8.4 24 8.4 C30.6 8.4 35.6 11 35.6 17 C35.6 22.6 31 26.6 24 26.6 C17 26.6 12.4 22.6 12.4 17 Z"
        fill="#F7B15A"
        stroke={O}
        strokeWidth="1"
      />
      {/* 이마 줄무늬 */}
      <path d="M24 8.8 V12 M20.4 9.6 L21 12 M27.6 9.6 L27 12" stroke="#E08A30" strokeWidth="1.2" strokeLinecap="round" />
      {/* 볼 줄무늬 */}
      <path d="M12.8 19 H15.4 M35.2 19 H32.6" stroke="#E08A30" strokeWidth="1.1" strokeLinecap="round" />
      {/* 주둥이 */}
      <path d="M20 21.4 C20 19.8 22 19.4 24 19.4 C26 19.4 28 19.8 28 21.4 C28 23.6 26.4 24.6 24 24.6 C21.6 24.6 20 23.6 20 21.4 Z" fill="#FFF4DE" />
      {/* 눈 */}
      {mood === "happy" ? (
        <>
          <path d="M15.4 16.4 q2.2-2.6 4.4 0" fill="none" stroke="#3B2314" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M28.2 16.4 q2.2-2.6 4.4 0" fill="none" stroke="#3B2314" strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="17.6" cy={eyeY} rx="1.5" ry="2.1" fill="#3B2314" />
          <ellipse cx="30.4" cy={eyeY} rx="1.5" ry="2.1" fill="#3B2314" />
          <circle cx="18.1" cy={eyeY - 0.8} r="0.6" fill="#fff" />
          <circle cx="30.9" cy={eyeY - 0.8} r="0.6" fill="#fff" />
        </>
      )}
      {/* 코 + 입 */}
      <path d="M22.9 19.9 H25.1 L24 21.1 Z" fill="#EE8F8F" />
      {mood === "thinking" ? (
        <circle cx="24" cy="23.4" r="0.8" fill="#C25B5B" />
      ) : mood === "happy" ? (
        <path d="M21.6 22.2 q1.2 2 2.4 0 q1.2 2 2.4 0" fill="#FFB9B2" stroke={O} strokeWidth="0.7" strokeLinejoin="round" />
      ) : (
        <path d="M21.8 22.4 q1.1 1.3 2.2 0 q1.1 1.3 2.2 0" fill="none" stroke={O} strokeWidth="0.8" strokeLinecap="round" />
      )}
      {/* 수염 */}
      <path d="M10 20.4 L15.4 21 M10.4 23 L15.6 22.4 M38 20.4 L32.6 21 M37.6 23 L32.4 22.4" stroke={O} strokeWidth="0.55" strokeLinecap="round" />
    </svg>
  );
}

// 캐릭터가 하는 말풍선. tail="left": 캐릭터가 왼쪽 옆에 있을 때, tail="top": 캐릭터가 위에 있을 때.
const TONES = {
  cream: { bg: "#FFF9EC", border: "#D6C2A5", text: "#5B3E29" },
  green: { bg: "#E5F5D4", border: "#AED48C", text: "#2D6C2A" },
  amber: { bg: "#FFF1D6", border: "#F0C77A", text: "#8A5A00" },
} as const;

export function SpeechBubble({
  children,
  tone = "cream",
  tail = "left",
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  tail?: "left" | "top";
  className?: string;
}) {
  const c = TONES[tone];
  return (
    <div
      className={`relative rounded-2xl border-2 px-3.5 py-2 text-xs font-black leading-snug ${className}`}
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
    >
      <span
        className="absolute w-2.5 h-2.5 rotate-45"
        style={
          tail === "left"
            ? { left: -7, top: "50%", marginTop: -5, backgroundColor: c.bg, borderLeft: `2px solid ${c.border}`, borderBottom: `2px solid ${c.border}` }
            : { top: -7, left: 22, backgroundColor: c.bg, borderLeft: `2px solid ${c.border}`, borderTop: `2px solid ${c.border}` }
        }
      />
      {children}
    </div>
  );
}
