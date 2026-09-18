"use client";

// 보드 화면. 비주얼은 stitch_custom_ui_design_system-2/code.html(동물의 숲 스킨)을 그대로 옮겼다.
// 단, 화폐는 "벨" 대신 "원" 유지 (사용자 결정).
// 기능: 아이템 주머니(cart)에서 "AI에게 우선순위 배정 부탁하기" -> 판정 후 쇼케이스(buy)로 자동 진열.
// 옮기기/빼기/내리기는 드래그.

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useApp, type Item } from "@/lib/store";
import { AddItemForm } from "@/components/AddItemForm";
import { ScreenshotImportForm } from "@/components/ScreenshotImportForm";
import { CartIcon } from "@/components/icons";
import {
  computeScores,
  positiveMessage,
  smallGapMessage,
  bigGapMessage,
  DEFAULT_QUAL_WEIGHT,
  type LlmEstimate,
} from "@/lib/scoring";

type EvalState = "idle" | "loading" | "ready" | "error";

const SHADOW_AC = "shadow-[0_6px_0_rgba(74,46,53,0.18)]";
const SHADOW_AC_SM = "shadow-[0_3px_0_rgba(74,46,53,0.16)]";
const SHADOW_INNER = "shadow-[inset_0_3px_6px_rgba(0,0,0,0.1)]";

const won = (n: number) => `${n.toLocaleString()}원`;
const short = (n: number) => (n >= 10000 ? `${+(n / 10000).toFixed(1)}만원` : `${n.toLocaleString()}원`);

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l2.4 7.2L22 10l-6 4.8 2.4 7.2L12 17.5 5.6 22 8 14.8 2 10l7.6-.8z" />
    </svg>
  );
}

function BagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2z" />
    </svg>
  );
}

export default function BoardPage() {
  const { goalType, monthlyBudget, items, moveItem } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const [evalState, setEvalState] = useState<EvalState>("idle");
  const [llmEstimates, setLlmEstimates] = useState<LlmEstimate[] | null>(null);
  // wayfinder #5 결정: 30~100 슬라이더 (0=가격순, 100=AI 판단), 기본값 65.
  const [qualWeight, setQualWeight] = useState(Math.round(DEFAULT_QUAL_WEIGHT * 100));
  const [revealedCount, setRevealedCount] = useState(0);
  const [userPick, setUserPick] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"link" | "screenshot">("link");
  // 판정대에 올려둔 아이템 id. 순위 판정은 여기 있는 것만 대상으로 한다 (DB 상태는 cart 그대로).
  const [judgeIds, setJudgeIds] = useState<string[]>([]);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 4 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  const cartItems = items.filter((it) => it.status === "cart");
  const buyItems = items.filter((it) => it.status === "buy");
  const judgeItems = cartItems.filter((it) => judgeIds.includes(it.id));
  const pouchItems = cartItems.filter((it) => !judgeIds.includes(it.id));
  const cartSum = cartItems.reduce((s, it) => s + it.price, 0);
  const buySum = buyItems.reduce((s, it) => s + it.price, 0);

  // 순위 배정 후 쇼케이스에 뜬 항목들을 위에서부터 순차적으로 드러낸다 (§8-1).
  useEffect(() => {
    if (evalState !== "ready") return;
    const total = buyItems.length;
    for (let i = 0; i < total; i++) {
      setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), i * 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalState]);

  const budget = monthlyBudget ?? 0;

  const scored =
    evalState === "ready" && llmEstimates
      ? computeScores(
          buyItems.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            category: it.category,
            reasonCode: it.reasonCode,
          })),
          llmEstimates,
          qualWeight / 100
        )
      : null;

  const buyItemById = new Map(buyItems.map((it) => [it.id, it]));
  const orderedIds =
    evalState === "ready" && scored
      ? scored.map((s) => s.id)
      : [...buyItems].sort((a, b) => b.price - a.price).map((it) => it.id);
  const scoredById = new Map((scored ?? []).map((s) => [s.id, s]));

  let cumulative = 0;
  let overBudgetIndex = 0;
  const rows = orderedIds.flatMap((id, i) => {
    const item = buyItemById.get(id);
    if (!item) return [];
    const before = cumulative;
    cumulative += item.price;
    const overBudget = before >= budget && budget > 0;
    const message =
      evalState === "ready"
        ? overBudget
          ? overBudgetIndex++ === 0
            ? smallGapMessage(item.price - Math.max(0, budget - before))
            : bigGapMessage(2)
          : i === 0
            ? positiveMessage()
            : null
        : null;
    const reasoning = evalState === "ready" ? scoredById.get(id)?.reasoning ?? null : null;
    return [{ item, overBudget, message, reasoning, index: i }];
  });

  const shelf1 = rows.filter((r) => !r.overBudget);
  const shelf2 = rows.filter((r) => r.overBudget);
  const overAmount = Math.max(0, buySum - budget);

  const topPick = evalState === "ready" && scored ? scored[0] : null;
  const pickedItem = scored?.find((s) => s.id === userPick) ?? null;
  const showGapExplanation = evalState === "ready" && pickedItem && topPick && pickedItem.id !== topPick.id;

  // 순위 배정: 아이템 주머니(cart)에서 시작 -> 판정 끝나면 쇼케이스(buy)로 자동 승격.
  // llmEstimates는 id 기준으로 병합해서 여러 번 나눠 배정해도 누적 전체가 같은 기준으로 다시 랭킹된다.
  async function handleEvaluate() {
    if (judgeItems.length === 0) return;
    setEvalState("loading");
    const toPromote = judgeItems;
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: toPromote.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            category: it.category,
            reasonCode: it.reasonCode,
            customReason: it.customReason,
          })),
        }),
      });
      if (!res.ok) throw new Error("eval_failed");
      const data: { items: LlmEstimate[] } = await res.json();
      const newIds = new Set(data.items.map((e) => e.id));
      setLlmEstimates((prev) => [...(prev ?? []).filter((e) => !newIds.has(e.id)), ...data.items]);
      toPromote.forEach((it) => moveItem(it.id, "buy"));
      setJudgeIds((prev) => prev.filter((id) => !newIds.has(id)));
      setEvalState("ready");
      setRevealedCount(0);
    } catch {
      setEvalState("error");
    }
  }

  const activeItem = items.find((it) => it.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const zone = String(over.id);
    const status = items.find((it) => it.id === id)?.status;
    if (zone === "judge-zone") {
      if (status !== "cart") moveItem(id, "cart");
      setJudgeIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    setJudgeIds((prev) => prev.filter((x) => x !== id));
    if (zone === "cart-zone") {
      if (status !== "cart") moveItem(id, "cart");
    } else if (zone === "buy-zone") moveItem(id, "buy");
    else if (zone === "toss-zone") moveItem(id, "removed");
    else if (zone === "flush-zone") moveItem(id, "purchased");
  }

  const pouchSlots = Math.max(10, Math.ceil(pouchItems.length / 5) * 5);
  const judgeSlots = Math.max(5, Math.ceil(judgeItems.length / 5) * 5);
  const shelf1Slots = Math.max(8, Math.ceil(shelf1.length / 4) * 4);
  const shelf2Slots = Math.max(4, Math.ceil(shelf2.length / 4) * 4);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grass-bg flex-1 text-[#4A3324]">
        <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-16 pb-32 flex flex-col gap-5">
          {/* 헤더 */}
          <header
            className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FFF9EC]/90 backdrop-blur-md p-4 rounded-[28px] border-[3px] border-[#D6C2A5] ${SHADOW_AC}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`relative w-12 h-12 rounded-2xl bg-[#F6C644] border-2 border-[#C9981A] ${SHADOW_AC_SM} flex items-center justify-center shrink-0 text-[#8C5500] font-black text-xl`}
              >
                ₩
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#5D8A37] text-white text-xs font-black rounded-full flex items-center gap-1">
                    <LeafIcon className="w-3 h-3 text-[#BEE88A]" />
                    목표: {goalType ?? "-"}
                  </span>
                  <span className="text-xs text-[#8C6D53] font-bold">이번 달 예산:</span>
                  <span className="bg-[#FFF0D4] border-2 border-[#F6C644] text-[#A75D00] font-black text-sm sm:text-base px-2.5 py-0.5 rounded-full">
                    {won(budget)}
                  </span>
                </div>
                <p className="mt-1" style={{ fontFamily: "var(--font-gaegu)" }}>
                  <span className="text-base text-[#467A26] font-bold">
                    주머니 아이템을 꺼내 가판대 쇼케이스에 올려보세요!
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-center">
              <div
                className={`bg-[#784A28] border-2 border-[#573318] text-[#FFF3DE] px-4 py-2 rounded-2xl ${SHADOW_AC_SM} flex items-center gap-3`}
              >
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-[#FFD8A8] font-bold">담긴 금액 총합</span>
                  <span className="text-sm font-black text-[#FFDE59] tracking-tight">{won(cartSum + buySum)}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#FFDE59] border border-[#B37400] flex items-center justify-center text-[#734500]">
                  <BagIcon className="w-4 h-4" />
                </div>
              </div>
            </div>
          </header>

          {/* 항목 등록 (우드 팻말) */}
          <section
            className={`bg-[#FFFBF2] rounded-[28px] border-[3px] border-[#D6C2A5] p-4 sm:p-5 ${SHADOW_AC} relative overflow-hidden`}
          >
            <div className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full bg-[#9E7A56] border border-[#6B4F33]" />
            <div className="absolute right-3 top-3 w-2.5 h-2.5 rounded-full bg-[#9E7A56] border border-[#6B4F33]" />
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={() => setAddMode("link")}
                className={`px-4 py-1.5 text-xs sm:text-sm font-black rounded-full transition-all flex items-center gap-1.5 ${
                  addMode === "link"
                    ? `bg-[#4F8B33] text-white ${SHADOW_AC_SM}`
                    : "bg-[#EFE8D6] text-[#694D36] border-2 border-[#D4C3A3]"
                }`}
              >
                <LeafIcon className="w-3.5 h-3.5" />
                링크로 주머니에 넣기
              </button>
              <button
                onClick={() => setAddMode("screenshot")}
                className={`px-4 py-1.5 text-xs sm:text-sm font-black rounded-full transition-all flex items-center gap-1.5 ${
                  addMode === "screenshot"
                    ? `bg-[#4F8B33] text-white ${SHADOW_AC_SM}`
                    : "bg-[#EFE8D6] text-[#694D36] border-2 border-[#D4C3A3]"
                }`}
              >
                스샷으로 넣기
              </button>
            </div>
            {addMode === "link" ? <AddItemForm /> : <ScreenshotImportForm />}
          </section>

          {/* 인벤토리 주머니 vs 가판대 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* LEFT: 아이템 주머니 */}
            <ZoneShell
              id="cart-zone"
              className={`flex flex-col rounded-[36px] border-4 border-[#C8B693] bg-[#EFE8D6] p-5 sm:p-6 relative ${SHADOW_AC} overflow-hidden`}
            >
              <div className="absolute inset-2.5 rounded-[30px] border-2 border-dashed border-[#CCBFA3] pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between pb-2 mb-3 border-b-2 border-[#D9CDAF]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-[#E68759] border-2 border-[#9F512B] flex items-center justify-center text-white ${SHADOW_AC_SM} p-2 shrink-0`}
                  >
                    <CartIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-[#5B3E29] tracking-tight">아이템 주머니</h2>
                      <span className="text-xs font-black text-[#2D6C2A] bg-[#DCF2C7] px-2.5 py-0.5 rounded-full border border-[#AED48C]">
                        {cartItems.length}/20 보관 중
                      </span>
                    </div>
                    <p className="text-xs text-[#826954] mt-0.5 font-medium">
                      일반 보관 주머니와 AI 우선순위 판정대로 나뉘어 있어요
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-[#8C6D53]">주머니 합계</span>
                  <p className="text-sm font-black text-[#7A4924]">{won(cartSum)}</p>
                </div>
              </div>

              <div
                className={`relative z-10 flex flex-col gap-2 mb-3 bg-[#E2D9C2]/80 rounded-[24px] border-2 border-[#C2B18E] p-3 ${SHADOW_INNER}`}
              >
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5D8A37]" />
                  <h3 className="text-xs font-black text-[#5B3E29]">내 주머니 (일반 보관)</h3>
                  <span className="text-[10px] font-bold text-[#2D6C2A] bg-[#DCF2C7] px-2 rounded-full border border-[#AED48C]">
                    {pouchItems.length}/{pouchSlots} 보관
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                  {pouchItems.map((it) => (
                    <ItemTile key={it.id} item={it} />
                  ))}
                  {Array.from({ length: pouchSlots - pouchItems.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="pocket-slot w-full aspect-square rounded-2xl flex items-center justify-center opacity-60"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C9BFAB]" />
                    </div>
                  ))}
                </div>
              </div>

              <JudgeShell
                className={`relative z-10 flex flex-col gap-2 bg-[#FFFDF0] rounded-[26px] border-[3px] border-dashed border-[#F6C644] p-3.5 ${SHADOW_AC_SM}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FFDE59] border border-[#B37400] flex items-center justify-center text-[#734500]">
                      <StarIcon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-black text-[#693E00]">AI 지름 우선순위 판정대</h3>
                    <span className="text-[10px] font-bold text-[#A16500] bg-[#FFF0D4] px-2 rounded-full border border-[#D9BA8B]">
                      연구소 바구니
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#4FA429] bg-[#E4F5D2] px-2 py-0.5 rounded-full border border-[#BBDC9F]">
                    {judgeItems.length}개 후보 대기 중
                  </span>
                </div>
                <p className="text-[11px] text-[#7A5B3E] font-medium leading-tight">
                  순위를 정하고 싶은 아이템만 위 주머니에서 이 칸으로 끌어다 놓으세요. 버튼을 누르면 여기 있는 아이템만
                  AI가 예산과 필요도를 따져 우측 선반에 자동 진열해요!
                </p>
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5 py-1">
                  {judgeItems.map((it) => (
                    <ItemTile key={it.id} item={it} badge={{ text: "판정 대기", kind: "gold" }} />
                  ))}
                  {Array.from({ length: judgeSlots - judgeItems.length }).map((_, i) => (
                    <div
                      key={`judge-empty-${i}`}
                      className="w-full aspect-square rounded-2xl bg-[#FFF9EC] border-2 border-dashed border-[#D6C2A0] flex flex-col items-center justify-center text-center p-1"
                    >
                      <span className="text-[#A8582C] text-sm font-bold">+</span>
                      <span className="text-[10px] text-[#A89481] font-bold leading-tight">아이템 담기</span>
                    </div>
                  ))}
                </div>
                {evalState === "error" && (
                  <p className="text-xs font-bold text-[#C93B2B]">판정에 실패해서 가격순으로 보여드릴게요</p>
                )}
                <button
                  onClick={handleEvaluate}
                  disabled={judgeItems.length === 0 || evalState === "loading"}
                  className={`w-full py-2.5 px-4 bg-[#4EA434] hover:bg-[#3F8829] active:translate-y-0.5 text-white font-black text-xs sm:text-sm rounded-2xl ${SHADOW_AC_SM} transition-all flex items-center justify-center gap-2 disabled:opacity-40`}
                >
                  <StarIcon className="w-4 h-4 text-[#FFE073]" />
                  <span>{evalState === "loading" ? "음... 잠깐 생각해볼게요" : "AI에게 우선순위 배정 부탁하기"}</span>
                  <span className="text-[10px] bg-[#355E1D] text-[#D8F5AF] px-2 py-0.5 rounded-full font-bold">
                    자동 정렬
                  </span>
                </button>
              </JudgeShell>

              <div className="relative z-10 mt-3 text-center text-[11px] text-[#7A614B] font-medium flex items-center justify-center gap-1">
                <LeafIcon className="w-3.5 h-3.5 text-[#5D8B33]" />
                <span>주머니 속 아이템은 언제든 드래그해서 자유롭게 옮길 수 있어요.</span>
              </div>
            </ZoneShell>

            {/* RIGHT: 쇼케이스 */}
            <ZoneShell
              id="buy-zone"
              className={`flex flex-col rounded-[36px] border-4 border-[#85532F] bg-[#FFFDF2] p-5 sm:p-6 relative ${SHADOW_AC} overflow-hidden`}
            >
              <div className="absolute inset-2 rounded-[28px] border-2 border-dashed border-[#D6C2A5] pointer-events-none" />
              <div
                className={`relative z-10 rounded-2xl overflow-hidden border-2 border-[#5E371C] ${SHADOW_AC_SM} mb-3 wood-grain`}
              >
                <div className="py-2 px-4 flex items-center justify-between text-white text-xs font-black">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FFDE59] border border-[#783F1E] inline-flex items-center justify-center text-[8px] text-[#734500]">
                      ★
                    </span>
                    <span className="tracking-tight text-base text-[#FFF3DE]" style={{ fontFamily: "var(--font-gaegu)" }}>
                      나의 위시 원목 서랍 진열장
                    </span>
                  </div>
                  <span className="text-[11px] text-[#FFE8C2] bg-[#57351F] px-2.5 py-0.5 rounded-full border border-[#8C5D35]">
                    우선순위 2단 선반 배치 중
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between pb-2 mb-2 border-b-2 border-[#E8DCC2]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#57351F] tracking-tight">진짜 살 물건 쇼케이스</h3>
                  <span className="text-xs font-black text-[#C93B2B] bg-[#FFEAE6] px-2.5 py-0.5 rounded-full border border-[#FFAE9E]">
                    이번 달 구매
                  </span>
                </div>
                <span className="text-xs font-bold text-[#8A5A35]">{buyItems.length}개 진열 중</span>
              </div>

              {evalState === "ready" && (
                <div className="relative z-10 flex items-center gap-2 text-xs text-[#7A5B3E] font-bold mb-2">
                  <span>가격순</span>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={qualWeight}
                    onChange={(e) => setQualWeight(Number(e.target.value))}
                    className="flex-1 accent-[#4EA434]"
                  />
                  <span>AI 판단</span>
                  <span className="w-8 text-right">{qualWeight}</span>
                </div>
              )}

              <div
                className={`relative z-10 rounded-[28px] bg-[#EFE4CF] border-[3px] border-[#C9B390] p-4 ${SHADOW_INNER} flex-1 flex flex-col justify-between gap-3 select-none`}
              >
                {/* 1층 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-[#69421A] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#E09D1B]" />
                      1층: 이번 달 구매 확정 칸 (예산 내)
                    </span>
                    <span className="text-[11px] font-bold text-[#4FA429] bg-[#DCF2C7] px-2 py-0.5 rounded-full border border-[#BBDC9F]">
                      {shelf1.length}/{shelf1Slots} 전시 중
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {shelf1.map((r) => {
                      if (evalState === "ready" && r.index >= revealedCount) return null;
                      return (
                        <ItemTile
                          key={r.item.id}
                          item={r.item}
                          showcase
                          badge={
                            evalState === "ready"
                              ? { text: r.index === 0 ? `${r.index + 1}위 확정` : `${r.index + 1}위`, kind: "gold" }
                              : undefined
                          }
                        />
                      );
                    })}
                    {Array.from({ length: Math.max(0, shelf1Slots - shelf1.length) }).map((_, i) => (
                      <EmptyShelf key={`s1-${i}`} label="빈 선반" />
                    ))}
                  </div>
                </div>

                {/* 예산 한도선 리본 */}
                <div className="py-1 z-20 relative">
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute inset-x-0 h-4 bg-[#85532F] rounded-md border-2 border-[#573318] ${SHADOW_AC_SM}`} />
                    <div className="absolute inset-x-0 h-1 bg-[#A8582C] top-0.5 rounded-t-sm opacity-60" />
                    <div
                      className={`relative z-10 bg-[#FFDE59] border-2 border-[#B37400] text-[#693E00] text-xs font-black px-4 py-0.5 rounded-full ${SHADOW_AC} flex items-center gap-1.5`}
                    >
                      <span>이번 달 예산 한도선 선반 ({won(budget)})</span>
                      <span className="w-2 h-2 rounded-full bg-[#E09D1B] border border-[#693E00]" />
                    </div>
                  </div>
                </div>

                {/* 2층 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-[#755541] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#A8582C]" />
                      2층: 다음 달 보관 서랍 (월급날 개봉)
                    </span>
                    {overAmount > 0 && (
                      <span className="text-[11px] font-bold text-[#8C5D35] bg-[#FAF2DC] px-2 py-0.5 rounded-full border border-[#D9CAAF]">
                        +{won(overAmount)} 초과
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {shelf2.map((r) => {
                      if (evalState === "ready" && r.index >= revealedCount) return null;
                      return (
                        <ItemTile
                          key={r.item.id}
                          item={r.item}
                          showcase
                          dim
                          badge={
                            evalState === "ready" ? { text: `${r.index + 1}위 대기`, kind: "brown" } : undefined
                          }
                        />
                      );
                    })}
                    {Array.from({ length: Math.max(0, shelf2Slots - shelf2.length) }).map((_, i) => (
                      <EmptyShelf key={`s2-${i}`} label="서랍 칸" faint />
                    ))}
                  </div>
                </div>
              </div>

              {/* AI 한줄평 + 안내 문구 */}
              {evalState === "ready" && rows.length > 0 && (
                <div className="relative z-10 mt-3 flex flex-col gap-2">
                  {rows.map((r) => {
                    if (r.index >= revealedCount) return null;
                    return (
                      <div
                        key={r.item.id}
                        className="rounded-2xl border-2 border-[#E3C59E] bg-[#FFFDF7] p-3 text-[#573A23]"
                      >
                        <p className="text-sm font-black">
                          {r.index + 1}위 · {r.item.name} · {won(r.item.price)}
                        </p>
                        {r.reasoning && <p className="text-xs italic mt-0.5 text-[#7A5B3E]">&quot;{r.reasoning}&quot;</p>}
                        {r.message && (
                          <p className="text-sm font-black mt-2 px-3 py-2 rounded-xl border-2 border-[#E09D1B] bg-[#FFF4D6] text-[#8A5A00]">
                            💡 {r.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {shelf2.length > 0 && (
                <div className="relative z-10 mt-3 p-3 bg-[#FFFDF7] rounded-2xl border-2 border-[#E3C59E] flex items-center gap-2 text-sm text-[#573A23] font-bold">
                  <div className="w-6 h-6 rounded-full bg-[#5BA431] text-white flex items-center justify-center font-black text-[11px] shrink-0">
                    !
                  </div>
                  <span>예산선 아래 물건은 계획 재검토가 필요해요! 다음 달 월급날 서랍에서 꺼내는 건 어때요?</span>
                </div>
              )}

              {/* §6-3: 하나만 살 수 있다면? */}
              {evalState === "ready" && revealedCount === (scored?.length ?? 0) && scored && scored.length > 1 && (
                <div className="relative z-10 mt-3 pt-3 border-t-2 border-[#E8DCC2]">
                  <p className="text-sm font-black text-[#57351F] mb-1.5">이 중에 하나만 살 수 있다면?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scored.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setUserPick(s.id)}
                        className={`text-xs rounded-full px-3 py-1 border-2 font-bold transition-all ${
                          userPick === s.id
                            ? "border-[#4EA434] bg-[#E4F5D2] text-[#2D6C2A]"
                            : "border-[#D6C2A5] bg-white text-[#694D36]"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  {showGapExplanation && pickedItem && topPick && (
                    <p className="text-sm mt-2 rounded-2xl p-3 bg-[#FAF2DC] text-[#573A23]">
                      당신은 {pickedItem.name}를 골랐는데 계산상으로는 {topPick.name}가 앞서요. {pickedItem.name}는
                      만족이 {pickedItem.satisfaction_months}개월 정도인데 {topPick.name}는{" "}
                      {topPick.satisfaction_months}개월 가거든요. 그래도 {pickedItem.name}가 맞다면 그건 그것대로
                      괜찮아요.
                    </p>
                  )}
                  {userPick === topPick?.id && (
                    <p className="text-sm mt-2 text-[#2D6C2A] font-bold">
                      계산이랑 똑같이 고르셨네요, 좋은 선택이에요.
                    </p>
                  )}
                </div>
              )}
            </ZoneShell>
          </section>

          {/* 드롭존: 빼기 / 내리기 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <ActionZone
              id="toss-zone"
              borderClass="border-[#C9B693] hover:border-[#6B4B32]"
              overClass="border-[#6B4B32] bg-[#FFF5E6]"
              visual={
                <div className="relative shrink-0 flex items-center justify-center w-20 h-20 group-hover:rotate-6 transition-transform">
                  <div
                    className={`w-[72px] h-[72px] rounded-2xl bg-[#E8DCC2] border-2 border-[#9E8665] flex items-center justify-center ${SHADOW_AC_SM} relative overflow-hidden`}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#C99863] border-2 border-[#85532F] flex items-center justify-center relative">
                      <svg className="w-8 h-8 text-[#573318] fill-current" viewBox="0 0 24 24">
                        <path d="M12 2L9.5 9 2 9.5 7.5 14.5 5.5 22 12 18 18.5 22 16.5 14.5 22 9.5 14.5 9z" />
                      </svg>
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 text-[10px] bg-[#6B4A2F] text-white px-2 py-0.5 rounded-full font-black border border-white">
                    묻기
                  </span>
                </div>
              }
              titleChip={
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#6B4A2F] text-white">
                  빼기 (안 살 것 털어내기)
                </span>
              }
              sub="별 구덩이에 묻기 & 비우기"
              desc="땅속에 묻어 지름신 봉인하기! 충동구매를 시원하게 털어내고 소중한 돈을 아껴요."
              hint="구덩이에 묻어버릴 아이템을 퐁당 던지기"
              hintClass="bg-[#F5EADB] border-[#CBB394] text-[#694A2F]"
            />
            <ActionZone
              id="flush-zone"
              borderClass="border-[#F0B2BA] hover:border-[#E84364]"
              overClass="border-[#E84364] bg-[#FFF0F3]"
              visual={
                <div className="relative shrink-0 flex items-center justify-center w-20 h-20 group-hover:-rotate-6 transition-transform animate-balloon">
                  <div className="relative flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#FF4765] border-2 border-[#D12644] shadow-md flex items-center justify-center text-white relative">
                      <div className="w-2.5 h-2.5 bg-white/40 rounded-full absolute top-1.5 left-2" />
                    </div>
                    <div className="w-0.5 h-3 bg-[#8C5D35]" />
                    <div
                      className={`w-11 h-9 rounded-lg bg-[#FFFDF0] border-2 border-[#D69651] ${SHADOW_AC_SM} flex items-center justify-center relative`}
                    >
                      <div className="absolute inset-y-0 w-2 bg-[#FF4765]" />
                      <div className="absolute inset-x-0 h-2 bg-[#FF4765]" />
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 text-[10px] bg-[#E84364] text-white px-2 py-0.5 rounded-full font-black border border-white">
                    배송 완료
                  </span>
                </div>
              }
              titleChip={
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E84364] text-white">
                  <StarIcon className="w-3.5 h-3.5 text-[#FFE073]" />
                  내리기 (샀음!)
                </span>
              }
              sub="선물상자 완성 & 구매 완료"
              desc="선물상자 완성! 알뜰한 계획 소비로 결제 완료하고 뿌듯함을 챙겨요."
              hint="결제 완료한 물건을 선물상자에 퐁당 던지기!"
              hintClass="bg-[#FFEBF0] border-[#FFBFCE] text-[#D83A61]"
            />
          </section>
        </main>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="rounded-2xl px-3 py-2 shadow-lg border-2 border-[#4EA434] bg-[#FFFDF0] text-[#4A3324]">
            <span className="font-black text-sm">{activeItem.name}</span>{" "}
            <span className="text-xs font-bold text-[#82542B]">{won(activeItem.price)}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ZoneShell({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={`${className} ${isOver ? "ring-4 ring-[#4EA434]" : ""}`}>
      {children}
    </section>
  );
}

function JudgeShell({ className, children }: { className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "judge-zone" });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "ring-4 ring-[#F6C644]" : ""}`}>
      {children}
    </div>
  );
}

function EmptyShelf({ label, faint }: { label: string; faint?: boolean }) {
  return (
    <div
      className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center ${
        faint ? "bg-[#E8DCC2]/70 border-[#D4C7A7]" : "bg-[#E8DCC2] border-[#C9B693]"
      }`}
    >
      <div className="w-3 h-3 rounded-full bg-[#C9BFAB]" />
      <span className="text-[10px] text-[#A89481] font-bold mt-1">{label}</span>
    </div>
  );
}

function ItemTile({
  item,
  badge,
  dim,
  showcase,
}: {
  item: Item;
  badge?: { text: string; kind: "gold" | "brown" };
  dim?: boolean;
  showcase?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  const exitClass =
    item.exiting === "toss" ? "animate-toss-away" : item.exiting === "flush" ? "animate-flush-down" : "animate-pop-in";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={`${item.name} · ${won(item.price)}`}
      className={`group relative flex flex-col items-center touch-none select-none ${exitClass} ${
        isDragging ? "opacity-30" : ""
      } ${item.exiting ? "pointer-events-none" : ""}`}
    >
      <div
        className={`pocket-slot active w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-1 cursor-grab hover:-translate-y-1 transition-all border-2 relative ${
          showcase
            ? dim
              ? "border-dashed border-[#CFB7A1] !bg-[#FFFBF0]/90 opacity-95"
              : "border-[#E0859D] !bg-[#FFFDF7]"
            : "border-[#549E32]"
        }`}
      >
        {badge && (
          <div
            className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-2 py-0.5 rounded-full border border-white whitespace-nowrap z-20 flex items-center gap-0.5 ${
              badge.kind === "gold" ? "bg-[#F6C644] text-[#693E00]" : "bg-[#755541] text-[#FFE8D6]"
            }`}
          >
            {badge.kind === "gold" && <StarIcon className="w-2.5 h-2.5 text-[#A16500]" />}
            {badge.text}
          </div>
        )}
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover border border-[#BEE69E] shadow-sm mt-1"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#E5F5D4] border border-[#BEE69E] flex items-center justify-center shadow-sm mt-1">
            <BagIcon className="w-5 h-5 text-[#4F942B]" />
          </div>
        )}
        <span className="text-[11px] font-black text-[#355E1D] mt-1 truncate max-w-full">{item.name}</span>
        <span
          className={`text-[10px] font-bold ${
            showcase && !dim ? "text-[#E84364]" : "text-[#82542B]"
          } ${dim ? "line-through text-[#A89481]" : ""}`}
        >
          {short(item.price)}
        </span>
      </div>
    </div>
  );
}

function ActionZone({
  id,
  borderClass,
  overClass,
  visual,
  titleChip,
  sub,
  desc,
  hint,
  hintClass,
}: {
  id: string;
  borderClass: string;
  overClass: string;
  visual: React.ReactNode;
  titleChip: React.ReactNode;
  sub: string;
  desc: string;
  hint: string;
  hintClass: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`group relative p-5 rounded-[32px] bg-[#FFFBF0]/95 border-[3px] border-dashed transition-all ${SHADOW_AC} flex items-center gap-5 text-[#523B28] ${
        isOver ? overClass : borderClass
      }`}
    >
      {visual}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {titleChip}
          <span className="text-[11px] font-bold text-[#80644D] bg-[#EFE4CF] px-2 py-0.5 rounded-md">{sub}</span>
        </div>
        <p className="text-xs font-medium">{desc}</p>
        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[11px] font-black ${hintClass}`}>
          <span>↓</span> {hint}
        </div>
      </div>
    </div>
  );
}
