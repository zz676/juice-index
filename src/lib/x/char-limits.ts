export const X_FREE_CHAR_LIMIT = 280;
export const X_PREMIUM_CHAR_LIMIT = 25_000;

export function getXCharLimit(isXPremium: boolean): number {
  return isXPremium ? X_PREMIUM_CHAR_LIMIT : X_FREE_CHAR_LIMIT;
}
