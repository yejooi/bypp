"use client";

// ③④⑤⑥ 항목 등록 / 분류(2단 구조) / 예산 점검 / 정리 (§3, §4, §6-5).
// Phase 4: AI 판정 연결 + 순위 출력 + 공개 연출 (§6, §8-1).
// - 옮기기/빼기/내리기는 드래그로 (Phase 3, 사용자 요청).
// - "순위 보기" 전에는 가격순 폴백 (§9-2: 실패해도 빈 화면 금지 원칙과 동일한 이유로 기본값을 둔다).

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
import { useApp, REASON_CODE_LABEL, type Item } from "@/lib/store";
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
      <main className="flex-1 flex flex-col gap-4 p-4 pb-36">
        <header className="text-sm text-gray-500">
          목표: {goalType ?? "-"} · 월 예산: {budget.toLocaleString()}원
        </header>

        {/* ③ 항목 등록: 링크 파싱 -> 실패시 수동 입력 폴백 (§5). 스크린샷 일괄 등록은 장바구니 스크래핑이
            로그인/JS렌더링 문제로 불가능해서(무신사/지그재그/쿠팡/네이버 확인함) 나온 대안. */}
        <section className="border border-gray-300 rounded p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setAddMode("link")}
              className={`text-sm px-2 py-1 rounded ${addMode === "link" ? "bg-black text-white" : "text-gray-500"}`}
            >
              링크로 추가
            </button>
            <button
              onClick={() => setAddMode("screenshot")}
              className={`text-sm px-2 py-1 rounded ${
                addMode === "screenshot" ? "bg-black text-white" : "text-gray-500"
              }`}
            >
              스크린샷으로 추가
            </button>
          </div>
          {addMode === "link" ? <AddItemForm /> : <ScreenshotImportForm />}
        </section>

        {/* ④ 2단 구조 */}
        <section className="flex-1 flex flex-col md:flex-row gap-4">
          <ColumnDropZone id="cart-zone" title={`장바구니 (${cartItems.length})`}>
            {cartItems.length === 0 && <p className="text-sm text-gray-400">비어있음</p>}
            {cartItems.map((it) => (
              <DraggableItemRow key={it.id} item={it} />
            ))}
          </ColumnDropZone>

          <ColumnDropZone
            id="buy-zone"
            title={`진짜 살 물건 (${buyItems.length}) — ⑤ 예산선 아래는 흐리게`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handleEvaluate}
                disabled={buyItems.length === 0 || evalState === "loading"}
                className="text-xs bg-black text-white rounded px-3 py-1 disabled:opacity-30"
              >
                {evalState === "loading" ? "음... 잠깐 생각해볼게요" : "순위 보기"}
              </button>
              {evalState === "error" && (
                <span className="text-xs text-red-500">판정에 실패해서 가격순으로 보여드릴게요</span>
              )}
            </div>

            {/* §6-1: 결과를 본 다음 사용자가 직접 조정하는 두 번째 판단 기준. 30~100, 기본값 65 (wayfinder #5). */}
            {evalState === "ready" && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
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

            {buyItems.length === 0 && <p className="text-sm text-gray-400">비어있음</p>}

            {rows.map(({ item, overBudget, message, reasoning, index }, i) => {
              const revealed = evalState !== "ready" || index < revealedCount;
              if (!revealed) return null;
              return (
                <div key={item.id}>
                  {overBudget &&
                    i > 0 &&
                    !rows[i - 1].overBudget && (
                      <div className="border-t-2 border-dashed border-red-400 my-1 text-xs text-red-400">
                        예산선
                      </div>
                    )}
                  <DraggableItemRow
                    item={item}
                    dim={overBudget}
                    message={message}
                    reasoning={reasoning}
                    rank={evalState === "ready" ? index + 1 : undefined}
                  />
                </div>
              );
            })}

            {/* §6-3: 하나만 살 수 있다면? */}
            {evalState === "ready" && revealedCount === (scored?.length ?? 0) && scored && scored.length > 1 && (
              <div className="mt-2 border-t border-gray-200 pt-2">
                <p className="text-sm font-medium mb-1">이 중에 하나만 살 수 있다면?</p>
                <div className="flex flex-wrap gap-1">
                  {scored.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setUserPick(s.id)}
                      className={`text-xs border rounded px-2 py-1 ${
                        userPick === s.id ? "border-black font-semibold" : "border-gray-300"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                {/* §6-6: 선택 갭 설명 */}
                {showGapExplanation && pickedItem && topPick && (
                  <p className="text-sm text-gray-600 mt-2 border border-gray-200 rounded p-2">
                    당신은 {pickedItem.name}를 골랐는데 계산상으로는 {topPick.name}가 앞서요.{" "}
                    {pickedItem.name}는 만족이 {pickedItem.satisfaction_months}개월 정도인데{" "}
                    {topPick.name}는 {topPick.satisfaction_months}개월 가거든요. 그래도{" "}
                    {pickedItem.name}가 맞다면 그건 그것대로 괜찮아요.
                  </p>
                )}
                {evalState === "ready" && userPick === topPick?.id && (
                  <p className="text-sm text-gray-600 mt-2">계산이랑 똑같이 고르셨네요, 좋은 선택이에요.</p>
                )}
              </div>
            )}
          </ColumnDropZone>
        </section>

        {/* 빼기/내리기 드롭존 - 항상 노출. ProgressRunner(h-8)가 화면 맨 밑을 쓰므로 그 위에 쌓는다. */}
        <div className="fixed bottom-8 left-0 right-0 flex gap-2 p-3 bg-white border-t border-gray-300">
          <ActionDropZone id="toss-zone" label="빼기 (안 살 것)" />
          <ActionDropZone id="flush-zone" label="내리기 (샀음)" />
        </div>
      </main>

      <DragOverlay>
        {activeItem ? (
          <div className="border border-gray-300 rounded px-2 py-1 bg-white shadow-lg">
            <span className="font-medium text-sm">{activeItem.name}</span>{" "}
            <span className="text-gray-500 text-xs">{activeItem.price.toLocaleString()}원</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnDropZone({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border rounded p-3 flex flex-col gap-2 min-h-[200px] ${
        isOver ? "border-black bg-gray-50" : "border-gray-300"
      }`}
    >
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function ActionDropZone({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border-2 border-dashed rounded p-4 text-center text-sm ${
        isOver ? "border-black bg-gray-100 font-semibold" : "border-gray-300 text-gray-500"
      }`}
    >
      {label}
    </div>
  );
}

function DraggableItemRow({
  item,
  dim,
  message,
  reasoning,
  rank,
}: {
  item: Item;
  dim?: boolean;
  message?: string | null;
  reasoning?: string | null;
  rank?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  // §8-1: 빼기="확 털어냄" (toss), 내리기="변기물 내리듯" (flush). 도착/공개 시엔 반동(pop-in).
  const exitClass =
    item.exiting === "toss"
      ? "animate-toss-away"
      : item.exiting === "flush"
        ? "animate-flush-down"
        : "animate-pop-in";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex gap-2 border border-gray-200 rounded p-2 select-none touch-none ${
        isDragging ? "opacity-30" : "cursor-grab"
      } ${exitClass} ${dim ? "opacity-40" : ""} ${item.exiting ? "pointer-events-none" : ""}`}
    >
      {rank != null && <span className="text-lg font-bold text-gray-400 w-5 shrink-0">{rank}</span>}

      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="w-20 h-20 object-cover rounded shrink-0 bg-gray-100"
        />
      ) : (
        <div className="w-20 h-20 rounded shrink-0 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
          이미지 없음
        </div>
      )}

      <div className="flex flex-col gap-0.5 min-w-0 flex-1 justify-center">
        <p className="text-xs font-medium truncate">{item.name}</p>
        <p className="text-xs text-gray-500">
          {item.price.toLocaleString()}원 ·{" "}
          {item.reasonCode === "other" && item.customReason ? item.customReason : REASON_CODE_LABEL[item.reasonCode]}
        </p>
        {reasoning && <p className="text-xs text-gray-400 italic">&quot;{reasoning}&quot;</p>}
        {message && <p className="text-xs text-gray-600">{message}</p>}
      </div>
    </div>
  );
}
