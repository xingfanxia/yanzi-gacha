import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BattleExperience } from "@/features/battle/BattleExperience";

describe("BattleExperience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the prep scene and advances into the battle scene after hero selection", async () => {
    const { container } = render(<BattleExperience />);

    expect(screen.getByText("选 一 位 出 战")).toBeInTheDocument();
    expect(screen.getByTitle("返回卡池")).toHaveAttribute("href", "/");

    fireEvent.click(container.querySelector<HTMLElement>(".choose-card.A")!);
    expect(container.querySelector(".choose-card.A")).toHaveClass("selected");

    fireEvent.click(screen.getByText("进 入 共 鸣"));
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(900);
      });
    }

    expect(screen.getByText("choose your frequency")).toBeInTheDocument();
    expect(screen.getByTitle("出招回顾")).toBeInTheDocument();
  });

  it("can render without standalone chrome when embedded in the wireframe", () => {
    const { container } = render(<BattleExperience embedded />);

    expect(screen.getByText("选 一 位 出 战")).toBeInTheDocument();
    expect(screen.queryByTitle("返回卡池")).not.toBeInTheDocument();
    expect(container.querySelector(".battle-root.embedded")).toBeInTheDocument();
  });
});
