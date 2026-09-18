"use client";

// ③④⑤⑥ 항목 등록 / 분류(2단 구조) / 예산 점검 / 정리 (§3, §4, §6-5).
// - 항목 등록: 지금은 이름+가격+이유 직접 입력. 실제 링크 파싱(§5)은 Phase 2에서 이 폼을 교체.
// - 순위: 지금은 가격 내림차순. 실제 AI 판정(§6)은 Phase 4에서 교체.
// - 데스크톱 좌우분할 / 모바일 위아래분할 (§9-0).

import { useApp, REASON_CODE_LABEL, type Item } from "@/lib/store";
import { AddItemForm } from "@/components/AddItemForm";

export default function BoardPage() {
  const { goalType, monthlyBudget, items, moveItem } = useApp();

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

  return (
    <main className="flex-1 flex flex-col gap-4 p-4">
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
        <div className="flex-1 border border-gray-300 rounded p-3 flex flex-col gap-2">
          <h2 className="font-semibold">장바구니 ({cartItems.length})</h2>
          {cartItems.length === 0 && (
            <p className="text-sm text-gray-400">비어있음</p>
          )}
          {cartItems.map((it) => (
            <ItemRow key={it.id} item={it}>
              <button
                onClick={() => moveItem(it.id, "buy")}
                className="text-xs border rounded px-2 py-1"
              >
                진짜 살 물건으로 →
              </button>
              <button
                onClick={() => moveItem(it.id, "removed")}
                className="text-xs border rounded px-2 py-1 text-gray-500"
              >
                빼기
              </button>
            </ItemRow>
          ))}
        </div>

        <div className="flex-1 border border-gray-300 rounded p-3 flex flex-col gap-2">
          <h2 className="font-semibold">
            진짜 살 물건 ({buyItems.length}) — ⑤ 예산선 아래는 흐리게
          </h2>
          {buyItems.length === 0 && (
            <p className="text-sm text-gray-400">비어있음</p>
          )}
          {buyItemsWithBudgetLine.map(({ item, overBudget }, i) => (
            <div key={item.id}>
              {overBudget && i > 0 && buyItemsWithBudgetLine[i - 1].overBudget === false && (
                <div className="border-t-2 border-dashed border-red-400 my-1 text-xs text-red-400">
                  예산선
                </div>
              )}
              <ItemRow item={item} dim={overBudget}>
                <button
                  onClick={() => moveItem(item.id, "cart")}
                  className="text-xs border rounded px-2 py-1"
                >
                  ← 장바구니로
                </button>
                <button
                  onClick={() => moveItem(item.id, "purchased")}
                  className="text-xs border rounded px-2 py-1 bg-black text-white"
                >
                  내리기 (샀음)
                </button>
              </ItemRow>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ItemRow({
  item,
  dim,
  children,
}: {
  item: Item;
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 border border-gray-200 rounded px-2 py-1 ${
        dim ? "opacity-40" : ""
      }`}
    >
      <div className="text-sm">
        <span className="font-medium">{item.name}</span>{" "}
        <span className="text-gray-500">
          {item.price.toLocaleString()}원 · {REASON_CODE_LABEL[item.reasonCode]}
        </span>
      </div>
      <div className="flex gap-1 shrink-0">{children}</div>
    </div>
  );
}
