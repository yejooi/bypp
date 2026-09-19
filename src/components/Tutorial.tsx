"use client";

// 처음 들어왔을 때 뜨는 간단한 사용법. 화면 이미지는 실제 앱을 캡처한 것 (public/tutorial).
// 한 번 닫으면 localStorage에 기록해서 다시 자동으로 뜨지 않고, 헤더의 "이용 방법" 버튼으로 다시 볼 수 있다.

import { useState } from "react";
import { Mascot, SpeechBubble } from "@/components/Mascot";

export const TUTORIAL_SEEN_KEY = "bypp_tutorial_seen";

const SLIDES = [
  {
    img: "/tutorial/1-board.jpg",
    title: "장바구니, 같이 정리해요",
    lead: "장바구니에 잔뜩 담아두고 뭘 살지 못 정하는 사람을 위한 서비스예요.",
    body: "",
  },
  {
    img: "/tutorial/2-add.jpg",
    title: "① 물건을 담아요",
    lead: "\"물건 추가하기\"를 눌러요.",
    body: "장바구니 스크린샷을 올리거나, 상품 링크를 붙여 넣으면 이름과 가격, 사진이 자동으로 채워져요.",
  },
  {
    img: "/tutorial/3-sheet.jpg",
    title: "② 드래그해서 옮겨요",
    lead: "물건을 끌어서 AI 심사대, 가판대, 반품함에 놓아요.",
    body: "(클릭해서 옮길 수도 있어요)",
  },
  {
    img: "/tutorial/4-judge.jpg",
    title: "③ AI가 같이 골라 줘요",
    lead: "고민되는 물건만 AI 심사대에 올리고 판정을 받아 보세요.",
    body: "물건마다 점수가 매겨지고, 마우스를 올리면 이유가 보여요. 마음에 들면 \"가판대로 옮기기\"를 눌러요. 순서는 가판대에서 직접 바꿀 수 있고, 결정은 언제나 내가 해요.",
  },
  {
    img: "/tutorial/5-bulk.jpg",
    title: "④ 정리하면 끝!",
    lead: "예산 안 물건은 이번 달 선반, 넘는 물건은 다음 달 선반으로 자동으로 나뉘어요.",
    body: "산 물건은 계산대로, 안 사기로 한 물건은 반품함으로 보내면 목록이 가벼워져요.",
  },
] as const;

export function Tutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  if (!open) return null;
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  function close() {
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {}
    setI(0);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3 sm:p-6" onClick={close}>
      <div
        className="w-full max-w-3xl max-h-[94vh] overflow-y-auto bg-[#FFFBF2] border-4 border-[#85532F] rounded-[28px] shadow-[0_8px_0_rgba(74,46,53,0.25)] p-4 sm:p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-[#5B3E29]" style={{ fontFamily: "var(--font-gaegu)" }}>
            {s.title}
          </h2>
          <button onClick={close} className="text-xs font-bold text-[#6F523A] underline shrink-0">
            건너뛰기
          </button>
        </div>

        {/* 모든 이미지를 미리 깔아 두고 투명도만 바꿔서, 넘길 때 깜빡이거나 높이가 출렁이지 않게 한다. */}
        <div className="relative w-full aspect-[8/5] rounded-2xl overflow-hidden border-2 border-[#D6C2A5] bg-[#E8EDD6]">
          {SLIDES.map((sl, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={sl.img}
              src={sl.img}
              alt={sl.title}
              loading="eager"
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${n === i ? "opacity-100" : "opacity-0"}`}
              aria-hidden={n !== i}
            />
          ))}
        </div>

        <div className="flex items-start gap-2.5 min-h-[92px]">
          <Mascot size={44} mood={last ? "happy" : "idle"} />
          <SpeechBubble className="flex-1">
            <p className="text-sm">{s.lead}</p>
            {s.body && <p className="mt-1 text-xs font-medium leading-relaxed opacity-90">{s.body}</p>}
          </SpeechBubble>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label={`${i + 1} / ${SLIDES.length}`}>
            {SLIDES.map((_, n) => (
              <button
                key={n}
                onClick={() => setI(n)}
                aria-label={`${n + 1}번째 설명`}
                className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-[#4F8B33]" : "w-2 bg-[#D4C3A3] hover:bg-[#B89A72]"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => setI(i - 1)}
                className="px-4 py-1.5 rounded-2xl border-2 border-[#D4C3A3] bg-[#EFE8D6] text-[#694D36] text-lg font-black active:translate-y-0.5 transition"
                style={{ fontFamily: "var(--font-gaegu)" }}
              >
                이전
              </button>
            )}
            <button
              onClick={() => (last ? close() : setI(i + 1))}
              className="btn-soft-green px-8 py-1.5 rounded-2xl text-lg"
              style={{ fontFamily: "var(--font-gaegu)" }}
            >
              {last ? "시작하기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
