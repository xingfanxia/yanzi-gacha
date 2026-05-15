from pathlib import Path
import os
import re
from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3210").rstrip("/")
OUT_DIR = Path("/tmp/yanzi-gacha-next-verify")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def loaded_images(page):
    return page.evaluate(
        """
        () => Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length
        """
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    wire = browser.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
    wire.goto(f"{BASE_URL}/spec/wireframe", wait_until="networkidle")
    expect(wire.locator('.screen.active[data-id="03"]')).to_have_count(1)
    expect(wire.locator("#screenSelect")).to_have_value("03")
    wire.screenshot(path=str(OUT_DIR / "wireframe-desktop.png"), full_page=False)
    print(f"wireframe active=03 images_loaded={loaded_images(wire)} screenshot={OUT_DIR / 'wireframe-desktop.png'}")

    wire.locator("#screenSelect").select_option("24")
    expect(wire.locator('.screen.active[data-id="24"]')).to_have_count(1)
    expect(wire.get_by_text("选 一 位 出 战")).to_be_visible()
    expect(wire.locator(".battle-root.embedded")).to_have_count(1)
    expect(wire.get_by_title("返回卡池")).to_have_count(0)
    expect(wire.get_by_role("button", name="返回卡池")).to_be_visible()
    wire.screenshot(path=str(OUT_DIR / "wireframe-battle-tab-desktop.png"), full_page=False)
    print(f"wireframe_battle_tab active=24 screenshot={OUT_DIR / 'wireframe-battle-tab-desktop.png'}")
    wire.get_by_role("button", name="返回卡池").click()
    expect(wire.locator('.screen.active[data-id="03"]')).to_have_count(1)
    wire.locator("#screenSelect").select_option("24")
    expect(wire.locator('.screen.active[data-id="24"]')).to_have_count(1)

    wire_mobile = browser.new_page(
        viewport={"width": 430, "height": 932},
        device_scale_factor=2,
        is_mobile=True,
    )
    wire_mobile.goto(f"{BASE_URL}/spec/wireframe", wait_until="networkidle")
    expect(wire_mobile.locator(".wf-device")).to_be_visible()
    wire_mobile.locator("#screenSelect").select_option("24")
    expect(wire_mobile.get_by_text("选 一 位 出 战")).to_be_visible()
    expect(wire_mobile.locator(".battle-root.embedded")).to_have_count(1)
    expect(wire_mobile.get_by_role("button", name="返回卡池")).to_be_visible()
    wire_mobile.get_by_role("button", name="返回卡池").click()
    expect(wire_mobile.locator('.screen.active[data-id="03"]')).to_have_count(1)
    wire_mobile.locator("#screenSelect").select_option("24")
    wire_mobile.screenshot(path=str(OUT_DIR / "wireframe-mobile.png"), full_page=False)
    print(f"wireframe_mobile battle_tab_visible=1 screenshot={OUT_DIR / 'wireframe-mobile.png'}")

    battle = browser.new_page(viewport={"width": 430, "height": 932}, device_scale_factor=2, is_mobile=True)
    battle.goto(f"{BASE_URL}/battle", wait_until="networkidle")
    expect(battle.get_by_text("选 一 位 出 战")).to_be_visible()
    battle.locator(".choose-card.A").click()
    expect(battle.locator(".choose-card.A")).to_have_class(re.compile("selected"))
    battle.get_by_text("进 入 共 鸣").click()
    expect(battle.get_by_text("choose your frequency")).to_be_visible(timeout=5000)
    expect(battle.get_by_title("出招回顾")).to_be_visible()
    battle.screenshot(path=str(OUT_DIR / "battle-mobile.png"), full_page=False)
    print(f"battle reached=action_tray images_loaded={loaded_images(battle)} screenshot={OUT_DIR / 'battle-mobile.png'}")

    browser.close()
