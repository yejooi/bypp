// 시그니처 캐릭터 (CLAUDE.md 8-2): 하단 바에서 목표까지 달리고, AI 판정 때는 말하는 화자가 된다.
// 한 캐릭터가 두 역할을 겸하고, 표정(mood)만 바뀐다.

export type MascotMood = "idle" | "thinking" | "happy";

// 치즈냥이: 앉아 있는 실루엣 하나로 이어진 부드러운 고양이. 외곽선 없이 색으로만 그리고, 얼굴은 최소한만 둔다.
// 표정(mood)만 바뀌고, 행복할 땐 꼬리가 위로 올라간다.
export function Mascot({ size = 32, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  const eyeY = mood === "thinking" ? 15.6 : 16.4;
  const tail = mood === "happy" ? "M34 43.5 C45 44 46.5 31 40.5 25.5" : "M34 44 C45.5 44.5 46.5 36 42 31";
  return (
    <svg className={`shrink-0 ${className}`} style={{ width: size, height: size }} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="cat-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9B95F" />
          <stop offset="1" stopColor="#EE9B3F" />
        </linearGradient>
      </defs>
      {/* 바닥 그림자 */}
      <ellipse cx="24" cy="45.6" rx="13" ry="1.6" fill="rgba(74,46,53,0.14)" />
      {/* 꼬리 (실루엣 뒤로 감김) */}
      <path d={tail} fill="none" stroke="#EE9B3F" strokeWidth="4.6" strokeLinecap="round" />
      <path d={mood === "happy" ? "M41.2 26.4 L40.4 25.4" : "M42.2 31.8 L41.8 31"} stroke="#FFF4DE" strokeWidth="4.6" strokeLinecap="round" />
      {/* 몸+머리가 하나로 이어진 실루엣 */}
      <path
        d="M14.6 3 L21.2 8.9 Q24 8.1 26.8 8.9 L33.4 3 C34.6 6 35.4 9.4 35.8 13.4 C36 17.6 34.6 21.2 32.2 23.4 C32.3 24.7 32.4 26 32.8 27.2 C37 30 37.6 39 35.6 45 L13.4 45 C11.4 39 12 30 15.2 27.2 C15.6 26 15.7 24.7 15.8 23.4 C13.4 21.2 12 17.6 12.2 13.4 C12.6 9.4 13.4 6 14.6 3 Z"
        fill="url(#cat-fur)"
      />
      {/* 속귀 */}
      <path d="M15.4 6.4 L19.2 9.6 L15.2 10.6 Z" fill="#FFB9B2" opacity="0.9" />
      <path d="M32.6 6.4 L28.8 9.6 L32.8 10.6 Z" fill="#FFB9B2" opacity="0.9" />
      {/* 가슴·배 (부드러운 크림색) */}
      <path d="M24 27 C20.6 27.6 19.6 34 20.4 45 L27.6 45 C28.4 34 27.4 27.6 24 27 Z" fill="#FFF4DE" />
      {/* 이마와 몸통 줄무늬: 실루엣 안에서만 은은하게 */}
      <path d="M24 9.4 V12.4 M20.6 10.2 L21.2 12.4 M27.4 10.2 L26.8 12.4" stroke="#E0842A" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      <path d="M13.4 33 H17 M13 37.4 H16.8 M34.6 33 H31 M35 37.4 H31.2" stroke="#E0842A" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      {/* 앞발 */}
      <path d="M17.6 45 C17.4 42.6 20.6 42.4 21.4 45 Z M26.6 45 C27.4 42.4 30.6 42.6 30.4 45 Z" fill="#FFF4DE" />
      {/* 눈 */}
      {mood === "happy" ? (
        <>
          <path d="M16.4 16.6 q2.2-2.6 4.4 0" fill="none" stroke="#3B2314" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M27.2 16.6 q2.2-2.6 4.4 0" fill="none" stroke="#3B2314" strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="18.6" cy={eyeY} rx="1.3" ry="1.9" fill="#3B2314" />
          <ellipse cx="29.4" cy={eyeY} rx="1.3" ry="1.9" fill="#3B2314" />
          <circle cx="19" cy={eyeY - 0.7} r="0.5" fill="#fff" />
          <circle cx="29.8" cy={eyeY - 0.7} r="0.5" fill="#fff" />
        </>
      )}
      {/* 코 + 입 */}
      <path d="M23 19.4 H25 L24 20.6 Z" fill="#E98585" />
      {mood === "thinking" ? (
        <circle cx="24" cy="22.6" r="0.7" fill="#B4574F" />
      ) : mood === "happy" ? (
        <path d="M21.8 21.6 q1.1 1.9 2.2 0 q1.1 1.9 2.2 0" fill="#FFB9B2" />
      ) : (
        <path d="M22 21.8 q1 1.2 2 0 q1 1.2 2 0" fill="none" stroke="#B4574F" strokeWidth="0.7" strokeLinecap="round" />
      )}
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
