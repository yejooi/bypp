"use client";

// 보드 화면. 비주얼은 stitch_custom_ui_design_system-2/code.html(동물의 숲 스킨)을 그대로 옮겼다.
// 단, 화폐는 "벨" 대신 "원" 유지 (사용자 결정).
// 기능: 아이템 주머니(cart)에서 "AI에게 우선순위 배정 부탁하기" -> 판정 후 쇼케이스(buy)로 자동 진열.
// 옮기기/빼기/내리기는 드래그.

import Link from "next/link";
import { Mascot, SpeechBubble } from "@/components/Mascot";
import { GoalIcon } from "@/components/GoalIcon";
import { UserControls } from "@/components/UserBar";
import { Tutorial, TUTORIAL_SEEN_KEY } from "@/components/Tutorial";
import { authedFetch } from "@/lib/authedFetch";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// 물건을 탭하면 옮기기 메뉴가 열린다 (모바일에서 긴 화면을 드래그로 오가기 어려워서 만든 기본 경로. 드래그는 추가 동작).
const TileTapContext = createContext<(id: string) => void>(() => {});

// AI 판정 뒤 물건별 점수(0~100)와 "왜 이 순위인지" 설명. 점수는 타일 배지로, 설명은 호버할 때만 보인다.
// 최하위도 0점처럼 보이지 않게 30~100으로 펼친다 (0점은 "실패" 프레임이 돼서). 순위 순서는 그대로다.
const SCORE_FLOOR = 30;
type JudgeInfo = { score: number | null; reasoning: string | null; rank?: number };
const JudgeInfoContext = createContext<Record<string, JudgeInfo>>({});
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
  // 빼기/내리기 직후 5초 동안 되돌릴 수 있게 이전 상태를 들고 있는다.
  const [undo, setUndo] = useState<{ text: string; prev: { id: string; status: Item["status"] }[] } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);
  const [addMode, setAddMode] = useState<"link" | "screenshot">("screenshot");
  const [addOpen, setAddOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  // 처음 방문하면 사용법을 자동으로 보여준다 (닫으면 다시 안 뜸).
  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) setTutorialOpen(true);
    } catch {}
  }, []);
  const itemCountRef = useRef(items.length);
  // 물건이 새로 담기면 추가 패널을 자동으로 접는다.
  useEffect(() => {
    if (items.length > itemCountRef.current) setAddOpen(false);
    itemCountRef.current = items.length;
  }, [items.length]);
  // 판정대에 올려둔 아이템 id. 순위 판정은 여기 있는 것만 대상으로 한다 (DB 상태는 cart 그대로).
  const [judgeIds, setJudgeIds] = useState<string[]>([]);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [judgeInfo, setJudgeInfo] = useState<Record<string, JudgeInfo>>({});
  const justDraggedRef = useRef(false);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 4 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  const cartItems = items.filter((it) => it.status === "cart");
  const buyItems = items.filter((it) => it.status === "buy");
  const judgeItems = cartItems.filter((it) => judgeIds.includes(it.id));
  const pouchItems = cartItems.filter((it) => !judgeIds.includes(it.id));
  const cartSum = cartItems.reduce((s, it) => s + it.price, 0);
  const buySum = buyItems.reduce((s, it) => s + it.price, 0);

  const totalBudget = monthlyBudget ?? 0;
  const hasBudget = totalBudget > 0;
  // 이미 구매(내리기)한 금액은 이번 달 예산에서 빼고, 남은 예산으로 1층/2층을 나눈다.
  const purchasedSum = items.filter((it) => it.status === "purchased").reduce((a, it) => a + it.price, 0);
  const budget = Math.max(0, totalBudget - purchasedSum);

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
    if (!over && hasBudget && cumulative + item.price > budget) over = true;
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
      const res = await authedFetch("/api/evaluate", {
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
            urgency: it.urgency,
            desire: it.desire,
            longevity: it.longevity,
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
          urgency: it.urgency,
          desire: it.desire,
          longevity: it.longevity,
        })),
        data.items,
        qualWeight / 100
      );
      // 점수: 이번 판정에 올린 물건들 안에서의 상대 점수. 한 개만 올렸으면 비교 대상이 없어 점수 없이 설명만 남긴다.
      // 판정이 끝난 물건은 심사대에 그대로 두고(순위순 정렬), 사용자가 "가판대로 옮기기"를 눌러야 옮겨진다.
      setJudgeInfo((prev) => ({
        ...prev,
        ...Object.fromEntries(
          ranked.map((r, i) => [
            r.id,
            {
              score: ranked.length >= 2 ? Math.round(SCORE_FLOOR + (100 - SCORE_FLOOR) * r.finalScore) : null,
              reasoning: r.reasoning ?? null,
              rank: i + 1,
            },
          ])
        ),
      }));
      setEvalState("ready");
    } catch {
      setEvalState("error");
    }
  }

  const activeItem = items.find((it) => it.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    justDraggedRef.current = true;
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 150);
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
    } else if (zone === "toss-zone") {
      setUndo({ text: "안 사기로 했어요. 목록이 가벼워졌어요!", prev: [{ id, status: status ?? "buy" }] });
      moveItem(id, "removed");
    }
    else if (zone === "flush-zone") {
      // 2층(예산 초과) 물건을 구매로 내리면 확인부터.
      if (shelf2Ids.has(id)) setPendingBuyId(id);
      else {
        setUndo({ text: "1개 정리됐어요!", prev: [{ id, status: status ?? "buy" }] });
        moveItem(id, "purchased");
      }
    }
  }

  function buyFirstFloor() {
    if (shelf1.length === 0) return;
    setUndo({ text: `${shelf1.length}개 정리됐어요!`, prev: shelf1.map((r) => ({ id: r.item.id, status: r.item.status })) });
    shelf1.forEach((r) => moveItem(r.item.id, "purchased"));
  }

  // ---- 탭 메뉴 동작들 ----
  const sheetItem = items.find((it) => it.id === sheetId) ?? null;

  function openSheet(id: string) {
    if (justDraggedRef.current) return;
    setSheetId(id);
  }
  function sheetToJudge(id: string) {
    const st = items.find((it) => it.id === id)?.status;
    if (st !== "cart") moveItem(id, "cart");
    setJudgeIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSheetId(null);
  }
  function sheetToPouch(id: string) {
    setJudgeIds((prev) => prev.filter((x) => x !== id));
    moveItem(id, "cart");
    setSheetId(null);
  }
  function sheetToStall(id: string) {
    setJudgeIds((prev) => prev.filter((x) => x !== id));
    moveItem(id, "buy");
    reorderShowcase([...orderedBuyIds.filter((x) => x !== id), id]);
    setSheetId(null);
  }
  function sheetShift(id: string, dir: -1 | 1) {
    const i = orderedBuyIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= orderedBuyIds.length) return;
    const next = [...orderedBuyIds];
    [next[i], next[j]] = [next[j], next[i]];
    reorderShowcase(next);
  }
  function sheetToss(id: string) {
    const st = items.find((it) => it.id === id)?.status ?? "cart";
    setUndo({ text: "안 사기로 했어요. 목록이 가벼워졌어요!", prev: [{ id, status: st }] });
    setJudgeIds((prev) => prev.filter((x) => x !== id));
    moveItem(id, "removed");
    setSheetId(null);
  }
  function sheetBuy(id: string) {
    setSheetId(null);
    if (shelf2Ids.has(id)) {
      setPendingBuyId(id);
      return;
    }
    const st = items.find((it) => it.id === id)?.status ?? "buy";
    setUndo({ text: "1개 정리됐어요!", prev: [{ id, status: st }] });
    moveItem(id, "purchased");
  }

  const pouchSlots = Math.max(10, Math.ceil(pouchItems.length / 5) * 5);
  // 판정이 끝난 물건은 순위순으로, 아직 안 된 물건은 뒤에.
  const sortedJudgeItems = [...judgeItems].sort((a, b) => (judgeInfo[a.id]?.rank ?? 999) - (judgeInfo[b.id]?.rank ?? 999));
  const judgedInStand = sortedJudgeItems.filter((it) => judgeInfo[it.id]?.rank != null);
  function moveJudgedToStall() {
    const ids = judgedInStand.map((it) => it.id);
    if (ids.length === 0) return;
    ids.forEach((id) => moveItem(id, "buy"));
    reorderShowcase([...orderedBuyIds.filter((id) => !ids.includes(id)), ...ids]);
    setJudgeIds((prev) => prev.filter((id) => !ids.includes(id)));
  }
  const judgeSlots = Math.max(5, Math.ceil(judgeItems.length / 5) * 5);
  const shelf1Slots = Math.max(10, Math.ceil(shelf1.length / 5) * 5);
  const shelf2Slots = Math.max(5, Math.ceil(shelf2.length / 5) * 5);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        justDraggedRef.current = false;
      }}
    >
      <TileTapContext.Provider value={openSheet}>
      <JudgeInfoContext.Provider value={judgeInfo}>
      <div className="grass-bg-calm flex-1 text-[#4A3324] xl:h-screen xl:overflow-hidden">
        <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-4 pb-32 flex flex-col gap-5 xl:pt-3 xl:pb-[84px] xl:h-full xl:gap-3">
          {/* 헤더 */}
          <header
            className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[#FFF9EC]/90 backdrop-blur-md px-4 py-2 rounded-[28px] border-[3px] border-[#D6C2A5] ${SHADOW_AC}`}
          >
            <div className="flex items-center gap-3">
              <UserControls />
              <button
                onClick={() => setTutorialOpen(true)}
                className="px-3 py-1 rounded-full bg-[#FFF0D4] border-2 border-[#F0C77A] text-[#7A4A00] text-xs font-black hover:bg-[#FFE7BA] active:translate-y-0.5 transition"
              >
                이용 방법
              </button>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-xs font-bold text-[#6F523A] flex items-center gap-2">
                목표
                <Link href="/?edit=1" className="font-medium underline">
                  바꾸기
                </Link>
              </span>
              <span className="text-2xl font-bold text-[#A75D00] flex items-center gap-1.5 truncate" style={HAND}>
                <GoalIcon goal={goalType} className="w-5 h-5" />
                {goalType ?? "-"}
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-bold text-[#6F523A]">
                이번 달 남은 예산 <span className="font-medium">(총 {won(totalBudget)}{purchasedSum > 0 && ` · 구매 ${won(purchasedSum)}`})</span>
              </span>
              <span className="text-2xl font-bold text-[#2D6C2A]" style={HAND}>{won(budget)}</span>
            </div>
            <div className="flex flex-col leading-tight text-right">
              <span className="text-xs font-bold text-[#6F523A]">담긴 물건</span>
              <span className="text-2xl font-bold text-[#5B3E29]" style={HAND}>
                {cartItems.length + buyItems.length}개 · {won(cartSum + buySum)}
              </span>
            </div>
          </header>


          {/* 인벤토리 주머니 vs 가판대 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[170px_1fr_1fr_170px] gap-6 xl:gap-4 items-stretch xl:flex-1 xl:min-h-0 xl:grid-rows-1">
            {/* LEFT: 아이템 주머니 */}
            <ZoneShell
              id="cart-zone"
              className={`order-1 lg:order-none lg:col-start-1 lg:row-start-1 xl:col-start-2 flex flex-col rounded-[36px] border-4 border-[#C8B693] bg-[#EFE8D6] p-5 sm:p-6 xl:p-4 xl:min-h-0 xl:overflow-y-auto relative ${SHADOW_AC} overflow-hidden`}
            >
                            <div
                className={`relative z-10 w-full rounded-2xl border-2 border-[#B89A62] shrink-0 mb-3 py-3 px-5 xl:mb-2 xl:py-1.5 ${SHADOW_AC_SM}`}
                style={{
                  backgroundColor: "#E3CD98",
                  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(0,0,0,0.05))",
                  outline: "2px dashed rgba(255,255,255,0.7)",
                  outlineOffset: "-6px",
                }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-[#5B3E29] tracking-tight" style={{ fontFamily: "var(--font-gaegu)" }}>
                  장바구니 주머니
                </h2>
              </div>

              <button
                onClick={() => setAddOpen(true)}
                className="relative z-10 shrink-0 mx-auto w-fit px-8 mb-3 xl:mb-2 flex items-center justify-center gap-2 py-1.5 rounded-2xl btn-soft-green text-lg"
                style={HAND}
              >
                <svg className="w-6 h-6 text-[#3F8A3A]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z" />
                </svg>
                물건 추가하기
                <span className="text-xs font-bold text-[#4F7A36]" style={{ fontFamily: "var(--font-body)" }}>스크린샷 · 링크</span>
              </button>

              <div
                className={`relative z-10 flex flex-col gap-2 mb-3 shrink-0 xl:mb-2 bg-[#E2D9C2]/80 rounded-[24px] border-2 border-[#C2B18E] p-3 xl:p-2 ${SHADOW_INNER}`}
              >
                <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5D8A37]" />
                    <h3 className="text-lg font-bold text-[#5B3E29]" style={HAND}>
                      내 주머니
                    </h3>
                    <span className="text-xs font-black text-[#2D6C2A] bg-[#DCF2C7] px-2.5 py-0.5 rounded-full border border-[#AED48C]">
                      {cartItems.length}/{Math.max(10, cartItems.length)} 보관 중
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-[#6F523A]">주머니 합계</span>
                    <span className="text-sm font-black text-[#7A4924]">{won(cartSum)}</span>
                  </div>
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
                className={`relative z-10 flex flex-col gap-2 bg-[#FFFDF0] rounded-[26px] border-2 border-dashed border-[#F5D671] shrink-0 p-3.5 xl:p-2.5 ${SHADOW_AC_SM}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mascot size={34} mood={evalState === "loading" ? "thinking" : "idle"} />
                    <h3 className="text-lg font-bold text-[#693E00]" style={HAND}>
                      AI 심사대
                    </h3>
                  </div>
                </div>
                <SpeechBubble tail="top" className="self-start ml-3 mt-1">
                  {evalState === "loading"
                    ? "음... 잠깐 생각해볼게요"
                    : "살까 말까 고민되는 것만 끌어다 놓아 보세요. 같이 골라 볼게요!"}
                </SpeechBubble>
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
                  {sortedJudgeItems.map((it) => (
                    <ItemTile
                      key={it.id}
                      item={it}
                      badge={judgeInfo[it.id]?.score != null ? undefined : { text: "판정 대기", kind: "gold" }}
                    />
                  ))}
                  {Array.from({ length: judgeSlots - judgeItems.length }).map((_, i) => (
                    <div
                      key={`judge-empty-${i}`}
                      className="pocket-slot w-full aspect-square rounded-2xl flex items-center justify-center opacity-60"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C9BFAB]" />
                    </div>
                  ))}
                </div>
                {evalState === "error" && (
                  <p className="text-xs font-bold text-[#C93B2B]">판정에 실패했어요. 잠시 뒤 다시 눌러주세요</p>
                )}
                {/* 판정 전에는 "판정 부탁하기", 판정이 끝나면 같은 자리에 "가판대로 옮기기"가 나온다. */}
                {judgedInStand.length > 0 && judgedInStand.length === judgeItems.length && evalState !== "loading" ? (
                  <button
                    onClick={moveJudgedToStall}
                    className="btn-soft-green mx-auto w-fit px-8 py-1.5 rounded-2xl text-lg flex items-center justify-center gap-2 shrink-0"
                    style={HAND}
                  >
                    가판대로 옮기기
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleEvaluate}
                    disabled={judgeItems.length === 0 || evalState === "loading"}
                    className="btn-soft-green mx-auto w-fit px-8 py-1.5 rounded-2xl text-lg flex items-center justify-center gap-2 shrink-0"
                    style={HAND}
                  >
                    <StarIcon className="w-4 h-4 text-[#E09D1B]" />
                    <span>{evalState === "loading" ? "음... 잠깐 생각해볼게요" : "AI에게 판정 부탁하기"}</span>
                  </button>
                )}
              </JudgeShell>

            </ZoneShell>

            {/* RIGHT: 쇼케이스 */}
            <ZoneShell
              id="buy-zone"
              className={`order-3 lg:order-none lg:col-start-2 lg:row-start-1 xl:col-start-3 flex flex-col rounded-[36px] border-4 border-[#85532F] bg-[#FFFDF2] p-5 sm:p-6 xl:p-4 xl:min-h-0 xl:overflow-y-auto relative ${SHADOW_AC} overflow-hidden`}
            >
              <div className="absolute inset-2 rounded-[28px] border-2 border-dashed border-[#D6C2A5] pointer-events-none" />
              <div
                className={`relative z-10 rounded-2xl overflow-hidden border-2 border-[#5E371C] ${SHADOW_AC_SM} shrink-0 mb-3 xl:mb-2 wood-grain`}
              >
                <div className="py-3 px-4 xl:py-1.5 flex items-center justify-between text-white text-xs font-black">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFDE59] border-2 border-[#783F1E] inline-flex items-center justify-center text-[11px] text-[#734500]">
                      ★
                    </span>
                    <span className="tracking-tight text-lg sm:text-xl text-[#FFF3DE]" style={{ fontFamily: "var(--font-gaegu)" }}>
                      살 물건 가판대
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`relative z-10 rounded-[28px] bg-[#EFE4CF] border-[3px] border-[#C9B390] p-4 xl:p-2.5 ${SHADOW_INNER} flex-1 flex flex-col justify-between gap-3 xl:gap-2 select-none`}
              >
                {/* 1층 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                    <span className="text-lg font-bold text-[#69421A] flex items-center gap-1" style={HAND}>
                      <span className="w-2 h-2 rounded-full bg-[#E09D1B]" />
                      이번 달 구매 선반 · {won(shelf1Sum)}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {shelf1.map((r) => (
                      <SlotDrop key={r.item.id} id={`slot-item-${r.item.id}`} label={`${r.index + 1}위`}>
                        <ItemTile item={r.item} showcase />
                      </SlotDrop>
                    ))}
                    {Array.from({ length: Math.max(0, shelf1Slots - shelf1.length) }).map((_, i) => (
                      <SlotDrop key={`s1-${i}`} id="slot-end1" label={`${shelf1.length + i + 1}위`}>
                        <EmptyShelf />
                      </SlotDrop>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setConfirmBulk(true)}
                  disabled={shelf1.length === 0}
                  className={`btn-soft-green mx-auto w-fit px-8 py-1.5 rounded-2xl text-lg flex items-center justify-center gap-2`}
                  style={HAND}
                >
                  <ReceiptIcon className="w-5 h-5" />
                  전체 계산하기
                  <span className="text-xs font-bold text-[#4F7A36]" style={{ fontFamily: "var(--font-body)" }}>
                    ({shelf1.length}개 · {won(shelf1Sum)})
                  </span>
                </button>

                {/* 예산 한도선 리본 */}
                <div className="py-1 z-20 relative">
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute inset-x-0 h-4 bg-[#85532F] rounded-md border-2 border-[#573318] ${SHADOW_AC_SM}`} />
                    <div className="absolute inset-x-0 h-1 bg-[#A8582C] top-0.5 rounded-t-sm opacity-60" />
                    <div
                      className={`relative z-10 bg-[#FFDE59] border-2 border-[#B37400] text-[#693E00] text-xs font-black px-4 py-0.5 rounded-full ${SHADOW_AC} flex items-center gap-1.5`}
                    >
                      <span>남은 예산 한도선 ({won(budget)})</span>
                      <span className="w-2 h-2 rounded-full bg-[#E09D1B] border border-[#693E00]" />
                    </div>
                  </div>
                </div>

                {/* 2층 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-lg font-bold text-[#755541] flex items-center gap-1" style={HAND}>
                      <span className="w-2 h-2 rounded-full bg-[#A8582C]" />
                      다음 달 선반
                    </span>
                    {overAmount > 0 && (
                      <span className="text-xs font-bold text-[#8C5D35] bg-[#FAF2DC] px-2 py-0.5 rounded-full border border-[#D9CAAF]">
                        +{won(overAmount)} 넘는 물건
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {shelf2.map((r) => (
                      <SlotDrop key={r.item.id} id={`slot-item-${r.item.id}`} label="">
                        <ItemTile item={r.item} showcase dim />
                      </SlotDrop>
                    ))}
                    {Array.from({ length: Math.max(0, shelf2Slots - shelf2.length) }).map((_, i) => (
                      <SlotDrop key={`s2-${i}`} id="slot-end2" label="">
                        <EmptyShelf faint />
                      </SlotDrop>
                    ))}
                  </div>
                </div>
              </div>

              {shelf2.length > 0 && (
                <div className="relative z-10 mt-3 p-3 bg-[#FFFDF7] rounded-2xl border-2 border-[#E3C59E] flex items-center gap-2 text-sm text-[#573A23] font-bold">
                  <div className="w-6 h-6 rounded-full bg-[#5BA431] text-white flex items-center justify-center font-black text-xs shrink-0">
                    !
                  </div>
                  <span>다음 달 선반의 물건은 예산을 넘어요. 다음 달 월급날 꺼내거나, 이번 달 선반의 순서를 바꿔보세요.</span>
                </div>
              )}

            </ZoneShell>

            {/* 드롭존: 반품함(왼쪽) / 계산대(오른쪽) */}
            <ActionZone
              id="toss-zone"
              dim={!activeId}
              className="order-4 lg:order-none lg:col-start-1 lg:row-start-3 xl:col-start-1 xl:row-start-1"
              borderClass="border-[#B89A72] hover:border-[#6B4B32]"
              overClass="border-[#6B4B32] bg-[#FFF5E6] ring-4 ring-[#B89A72]"
              visual={
                <svg className="w-16 h-16 text-[#8A5A35]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z" />
                </svg>
              }
              titleChip="반품함"
              desc="안 사기로 정했어요."
              titleStyle={{
                color: "#5B3E29",
                backgroundColor: "#E8B84A",
                backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(0,0,0,0.06))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(120,80,40,0.25)",
                clipPath:
                  "polygon(0 0,100% 0,97% 25%,100% 50%,97% 75%,100% 100%,0 100%,3% 75%,0 50%,3% 25%)",
              }}
            />
            <ActionZone
              id="flush-zone"
              dim={!activeId}
              className="order-5 lg:order-none lg:col-start-2 lg:row-start-3 xl:col-start-4 xl:row-start-1"
              borderClass="border-[#8DBF6A] hover:border-[#3F8A3A]"
              overClass="border-[#3F8A3A] bg-[#F0FAEA] ring-4 ring-[#8DBF6A]"
              visual={
                <svg className="w-16 h-16 text-[#3F8A3A]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18zM6 15h12v2H6zm0-4h12v2H6zm0-4h12v2H6z" />
                </svg>
              }
              titleChip="계산대"
              desc="구매 끝!"
              stitchClass="border-[#B5D99A]"
              titleStyle={{
                color: "#FFF3DE",
                backgroundColor: "#4A4A4A",
                backgroundImage: "repeating-linear-gradient(90deg, #5C5C5C 0 6px, #454545 6px 12px)",
                borderTop: "3px solid #2B2B2B",
                borderBottom: "3px solid #2B2B2B",
                borderRadius: "999px",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08), 0 2px 0 rgba(0,0,0,0.25)",
              }}
            />
          </section>
          <p className="text-center text-xs font-medium text-[#3F5B2A] leading-relaxed px-4 xl:hidden">
            만족 지속 개월과 사용 빈도는 AI 추정값이며 실측이 아니에요. 참고용 판단이고 투자·재무 조언이 아니에요.
            <br />
            지출 결정의 책임은 사용자에게 있어요.
          </p>
          <p className="hidden xl:block text-center text-[11px] font-medium text-[#3F5B2A] leading-none -mt-1">
            AI 추정값이며 실측이 아니에요 · 참고용이고 투자·재무 조언이 아니에요 · 지출 결정의 책임은 사용자에게 있어요
          </p>
        </main>
      </div>

      {undo && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-[#57351F] text-[#FFF3DE] px-4 py-2.5 rounded-full border-2 border-[#8C5D35] shadow-lg">
          <span className="text-sm font-black">{undo.text}</span>
          <button
            onClick={() => {
              undo.prev.forEach((p) => moveItem(p.id, p.status));
              setUndo(null);
            }}
            className="text-sm font-black text-[#FFDE59] underline"
          >
            되돌리기
          </button>
        </div>
      )}

      {pendingBuyId && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className={`bg-[#FFFBF2] border-4 border-[#85532F] rounded-[28px] p-6 max-w-sm w-full text-[#4A3324] ${SHADOW_AC}`}>
            <p className="text-lg font-black">이번 달 예산을 조금 넘어요</p>
            <p className="text-sm mt-1 font-medium">
              {items.find((it) => it.id === pendingBuyId)?.name}은(는) 이번 달 남은 예산({won(budget)})을 넘어요. 지금
              살까요, 다음 달로 미룰까요?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setPendingBuyId(null)}
                className="flex-1 py-2.5 rounded-full font-black bg-[#EFE8D6] border-2 border-[#D4C3A3]"
              >
                다음 달에
              </button>
              <button
                onClick={() => {
                  setUndo({ text: "1개 정리됐어요!", prev: [{ id: pendingBuyId, status: items.find((it) => it.id === pendingBuyId)?.status ?? "buy" }] });
                  moveItem(pendingBuyId, "purchased");
                  setPendingBuyId(null);
                }}
                className={`flex-1 py-2.5 rounded-full font-black text-white bg-[#E84364] ${SHADOW_AC_SM}`}
              >
                네 살래요
              </button>
            </div>
          </div>
        </div>
      )}

      <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {addOpen && (
        <div className="fixed inset-0 z-[58] bg-black/35" onClick={() => setAddOpen(false)}>
          <div
            className="animate-slide-down mx-auto mt-4 w-[min(760px,calc(100vw-24px))] max-h-[88vh] overflow-y-auto bg-[#FFFBF2] rounded-[28px] border-[3px] border-[#D6C2A5] p-4 sm:p-5 shadow-[0_8px_0_rgba(74,46,53,0.2)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={() => setAddMode("screenshot")}
                className={`px-4 py-1.5 text-xs sm:text-sm font-black rounded-full transition-all ${
                  addMode === "screenshot"
                    ? "btn-soft-green"
                    : "bg-[#EFE8D6] text-[#694D36] border-2 border-[#D4C3A3]"
                }`}
              >
                스샷으로 넣기
              </button>
              <button
                onClick={() => setAddMode("link")}
                className={`px-4 py-1.5 text-xs sm:text-sm font-black rounded-full transition-all flex items-center gap-1.5 ${
                  addMode === "link"
                    ? "btn-soft-green"
                    : "bg-[#EFE8D6] text-[#694D36] border-2 border-[#D4C3A3]"
                }`}
              >
                <LeafIcon className="w-3.5 h-3.5" />
                링크로 넣기
              </button>
              <button onClick={() => setAddOpen(false)} className="ml-auto text-xs font-bold text-[#6F523A] underline">
                닫기
              </button>
            </div>
            {addMode === "link" ? <AddItemForm /> : <ScreenshotImportForm />}
          </div>
        </div>
      )}

      {confirmBulk && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmBulk(false)}>
          <div
            className={`bg-[#FFFBF2] border-4 border-[#85532F] rounded-[28px] p-6 max-w-sm w-full text-[#4A3324] ${SHADOW_AC}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-black">
              {shelf1.length}개 · {won(shelf1Sum)} 계산할까요?
            </p>
            <p className="text-sm mt-1 font-medium">이번 달 선반의 물건이 한 번에 정리돼요. 바로 뒤에 되돌릴 수도 있어요.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmBulk(false)} className="flex-1 py-2.5 rounded-full font-black bg-[#EFE8D6] border-2 border-[#D4C3A3]">
                아직이요
              </button>
              <button
                onClick={() => {
                  setConfirmBulk(false);
                  buyFirstFloor();
                }}
                className={`btn-soft-green flex-1 py-2.5 rounded-full`}
              >
                네 계산할래요
              </button>
            </div>
          </div>
        </div>
      )}

      {sheetItem && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setSheetId(null)}>
          <div
            className={`w-full sm:max-w-sm bg-[#FFFBF2] border-4 border-[#85532F] rounded-t-[28px] sm:rounded-[28px] p-5 pb-6 text-[#4A3324] ${SHADOW_AC} flex flex-col gap-3`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="pocket-slot relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                {sheetItem.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sheetItem.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <BagIcon className="w-7 h-7 text-[#4F942B]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black leading-snug line-clamp-2">{sheetItem.name}</p>
                <p className="text-sm font-black text-[#82542B]">{won(sheetItem.price)}</p>
              </div>
              <button onClick={() => setSheetId(null)} className="text-xs font-bold text-[#6F523A] underline shrink-0">
                닫기
              </button>
            </div>
            <p className="text-xs font-bold text-[#7A5B3E]">어디로 옮길까요?</p>
            <div className="flex flex-col gap-2">
              {sheetItem.status === "cart" && !judgeIds.includes(sheetItem.id) && (
                <SheetBtn onClick={() => sheetToJudge(sheetItem.id)}>🔍 AI 심사대에 올리기</SheetBtn>
              )}
              {sheetItem.status === "cart" && judgeIds.includes(sheetItem.id) && (
                <SheetBtn onClick={() => sheetToPouch(sheetItem.id)}>👜 주머니로 돌려놓기</SheetBtn>
              )}
              {sheetItem.status === "cart" && (
                <SheetBtn tone="wood" onClick={() => sheetToStall(sheetItem.id)}>
                  🪵 살 물건 가판대에 올리기
                </SheetBtn>
              )}
              {sheetItem.status === "buy" && (
                <div className="flex gap-2">
                  <SheetBtn className="flex-1" onClick={() => sheetShift(sheetItem.id, -1)}>
                    ⬆ 앞으로
                  </SheetBtn>
                  <SheetBtn className="flex-1" onClick={() => sheetShift(sheetItem.id, 1)}>
                    ⬇ 뒤로
                  </SheetBtn>
                </div>
              )}
              {sheetItem.status === "buy" && <SheetBtn onClick={() => sheetToPouch(sheetItem.id)}>👜 주머니로 돌려놓기</SheetBtn>}
              {sheetItem.status === "buy" && (
                <SheetBtn tone="green" onClick={() => sheetBuy(sheetItem.id)}>
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <ReceiptIcon className="w-4 h-4" />
                    계산대 (샀어요!)
                  </span>
                </SheetBtn>
              )}
              <SheetBtn tone="tape" onClick={() => sheetToss(sheetItem.id)}>
                <span className="inline-flex items-center justify-center gap-1.5">
                  <BoxIcon className="w-4 h-4" />
                  반품함 (안 살래요)
                </span>
              </SheetBtn>
            </div>
          </div>
        </div>
      )}

      <DragOverlay>
        {activeItem ? (
          <div className="max-w-[180px] rounded-xl px-2.5 py-1.5 shadow-lg border-2 border-[#4EA434] bg-[#FFFDF0] text-[#4A3324]">
            <p className="font-black text-xs truncate">{activeItem.name}</p>
            <p className="text-[11px] font-bold text-[#82542B]">{won(activeItem.price)}</p>
          </div>
        ) : null}
      </DragOverlay>
      </JudgeInfoContext.Provider>
      </TileTapContext.Provider>
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
      {label && <span className="text-[11px] font-black text-[#69421A] leading-none text-center">{label}</span>}
      {children}
    </div>
  );
}

function EmptyShelf({ faint }: { faint?: boolean }) {
  return (
    <div
      className={`pocket-slot w-full aspect-square rounded-2xl flex flex-col items-center justify-center opacity-60`}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-[#C9BFAB]" />
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

  const elRef = useRef<HTMLDivElement | null>(null);
  const onTap = useContext(TileTapContext);
  const info = useContext(JudgeInfoContext)[item.id];
  const shownBadge = badge ?? (info?.score != null ? { text: `${info.score}점`, kind: "gold" as const } : undefined);
  // 이름 툴팁은 패널의 overflow에 잘리지 않게 body에 fixed로 띄운다 (가장 위 레이어).
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  function showTip() {
    const r = elRef.current?.getBoundingClientRect();
    if (r) setTip({ x: r.left + r.width / 2, y: r.top });
  }

  // 계산대로 내릴 때: 원본은 숨기고, 화면 위에 복제본을 띄워 계산대 카드 중심까지 날려 보낸다.
  // (패널이 overflow-hidden이라 원본을 그대로 옮기면 잘려서, fixed 복제본을 body에 붙인다.)
  useEffect(() => {
    if (item.exiting !== "flush") return;
    const el = elRef.current;
    const target = document.getElementById("flush-zone");
    if (!el || !target) return;
    const a = el.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const clone = el.cloneNode(true) as HTMLDivElement;
    clone.classList.remove("opacity-0", "animate-pop-in");
    Object.assign(clone.style, {
      position: "fixed",
      left: `${a.left}px`,
      top: `${a.top}px`,
      width: `${a.width}px`,
      height: `${a.height}px`,
      margin: "0",
      zIndex: "100",
      pointerEvents: "none",
      opacity: "1",
    });
    document.body.appendChild(clone);
    const anim = clone.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.6}px,${dy * 0.6 - 30}px) scale(0.7) rotate(-6deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px,${dy}px) scale(0.15) rotate(8deg)`, opacity: 0 },
      ],
      { duration: 520, delay: Math.random() * 180, easing: "cubic-bezier(0.45, 0, 0.9, 0.6)", fill: "both" }
    );
    anim.onfinish = () => clone.remove();
    return () => {
      // 언마운트돼도 복제본은 끝까지 날아가게 두되, 안전하게 정리 타이머를 건다.
      setTimeout(() => clone.remove(), 900);
    };
  }, [item.exiting]);

  const exitClass =
    item.exiting === "toss" ? "animate-toss-away" : item.exiting === "flush" ? "opacity-0" : "animate-pop-in";

  return (
    <div
      ref={(node) => {
        elRef.current = node;
        setNodeRef(node);
      }}
      {...listeners}
      {...attributes}
      onClick={() => onTap(item.id)}
      onMouseEnter={showTip}
      onMouseLeave={() => setTip(null)}
      className={`group relative flex flex-col items-center touch-manipulation select-none ${exitClass} ${
        isDragging ? "opacity-30" : ""
      } ${item.exiting ? "pointer-events-none" : ""}`}
    >
      <div
        className={`pocket-slot active w-full aspect-square rounded-2xl flex flex-col items-center justify-between p-1.5 cursor-grab hover:-translate-y-1 transition-all border-2 relative ${
          showcase
            ? dim
              ? "border-[#CFB7A1] !bg-[#FFFBF0]/90 opacity-95"
              : "border-[#A36B3E] !bg-[#FFFDF7]"
            : "border-transparent"
        }`}
      >
        <span className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-white/85 border border-[#D6C2A5] text-[#6F523A] text-xs font-black flex items-center justify-center leading-none pointer-events-none">
          ⋯
        </span>
        {shownBadge && (
          <div
            className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-black px-2 py-0.5 rounded-full border border-white whitespace-nowrap z-20 flex items-center gap-0.5 ${
              shownBadge.kind === "gold" ? "bg-[#F6C644] text-[#693E00]" : "bg-[#755541] text-[#FFE8D6]"
            }`}
          >
            {shownBadge.kind === "gold" && <StarIcon className="w-2.5 h-2.5 text-[#A16500]" />}
            {shownBadge.text}
          </div>
        )}
        <div className="w-full flex-1 min-h-0 rounded-xl overflow-hidden bg-[#E5F5D4] flex items-center justify-center">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <BagIcon className="w-1/2 h-1/2 text-[#4F942B]" />
          )}
        </div>
        <span
          className={`text-[11px] font-bold leading-none mt-1 ${
            showcase && !dim ? "text-[#85532F]" : "text-[#82542B]"
          } ${dim ? "text-[#8A7460]" : ""}`}
        >
          {short(item.price)}
        </span>
      </div>
      {tip &&
        !isDragging &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200] max-w-[280px] -translate-x-1/2 -translate-y-full bg-[#FFFDF0] border-2 border-[#68472E] text-[#4A3324] text-xs font-black py-1 px-3 rounded-2xl shadow-[0_3px_0_rgba(74,46,53,0.16)] leading-snug"
            style={{ left: Math.min(Math.max(tip.x, 150), window.innerWidth - 150), top: Math.max(tip.y - 6, 40) }}
          >
            <p>{item.name}</p>
            {info?.reasoning && item.status !== "buy" && <p className="mt-1 font-medium text-[#7A5B3E]">{info.reasoning}</p>}
          </div>,
          document.body
        )}
    </div>
  );
}

function ActionZone({
  id,
  className = "",
  titleStyle,
  stitchClass = "border-[#D6C2A5]",
  dim = false,
  borderClass,
  overClass,
  visual,
  titleChip,
  desc,
}: {
  id: string;
  className?: string;
  titleStyle?: React.CSSProperties;
  stitchClass?: string;
  dim?: boolean;
  borderClass: string;
  overClass: string;
  visual: React.ReactNode;
  titleChip: React.ReactNode;
  desc?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`group relative rounded-[32px] border-4 bg-[#FFFDF2] p-6 xl:p-4 xl:min-h-0 xl:overflow-hidden transition-all ${SHADOW_AC} flex flex-col items-center gap-3 text-center text-[#523B28] ${dim ? "opacity-50 saturate-50 hover:opacity-100 hover:saturate-100" : ""} ${className} ${
        isOver ? overClass : borderClass
      }`}
    >
      <div className={`absolute inset-2 rounded-[22px] border-2 border-dashed pointer-events-none ${stitchClass}`} />
      <h3
        className="relative self-stretch px-4 py-1.5 text-lg font-black tracking-tight"
        style={{ ...HAND, ...titleStyle }}
      >
        {titleChip}
      </h3>
      <div className="relative flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-24 h-24 flex items-center justify-center group-hover:-translate-y-1 transition-transform">
          {visual}
        </div>
        {desc && (
          <p className="text-base font-bold leading-snug" style={HAND}>
            {desc}
          </p>
        )}
      </div>
    </div>
  );
}

function SheetBtn({
  children,
  onClick,
  tone = "cream",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "cream" | "wood" | "green" | "tape";
  className?: string;
}) {
  const palette = {
    cream: "bg-[#EFE8D6] border-[#D4C3A3] text-[#5B3E29]",
    wood: "bg-[#A36B3E] border-[#5E371C] text-[#FFF3DE]",
    green: "btn-soft-green",
    tape: "bg-[#E8B84A] border-[#B8862A] text-[#5B3E29]",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 rounded-2xl border-2 font-black text-sm active:translate-y-0.5 transition ${SHADOW_AC_SM} ${palette} ${className}`}
    >
      {children}
    </button>
  );
}

// 반품함/계산대 아이콘 (머티리얼 스타일, 이모지 대신).
function BoxIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z" />
    </svg>
  );
}

function ReceiptIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18zM6 15h12v2H6zm0-4h12v2H6zm0-4h12v2H6z" />
    </svg>
  );
}
