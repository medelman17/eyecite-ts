export interface BughuntCase {
  key: string;
  text: string;
  sourceKind: "inline" | "fixture" | "cap";
}

export function inlineCases(): BughuntCase[] {
  return [
    {
      key: "inline/full-case",
      sourceKind: "inline",
      text: "Smith v. Jones, 1 U.S. 1, 3 (1801).",
    },
    {
      key: "inline/id-chain",
      sourceKind: "inline",
      text: "Smith v. Jones, 1 U.S. 1 (1801). Id. at 3.",
    },
    {
      key: "inline/statute",
      sourceKind: "inline",
      text: "The statute appears at 42 U.S.C. § 1983.",
    },
  ];
}
