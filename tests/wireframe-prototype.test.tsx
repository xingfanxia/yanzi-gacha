import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WireframePrototype } from "@/features/wireframe/WireframePrototype";

function activeScreenId(container: HTMLElement) {
  return container.querySelector(".screen.active")?.getAttribute("data-id");
}

describe("WireframePrototype", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the full 00-25 prototype and starts on the channel screen", () => {
    const { container } = render(<WireframePrototype />);
    const ids = Array.from(container.querySelectorAll(".screen")).map((screen) =>
      screen.getAttribute("data-id"),
    );

    expect(ids).toEqual(
      expect.arrayContaining([
        "00",
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
      ]),
    );
    expect(activeScreenId(container)).toBe("03");
    expect(container.querySelector<HTMLSelectElement>("#screenSelect")?.value).toBe("03");
  });

  it("keeps the original data-driven navigation and sync-code flow", () => {
    const { container } = render(<WireframePrototype />);

    fireEvent.click(container.querySelector<HTMLElement>('[data-jump="10"]')!);
    expect(activeScreenId(container)).toBe("10");

    fireEvent.change(container.querySelector<HTMLSelectElement>("#screenSelect")!, {
      target: { value: "00" },
    });
    fireEvent.click(container.querySelector<HTMLElement>('[data-fill="XIAOYU"]')!);
    expect(container.querySelector<HTMLInputElement>("#codeInput")?.value).toBe("XIAOYU");

    fireEvent.click(container.querySelector<HTMLElement>("#codeSubmit")!);
    vi.advanceTimersByTime(400);
    expect(activeScreenId(container)).toBe("01");

    vi.advanceTimersByTime(4500);
    expect(container.querySelector("#welcomeModal")).toHaveClass("show");
  });

  it("embeds the battle experience inside the frequency tab", () => {
    const { container } = render(<WireframePrototype />);

    fireEvent.change(container.querySelector<HTMLSelectElement>("#screenSelect")!, {
      target: { value: "24" },
    });

    expect(activeScreenId(container)).toBe("24");
    expect(container.querySelector("[data-real-link]")).not.toBeInTheDocument();
    expect(screen.getByText("选 一 位 出 战")).toBeInTheDocument();
    expect(container.querySelector(".battle-root.embedded")).toBeInTheDocument();
    expect(container.querySelector("#back-to-home-link")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回卡池" }));
    expect(activeScreenId(container)).toBe("03");
  });
});
