"use client";

// ③④⑤⑥ 항목 등록 / 분류(2단 구조) / 예산 점검 / 정리 (§3, §4, §6-5).
// Phase 4: AI 판정 연결 + 순위 출력 + 공개 연출 (§6, §8-1).
// - 옮기기/빼기/내리기는 드래그로 (Phase 3, 사용자 요청).
// - "순위 보기" 전에는 가격순 폴백 (§9-2: 실패해도 빈 화면 금지 원칙과 동일한 이유로 기본값을 둔다).
// 비주얼: stitch_custom_ui_design_system/main_organizer.

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
import { useApp, REASON_CODE_LABEL, type Item, type ReasonCode } from "@/lib/store";
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

const REASON_TAG_STYLE: Record<ReasonCode, { bg: string; color: string }> = {
  broke_replace: { bg: "var(--primary-light)", color: "var(--primary-hover)" },
  urgent_need: { bg: "var(--primary-light)", color: "var(--primary-hover)" },
  long_wanted: { bg: "var(--butter)", color: "var(--butter-dark)" },
  on_sale: { bg: "var(--accent-light)", color: "var(--accent-hover)" },
  social_proof: { bg: "var(--accent-light)", color: "var(--accent-hover)" },
  mood_boost: { bg: "var(--accent-light)", color: "var(--accent-hover)" },
  other: { bg: "var(--surface-alt)", color: "var(--text-sub)" },
};

export default function BoardPage() {
  const { goalType, monthlyBudget, items, moveItem } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const [evalState, setEvalState] = useState<EvalState>("idle");
  const [llmEstimates, setLlmEstimates] = useState<LlmEstimate[] | null>(null);
  // wayfinder #5 결정: 30~100 슬러더 (0=가격순, 100=AI 판단), 기본값 65.
  const [qualWeight, setQualWeight] = useState(Math.round(DEFAULT_QUAL_WEIGHT * 100));
  const [revealedCount, setRevealedCount] = useState(0);
  const [userPick, setUserPick] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"link" | "screenshot">("link");

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 4 } });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const cartItems = items.filter((it) => it.status === "cart");
  const buyItems = items.filter((it) => it.status === "buy");
  const cartTotal = cartItems.reduce((s, it) => s + it.price, 0) + buyItems.reduce((s, it) => s + it.price, 0);

  // 진짜 살 물건 목록이 바뀌면(추가/제거) 이전 판정 결과는 더 이상 안 맞으니 리셋 (§9-2 정신: 낡은 정보로 화면을 계속 보여주지 않는다)
  useEffect(() => {
    if (!llmEstimates) return;
    const evaluatedIds = new Set(llmEstimates.map((e) => e.id));
    const currentIds = new Set(buyItems.map((it) => it.id));
    const same =
      evaluatedIds.size === currentIds.size && [...evaluatedIds].every((id) => currentIds.has(id));
    if (!same) {
      setEvalState("idle");
      setLlmEstimates(null);
      setRevealedCount(0);
      setUserPick(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyItems.map((it) => it.id).join(",")]);

  const budget = monthlyBudget ?? 0;

  // 가중치 슬러더(qualWeight)가 바뀌면 즉시 재정렬 -- 결과를 본 다음 사용자가 조정하는 두 번째 판단 기준 (§6-1).
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

  // 순위 보기 전: 가격순 폴백. 순위 보기 후: AI 순위. 드래그/애니메이션 상태는 항상 실제 Item에서 가져온다
  // (ScoredItem은 표시용 파생 데이터라 exiting 같은 필드가 없다).
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

  const topPick = evalState === "ready" && scored ? scored[0] : null;
  const pickedItem = scored?.find((s) => s.id === userPick) ?? null;
  const showGapExplanation = evalState === "ready" && pickedItem && topPick && pickedItem.id !== topPick.id;

  async function handleEvaluate() {
    if (buyItems.length === 0) return;
    setEvalState("loading");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: buyItems.map((it) => ({
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
      const data = await res.json();
      setLlmEstimates(data.items);
      setEvalState("ready");
      setRevealedCount(0);
      // §8-1: 순위 공개 연출 - 위에서부터 순차적으로 드러남
      const count = buyItems.length;
      for (let i = 0; i < count; i++) {
        setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), i * 250);
      }
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
    if (zone === "cart-zone") moveItem(id, "cart");
    else if (zone === "buy-zone") moveItem(id, "buy");
    else if (zone === "toss-zone") moveItem(id, "removed");
    else if (zone === "flush-zone") moveItem(id, "purchased");
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* pt-16: 우측 상단 고정 테마 토글(ThemeToggle)에 헤더의 총액 뱃지가 가리지 않도록 여유 공간 확보 */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-16 pb-40 flex flex-col gap-5">
        {/* 헤더: 목표/잔여예산/총액 */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-sm font-bold text-lg shrink-0">
              🥜
            </div>
            <div>
              <h1
                className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 flex-wrap"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                목표: {goalType ?? "-"} <span style={{ color: "var(--border)" }}>|</span>{" "}
                <span className="text-[var(--text-sub)] font-medium text-sm">
                  이번 달 예산: <strong className="text-[var(--accent)] font-bold">{budget.toLocaleString()}원</strong>
                </span>
              </h1>
              <p className="text-xs text-[var(--text-sub)]">
                장바구니와 살 물건 사이를 드래그로 옮기며 소비 우선순위를 정해보세요.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-[var(--butter)] px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-semibold">
            🛒 총 담긴 금액: <strong>{cartTotal.toLocaleString()}원</strong>
          </div>
        </header>

        {/* ③ 항목 등록: 링크 파싱 -> 실패시 수동 입력 폴백 (§5). 스크린샷 일괄 등록은 장바구니 스크래핑이
            로그인/JS렌더링 문제로 불가능해서(무신사/지그재그/쿠팡/네이버 확인함) 나온 대안. */}
        <section
          className="bg-[var(--surface)] rounded-[22px] border-2 p-4 sm:p-5"
          style={{ borderColor: "var(--border)", boxShadow: "0 4px 0 0 var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setAddMode("link")}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all"
              style={
                addMode === "link"
                  ? { backgroundColor: "var(--text)", color: "var(--surface)" }
                  : { backgroundColor: "var(--surface-alt)", color: "var(--text-sub)" }
              }
            >
              링크로 추가
            </button>
            <button
              onClick={() => setAddMode("screenshot")}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all"
              style={
                addMode === "screenshot"
                  ? { backgroundColor: "var(--text)", color: "var(--surface)" }
                  : { backgroundColor: "var(--surface-alt)", color: "var(--text-sub)" }
              }
            >
              스크린샷으로 추가
            </button>
          </div>
          {addMode === "link" ? <AddItemForm /> : <ScreenshotImportForm />}
        </section>

        {/* ④ 2단 구조 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <ColumnDropZone id="cart-zone" icon="🧺" title="장바구니" count={cartItems.length}>
            {cartItems.length === 0 && <p className="text-sm text-[var(--text-sub)]">비어있음</p>}
            {cartItems.map((it) => (
              <DraggableItemRow key={it.id} item={it} />
            ))}
          </ColumnDropZone>

          <ColumnDropZone
            id="buy-zone"
            icon="✨"
            title="진짜 살 물건"
            count={buyItems.length}
            action={
              <button
                onClick={handleEvaluate}
                disabled={buyItems.length === 0 || evalState === "loading"}
                className="px-3 py-1 text-white text-xs font-bold rounded-full shadow-sm transition-all disabled:opacity-40"
                style={{ backgroundColor: "var(--text)" }}
              >
                {evalState === "loading" ? "음... 잠깐 생각해볼게요" : "순위 보기"}
              </button>
            }
          >
            {evalState === "error" && (
              <p className="text-xs" style={{ color: "var(--accent)" }}>
                판정에 실패해서 가격순으로 보여드릴게요
              </p>
            )}

            {/* §6-1: 결과를 본 다음 사용자가 직접 조정하는 두 번째 판단 기준. 30~100, 기본값 65 (wayfinder #5). */}
            {evalState === "ready" && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-sub)] mb-1">
                <span>가격순</span>
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={qualWeight}
                  onChange={(e) => setQualWeight(Number(e.target.value))}
                  className="flex-1"
                />
                <span>AI 판단</span>
                <span className="w-8 text-right">{qualWeight}</span>
              </div>
            )}

            <p
              className="text-sm font-bold px-3 py-2.5 rounded-xl border-2 mb-1"
              style={{ backgroundColor: "var(--accent-light)", color: "var(--accent-hover)", borderColor: "var(--accent)" }}
            >
              📋 예산선 아래 항목은 계획 재검토가 필요해요!
            </p>

            {buyItems.length === 0 && <p className="text-sm text-[var(--text-sub)]">비어있음</p>}

            {rows.map(({ item, overBudget, message, reasoning, index }, i) => {
              const revealed = evalState !== "ready" || index < revealedCount;
              if (!revealed) return null;
              return (
                <div key={item.id}>
                  {overBudget && i > 0 && !rows[i - 1].overBudget && (
                    <div className="py-3 my-1 flex items-center gap-3">
                      <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                      <div
                        className="text-white text-sm font-extrabold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        <span>✂️ 여기까지 예산 안 ({budget.toLocaleString()}원)</span>
                      </div>
                      <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                    </div>
                  )}
                  <DraggableItemRow
                    item={item}
                    dim={overBudget}
                    message={message}
                    reasoning={reasoning}
                    rank={evalState === "ready" ? index + 1 : undefined}
                    positive={evalState === "ready" && !overBudget && index === 0}
                  />
                </div>
              );
            })}

            {/* §6-3: 하나만 살 수 있다면? */}
            {evalState === "ready" && revealedCount === (scored?.length ?? 0) && scored && scored.length > 1 && (
              <div className="mt-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-bold mb-1.5">이 중에 하나만 살 수 있다면?</p>
                <div className="flex flex-wrap gap-1.5">
                  {scored.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setUserPick(s.id)}
                      className="text-xs rounded-full px-3 py-1 border-2 font-medium transition-all"
                      style={
                        userPick === s.id
                          ? { borderColor: "var(--primary)", backgroundColor: "var(--primary-light)" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                {/* §6-6: 선택 갭 설명 */}
                {showGapExplanation && pickedItem && topPick && (
                  <p
                    className="text-sm mt-2 rounded-2xl p-3"
                    style={{ backgroundColor: "var(--surface-alt)", color: "var(--text)" }}
                  >
                    당신은 {pickedItem.name}를 골랐는데 계산상으로는 {topPick.name}가 앞서요.{" "}
                    {pickedItem.name}는 만족이 {pickedItem.satisfaction_months}개월 정도인데{" "}
                    {topPick.name}는 {topPick.satisfaction_months}개월 가거든요. 그래도{" "}
                    {pickedItem.name}가 맞다면 그건 그것대로 괜찮아요.
                  </p>
                )}
                {evalState === "ready" && userPick === topPick?.id && (
                  <p className="text-sm mt-2 text-[var(--primary-hover)] font-medium">
                    계산이랑 똑같이 고르셨네요, 좋은 선택이에요.
                  </p>
                )}
              </div>
            )}
          </ColumnDropZone>
        </section>

        {/* 빼기/내리기 드롭존 - 항상 노출. ProgressRunner(h-8)가 화면 맨 밑을 쓰므로 그 위에 쌓는다. */}
        <div
          className="fixed bottom-8 left-0 right-0 grid grid-cols-2 gap-3 p-3 sm:px-6"
          style={{ backgroundColor: "var(--surface)", borderTop: "2px solid var(--border)" }}
        >
          <ActionDropZone id="toss-zone" icon="🗑️" title="빼기 (안 살 것)" desc="마음을 비우고 털어내기" />
          <ActionDropZone id="flush-zone" icon="✨" title="내리기 (샀음!)" desc="구매 완료, 쾌감 느끼기" />
        </div>
      </main>

      <DragOverlay>
        {activeItem ? (
          <div
            className="rounded-2xl px-3 py-2 shadow-lg border-2"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--primary)" }}
          >
            <span className="font-bold text-sm">{activeItem.name}</span>{" "}
            <span className="text-[var(--text-sub)] text-xs">{activeItem.price.toLocaleString()}원</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnDropZone({
  id,
  icon,
  title,
  count,
  action,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="rounded-[24px] border-2 p-5 sm:p-6 flex flex-col gap-2 min-h-[300px] transition-colors"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: isOver ? "var(--primary)" : "var(--border)",
        boxShadow: "0 4px 0 0 var(--border)",
      }}
    >
      <div className="flex items-center justify-between pb-3 mb-1 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg font-bold">
            {title} <span style={{ color: "var(--accent)" }}>({count})</span>
          </h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ActionDropZone({
  id,
  icon,
  title,
  desc,
}: {
  id: string;
  icon: string;
  title: string;
  desc: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="rounded-2xl p-3 sm:p-4 flex items-center justify-center gap-3 border-2 border-dashed transition-all"
      style={{
        borderColor: isOver ? "var(--accent)" : "var(--border)",
        backgroundColor: isOver ? "var(--accent-light)" : "transparent",
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: "var(--surface-alt)" }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs hidden sm:block text-[var(--text-sub)]">{desc}</p>
      </div>
    </div>
  );
}

function DraggableItemRow({
  item,
  dim,
  message,
  reasoning,
  rank,
  positive,
}: {
  item: Item;
  dim?: boolean;
  message?: string | null;
  reasoning?: string | null;
  rank?: number;
  positive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  // §8-1: 빼기="확 털어냄" (toss), 내리기="변기물 내리듯" (flush). 도착/공개 시엔 반동(pop-in).
  const exitClass =
    item.exiting === "toss"
      ? "animate-toss-away"
      : item.exiting === "flush"
        ? "animate-flush-down"
        : "animate-pop-in";

  const tag = REASON_TAG_STYLE[item.reasonCode];
  const reasonLabel =
    item.reasonCode === "other" && item.customReason ? item.customReason : REASON_CODE_LABEL[item.reasonCode];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`relative rounded-[20px] border-2 p-3.5 flex items-center justify-between gap-3 select-none touch-none overflow-hidden ${
        isDragging ? "opacity-30" : "cursor-grab"
      } ${exitClass} ${dim ? "opacity-70" : ""} ${item.exiting ? "pointer-events-none" : ""}`}
      style={{
        backgroundColor: "var(--surface)",
        borderColor: rank === 1 ? "var(--primary)" : dim ? "var(--border)" : "var(--border)",
        borderStyle: dim ? "dashed" : "solid",
      }}
    >
      {rank != null && (
        <span
          className="absolute top-0 left-0 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-br-xl"
          style={{ backgroundColor: rank === 1 ? "var(--primary)" : "var(--text-sub)" }}
        >
          {rank}위{dim ? " (초과)" : ""}
        </span>
      )}

      <div className={`flex items-center gap-3 ${rank != null ? "pt-2" : ""}`}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="w-14 h-14 object-cover rounded-2xl border shrink-0"
            style={{ borderColor: "var(--border)" }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl border flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: "var(--surface-alt)", borderColor: "var(--border)" }}
          >
            🛍️
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-extrabold" style={{ color: dim ? "var(--text-sub)" : "var(--text)" }}>
              {item.price.toLocaleString()}원
            </span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: tag.bg, color: tag.color }}
            >
              #{reasonLabel}
            </span>
          </div>
          {reasoning && <p className="text-xs italic mt-0.5 text-[var(--text-sub)]">&quot;{reasoning}&quot;</p>}
          {message && (
            <p
              className="text-sm font-bold mt-2 px-3 py-2 rounded-xl border-2"
              style={{ backgroundColor: "var(--butter)", color: "var(--butter-dark)", borderColor: "var(--butter-dark)" }}
            >
              💡 {message}
            </p>
          )}
        </div>
      </div>

      {positive && (
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full border shrink-0"
          style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-hover)", borderColor: "var(--primary)" }}
        >
          구매 확정권
        </span>
      )}
    </div>
  );
}
