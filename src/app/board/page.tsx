"use client";

// ③④⑤⑥ 항목 등록 / 분류(2단 구조) / 예산 점검 / 정리 (§3, §4, §6-5).
// - 항목 등록: 링크 파싱 (§5), Phase 2에서 구현.
// - 순위: 지금은 가격 내림차순. 실제 AI 판정(§6)은 Phase 4에서 교체.
// - 옮기기/빼기/내리기 전부 드래그로 (버튼 제거, 사용자 요청).
//   데스크톱: 즉시 드래그. 모바일: 길게 눌러야 시작 (§9-0의 "긴 누름" 원칙 유지, 자동 스크롤은 dnd-kit에 맡김).
//   빼기/내리기는 드래그 중에만 나타나는 하단 드롭존으로 받는다.

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
import { useApp, REASON_CODE_LABEL, type Item } from "@/lib/store";
import { AddItemForm } from "@/components/AddItemForm";

export default function BoardPage() {
  const { goalType, monthlyBudget, items, moveItem } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 4 } });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 }, // 길게 눌러야 드래그 시작
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const cartItems = items.filter((it) => it.status === "cart");
  const buyItems = [...items.filter((it) => it.status === "buy")].sort(
    (a, b) => b.price - a.price
  );

  const budget = monthlyBudget ?? 0;
  let cumulative = 0;
  const buyItemsWithBudgetLine = buyItems.map((it) => {
    const before = cumulative;
    cumulative += it.price;
    return { item: it, overBudget: before >= budget };
  });

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
      <main className="flex-1 flex flex-col gap-4 p-4 pb-28">
        <header className="text-sm text-gray-500">
          목표: {goalType ?? "-"} · 월 예산: {budget.toLocaleString()}원
        </header>

        {/* ③ 항목 등록: 링크 파싱 -> 실패시 수동 입력 폴백 (§5) */}
        <section className="border border-gray-300 rounded p-3 flex flex-col gap-2">
          <h2 className="font-semibold text-sm">항목 등록</h2>
          <AddItemForm />
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
            {buyItems.length === 0 && <p className="text-sm text-gray-400">비어있음</p>}
            {buyItemsWithBudgetLine.map(({ item, overBudget }, i) => (
              <div key={item.id}>
                {overBudget && i > 0 && buyItemsWithBudgetLine[i - 1].overBudget === false && (
                  <div className="border-t-2 border-dashed border-red-400 my-1 text-xs text-red-400">
                    예산선
                  </div>
                )}
                <DraggableItemRow item={item} dim={overBudget} />
              </div>
            ))}
          </ColumnDropZone>
        </section>

        {/* 빼기/내리기 드롭존 - 항상 노출 */}
        <div className="fixed bottom-0 left-0 right-0 flex gap-2 p-3 bg-white border-t border-gray-300">
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

function DraggableItemRow({ item, dim }: { item: Item; dim?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  // §8-1: 빼기="확 털어냄" (toss), 내리기="변기물 내리듯" (flush). 도착 시엔 반동(pop-in).
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
      className={`flex items-center justify-between gap-2 border border-gray-200 rounded px-2 py-1 select-none touch-none ${
        isDragging ? "opacity-30" : "cursor-grab"
      } ${exitClass} ${dim ? "opacity-40" : ""} ${item.exiting ? "pointer-events-none" : ""}`}
    >
      <div className="text-sm">
        <span className="font-medium">{item.name}</span>{" "}
        <span className="text-gray-500">
          {item.price.toLocaleString()}원 · {REASON_CODE_LABEL[item.reasonCode]}
        </span>
      </div>
    </div>
  );
}
