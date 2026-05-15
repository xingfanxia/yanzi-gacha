// @ts-nocheck

type Cleanup = () => void;

function getSfx() {
  return typeof window !== "undefined" ? (window as any).SFX : null;
}

function add(
  target: EventTarget | null | undefined,
  type: string,
  listener: EventListenerOrEventListenerObject,
  cleanups: Cleanup[],
) {
  if (!target) return;
  target.addEventListener(type, listener);
  cleanups.push(() => target.removeEventListener(type, listener));
}

export function initWireframePrototype() {
  const cleanups: Cleanup[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
    return timer;
  };

  const select = document.getElementById("screenSelect") as HTMLSelectElement | null;
  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  const toastEl = document.getElementById("toast");
  let currentId = document.querySelector(".screen.active")?.getAttribute("data-id") || "03";

  function toast(message: string) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    later(() => toastEl.classList.remove("show"), 1800);
  }

  function showScreen(id: string) {
    const target = document.querySelector<HTMLElement>(`.screen[data-id="${id}"]`);
    if (!target) return;

    document.querySelectorAll<HTMLElement>(".screen").forEach((screen) => screen.classList.remove("active"));
    target.classList.add("active");
    target.style.animation = "none";
    target.offsetHeight;
    target.style.animation = "";
    target.querySelector<HTMLElement>(".scroll")?.scrollTo?.(0, 0);

    currentId = id;
    if (select) select.value = id;

    const sfx = getSfx();
    if (sfx) {
      if (id === "05") sfx.revealSignal?.();
      else if (id === "06") sfx.revealEcho?.();
      else if (id === "07" || id === "08") sfx.revealResonance?.();
      else if (id === "04") sfx.pullRelease?.();
    }

    if (id === "13" && !(window as any)._firstPayShown) {
      later(() => {
        document.getElementById("firstPayModal")?.classList.add("show");
        (window as any)._firstPayShown = true;
      }, 500);
    }

    if (id === "04") {
      later(() => {
        const nextTier = target.dataset.nextTier || "07";
        showScreen(nextTier);
      }, 1000);
    }
  }

  add(
    document.body,
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const toastNode = target.closest<HTMLElement>("[data-toast]");
      if (toastNode) {
        toast(toastNode.dataset.toast || "");
        return;
      }

      const jumpNode = target.closest<HTMLElement>("[data-jump]");
      if (!jumpNode) return;
      event.preventDefault();

      if (jumpNode.dataset.tier) {
        const transition = document.querySelector<HTMLElement>('.screen[data-id="04"]');
        transition?.setAttribute(
          "data-next-tier",
          "0" + (jumpNode.dataset.tier === "signal" ? 5 : jumpNode.dataset.tier === "echo" ? 6 : 7),
        );
      }

      const sfx = getSfx();
      if (sfx) {
        if (jumpNode.classList.contains("btn-pull")) sfx.pullCharge?.();
        else if (jumpNode.classList.contains("tab") || jumpNode.classList.contains("mem-card")) {
          sfx.swipe?.();
        } else {
          sfx.tap?.();
        }
      }

      showScreen(jumpNode.dataset.jump || "03");
    },
    cleanups,
  );

  const muteBtn = document.getElementById("muteBtn");
  add(
    muteBtn,
    "click",
    () => {
      const muted = getSfx()?.toggleMute?.();
      if (!muteBtn) return;
      muteBtn.textContent = muted ? "🔇" : "🔊";
      muteBtn.classList.toggle("muted", Boolean(muted));
    },
    cleanups,
  );

  add(select, "change", (event) => showScreen((event.target as HTMLSelectElement).value), cleanups);
  add(
    prev,
    "click",
    () => {
      const screenNumber = Number.parseInt(currentId, 10);
      if (screenNumber > 0) showScreen(String(screenNumber - 1).padStart(2, "0"));
    },
    cleanups,
  );
  add(
    next,
    "click",
    () => {
      const screenNumber = Number.parseInt(currentId, 10);
      if (screenNumber < 25) showScreen(String(screenNumber + 1).padStart(2, "0"));
    },
    cleanups,
  );

  const redeemSubmit = document.getElementById("redeemSubmit");
  add(
    redeemSubmit,
    "click",
    () => {
      const input = document.getElementById("redeemInput") as HTMLInputElement | null;
      const value = (input?.value || "").trim().toUpperCase();
      if (!value) {
        toast("请输入兑换码");
        return;
      }
      const close = () => {
        document.getElementById("redeemModal")?.classList.remove("show");
        if (input) input.value = "";
      };
      const amount = Number.parseInt(value.match(/-(\d+)/)?.[1] || "30", 10);
      if (value.startsWith("XIAOYU-")) {
        close();
        toast(`兑换成功 · 小雨 Beacon +${amount} · 仅小雨池可用`);
      } else if (value.startsWith("BEACON-") || value === "DEMO" || value.startsWith("MEMORIA-")) {
        close();
        toast(`兑换成功 · Beacon +${amount} · 妍子 + 虚拟池通用`);
      } else {
        toast("码无效 · 请联系对应 coser 检查前缀");
      }
    },
    cleanups,
  );

  add(
    document.body,
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const tab = target.closest<HTMLElement>("[data-legal-tab]");
      if (!tab) return;
      const tabName = tab.dataset.legalTab;
      document
        .querySelectorAll<HTMLElement>("[data-legal-tab]")
        .forEach((node) => node.classList.toggle("active", node.dataset.legalTab === tabName));
      document
        .querySelectorAll<HTMLElement>("[data-legal-content]")
        .forEach((node) => node.classList.toggle("active", node.dataset.legalContent === tabName));
    },
    cleanups,
  );

  function showPayModal(name: string, price: string, item: string) {
    const payName = document.getElementById("payName");
    const payItem = document.getElementById("payItem");
    const payPrice = document.getElementById("payPrice");
    if (payName) payName.textContent = name;
    if (payItem) payItem.textContent = item;
    if (payPrice) payPrice.textContent = price;
    document.getElementById("payModal")?.classList.add("show");
  }

  function showPayFlow(price: string, item: string) {
    const amount = document.getElementById("payFlowAmount");
    const flowPrice = document.getElementById("payFlowPrice");
    if (amount) amount.textContent = `${price} · ${item}`;
    if (flowPrice) flowPrice.textContent = price;
    document.getElementById("payFlowModal")?.classList.add("show");
  }

  add(
    document.body,
    "click",
    (event) => {
      const target = event.target as HTMLElement;

      const modalTrigger = target.closest<HTMLElement>("[data-modal]");
      if (modalTrigger) {
        document.getElementById(modalTrigger.dataset.modal || "")?.classList.add("show");
        return;
      }

      const realLink = target.closest<HTMLElement>("[data-real-link]");
      if (realLink) {
        event.preventDefault();
        window.open(realLink.dataset.realLink || "/battle", "_blank");
        return;
      }

      const payTrigger = target.closest<HTMLElement>("[data-pay-trigger]");
      if (payTrigger) {
        const item = payTrigger.closest(".sh-item");
        const desc = item?.querySelector(".desc")?.textContent || "";
        showPayFlow(payTrigger.textContent || "", desc);
        return;
      }

      const directPay = target.closest<HTMLElement>("[data-pay]");
      if (directPay) {
        const data = JSON.parse(directPay.dataset.pay || "{}");
        document.getElementById("firstPayModal")?.classList.remove("show");
        showPayModal(data.name, data.price, data.item);
        return;
      }

      const close = target.closest<HTMLElement>("[data-close]");
      if (close) {
        document.getElementById(close.dataset.close || "")?.classList.remove("show");
        return;
      }

      if (target.closest("[data-gate-exit]")) {
        toast("未同意须知,无法继续使用");
        return;
      }

      if (target.closest("[data-confirm-pay]")) {
        document.getElementById("payModal")?.classList.remove("show");
        toast("支付成功 · Beacon 已到账 · 归属 妍子");
      }
    },
    cleanups,
  );

  const validCodes: Record<string, string> = {
    YANZI: "妍子",
    XIAOYU: "小雨",
    DEMO: "妍子",
  };
  const codeInput = document.getElementById("codeInput") as HTMLInputElement | null;
  const codeSubmit = document.getElementById("codeSubmit");
  const codeErr = document.getElementById("codeErr");

  function trySync() {
    const code = (codeInput?.value || "").trim().toUpperCase();
    if (!code) {
      if (codeErr) {
        codeErr.textContent = "请先输入码";
        codeErr.classList.add("show");
      }
      return;
    }
    if (!validCodes[code]) {
      codeInput?.classList.add("error");
      if (codeErr) {
        codeErr.textContent = "频率不匹配… 这个码不对";
        codeErr.classList.add("show");
      }
      later(() => codeInput?.classList.remove("error"), 500);
      return;
    }
    codeErr?.classList.remove("show");
    toast(`Sync 成功 · 接入 ${validCodes[code]} 频道`);
    later(() => {
      showScreen("01");
      later(() => document.getElementById("welcomeModal")?.classList.add("show"), 4500);
    }, 400);
  }

  add(codeSubmit, "click", trySync, cleanups);
  add(
    codeInput,
    "keydown",
    (event) => {
      if ((event as KeyboardEvent).key === "Enter") trySync();
    },
    cleanups,
  );
  document.querySelectorAll<HTMLElement>("[data-fill]").forEach((node) => {
    add(
      node,
      "click",
      () => {
        if (codeInput) codeInput.value = node.dataset.fill || "";
        codeErr?.classList.remove("show");
      },
      cleanups,
    );
  });

  add(
    document.body,
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const openDrawer = target.closest<HTMLElement>("[data-open-drawer]");
      if (openDrawer) {
        event.stopPropagation();
        document.querySelector(`[data-drawer="${openDrawer.dataset.openDrawer}"]`)?.classList.add("show");
        getSfx()?.swipe?.();
        return;
      }
      const closeDrawer = target.closest<HTMLElement>("[data-close-drawer]");
      if (closeDrawer) {
        document.querySelector(`[data-drawer="${closeDrawer.dataset.closeDrawer}"]`)?.classList.remove("show");
        getSfx()?.tap?.();
      }
    },
    cleanups,
  );

  document.querySelectorAll<HTMLElement>(".multi-up-banner .up-card").forEach((card) => {
    add(
      card,
      "click",
      () => {
        card.parentElement?.querySelectorAll(".up-card").forEach((node) => node.classList.remove("active"));
        card.classList.add("active");
        getSfx()?.tap?.();
      },
      cleanups,
    );
  });

  document.querySelectorAll<HTMLElement>(".sh-coser-tabs .sh-ctab").forEach((button) => {
    add(
      button,
      "click",
      () => {
        const target = button.dataset.shopCoser;
        if (!target) return;
        button.parentElement?.querySelectorAll(".sh-ctab").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        document
          .querySelectorAll<HTMLElement>("[data-shop-group]")
          .forEach((group) => (group.hidden = group.dataset.shopGroup !== target));
        getSfx()?.swipe?.();
      },
      cleanups,
    );
  });

  function syncWmNotes(state: string) {
    document.querySelectorAll<HTMLElement>("[data-wm-note]").forEach((node) => {
      if (state === "1") {
        node.textContent = "✓ 已加买家专属水印 · 保护中";
        node.classList.remove("warn");
      } else {
        node.textContent = "⚠ 水印已关闭 · 图泄露责任自负";
        node.classList.add("warn");
      }
    });
  }

  const wmToggle = document.getElementById("wmToggle");
  if (wmToggle) {
    const initial = localStorage.getItem("memoria_wm_on") || "1";
    wmToggle.setAttribute("data-wm-on", initial);
    syncWmNotes(initial);
    add(
      wmToggle,
      "click",
      () => {
        const next = wmToggle.getAttribute("data-wm-on") === "1" ? "0" : "1";
        wmToggle.setAttribute("data-wm-on", next);
        localStorage.setItem("memoria_wm_on", next);
        syncWmNotes(next);
        toast(next === "1" ? "水印已开启 · 图片受保护" : "水印已关闭 · 图泄露责任自负");
        getSfx()?.tap?.();
      },
      cleanups,
    );
  } else {
    syncWmNotes(localStorage.getItem("memoria_wm_on") || "1");
  }

  const gate = document.getElementById("gateModal");
  if (gate) {
    const checks = gate.querySelectorAll<HTMLInputElement>("[data-gate-req]");
    const confirm = gate.querySelector<HTMLButtonElement>("#gateConfirm");
    const updateState = () => {
      if (confirm) confirm.disabled = !Array.from(checks).every((checkbox) => checkbox.checked);
    };
    checks.forEach((checkbox) => add(checkbox, "change", updateState, cleanups));
    add(
      confirm,
      "click",
      () => {
        localStorage.setItem("memoria_gate_agreed", "1");
        gate.classList.remove("show");
        getSfx()?.complete?.();
      },
      cleanups,
    );
    if (localStorage.getItem("memoria_gate_agreed") !== "1") {
      later(() => gate.classList.add("show"), 1500);
    }
  }

  document.querySelectorAll<HTMLElement>(".s-single .cv-skin:not(.locked)").forEach((skin) => {
    add(
      skin,
      "click",
      () => {
        skin.parentElement?.querySelectorAll(".cv-skin").forEach((node) => node.classList.remove("active"));
        skin.classList.add("active");
        const name = skin.querySelector(".cv-skin-name")?.textContent || "";
        const currentSkin = document.querySelector(".s-single .cv-current-skin .cv-cs-line b");
        if (currentSkin) currentSkin.textContent = name;
        getSfx()?.tap?.();
      },
      cleanups,
    );
  });

  const coserLabel: Record<string, string> = { yanzi: "妍子", xiaoyu: "小雨", aria: "Aria" };
  document.querySelectorAll<HTMLElement>(".s-archive .coser-card[data-cos-target]").forEach((card) => {
    add(
      card,
      "click",
      () => {
        const archive = card.closest<HTMLElement>(".s-archive");
        const grid = archive?.querySelector<HTMLElement>('[data-arch-view="grid"]');
        const overview = archive?.querySelector<HTMLElement>('[data-arch-view="overview"]');
        const label = coserLabel[card.dataset.cosTarget || ""] || card.dataset.cosTarget || "";
        if (overview) overview.style.display = "none";
        if (grid) {
          grid.style.display = "block";
          const backTitle = grid.querySelector(".arc-back-title");
          const coserName = grid.querySelector(".arc-coser-name");
          if (backTitle) backTitle.textContent = `${label} 的档案`;
          if (coserName) coserName.textContent = `Memoria · ${label} · 守护进度`;
        }
        archive?.querySelector<HTMLElement>(".scroll")?.scrollTo?.(0, 0);
        getSfx()?.swipe?.();
      },
      cleanups,
    );
  });

  document.querySelectorAll<HTMLElement>(".s-archive [data-arch-back]").forEach((button) => {
    add(
      button,
      "click",
      () => {
        const archive = button.closest<HTMLElement>(".s-archive");
        const grid = archive?.querySelector<HTMLElement>('[data-arch-view="grid"]');
        const overview = archive?.querySelector<HTMLElement>('[data-arch-view="overview"]');
        if (grid) grid.style.display = "none";
        if (overview) overview.style.display = "block";
        getSfx()?.tap?.();
      },
      cleanups,
    );
  });

  document.querySelectorAll<HTMLElement>(".pool-tabs .pt-btn").forEach((button) => {
    add(
      button,
      "click",
      () => {
        const filter = button.dataset.poolFilter;
        if (!filter) return;
        button.parentElement?.querySelectorAll(".pt-btn").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        document.querySelectorAll<HTMLElement>(".pool-card").forEach((card) => {
          const visible = filter === "all" ? !card.classList.contains("permanent") : card.dataset.pool === filter;
          card.classList.toggle("hidden", !visible);
        });
        getSfx()?.swipe?.();
      },
      cleanups,
    );
  });

  add(
    document.body,
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const detail = target.closest<HTMLElement>("[data-detail]");
      if (detail) {
        event.stopPropagation();
        document.querySelector(`.me-detail-panel[data-panel="${detail.dataset.detail}"]`)?.classList.add("show");
        getSfx()?.swipe?.();
        return;
      }
      const close = target.closest<HTMLElement>("[data-close-detail]");
      if (close) {
        close.closest(".me-detail-panel")?.classList.remove("show");
        getSfx()?.tap?.();
      }
    },
    cleanups,
  );

  document.querySelectorAll<HTMLElement>(".me-detail-panel.rank .rank-tabs .t").forEach((tab) => {
    add(
      tab,
      "click",
      () => {
        tab.parentElement?.querySelectorAll(".t").forEach((node) => node.classList.remove("active"));
        tab.classList.add("active");
        getSfx()?.tap?.();
      },
      cleanups,
    );
  });

  showScreen(currentId);

  return () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    cleanups.forEach((cleanup) => cleanup());
  };
}
