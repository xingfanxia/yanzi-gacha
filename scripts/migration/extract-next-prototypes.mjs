import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Could not extract block ${start} ... ${end}`);
  }
  return source.slice(startIndex + start.length, endIndex);
}

function removeBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Could not remove block ${start} ... ${end}`);
  }
  return source.slice(0, startIndex) + source.slice(endIndex);
}

function rootedAssets(source) {
  return source
    .replaceAll("../img/", "/img/")
    .replaceAll("../spec/assets/", "/spec/assets/")
    .replaceAll('src="assets/', 'src="/spec/assets/')
    .replaceAll("src='assets/", "src='/spec/assets/")
    .replaceAll('href="assets/', 'href="/spec/assets/')
    .replaceAll("url('../img/", "url('/img/")
    .replaceAll('url("../img/', 'url("/img/')
    .replaceAll("url('assets/", "url('/spec/assets/")
    .replaceAll('url("assets/', 'url("/spec/assets/')
    .replaceAll('data-real-link="../battle/"', 'data-real-link="/battle"')
    .replaceAll('<option value="24">24 · ⚔ 频率战入口</option>', '<option value="24">24 · ⚔ 频率战</option>');
}

function embedBattleTab(source) {
  const start = source.indexOf("        <!-- ========== 24 频率战入口 ========== -->");
  const end = source.indexOf("\n\n      <!-- =============== 全局 modals", start);
  if (start < 0 || end < 0) {
    throw new Error("Could not replace wireframe battle tab");
  }
  const replacement = `        <!-- ========== 24 频率战 · 内嵌实战 ========== -->
        <div class="screen s-battle s-battle-tab" data-id="24">
          <div id="wireframeBattleMount" class="wireframe-battle-mount"></div>
        </div>

      </div>`;
  return source.slice(0, start) + replacement + source.slice(end);
}

function stabilizeBattleScript(source) {
  const oldParticles = `function Particles() {
  const particles = useMemo(() => Array.from({length: 12}, (_, i) => ({
    left: \`\${Math.random() * 100}%\`,
    delay: \`\${Math.random() * 9}s\`,
    duration: \`\${7 + Math.random() * 4}s\`,
    color: i % 3 === 0 ? 'var(--echo)' : i % 3 === 1 ? 'var(--charge)' : 'var(--signal)',
  })), []);`;
  const newParticles = `function Particles() {
  const particles = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const left = (i * 37 + 13) % 100;
    const delay = ((i * 19) % 90) / 10;
    const duration = 7 + ((i * 11) % 40) / 10;
    const color = i % 3 === 0 ? 'var(--echo)' : i % 3 === 1 ? 'var(--charge)' : 'var(--signal)';
    return {
      left: \`\${left}%\`,
      delay: \`\${delay}s\`,
      duration: \`\${duration}s\`,
      color,
    };
  }), []);`;
  if (!source.includes(oldParticles)) {
    throw new Error("Could not stabilize battle particles");
  }
  return source.replace(oldParticles, newParticles);
}

const wireframeHtml = read("spec/wireframe.html");
const wireframeCss = `${rootedAssets(between(wireframeHtml, "<style>", "</style>"))}

/* Next.js migration: screen 24 is now the real embedded battle tab. */
.s-battle-tab {
  background: #050816;
}
.s-battle-tab .wireframe-battle-mount {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
}
`;
const wireframeBody = embedBattleTab(rootedAssets(
  between(wireframeHtml, "<body>", '<script src="assets/sfx.js"></script>').trim(),
));

write(
  "src/features/wireframe/wireframe.css",
  `/* Extracted from spec/wireframe.html for pixel-parity migration. */\n${wireframeCss}\n`,
);
write(
  "src/features/wireframe/wireframeMarkup.ts",
  `// Extracted from spec/wireframe.html. Keep markup changes parity-driven.\nexport const WIREFRAME_MARKUP = ${JSON.stringify(wireframeBody)};\n`,
);

const battleHtml = read("battle/index.html");
const battleCss = `${rootedAssets(between(battleHtml, "<style>", "</style>")).replaceAll("#root", ".battle-root")}

/* Next.js migration: embedded mode lets battle live inside wireframe screen 24. */
.battle-root.embedded {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: #050816;
}
.battle-root.embedded .phone-shell {
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.battle-root.embedded .scene {
  padding-top: 34px;
}
@media (min-width: 500px) {
  .battle-root.embedded .phone-shell {
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}
`;
const battleScript = stabilizeBattleScript(
  removeBetween(
    rootedAssets(between(battleHtml, '<script type="text/babel">', "const root = ReactDOM.createRoot")),
    "// === 战斗常量 ===",
    "// ============ App ============",
  )
)
  .replace("const { useState, useEffect, useRef, useMemo } = React;\n", "")
  .replace(
    "// ============ App ============\nfunction App() {",
    `// ============ App ============
export function BattleExperience({ embedded = false } = {}) {
  useEffect(() => {
    if (embedded) return;
    if (new URLSearchParams(location.search).get('embed') === '1' || window.parent !== window) {
      document.body.classList.add('embed-mode');
    }
    return () => document.body.classList.remove('embed-mode');
  }, []);

  const handleBack = (event) => {
    if (window.parent && window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage({ type: 'memoria-battle-back' }, '*');
    }
  };

  return (
    <div className={\`battle-root\${embedded ? " embedded" : ""}\`}>
      {!embedded && (
        <a href="/" className="back-to-home" id="back-to-home-link" title="返回卡池" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>卡池</span>
        </a>
      )}
      <BattleApp />
    </div>
  );
}

function BattleApp() {`,
  )
  .replace(/\n<\/script>\s*$/u, "");

write(
  "src/features/battle/battle.css",
  `/* Extracted from battle/index.html for pixel-parity migration. */\n${battleCss}\n`,
);
write(
  "src/features/battle/BattleExperience.tsx",
  `// @ts-nocheck\n"use client";\n\nimport React, { useEffect, useMemo, useRef, useState } from "react";\nimport {\n  ACTION_LABEL,\n  ACTIONS,\n  ActionGlyph,\n  HEROES,\n  MAX_CHARGE,\n  MAX_ENERGY,\n  MAX_HP,\n  aiPickAction,\n  chargeInc,\n  commitPreview,\n  evaluateEV,\n  generateCandidates,\n  getTacticalHint,\n  predictActionDist,\n  resolveTurn,\n  scoreOutcome,\n  ultPreferredAction,\n} from "./model";\n\n${battleScript.trim()}\n`,
);

const modelBlock = rootedAssets(
  between(battleHtml, "// === 战斗常量 ===", "// ============ App ============"),
)
  .replace(
    "const MAX_HP = 20, MAX_ENERGY = 3, MAX_CHARGE = 10;",
    "export const MAX_HP = 20;\nexport const MAX_ENERGY = 3;\nexport const MAX_CHARGE = 10;",
  )
  .replace(
    "function _loadBattleSkinOverrides() {",
    `export type BattleState = {
  hp: number;
  energy: number;
  charge: number;
  combo: number;
  cstreak: number;
};

export function normalizeSkinSource(src) {
  if (!src) return src;
  if (/^(https?:|data:|\\/)/.test(src)) return src;
  return '/' + src.replace(/^(\\.\\.\\/)+/, '');
}

function _loadBattleSkinOverrides() {`,
  )
  .replace(
    "if (!/^(https?:|data:|\\/|\\.\\.\\/)/.test(src)) src = '../' + src;\n        out[letter] = src;",
    "out[letter] = normalizeSkinSource(src);",
  )
  .replace("const _skinOverrides =", "const _skinOverrides =")
  .replace("const HEROES =", "export const HEROES =")
  .replace("const ACTIONS =", "export const ACTIONS =")
  .replace("const ACTION_LABEL =", "export const ACTION_LABEL =")
  .replace("function ActionGlyph", "export function ActionGlyph")
  .replace("function chargeInc", "export function chargeInc")
  .replace("function resolveTurn", "export function resolveTurn")
  .replace("function predictActionDist", "export function predictActionDist")
  .replace("function scoreOutcome", "export function scoreOutcome")
  .replace("function generateCandidates", "export function generateCandidates")
  .replace("function evaluateEV", "export function evaluateEV")
  .replace("function ultPreferredAction", "export function ultPreferredAction")
  .replace("function aiPickActionNewbie", "export function aiPickActionNewbie")
  .replace("function aiPickActionAdept", "export function aiPickActionAdept")
  .replace("function aiPickActionMaster", "export function aiPickActionMaster")
  .replace(/\bfunction aiPickAction\(/u, "export function aiPickAction(")
  .replace("function getTacticalHint", "export function getTacticalHint")
  .replace("function commitPreview", "export function commitPreview");

write(
  "src/features/battle/model.tsx",
  `// @ts-nocheck\n// Extracted from battle/index.html. Keep rule changes parity-driven.\n${modelBlock.trim()}\n`,
);
