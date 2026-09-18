"use client";

// 보드 화면. 비주얼은 stitch_custom_ui_design_system-2/code.html(동물의 숲 스킨)을 그대로 옮겼다.
// 단, 화폐는 "벨" 대신 "원" 유지 (사용자 결정).
// 기능: 아이템 주머니(cart)에서 "AI에게 우선순위 배정 부탁하기" -> 판정 후 쇼케이스(buy)로 자동 진열.
// 옮기기/빼기/내리기는 드래그.

import { useState } from "react";
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

const HAND = { fontFamily: "var(--font-gaegu)" } as const;
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
  const { goalType, monthlyBudget, items, moveItem, reorderShowcase } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const [evalState, setEvalState] = useState<EvalState>("idle");
  const [llmEstimates, setLlmEstimates] = useState<LlmEstimate[] | null>(null);
  // wayfinder #5 결정: 30~100 슬라이더 (0=가격순, 100=AI 판단), 기본값 65.
  const [qualWeight, setQualWeight] = useState(Math.round(DEFAULT_QUAL_WEIGHT * 100));
  const [pendingBuyId, setPendingBuyId] = useState<string | null>(null);
  // 가장 최근 AI 판정 결과 스냅샷 (왼쪽 패널에 표시). baseSum = 판정 시점에 이미 1층에 있던 물건들의 합계.
  const [judgeResult, setJudgeResult] = useState<{
    baseSum: number;
    entries: {
      id: string;
      name: string;
      price: number;
      reasoning: string | null;
      rank: number;
      cumulative: number;
      within: boolean;
      message: string | null;
    }[];
  } | null>(null);
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

  const budget = monthlyBudget ?? 0;

  // 쇼케이스 순서는 사용자가 정한 대로(sortOrder). AI 판정은 "무엇이 쇼케이스에 들어가느냐"만 결정한다.
  const orderedBuy = buyItems
    .map((it, i) => ({ it, i }))
    .sort((x, y) => (x.it.sortOrder ?? 1e9) - (y.it.sortOrder ?? 1e9) || x.i - y.i)
    .map((x) => x.it);
  const orderedBuyIds = orderedBuy.map((it) => it.id);

  // 순서대로 누적해서 예산을 딱 넘는 항목부터 그 뒤는 전부 2층.
  let cumulative = 0;
  let over = false;
  let overCount = 0;
  const rows = orderedBuy.map((item, i) => {
    if (!over && budget > 0 && cumulative + item.price > budget) over = true;
    const before = cumulative;
    if (!over) cumulative += item.price;
    const message = over
      ? overCount++ === 0
        ? smallGapMessage(item.price - Math.max(0, budget - before))
        : bigGapMessage(2)
      : i === 0
        ? positiveMessage()
        : null;
    return { item, overBudget: over, message, index: i };
  });

  const shelf1 = rows.filter((r) => !r.overBudget);
  const shelf2 = rows.filter((r) => r.overBudget);
  const shelf1Sum = shelf1.reduce((s2, r) => s2 + r.item.price, 0);
  const overAmount = Math.max(0, buySum - budget);
  const shelf2Ids = new Set(shelf2.map((r) => r.item.id));

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
      // AI 판정 순위는 "쇼케이스에 들어올 때의 초기 순서"로만 쓰고, 기존 진열 뒤에 붙인다. 이후 순서는 사용자가.
      const ranked = computeScores(
        toPromote.map((it) => ({
          id: it.id,
          name: it.name,
          price: it.price,
          category: it.category,
          reasonCode: it.reasonCode,
        })),
        data.items,
        qualWeight / 100
      );
      // 기존 1층 합계까지 더한 누적으로, 예산 안에 들어오는 순위까지 표시한다.
      let run = shelf1Sum;
      let over = false;
      let overSeen = 0;
      const entries = ranked.map((r, i) => {
        if (!over && budget > 0 && run + r.price > budget) over = true;
        const before = run;
        if (!over) run += r.price;
        const message = over
          ? overSeen++ === 0
            ? smallGapMessage(r.price - Math.max(0, budget - before))
            : bigGapMessage(2)
          : i === 0
            ? positiveMessage()
            : null;
        return {
          id: r.id,
          name: r.name,
          price: r.price,
          reasoning: r.reasoning ?? null,
          rank: i + 1,
          cumulative: before + r.price,
          within: !over,
          message,
        };
      });
      setJudgeResult({ baseSum: shelf1Sum, entries });
      toPromote.forEach((it) => moveItem(it.id, "buy"));
      reorderShowcase([...orderedBuyIds.filter((id) => !newIds.has(id)), ...ranked.map((r) => r.id)]);
      setJudgeIds((prev) => prev.filter((id) => !newIds.has(id)));
      setEvalState("ready");
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

    if (zone === "buy-zone" || zone.startsWith("slot-")) {
      // slot-item-<id>: 그 항목 앞에 끼워넣기 / slot-end1: 1층 맨 끝 / slot-end2·buy-zone: 맨 끝
      const rest = orderedBuyIds.filter((x) => x !== id);
      let at = rest.length;
      if (zone === `slot-item-${id}`) return;
      if (zone.startsWith("slot-item-")) {
        // 이미 아이템이 있는 칸이면 자리를 맞바꾼다 (주머니/판정대에서 온 경우 밀려난 쪽이 주머니로 돌아감).
        const target = zone.slice("slot-item-".length);
        const tIdx = orderedBuyIds.indexOf(target);
        if (tIdx >= 0) {
          const next = [...orderedBuyIds];
          const fromIdx = next.indexOf(id);
          if (fromIdx >= 0) {
            [next[fromIdx], next[tIdx]] = [next[tIdx], next[fromIdx]];
          } else {
            next[tIdx] = id;
            moveItem(target, "cart");
            moveItem(id, "buy");
          }
          reorderShowcase(next);
          return;
        }
      }
      if (zone.startsWith("slot-item-")) {
        const idx = rest.indexOf(zone.slice("slot-item-".length));
        if (idx >= 0) at = idx;
      } else if (zone === "slot-end1") {
        const firstOver = shelf2[0]?.item.id;
        const idx = firstOver ? rest.indexOf(firstOver) : -1;
        if (idx >= 0) at = idx;
      }
      const next = [...rest.slice(0, at), id, ...rest.slice(at)];
      if (status !== "buy") moveItem(id, "buy");
      reorderShowcase(next);
    } else if (zone === "cart-zone") {
      if (status !== "cart") moveItem(id, "cart");
    } else if (zone === "toss-zone") moveItem(id, "removed");
    else if (zone === "flush-zone") {
      // 2층(예산 초과) 물건을 구매로 내리면 확인부터.
      if (shelf2Ids.has(id)) setPendingBuyId(id);
      else moveItem(id, "purchased");
    }
  }

  function buyFirstFloor() {
    shelf1.forEach((r) => moveItem(r.item.id, "purchased"));
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
                    주머니 물건을 꺼내 진열장에 올려보세요!
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
                      <h2 className="text-xl sm:text-2xl font-bold text-[#5B3E29] tracking-tight" style={{ fontFamily: "var(--font-gaegu)" }}>
                        장바구니 주머니
                      </h2>
                      <span className="text-xs font-black text-[#2D6C2A] bg-[#DCF2C7] px-2.5 py-0.5 rounded-full border border-[#AED48C]">
                        {cartItems.length}/20 보관 중
                      </span>
                    </div>
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
                  <h3 className="text-lg font-bold text-[#5B3E29]" style={HAND}>
                    내 주머니
                  </h3>
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
                    <h3 className="text-lg font-bold text-[#693E00]" style={HAND}>
                      AI 심사대
                    </h3>
                    <span className="text-[10px] font-bold text-[#A16500] bg-[#FFF0D4] px-2 rounded-full border border-[#D9BA8B]">
                      연구소 바구니
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#4FA429] bg-[#E4F5D2] px-2 py-0.5 rounded-full border border-[#BBDC9F]">
                    {judgeItems.length}개 후보 대기 중
                  </span>
                </div>
                <p className="text-[11px] text-[#7A5B3E] font-medium leading-tight">
                  진짜 살 물건 후보만 끌어다 놓고 AI의 판정을 받아보세요!
                </p>
                <p className="text-[11px] text-[#7A5B3E] font-bold">
                  판정 기준
                </p>
                <div className="flex items-center gap-2 text-xs text-[#7A5B3E] font-bold">
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
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5 py-1">
                  {judgeItems.map((it) => (
                    <ItemTile key={it.id} item={it} badge={{ text: "판정 대기", kind: "gold" }} />
                  ))}
                  {Array.from({ length: judgeSlots - judgeItems.length }).map((_, i) => (
                    <div
                      key={`judge-empty-${i}`}
                      className="w-full aspect-square rounded-2xl bg-[#FFF9EC] border-2 border-dashed border-[#D6C2A0] flex flex-col items-center justify-center text-center p-1"
                    >
                    </div>
                  ))}
                </div>
                {evalState === "error" && (
                  <p className="text-xs font-bold text-[#C93B2B]">판정에 실패했어요. 잠시 뒤 다시 눌러주세요</p>
                )}
                <button
                  onClick={handleEvaluate}
                  disabled={judgeItems.length === 0 || evalState === "loading"}
                  className={`w-full py-2.5 px-4 bg-[#4EA434] hover:bg-[#3F8829] active:translate-y-0.5 text-white font-black text-xs sm:text-sm rounded-2xl ${SHADOW_AC_SM} transition-all flex items-center justify-center gap-2 disabled:opacity-40`}
                >
                  <StarIcon className="w-4 h-4 text-[#FFE073]" />
                  <span>{evalState === "loading" ? "음... 잠깐 생각해볼게요" : "AI에게 판정 부탁하기"}</span>
                </button>
              </JudgeShell>

              {judgeResult && (
                <div
                  className={`relative z-10 mt-3 rounded-[26px] border-[3px] border-[#C8B693] bg-[#FFFDF7] p-3.5 ${SHADOW_AC_SM} flex flex-col gap-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-[#5B3E29]" style={HAND}>
                      AI 판정 결과
                    </h3>
                    <button
                      onClick={() => setJudgeResult(null)}
                      className="text-[11px] font-bold text-[#8C6D53] underline"
                    >
                      닫기
                    </button>
                  </div>
                  {judgeResult.entries.map((e) => (
                    <div
                      key={e.id}
                      className={`rounded-2xl border-2 p-3 text-[#573A23] ${
                        e.within ? "border-[#AED48C] bg-[#F4FBEA]" : "border-[#E3C59E] bg-[#FFF9EC]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <span
                          className={`shrink-0 min-w-11 text-center text-base font-black px-2 py-1 rounded-xl border-2 ${SHADOW_AC_SM} ${
                            e.within
                              ? "bg-[#4F8B33] text-white border-[#3B6B26]"
                              : "bg-[#E09D1B] text-white border-[#B87A0E]"
                          }`}
                          style={HAND}
                        >
                          {e.rank}위
                        </span>
                        <p className="flex-1 text-sm font-black">{e.name}</p>
                        <span
                          className={`shrink-0 text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                            e.within
                              ? "bg-[#DCF2C7] text-[#2D6C2A] border-[#AED48C]"
                              : "bg-[#FFEAE6] text-[#C93B2B] border-[#FFAE9E]"
                          }`}
                        >
                          {e.within ? "예산 안" : "예산 초과"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#82542B] mt-0.5">
                        {won(e.price)} · 누적 {won(e.cumulative)}
                      </p>
                      {e.reasoning && <p className="text-xs italic mt-1 text-[#7A5B3E]">&quot;{e.reasoning}&quot;</p>}
                      {e.message && !e.message.startsWith("예산 안에서 여유") && (
                        <p className="text-sm font-black mt-2 px-3 py-2 rounded-xl border-2 border-[#E09D1B] bg-[#FFF4D6] text-[#8A5A00]">
                          💡 {e.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                <div className="py-3 px-4 flex items-center justify-between text-white text-xs font-black">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFDE59] border-2 border-[#783F1E] inline-flex items-center justify-center text-[10px] text-[#734500]">
                      ★
                    </span>
                    <span className="tracking-tight text-lg sm:text-xl text-[#FFF3DE]" style={{ fontFamily: "var(--font-gaegu)" }}>
                      살 물건 가판대
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-3 pb-2 mb-2 border-b-2 border-[#E8DCC2]">
                <p className="text-xs text-[#7A5B3E] font-bold">
                  1층에 원하는 순서대로 놓으세요. 예산을 넘는 물건부터 자동으로 2층으로 내려가요.
                </p>
                <span className="shrink-0 text-xs font-bold text-[#8A5A35]">{buyItems.length}개 진열 중</span>
              </div>

              <div
                className={`relative z-10 rounded-[28px] bg-[#EFE4CF] border-[3px] border-[#C9B390] p-4 ${SHADOW_INNER} flex-1 flex flex-col justify-between gap-3 select-none`}
              >
                {/* 1층 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                    <span className="text-lg font-bold text-[#69421A] flex items-center gap-1" style={HAND}>
                      <span className="w-2 h-2 rounded-full bg-[#E09D1B]" />
                      1층: 이번 달 구매 선반 · {won(shelf1Sum)}
                    </span>
                    <button
                      onClick={buyFirstFloor}
                      disabled={shelf1.length === 0}
                      className={`text-[11px] font-black text-white bg-[#E84364] hover:bg-[#C72E4E] px-3 py-1 rounded-full ${SHADOW_AC_SM} active:translate-y-0.5 disabled:opacity-40 transition-all`}
                    >
                      1층 전체 구매 ({shelf1.length}개)
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {shelf1.map((r) => (
                      <SlotDrop key={r.item.id} id={`slot-item-${r.item.id}`} label={`${r.index + 1}위`}>
                        <ItemTile item={r.item} showcase />
                      </SlotDrop>
                    ))}
                    {Array.from({ length: Math.max(0, shelf1Slots - shelf1.length) }).map((_, i) => (
                      <SlotDrop key={`s1-${i}`} id="slot-end1" label={`${shelf1.length + i + 1}위`}>
                        <EmptyShelf label="빈 선반" />
                      </SlotDrop>
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
                      <span>이번 달 예산 한도선 ({won(budget)})</span>
                      <span className="w-2 h-2 rounded-full bg-[#E09D1B] border border-[#693E00]" />
                    </div>
                  </div>
                </div>

                {/* 2층 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-lg font-bold text-[#755541] flex items-center gap-1" style={HAND}>
                      <span className="w-2 h-2 rounded-full bg-[#A8582C]" />
                      2층: 예산 초과 서랍
                    </span>
                    {overAmount > 0 && (
                      <span className="text-[11px] font-bold text-[#8C5D35] bg-[#FAF2DC] px-2 py-0.5 rounded-full border border-[#D9CAAF]">
                        +{won(overAmount)} 초과
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {shelf2.map((r) => (
                      <SlotDrop key={r.item.id} id={`slot-item-${r.item.id}`} label="대기">
                        <ItemTile item={r.item} showcase dim />
                      </SlotDrop>
                    ))}
                    {Array.from({ length: Math.max(0, shelf2Slots - shelf2.length) }).map((_, i) => (
                      <SlotDrop key={`s2-${i}`} id="slot-end2" label="대기">
                        <EmptyShelf label="서랍 칸" faint />
                      </SlotDrop>
                    ))}
                  </div>
                </div>
              </div>

              {shelf2.length > 0 && (
                <div className="relative z-10 mt-3 p-3 bg-[#FFFDF7] rounded-2xl border-2 border-[#E3C59E] flex items-center gap-2 text-sm text-[#573A23] font-bold">
                  <div className="w-6 h-6 rounded-full bg-[#5BA431] text-white flex items-center justify-center font-black text-[11px] shrink-0">
                    !
                  </div>
                  <span>2층 물건은 예산을 넘어요. 다음 달 월급날 꺼내거나, 1층 순서를 바꿔보세요.</span>
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
                  구덩이 (안 살래요)
                </span>
              }
              sub=""
              desc="충동구매는 땅속에 묻고 돈을 아껴요."
              hint="구덩이에 퐁당!"
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
                  선물상자 (샀어요!)
                </span>
              }
              sub=""
              desc="구매 끝! 선물상자에 넣고 뿌듯하게."
              hint="선물상자에 퐁당!"
              hintClass="bg-[#FFEBF0] border-[#FFBFCE] text-[#D83A61]"
            />
          </section>
        </main>
      </div>

      {pendingBuyId && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className={`bg-[#FFFBF2] border-4 border-[#85532F] rounded-[28px] p-6 max-w-sm w-full text-[#4A3324] ${SHADOW_AC}`}>
            <p className="text-lg font-black">예산을 초과합니다</p>
            <p className="text-sm mt-1 font-medium">
              {items.find((it) => it.id === pendingBuyId)?.name}은(는) 이번 달 예산({won(budget)})을 넘어요. 그래도
              구매하시겠습니까?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setPendingBuyId(null)}
                className="flex-1 py-2.5 rounded-full font-black bg-[#EFE8D6] border-2 border-[#D4C3A3]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  moveItem(pendingBuyId, "purchased");
                  setPendingBuyId(null);
                }}
                className={`flex-1 py-2.5 rounded-full font-black text-white bg-[#E84364] ${SHADOW_AC_SM}`}
              >
                그래도 구매
              </button>
            </div>
          </div>
        </div>
      )}

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

function SlotDrop({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-stretch gap-0.5 rounded-2xl ${isOver ? "ring-4 ring-[#4EA434]" : ""}`}
    >
      <span className="text-[10px] font-black text-[#69421A] leading-none text-center">{label}</span>
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
      className={`group relative flex flex-col items-center touch-none select-none ${exitClass} ${
        isDragging ? "opacity-30" : ""
      } ${item.exiting ? "pointer-events-none" : ""}`}
    >
      <div
        className={`pocket-slot active w-full aspect-square rounded-2xl flex flex-col items-center justify-between p-1.5 cursor-grab hover:-translate-y-1 transition-all border-2 relative ${
          showcase
            ? dim
              ? "border-dashed border-[#CFB7A1] !bg-[#FFFBF0]/90 opacity-95"
              : "border-[#A36B3E] !bg-[#FFFDF7]"
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
        <div className="w-full flex-1 min-h-0 rounded-xl overflow-hidden bg-[#E5F5D4] border border-[#BEE69E] flex items-center justify-center">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <BagIcon className="w-1/2 h-1/2 text-[#4F942B]" />
          )}
        </div>
        <span
          className={`text-[10px] font-bold leading-none mt-1 ${
            showcase && !dim ? "text-[#85532F]" : "text-[#82542B]"
          } ${dim ? "line-through text-[#A89481]" : ""}`}
        >
          {short(item.price)}
        </span>
        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 z-30 max-w-[220px] bg-[#FFFDF0] border-2 border-[#68472E] text-[#4A3324] text-[11px] font-black py-0.5 px-2.5 rounded-full shadow-[0_3px_0_rgba(74,46,53,0.16)] truncate transition-opacity">
          {item.name}
        </div>
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
          {sub && <span className="text-[11px] font-bold text-[#80644D] bg-[#EFE4CF] px-2 py-0.5 rounded-md">{sub}</span>}
        </div>
        <p className="text-base font-bold" style={HAND}>
          {desc}
        </p>
        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[11px] font-black ${hintClass}`}>
          <span>↓</span> {hint}
        </div>
      </div>
    </div>
  );
}
