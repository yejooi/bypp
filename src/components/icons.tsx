// 장바구니/진짜 살 물건/빼기/내리기용 커스텀 라인아트 아이콘. 기본 이모지 대신 컨셉에 맞는 모양으로
// 직접 그린다 (동물의 숲 감성: 통통한 곡선, 두꺼운 둥근 선). currentColor를 써서 색은 부모에서 결정.

type IconProps = { className?: string };

// 장바구니: 카트 실루엣.
export function CartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M6 8h4l4.5 22a3 3 0 0 0 3 2.4h16a3 3 0 0 0 3-2.4L40 15H12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="40" r="3" stroke="currentColor" strokeWidth="3" />
      <circle cx="31" cy="40" r="3" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

// 진짜 살 물건: 별이 달린 확정 가방 (이거다! 하는 느낌).
export function ConfirmedBagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M14 16l1.5-6a8.5 8.5 0 0 1 17 0l1.5 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 16h28l2 22a4 4 0 0 1-4 4.4H12a4 4 0 0 1-4-4.4z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 24l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"
        fill="currentColor"
      />
    </svg>
  );
}

// 빼기: 뚜껑 달린 휴지통.
export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 13h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M17 13V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 13l2 26a3 3 0 0 0 3 2.8h14a3 3 0 0 0 3-2.8l2-26"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 20v14M29 20v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 내리기(샀음): 체크가 찍힌 영수증/상자 -- 완료 도장.
export function DoneStampIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M12 6h24v34l-4-3-4 3-4-3-4 3-4-3-4 3z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 22l5 5 9-11"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
