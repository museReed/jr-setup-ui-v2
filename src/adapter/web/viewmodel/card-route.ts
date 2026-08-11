// 網址列裡的「現在在第幾張」。
//
// 純函式、不碰 location——瀏覽器那一半留在 store，這裡只回答「這個字串指的是哪一張」。

export const CARD_PARAM = "card";

interface Identified {
  readonly id: string;
}

// 認不得就回第一張。網址是人手打／貼來貼去的東西，打錯不該讓畫面空掉——
// 停在第一張至少是一個學生走得下去的狀態。
export function resolveCardIndex(
  cards: readonly Identified[],
  param: string | null,
): number {
  if (param === null || param === "") {
    return 0;
  }

  const byId = cards.findIndex((card) => card.id === param);

  if (byId !== -1) {
    return byId;
  }

  // 數字是 1-based：畫面右上角寫的是「第 2 / 3 張」，學生會照那個數字打。
  const position = Number(param);

  if (!Number.isInteger(position)) {
    return 0;
  }

  const index = position - 1;
  return index >= 0 && index < cards.length ? index : 0;
}
