// ======================
// v86 DEBUG MODE
// F2 で開閉する開発用パネル
// ======================

(() => {
    const bossIds = [
        ["splitBoss", "分裂スライム"],
        ["summonBoss", "召喚型"],
        ["chargeBoss", "蓄積型"],
        ["thornBoss", "トゲ型"],
        ["twinBoss", "双生体"]
    ];

    const normalIds = Object.values(enemies || {})
        .filter(data => data?.type === "normal")
        .map(data => [data.id, data.name || data.id]);

    const eliteIds = Object.values(enemies || {})
        .filter(data => data?.type === "elite")
        .map(data => [data.id, data.name || data.id]);

    let panel = null;
    let logBox = null;

    function log(message) {
        console.log("🧪 DEBUG:", message);
        if (!logBox) return;
        const time = new Date().toLocaleTimeString("ja-JP", {
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
        const row = document.createElement("div");
        row.className = "debug-log-row";
        row.textContent = `[${time}] ${message}`;
        logBox.prepend(row);
        while (logBox.children.length > 30) logBox.lastElementChild?.remove();
    }

    function currentUnit() {
        if (!Array.isArray(battleEnemies) || battleEnemies.length === 0) return null;
        if (typeof syncSelectedEnemy === "function") syncSelectedEnemy();
        return enemy || battleEnemies[selectedEnemyIndex] || null;
    }

    function ensurePlayer() {
        if (player) return true;
        const characterId = document.getElementById("debug-character")?.value || "warrior";
        if (!characters?.[characterId]) return false;
        startGame(characterId);
        log(`${characters[characterId].name || characterId} でデバッグ用ランを作成`);
        return Boolean(player);
    }

    function startEnemyBattle(enemyId) {
        const data = enemies?.[enemyId];
        if (!data) return log(`敵が見つからない: ${enemyId}`);
        if (!ensurePlayer()) return log("プレイヤー初期化に失敗");

        window.__debugForcedEnemyId = enemyId;
        changeScene("battle");
        startBattle(data.type);
        log(`直接戦闘開始: ${data.name || enemyId}`);
        refresh();
    }

    function refresh() {
        try { if (typeof syncSelectedEnemy === "function") syncSelectedEnemy(); } catch (_) {}
        try { if (typeof updatePlayerUI === "function") updatePlayerUI(); } catch (_) {}
        try { if (typeof updateEnemyUI === "function") updateEnemyUI(); } catch (_) {}
        try { if (typeof renderHand === "function") renderHand(); } catch (_) {}
        updateSummary();
    }

    function updateSummary() {
        const summary = document.getElementById("debug-summary");
        if (!summary) return;
        const unit = currentUnit();
        const playerText = player
            ? `${player.name || selectedCharacter || "Player"} HP ${player.hp}/${player.maxHp} E ${player.energy}`
            : "未開始";
        const enemyText = unit
            ? `${unit.name || unit.id} HP ${unit.hp}/${unit.maxHp}`
            : "敵なし";
        summary.innerHTML = `<span>PLAYER: ${playerText}</span><span>ENEMY: ${enemyText}</span>`;
    }

    function setEnemyHp(mode) {
        const unit = currentUnit();
        if (!unit) return log("操作できる敵がいない");

        const before = unit.hp;
        if (mode === "half") unit.hp = Math.max(1, Math.floor(unit.maxHp * 0.49));
        if (mode === "one") unit.hp = 1;
        if (mode === "full") unit.hp = unit.maxHp;

        const hpDamage = Math.max(0, before - unit.hp);
        if (hpDamage > 0 && typeof handleBossDamageEvent === "function") {
            handleBossDamageEvent(unit, hpDamage, before);
        }
        log(`${unit.name}: HP ${unit.hp}/${unit.maxHp}`);
        refresh();
    }

    function killSelectedEnemy() {
        const unit = currentUnit();
        if (!unit) return log("操作できる敵がいない");
        dealDamage(unit, Math.max(1, (unit.block || 0) + unit.hp));
        log(`${unit.name}: 即撃破`);
        refresh();
    }

    function healPlayerDebug() {
        if (!ensurePlayer()) return;
        player.hp = player.maxHp;
        log(`プレイヤーHP全回復`);
        refresh();
    }

    function addEnergyDebug() {
        if (!ensurePlayer()) return;
        player.energy = (player.energy || 0) + 10;
        log("エナジー +10");
        refresh();
    }

    function addBlockDebug() {
        if (!ensurePlayer()) return;
        player.block = (player.block || 0) + 100;
        log("ブロック +100");
        refresh();
    }

    function drawDebug() {
        if (!player || Scene?.current !== "battle") return log("戦闘中に使用してね");
        drawCards(5);
        log("5枚ドロー");
        refresh();
    }

    function setChargeStage(stage) {
        const unit = battleEnemies?.find(u => u?.bossAbility?.type === "chargeCycle");
        if (!unit) return log("蓄積型ボスがいない");
        const maxStage = unit.bossAbility.maxStage ?? 6;
        unit.chargeStage = Math.max(0, Math.min(maxStage, Number(stage) || 0));
        refreshBossIntent(unit);
        log(`灯火 ${unit.chargeStage}/${maxStage}`);
        refresh();
    }

    function forceSplit() {
        const unit = currentUnit();
        if (!unit || unit.bossAbility?.type !== "splitChain") {
            return log("分裂可能なスライムを選択してね");
        }
        if ((unit.splitStage || 0) >= 2) return log("小型はこれ以上分裂しない");
        markSplitPending(unit);
        log(`${unit.name}: 次の行動を分裂に変更`);
        refresh();
    }

    function forceSummon() {
        const owner = battleEnemies?.find(u => u?.hp > 0 && u?.bossAbility?.type === "summonMinions");
        if (!owner) return log("召喚型ボスがいない");
        performSummon(owner);
        log("子分を即時補充");
        refresh();
    }

    function forceThorn() {
        const unit = battleEnemies?.find(u => u?.hp > 0 && u?.bossAbility?.type === "thornCycle");
        if (!unit) return log("トゲ型ボスがいない");

        // v94: デバッグでは待たずにトゲ状態へ即移行。
        // 画像切替・20ブロック・反撃をその場で確認できる。
        unit.thornPending = false;
        unit.thornActive = true;
        unit.thornVisualActive = true;
        unit.thorns = unit.bossAbility?.thorns ?? 3;
        unit.block = Math.max(unit.block || 0, unit.bossAbility?.thornBlock ?? 20);
        unit.specialNotice = `DEBUG: トゲ${unit.thorns} / ブロック${unit.block}`;
        log(`トゲ状態を即時発動: トゲ${unit.thorns} / ブロック${unit.block}`);
        refresh();
    }

    function returnMap() {
        if (!player) return log("ランがまだない");
        changeScene("map");
        log("マップへ移動");
        refresh();
    }

    function buttons(items) {
        return items.map(([id, label]) =>
            `<button type="button" data-debug-enemy="${id}">${label}</button>`
        ).join("");
    }

    function createPanel() {
        if (document.getElementById("debug-panel")) {
            panel = document.getElementById("debug-panel");
            logBox = document.getElementById("debug-log");
            return;
        }

        panel = document.createElement("aside");
        panel.id = "debug-panel";
        panel.className = "debug-panel hidden";

        const charOptions = Object.entries(characters || {}).map(([id, data]) =>
            `<option value="${id}">${data.name || id}</option>`
        ).join("");

        panel.innerHTML = `
            <div class="debug-head">
                <div><strong>DEBUG MODE</strong><small>v108 / F2で開閉</small></div>
                <button id="debug-close" type="button">×</button>
            </div>
            <div id="debug-summary" class="debug-summary"></div>

            <section class="debug-section">
                <h3>直接戦闘</h3>
                <label class="debug-inline-label">キャラ<select id="debug-character">${charOptions}</select></label>
                <div class="debug-button-grid boss-grid">${buttons(bossIds)}</div>
                <details class="debug-details">
                    <summary>通常敵を選ぶ</summary>
                    <div class="debug-button-grid normal-grid">${buttons(normalIds)}</div>
                </details>
                <details class="debug-details">
                    <summary>エリート敵を選ぶ</summary>
                    <div class="debug-button-grid normal-grid">${buttons(eliteIds)}</div>
                </details>
            </section>

            <section class="debug-section">
                <h3>プレイヤー</h3>
                <div class="debug-button-grid">
                    <button id="debug-heal" type="button">HP全回復</button>
                    <button id="debug-energy" type="button">エナジー+10</button>
                    <button id="debug-block" type="button">ブロック+100</button>
                    <button id="debug-draw" type="button">5枚ドロー</button>
                </div>
            </section>

            <section class="debug-section">
                <h3>選択中の敵</h3>
                <div class="debug-button-grid">
                    <button data-debug-hp="half" type="button">HP49%</button>
                    <button data-debug-hp="one" type="button">HP1</button>
                    <button data-debug-hp="full" type="button">HP全快</button>
                    <button id="debug-kill" class="debug-danger" type="button">即撃破</button>
                </div>
            </section>

            <section class="debug-section">
                <h3>ボス固有</h3>
                <div class="debug-charge-row">
                    <span>蓄積</span>
                    ${[0,1,2,3,4,5,6].map(n => `<button type="button" data-debug-charge="${n}">${n}</button>`).join("")}
                </div>
                <div class="debug-button-grid">
                    <button id="debug-split" type="button">分裂を予約</button>
                    <button id="debug-summon" type="button">子分を補充</button>
                    <button id="debug-thorn" type="button">トゲ即時発動</button>
                    <button id="debug-map" type="button">マップへ戻る</button>
                </div>
            </section>

            <section class="debug-section">
                <div class="debug-log-title"><h3>DEBUG LOG</h3><button id="debug-log-clear" type="button">消去</button></div>
                <div id="debug-log" class="debug-log"></div>
            </section>
        `;

        document.body.appendChild(panel);
        logBox = panel.querySelector("#debug-log");

        panel.querySelector("#debug-close")?.addEventListener("click", toggle);
        panel.querySelectorAll("[data-debug-enemy]").forEach(b => b.addEventListener("click", () => startEnemyBattle(b.dataset.debugEnemy)));
        panel.querySelectorAll("[data-debug-hp]").forEach(b => b.addEventListener("click", () => setEnemyHp(b.dataset.debugHp)));
        panel.querySelectorAll("[data-debug-charge]").forEach(b => b.addEventListener("click", () => setChargeStage(b.dataset.debugCharge)));
        panel.querySelector("#debug-heal")?.addEventListener("click", healPlayerDebug);
        panel.querySelector("#debug-energy")?.addEventListener("click", addEnergyDebug);
        panel.querySelector("#debug-block")?.addEventListener("click", addBlockDebug);
        panel.querySelector("#debug-draw")?.addEventListener("click", drawDebug);
        panel.querySelector("#debug-kill")?.addEventListener("click", killSelectedEnemy);
        panel.querySelector("#debug-split")?.addEventListener("click", forceSplit);
        panel.querySelector("#debug-summon")?.addEventListener("click", forceSummon);
        panel.querySelector("#debug-thorn")?.addEventListener("click", forceThorn);
        panel.querySelector("#debug-map")?.addEventListener("click", returnMap);
        panel.querySelector("#debug-log-clear")?.addEventListener("click", () => { if (logBox) logBox.innerHTML = ""; });

        log("デバッグパネル準備完了");
        updateSummary();
    }

    function toggle() {
        if (!panel) createPanel();
        panel?.classList.toggle("hidden");
        if (panel && !panel.classList.contains("hidden")) refresh();
    }

    document.addEventListener("keydown", event => {
        if (event.key === "F2") {
            event.preventDefault();
            toggle();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createPanel);
    } else {
        createPanel();
    }

    window.gameDebug = { toggle, startEnemyBattle, setChargeStage, refresh };
})();
