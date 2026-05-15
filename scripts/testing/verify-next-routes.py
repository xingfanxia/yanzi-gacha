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


def expect_inside_viewport(page, selector):
    locator = page.locator(selector).first
    expect(locator).to_be_visible()
    box = locator.bounding_box()
    viewport = page.viewport_size
    assert box is not None
    assert viewport is not None
    assert box["x"] >= -1, f"{selector} overflows left: {box}"
    assert box["y"] >= -1, f"{selector} overflows top: {box}"
    assert box["x"] + box["width"] <= viewport["width"] + 1, f"{selector} overflows right: {box}"
    assert box["y"] + box["height"] <= viewport["height"] + 1, f"{selector} overflows bottom: {box}"


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    wire = browser.new_page(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
    wire.goto(f"{BASE_URL}/spec/wireframe", wait_until="networkidle")
    expect(wire.locator('.screen.active[data-id="03"]')).to_have_count(1)
    expect(wire.locator("#screenSelect")).to_have_value("03")
    expect_inside_viewport(wire, ".wf-device")
    wire.screenshot(path=str(OUT_DIR / "wireframe-desktop.png"), full_page=False)
    print(f"wireframe active=03 images_loaded={loaded_images(wire)} screenshot={OUT_DIR / 'wireframe-desktop.png'}")

    wire.locator("#screenSelect").select_option("24")
    expect(wire.locator('.screen.active[data-id="24"]')).to_have_count(1)
    expect(wire.locator(".battle-root.embedded")).to_have_count(0)
    active_battle_entry = wire.locator('.screen.active[data-id="24"]')
    expect(active_battle_entry.get_by_role("heading", name="频率战")).to_be_visible()
    expect(active_battle_entry.get_by_role("button", name=re.compile("进 入 共 鸣"))).to_have_attribute(
        "data-real-link",
        "/battle",
    )
    wire.screenshot(path=str(OUT_DIR / "wireframe-battle-tab-desktop.png"), full_page=False)
    print(f"wireframe_battle_tab active=24 screenshot={OUT_DIR / 'wireframe-battle-tab-desktop.png'}")
    with wire.context.expect_page() as opened:
        active_battle_entry.get_by_role("button", name=re.compile("进 入 共 鸣")).click()
    battle_from_wire = opened.value
    battle_from_wire.wait_for_load_state("networkidle")
    expect(battle_from_wire).to_have_url(re.compile(r"/battle/?$"))
    expect(battle_from_wire.get_by_text("选 一 位 出 战")).to_be_visible()
    expect_inside_viewport(battle_from_wire, ".phone-shell")
    battle_from_wire.close()

    wire_mobile = browser.new_page(
        viewport={"width": 430, "height": 932},
        device_scale_factor=2,
        is_mobile=True,
    )
    wire_mobile.goto(f"{BASE_URL}/spec/wireframe", wait_until="networkidle")
    expect(wire_mobile.locator(".wf-device")).to_be_visible()
    expect_inside_viewport(wire_mobile, ".wf-device")
    wire_mobile.locator("#screenSelect").select_option("24")
    expect(wire_mobile.locator(".battle-root.embedded")).to_have_count(0)
    expect(
        wire_mobile.locator('.screen.active[data-id="24"]').get_by_role("button", name=re.compile("进 入 共 鸣"))
    ).to_be_visible()
    wire_mobile.screenshot(path=str(OUT_DIR / "wireframe-mobile.png"), full_page=False)
    print(f"wireframe_mobile battle_tab_visible=1 screenshot={OUT_DIR / 'wireframe-mobile.png'}")

    wire_compact = browser.new_page(viewport={"width": 390, "height": 640}, device_scale_factor=2, is_mobile=True)
    wire_compact.goto(f"{BASE_URL}/spec/wireframe", wait_until="networkidle")
    expect_inside_viewport(wire_compact, ".wf-device")
    wire_compact.close()

    battle = browser.new_page(viewport={"width": 430, "height": 932}, device_scale_factor=2, is_mobile=True)
    battle.goto(f"{BASE_URL}/battle", wait_until="networkidle")
    expect(battle.get_by_text("选 一 位 出 战")).to_be_visible()
    expect_inside_viewport(battle, ".phone-shell")
    battle.locator(".choose-card.A").click()
    expect(battle.locator(".choose-card.A")).to_have_class(re.compile("selected"))
    battle.get_by_text("进 入 共 鸣").click()
    expect(battle.get_by_text("choose your frequency")).to_be_visible(timeout=5000)
    expect(battle.get_by_title("出招回顾")).to_be_visible()
    battle.screenshot(path=str(OUT_DIR / "battle-mobile.png"), full_page=False)
    print(f"battle reached=action_tray images_loaded={loaded_images(battle)} screenshot={OUT_DIR / 'battle-mobile.png'}")

    battle_compact = browser.new_page(viewport={"width": 390, "height": 640}, device_scale_factor=2, is_mobile=True)
    battle_compact.goto(f"{BASE_URL}/battle", wait_until="networkidle")
    expect(battle_compact.get_by_text("选 一 位 出 战")).to_be_visible()
    expect_inside_viewport(battle_compact, ".phone-shell")
    expect(battle_compact.get_by_text("进 入 共 鸣")).to_be_visible()
    battle_compact.close()

    browser.close()
