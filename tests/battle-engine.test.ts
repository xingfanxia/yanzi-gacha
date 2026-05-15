import { describe, expect, it } from "vitest";
import {
  HEROES,
  MAX_CHARGE,
  MAX_ENERGY,
  type BattleState,
  normalizeSkinSource,
  resolveTurn,
} from "@/features/battle/model";

const baseState = (overrides: Partial<BattleState> = {}): BattleState => ({
  hp: 20,
  energy: 0,
  charge: 0,
  combo: 0,
  cstreak: 0,
  ...overrides,
});

describe("battle model parity", () => {
  it("keeps the original battle limits and rooted asset paths", () => {
    expect(MAX_ENERGY).toBe(3);
    expect(MAX_CHARGE).toBe(10);
    expect(HEROES.map((hero) => hero.skinImage)).toEqual(
      expect.arrayContaining([
        "/img/2B/DSC03676-5000.webp",
        "/img/小雨/xy-1.webp",
        "/spec/assets/virtual/aria/v1.webp",
      ]),
    );
    expect(normalizeSkinSource("img/2B/DSC03676-5000.webp")).toBe("/img/2B/DSC03676-5000.webp");
  });

  it("preserves the fast attack versus charging rule", () => {
    const result = resolveTurn(
      "attack",
      "charge",
      baseState({ combo: 1 }),
      baseState({ charge: 2, cstreak: 1 }),
      HEROES[0],
      HEROES[1],
    );

    expect(result.eDmg).toBe(4);
    expect(result.eC).toBe(5);
    expect(result.eCs).toBe(2);
    expect(result.msg).toContain("点数照收");
  });

  it("preserves burst penetration when power spends at least five charge", () => {
    const result = resolveTurn(
      "power",
      "attack",
      baseState({ charge: 6 }),
      baseState(),
      HEROES[0],
      HEROES[1],
      { pSpend: 5 },
    );

    expect(result.eDmg).toBe(6);
    expect(result.pDmg).toBe(2);
    expect(result.pC).toBe(1);
    expect(result.event).toBe("burst");
  });

  it("preserves guard reflection and break success outcomes", () => {
    const guarded = resolveTurn(
      "guard",
      "power",
      baseState({ energy: 3 }),
      baseState({ charge: 6 }),
      HEROES[1],
      HEROES[0],
      { eSpend: 6 },
    );
    expect(guarded.eDmg).toBe(4);
    expect(guarded.pE).toBe(1);

    const broken = resolveTurn(
      "break",
      "charge",
      baseState({ energy: 2, charge: 1 }),
      baseState({ charge: 7 }),
      HEROES[0],
      HEROES[1],
    );
    expect(broken.eC).toBe(0);
    expect(broken.pC).toBe(4);
    expect(broken.event).toBe("break_success");
  });
});
