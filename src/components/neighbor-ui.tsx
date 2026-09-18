// 이웃 위시리스트 화면들이 함께 쓰는 작은 조각들 (동물의 숲 스킨: 나무 간판, 천 패치, 컨베이어).

export const SHADOW_AC = "shadow-[0_6px_0_rgba(74,46,53,0.18)]";
export const SHADOW_AC_SM = "shadow-[0_3px_0_rgba(74,46,53,0.16)]";
export const HAND = { fontFamily: "var(--font-gaegu)" } as const;

const AVATAR_COLORS = ["#F6C644", "#8BC34A", "#E68759", "#7FB7D9", "#C9A0DC", "#F29CA3"];

export function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 48, src }: { name: string; size?: number; src?: string | null }) {
  return (
    <div
      className={`shrink-0 rounded-full border-[3px] border-[#69421A] flex items-center justify-center font-black text-[#4A2810] overflow-hidden ${SHADOW_AC_SM}`}
      style={{ width: size, height: size, backgroundColor: avatarColor(name), fontSize: size * 0.42, ...HAND }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}

// 사진을 정사각형으로 잘라 160px JPEG data URL로 줄인다.
export async function fileToAvatarDataUrl(file: File, size = 160): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 나무 간판 제목 (가판대와 같은 나무결).
export function WoodSign({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`wood-grain rounded-2xl border-2 border-[#5E371C] ${SHADOW_AC_SM} px-5 py-2.5 text-xl sm:text-2xl text-[#FFF3DE] tracking-tight inline-flex items-center gap-2`}
      style={HAND}
    >
      {children}
    </div>
  );
}

type SectionKind = "pouch" | "stall" | "checkout";

const TITLE_STYLE: Record<SectionKind, React.CSSProperties> = {
  pouch: {
    color: "#5B3E29",
    backgroundColor: "#E3CD98",
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(0,0,0,0.05))",
    outline: "2px dashed rgba(255,255,255,0.7)",
    outlineOffset: "-5px",
    boxShadow: "0 2px 0 rgba(120,80,40,0.25)",
    borderRadius: "12px",
  },
  stall: {
    color: "#FFF3DE",
    backgroundColor: "#a36b3e",
    backgroundImage: "repeating-linear-gradient(0deg, #966035, #966035 8px, #aa7242 8px, #aa7242 16px)",
    border: "2px solid #5E371C",
    borderRadius: "12px",
    boxShadow: "0 3px 0 rgba(74,46,53,0.16)",
  },
  checkout: {
    color: "#FFF3DE",
    backgroundColor: "#4A4A4A",
    backgroundImage: "repeating-linear-gradient(90deg, #5C5C5C 0 6px, #454545 6px 12px)",
    borderTop: "3px solid #2B2B2B",
    borderBottom: "3px solid #2B2B2B",
    borderRadius: "999px",
    boxShadow: "0 2px 0 rgba(0,0,0,0.25)",
  },
};

export function SectionTitle({ kind, children, count }: { kind: SectionKind; children: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <h2 className="px-5 py-1 text-xl font-bold tracking-tight" style={{ ...HAND, ...TITLE_STYLE[kind] }}>
        {children}
      </h2>
      <span className="text-xs font-black text-[#2D6C2A] bg-[#DCF2C7] px-2.5 py-0.5 rounded-full border border-[#AED48C]">
        {count}개
      </span>
    </div>
  );
}
