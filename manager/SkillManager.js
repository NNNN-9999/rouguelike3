// ======================
// SkillManager.js v23
// 段階式・独立二択スキルツリー
// ======================

const SKILL_SAVE_KEY = "cardRoguelike_skillTree";
const SKILL_CHARACTERS = ["warrior", "wizard", "machinist", "gravekeeper", "common"];

let skillTreeCharacter = "warrior";
let skillState = loadSkillState();


function createEmptyUnlockedState() {
    const state = {};

    SKILL_CHARACTERS.forEach(characterId => {
        state[characterId] = [
            skillTrees[characterId].startNode
        ];
    });

    return state;
}


function createEmptyPointState() {
    return {
        warrior: 0,
        wizard: 0,
        machinist: 0,
        gravekeeper: 0,
        common: 0
    };
}


function getChoiceGroupMembers(groupId) {
    if (!groupId) {
        return [];
    }

    return Object.values(skillTree)
        .filter(node => node.choiceGroup === groupId);
}


function normalizeChoiceConflicts(characterId, nodeIds) {
    const valid = [...new Set(nodeIds)];
    const groups = new Map();

    valid.forEach(nodeId => {
        const node = skillTree[nodeId];

        if (
            !node ||
            node.character !== characterId ||
            !node.choiceGroup
        ) {
            return;
        }

        if (!groups.has(node.choiceGroup)) {
            groups.set(node.choiceGroup, []);
        }

        groups.get(node.choiceGroup).push(nodeId);
    });

    const remove = new Set();

    groups.forEach(ids => {
        if (ids.length <= 1) {
            return;
        }

        // v22.1以前の一本道セーブでは、v23で二択になる
        // 両ノードが取得済みのことがある。
        // よりコストの高い（旧ツリーで深い）側を残す。
        const keep = [...ids].sort((a, b) => {
            const costDiff =
                (skillTree[b]?.cost || 0) -
                (skillTree[a]?.cost || 0);

            if (costDiff !== 0) {
                return costDiff;
            }

            return ids.indexOf(b) - ids.indexOf(a);
        })[0];

        ids.forEach(id => {
            if (id !== keep) {
                remove.add(id);
            }
        });
    });

    return valid.filter(id => !remove.has(id));
}


function loadSkillState() {
    try {
        const raw = localStorage.getItem(SKILL_SAVE_KEY);

        if (!raw) {
            return {
                pointsByCharacter: createEmptyPointState(),
                unlockedByCharacter: createEmptyUnlockedState()
            };
        }

        const parsed = JSON.parse(raw);
        const pointsByCharacter = createEmptyPointState();
        const unlockedByCharacter = createEmptyUnlockedState();

        SKILL_CHARACTERS.forEach(characterId => {
            if (
                parsed.pointsByCharacter &&
                Number.isFinite(
                    Number(parsed.pointsByCharacter[characterId])
                )
            ) {
                pointsByCharacter[characterId] =
                    Math.max(
                        0,
                        Number(parsed.pointsByCharacter[characterId])
                    );
            } else if (
                Number.isFinite(
                    Number(parsed.totalPoints)
                )
            ) {
                pointsByCharacter[characterId] =
                    Math.max(
                        0,
                        Number(parsed.totalPoints)
                    );
            }

            const oldUnlocked =
                Array.isArray(
                    parsed.unlockedByCharacter?.[characterId]
                )
                    ? parsed.unlockedByCharacter[characterId]
                    : [];

            const validUnlocked =
                oldUnlocked.filter(nodeId =>
                    Boolean(skillTree[nodeId]) &&
                    skillTree[nodeId].character === characterId
                );

            const startId =
                skillTrees[characterId].startNode;

            unlockedByCharacter[characterId] =
                normalizeChoiceConflicts(
                    characterId,
                    [
                        startId,
                        ...validUnlocked.filter(
                            nodeId => nodeId !== startId
                        )
                    ]
                );
        });

        return {
            pointsByCharacter,
            unlockedByCharacter
        };

    } catch (error) {
        console.error(
            "スキルツリーのロードに失敗しました",
            error
        );

        return {
            pointsByCharacter: createEmptyPointState(),
            unlockedByCharacter: createEmptyUnlockedState()
        };
    }
}


function saveSkillState() {
    localStorage.setItem(
        SKILL_SAVE_KEY,
        JSON.stringify(skillState)
    );
}


// ======================
// SP
// ======================

function awardSkillPoint(
    amount = 1,
    characterId = selectedCharacter || skillTreeCharacter
) {
    if (!SKILL_CHARACTERS.includes(characterId) || characterId === "common") {
        return;
    }

    const earned = Math.max(0, amount);

    skillState.pointsByCharacter[characterId] =
        (skillState.pointsByCharacter[characterId] || 0) + earned;

    // v29: 共通SPはどのキャラで遊んでも貯まる。
    // 通常戦1 / エリート1 / ボス2程度のテンポ。
    const commonEarned = earned > 0
        ? Math.max(1, Math.ceil(earned / 2))
        : 0;

    skillState.pointsByCharacter.common =
        (skillState.pointsByCharacter.common || 0) + commonEarned;

    saveSkillState();
}


function getEarnedSkillPoints(
    characterId = skillTreeCharacter
) {
    return Math.max(
        0,
        skillState.pointsByCharacter[characterId] || 0
    );
}


function getUnlockedForCharacter(characterId) {
    return (
        skillState.unlockedByCharacter[characterId] ||
        []
    );
}


function isSkillUnlockedForCharacter(
    nodeId,
    characterId
) {
    return getUnlockedForCharacter(characterId)
        .includes(nodeId);
}


function getUsedSkillPoints(
    characterId = skillTreeCharacter
) {
    return getUnlockedForCharacter(characterId)
        .reduce((total, nodeId) => {
            return total + (skillTree[nodeId]?.cost || 0);
        }, 0);
}


function getAvailableSkillPoints(
    characterId = skillTreeCharacter
) {
    return Math.max(
        0,
        getEarnedSkillPoints(characterId) -
        getUsedSkillPoints(characterId)
    );
}


// v23も恒久ステータス強化はなし。
function getSkillBonusTotals() {
    const bonuses = {
        maxHp: 0, startGold: 0, battleGoldBonus: 0, extraRewardChoice: 0,
        startEnergy: 0, startBlock: 0, extraDraw: 0, victoryHeal: 0, maxRage: 0,
        chainDamageBonus: 0, chainBlockBonus: 0, recoveredCardBlock: 0,
        firstRecoveryEnergy: 0, secondRecoveryDraw: 0, startDiscard: 0,
        fifthCardDiscount: 0, firstHighMagicDiscount: 0, lowHpAttackBonus: 0,
        thirdCardAttackBonus: 0, lateComboAttackBonus: 0, attackCardBlock: 0,
        sameElementBlock: 0, sameElementAttackBonus: 0, sameElementFirstDraw: 0,
        highCostMagicAttackBonus: 0, highCostAttackBonus: 0, veryHighCostAttackBonus: 0,
        firstHeavyAttackBonus: 0, heavyAttackBlock: 0, discardScalingBonus: 0,
        discardThresholdAttackBonus: 0, deepDiscardAttackBonus: 0,
        discardThresholdSkillBlock: 0, rageSpendAttackBonus: 0, firstChainEnergy: 0,
        skillBlockBonus: 0, energySkillBlock: 0, thirdSameElementPower: 0,
        firstHighMagicDraw: 0, firstEnergyGainBonus: 0, fourthCardDraw: 0,
        selfDamageReduction: 0, retainBlockFraction: 0, energyPenaltyReduction: 0,
        penaltyToBlock: 0, zeroEnergyNextTurn: 0, discardTurnEnergy: 0
    };

    const characterId = selectedCharacter;
    if (!characterId || !SKILL_CHARACTERS.includes(characterId)) {
        return bonuses;
    }

    getUnlockedForCharacter(characterId).forEach(nodeId => {
        const effect = skillTree[nodeId]?.effect || {};
        Object.keys(bonuses).forEach(key => {
            if (typeof effect[key] === "number") {
                bonuses[key] += effect[key];
            }
        });
    });

    return bonuses;
}


// ======================
// Relic unlock compatibility
// ======================

function isRelicUnlockedForCharacter(
    relic,
    characterId
) {
    if (!relic) {
        return false;
    }

    if (!relic.unlockSkill) {
        return true;
    }

    const owner =
        relic.character || characterId;

    return isSkillUnlockedForCharacter(
        relic.unlockSkill,
        owner
    );
}


// ======================
// Node state
// ======================

function isNodeUnlocked(
    nodeId,
    characterId = skillTreeCharacter
) {
    return isSkillUnlockedForCharacter(
        nodeId,
        characterId
    );
}


function isChoiceLocked(
    nodeId,
    characterId = skillTreeCharacter
) {
    const node = skillTree[nodeId];

    if (!node?.choiceGroup) {
        return false;
    }

    return getChoiceGroupMembers(node.choiceGroup)
        .some(other =>
            other.id !== nodeId &&
            isNodeUnlocked(other.id, characterId)
        );
}


function areRequirementsMet(
    nodeId,
    characterId = skillTreeCharacter
) {
    const node = skillTree[nodeId];

    if (
        !node ||
        node.character !== characterId
    ) {
        return false;
    }

    const allRequirementsMet =
        (node.requires || [])
            .every(requiredId =>
                isNodeUnlocked(
                    requiredId,
                    characterId
                )
            );

    const anyRequirements =
        node.requiresAny || [];

    const anyRequirementMet =
        anyRequirements.length === 0 ||
        anyRequirements.some(requiredId =>
            isNodeUnlocked(
                requiredId,
                characterId
            )
        );

    return (
        allRequirementsMet &&
        anyRequirementMet
    );
}


function isNodeAvailable(
    nodeId,
    characterId = skillTreeCharacter
) {
    const node = skillTree[nodeId];

    if (
        !node ||
        node.character !== characterId ||
        isNodeUnlocked(nodeId, characterId) ||
        isChoiceLocked(nodeId, characterId)
    ) {
        return false;
    }

    return (
        areRequirementsMet(
            nodeId,
            characterId
        ) &&
        getAvailableSkillPoints(characterId) >= node.cost
    );
}


function unlockNode(nodeId) {
    if (
        !isNodeAvailable(
            nodeId,
            skillTreeCharacter
        )
    ) {
        return;
    }

    skillState
        .unlockedByCharacter[skillTreeCharacter]
        .push(nodeId);

    saveSkillState();
    closeSkillNodeModal();
    renderSkillTree();
}



// ======================
// v58: まとめて解放
// 一本道は一括取得し、requiresAny の未選択分岐に来たらそこで選択を求める。
// ======================

function getNodeCostForBatch(nodeId) {
    return Math.max(0, Number(skillTree[nodeId]?.cost || 0));
}



// ======================
// v62: 戦士のまとめて取得は、ツリーの見た目どおり
// 3ルート選択 → 1回目の二択 → 2回目の二択
// の順で固定して処理する。
// ======================
function getWarriorBatchRouteInfo(targetId) {
    const routes = {
        berserk: {
            entry: "warrior_berserk_1",
            first: [
                "warrior_unlock_1",
                "warrior_berserk_alt"
            ],
            second: [
                "warrior_unlock_2",
                "warrior_berserk_cap"
            ],
            deep: [
                "warrior_rule_rage",
                "warrior_berserk_step_7",
                "warrior_berserk_step_8",
                "warrior_berserk_step_9",
                "warrior_berserk_step_10"
            ]
        },
        fortress: {
            entry: "warrior_fortress_1",
            first: [
                "warrior_mastery",
                "warrior_fortress_alt"
            ],
            second: [
                "warrior_unlock_3",
                "warrior_fortress_cap"
            ],
            deep: [
                "warrior_rule_guard",
                "warrior_fortress_step_7",
                "warrior_fortress_step_8",
                "warrior_fortress_step_9",
                "warrior_fortress_step_10"
            ]
        },
        combo: {
            entry: "warrior_combo_1",
            first: [
                "warrior_combo_2",
                "warrior_combo_alt"
            ],
            second: [
                "warrior_combo_bridge",
                "warrior_legend"
            ],
            deep: [
                "warrior_rule_combo",
                "warrior_combo_step_7",
                "warrior_combo_step_8",
                "warrior_combo_step_9",
                "warrior_combo_step_10"
            ]
        }
    };

    for (const [routeId, route] of Object.entries(routes)) {
        const allIds = [
            route.entry,
            ...route.first,
            ...route.second,
            ...route.deep
        ];

        if (allIds.includes(targetId)) {
            return {
                routeId,
                ...route
            };
        }
    }

    return null;
}


function getWarriorBatchChoice(
    targetId,
    characterId = skillTreeCharacter
) {
    if (characterId !== "warrior") {
        return null;
    }

    const route =
        getWarriorBatchRouteInfo(targetId);

    if (!route) {
        return null;
    }

    const mainEntries = [
        "warrior_berserk_1",
        "warrior_fortress_1",
        "warrior_combo_1"
    ];

    const selectedMain =
        mainEntries.find(id =>
            isNodeUnlocked(id, characterId)
        );

    // v63:
    // まとめて取得先が特定ルートの中にあるなら、
    // 最初の3択を改めて出さず、そのルート入口を自動取得する。
    // 入口そのものをクリックした時だけ通常の取得処理に任せる。
    if (!selectedMain && targetId === route.entry) {
        return null;
    }

    if (!selectedMain) {
        return {
            targetId,
            autoEntry: route.entry
        };
    }

    // すでに別ルートを選択済みなら、その先は取得不可。
    if (selectedMain !== route.entry) {
        return {
            blocked: true,
            reason:
                "別のメインルートを選択済みです。リセットすると選び直せます。"
        };
    }

    const firstChosen =
        route.first.some(id =>
            isNodeUnlocked(id, characterId)
        );

    const targetNeedsFirst =
        route.second.includes(targetId) ||
        route.deep.includes(targetId);

    if (
        targetNeedsFirst &&
        !firstChosen
    ) {
        return {
            targetId,
            title: "1回目の分岐",
            description:
                "このルート内の二択です。どちらか1つを選ぶと、もう片方は取得できなくなります。",
            candidates: route.first
        };
    }

    const secondChosen =
        route.second.some(id =>
            isNodeUnlocked(id, characterId)
        );

    const targetNeedsSecond =
        route.deep.includes(targetId);

    if (
        targetNeedsSecond &&
        !secondChosen
    ) {
        return {
            targetId,
            title: "2回目の分岐",
            description:
                "さらに進むための二択です。ここでもどちらか1つを選択します。",
            candidates: route.second
        };
    }

    return null;
}


function buildBatchUnlockPlan(
    targetId,
    characterId = skillTreeCharacter,
    visiting = new Set()
) {
    if (isNodeUnlocked(targetId, characterId)) {
        return { nodes: [], choice: null, blocked: false };
    }

    if (visiting.has(targetId)) {
        return { nodes: [], choice: null, blocked: true };
    }

    const node = skillTree[targetId];

    if (
        !node ||
        node.character !== characterId ||
        isChoiceLocked(targetId, characterId)
    ) {
        return { nodes: [], choice: null, blocked: true };
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(targetId);

    const nodes = [];

    for (const requiredId of (node.requires || [])) {
        const result =
            buildBatchUnlockPlan(
                requiredId,
                characterId,
                nextVisiting
            );

        if (result.blocked || result.choice) {
            return {
                nodes: [...nodes, ...(result.nodes || [])],
                choice: result.choice || null,
                blocked: result.blocked
            };
        }

        nodes.push(...result.nodes);
    }

    const anyRequirements = node.requiresAny || [];

    if (anyRequirements.length > 0) {
        const alreadyChosen =
            anyRequirements.find(requiredId =>
                isNodeUnlocked(requiredId, characterId)
            );

        if (!alreadyChosen) {
            const candidates =
                anyRequirements
                    .filter(requiredId => {
                        const candidate = skillTree[requiredId];

                        return (
                            candidate &&
                            candidate.character === characterId &&
                            !isChoiceLocked(requiredId, characterId)
                        );
                    });

            if (candidates.length === 0) {
                return { nodes, choice: null, blocked: true };
            }

            if (candidates.length > 1) {
                return {
                    nodes,
                    choice: {
                        targetId,
                        candidates
                    },
                    blocked: false
                };
            }

            const result =
                buildBatchUnlockPlan(
                    candidates[0],
                    characterId,
                    nextVisiting
                );

            if (result.blocked || result.choice) {
                return {
                    nodes: [...nodes, ...(result.nodes || [])],
                    choice: result.choice || null,
                    blocked: result.blocked
                };
            }

            nodes.push(...result.nodes);
        }
    }

    if (!nodes.includes(targetId)) {
        nodes.push(targetId);
    }

    return {
        nodes: [...new Set(nodes)],
        choice: null,
        blocked: false
    };
}


function getBatchUnlockCost(nodeIds) {
    return (nodeIds || [])
        .filter(nodeId => !isNodeUnlocked(nodeId))
        .reduce(
            (total, nodeId) =>
                total + getNodeCostForBatch(nodeId),
            0
        );
}


function unlockBatchNodesSilently(nodeIds) {
    for (const nodeId of (nodeIds || [])) {
        if (isNodeUnlocked(nodeId)) {
            continue;
        }

        if (!isNodeAvailable(nodeId)) {
            return false;
        }

        skillState
            .unlockedByCharacter[skillTreeCharacter]
            .push(nodeId);
    }

    saveSkillState();
    return true;
}


function showBatchChoiceStep(
    targetId,
    choice
) {
    const modal =
        ensureSkillNodeModal();

    const content =
        modal.querySelector(
            "#skill-node-modal-content"
        );

    const candidateButtons =
        (choice?.candidates || [])
            .map(candidateId => {
                const candidate =
                    skillTree[candidateId];

                if (!candidate) {
                    return "";
                }

                return `
                    <button
                        type="button"
                        class="skill-batch-choice-button"
                        data-choice-node="${candidateId}"
                    >
                        <strong>
                            ${candidate.icon || "◆"} ${candidate.name}
                        </strong>
                        <span class="skill-batch-node-summary">
                            ${candidate.description || ""}
                        </span>
                        <div class="skill-batch-unlock-preview">
                            ${getSkillUnlockPreview(candidate)}
                        </div>
                        <small>
                            ${candidate.cost || 0} SP
                        </small>
                    </button>
                `;
            })
            .join("");

    content.innerHTML = `
        <div class="skill-modal-kicker">
            ROUTE CHOICE
        </div>

        <div class="skill-modal-icon">
            ◇
        </div>

        <h3>${choice?.title || "途中のルートを選択"}</h3>

        <div class="skill-modal-choice">
            ${
                choice?.description ||
                "ここから先へまとめて進むには、どちらか1つを選択してください。"
            }
        </div>

        <div class="skill-batch-help">
            <strong>まとめて取得について</strong>
            <span>
                目的のノードまでの一本道を自動で取得します。
                途中に分岐がある場合は、ここで選択してから先へ進みます。
                選択した側だけが取得されます。
            </span>
        </div>

        <div class="skill-batch-choice-list">
            ${candidateButtons}
        </div>
    `;

    content
        .querySelectorAll(
            "[data-choice-node]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const candidateId =
                        button.dataset.choiceNode;

                    const candidatePlan =
                        buildBatchUnlockPlan(
                            candidateId
                        );

                    if (candidatePlan.blocked) {
                        return;
                    }

                    // v59: さらに手前に未選択分岐がある場合も
                    // その分岐を続けて表示する。
                    if (candidatePlan.choice) {
                        const prefixCost =
                            getBatchUnlockCost(
                                candidatePlan.nodes
                            );

                        if (
                            prefixCost > 0 &&
                            getAvailableSkillPoints() <
                            prefixCost
                        ) {
                            button.classList.add(
                                "need-points"
                            );
                            return;
                        }

                        if (
                            prefixCost > 0 &&
                            !unlockBatchNodesSilently(
                                candidatePlan.nodes
                            )
                        ) {
                            return;
                        }

                        showBatchChoiceStep(
                            targetId,
                            candidatePlan.choice
                        );
                        return;
                    }

                    const candidateCost =
                        getBatchUnlockCost(
                            candidatePlan.nodes
                        );

                    if (
                        getAvailableSkillPoints() <
                        candidateCost
                    ) {
                        button.classList.add(
                            "need-points"
                        );
                        return;
                    }

                    if (
                        !unlockBatchNodesSilently(
                            candidatePlan.nodes
                        )
                    ) {
                        return;
                    }

                    continueBatchUnlock(
                        targetId
                    );
                }
            );
        });

    modal.classList.remove("hidden");
}


function continueBatchUnlock(targetId) {
    let warriorChoice =
        getWarriorBatchChoice(
            targetId
        );

    if (warriorChoice?.blocked) {
        return;
    }

    if (warriorChoice?.autoEntry) {
        const entryId =
            warriorChoice.autoEntry;

        if (!isNodeUnlocked(entryId)) {
            const entryCost =
                getNodeCostForBatch(entryId);

            if (
                getAvailableSkillPoints() <
                entryCost
            ) {
                return;
            }

            if (
                !unlockBatchNodesSilently(
                    [entryId]
                )
            ) {
                return;
            }
        }

        warriorChoice =
            getWarriorBatchChoice(
                targetId
            );
    }

    if (
        warriorChoice &&
        warriorChoice.candidates?.length
    ) {
        showBatchChoiceStep(
            targetId,
            warriorChoice
        );
        return;
    }

    const plan =
        buildBatchUnlockPlan(targetId);

    if (plan.blocked) {
        return;
    }

    const prefixNodes =
        plan.choice
            ? plan.nodes
            : plan.nodes;

    const prefixCost =
        getBatchUnlockCost(
            prefixNodes
        );

    if (prefixCost > 0) {
        if (
            getAvailableSkillPoints() <
            prefixCost
        ) {
            return;
        }

        if (
            !unlockBatchNodesSilently(
                prefixNodes
            )
        ) {
            return;
        }
    }

    if (plan.choice) {
        showBatchChoiceStep(
            targetId,
            plan.choice
        );
        return;
    }

    saveSkillState();
    closeSkillNodeModal();
    renderSkillTree();
}


function startBatchUnlock(targetId) {
    const plan =
        buildBatchUnlockPlan(targetId);

    if (plan.blocked) {
        return;
    }

    const totalCost =
        getBatchUnlockCost(
            plan.nodes
        );

    // 分岐までの一本道すらSP不足なら何もしない。
    if (
        totalCost > 0 &&
        getAvailableSkillPoints() < totalCost &&
        !plan.choice
    ) {
        return;
    }

    continueBatchUnlock(targetId);
}


function resetSkillTree() {
    const startId =
        skillTrees[skillTreeCharacter].startNode;

    const unlocked =
        getUnlockedForCharacter(
            skillTreeCharacter
        );

    if (
        unlocked.length <= 1 &&
        unlocked.includes(startId)
    ) {
        return;
    }

    const name =
        skillTrees[skillTreeCharacter]?.name ||
        "このキャラクター";

    if (
        !confirm(
            `${name}の追加アンロックをリセットしますか？\nSTARTは残り、使用SPはこのキャラへ返還されます。`
        )
    ) {
        return;
    }

    skillState.unlockedByCharacter[
        skillTreeCharacter
    ] = [startId];

    saveSkillState();
    closeSkillNodeModal();
    hideSkillHoverPreview();
    renderSkillTree();
}


// ======================
// Preview
// ======================

function getNodeTypeLabel(node) {
    if (node?.type === "start") {
        return "START";
    }

    if (node?.type === "relic") {
        return "RELIC UNLOCK";
    }

    if (node?.type === "milestone") {
        return "MILESTONE UNLOCK";
    }

    if (node?.type === "rule") {
        return "RULE CHANGE";
    }

    if (node?.type === "system") {
        if (
            node?.effect?.unlockEvent ||
            node?.effect?.eventSense ||
            node?.effect?.rareEvents
        ) {
            return "EVENT UNLOCK";
        }
        return "SYSTEM UNLOCK";
    }

    if (node?.type === "potion") {
        return "POTION UNLOCK";
    }

    return "CARD UNLOCK";
}


function getSkillUnlockPreview(node) {
    if (!node) {
        return "";
    }

    const parts = [];

    // v29.2: 何を解禁するノードなのか、カード/レリックの詳細とは別に必ず表示する。
    // システム・イベント系ノードで「効果はあるのに説明が見えない」状態を防ぐ。
    if (node.description) {
        parts.push(`
            <div class="skill-preview-entry skill-node-description">
                <strong>📖 解禁内容</strong>
                <span>${node.description}</span>
            </div>
        `);
    }

    (node.unlockCards || [])
        .map(cardId => cards[cardId])
        .filter(Boolean)
        .forEach(card => {
            parts.push(`
                <div class="skill-preview-entry card-preview">
                    <div class="skill-preview-category">🃏 カード追加</div>
                    <strong>🃏 ${card.name}</strong>
                    <span>${card.description || ""}</span>
                </div>
            `);
        });

    (node.unlockRelics || [])
        .map(relicId => relics[relicId])
        .filter(Boolean)
        .forEach(relic => {
            parts.push(`
                <div class="skill-preview-entry relic-preview">
                    <div class="skill-preview-category">💎 レリック追加</div>
                    <strong>${relic.icon || "💎"} ${relic.name}</strong>
                    <span>${relic.description || ""}</span>
                </div>
            `);
        });

    (node.unlockPotions || [])
        .map(potionId => typeof potions !== "undefined" ? potions[potionId] : null)
        .filter(Boolean)
        .forEach(potion => {
            parts.push(`
                <div class="skill-preview-entry potion-preview">
                    <div class="skill-preview-category">🧪 ポーション追加</div>
                    <strong>${potion.icon || "🧪"} ${potion.name}</strong>
                    <span>${potion.description || ""}</span>
                </div>
            `);
        });

    const eventNames = {
        sleepingForge: ["⚒️", "眠れる鍛冶場", "スラッシュとガードをまとめて強化できるイベント。"],
        markedSupply: ["📦", "印のついた補給箱", "35G獲得かHP12回復を選べるイベント。"],
        ancientBench: ["🗿", "古代の整備台", "深層で出現するレアイベント。"]
    };
    if (node.effect?.unlockEvent && eventNames[node.effect.unlockEvent]) {
        const [icon, name, desc] = eventNames[node.effect.unlockEvent];
        parts.push(`<div class="skill-preview-entry event-preview"><div class="skill-preview-category">❓ イベント追加</div><strong>${icon} ${name}</strong><span>${desc}</span></div>`);
    }
    if (node.effect?.eventSense) {
        parts.push(`<div class="skill-preview-entry event-preview"><div class="skill-preview-category">❓ イベント追加</div><strong>📦 印のついた補給箱</strong><span>35Gを獲得するか、HPを12回復するかを選べます。</span></div>`);
    }
    if (node.effect?.rareEvents) {
        parts.push(`<div class="skill-preview-entry event-preview"><div class="skill-preview-category">❓ イベント追加</div><strong>🗿 古代の整備台</strong><span>深層で出現するレアイベントがイベントプールに追加されます。</span></div>`);
    }

    if (parts.length === 0) {
        return `
            <div class="skill-preview-entry">
                <strong>${node.icon || "◆"} ${node.name}</strong>
                <span>このノードの詳細は今後追加予定です。</span>
            </div>
        `;
    }

    return parts.join("");
}


function ensureSkillHoverPreview() {
    let preview =
        document.getElementById(
            "skill-hover-preview"
        );

    if (preview) {
        return preview;
    }

    preview = document.createElement("div");
    preview.id = "skill-hover-preview";
    preview.className =
        "skill-hover-preview hidden";

    document.body.appendChild(preview);

    return preview;
}


function showSkillHoverPreview(
    nodeId,
    anchor
) {
    const node = skillTree[nodeId];

    if (!node || !anchor) {
        return;
    }

    const preview =
        ensureSkillHoverPreview();

    const choiceNote =
        node.choiceGroup
            ? (
                isChoiceLocked(nodeId)
                    ? `<div class="skill-preview-choice locked">🔒 同じ二択のもう片方を取得済み</div>`
                    : `<div class="skill-preview-choice">◇ この段階ではどちらか1つだけ選択</div>`
            )
            : "";

    preview.innerHTML = `
        <div class="skill-hover-preview-type">
            ${getNodeTypeLabel(node)}
        </div>

        <div class="skill-hover-preview-name">
            ${node.icon || "◆"} ${node.name}
        </div>

        ${choiceNote}
        ${getSkillUnlockPreview(node)}
    `;

    preview.classList.remove("hidden");

    const rect =
        anchor.getBoundingClientRect();

    const previewWidth = 310;
    const viewportWidth =
        window.innerWidth;

    let left =
        rect.right + 12;

    if (
        left + previewWidth >
        viewportWidth - 12
    ) {
        left =
            Math.max(
                12,
                rect.left -
                previewWidth -
                12
            );
    }

    const top =
        Math.max(
            12,
            Math.min(
                rect.top - 8,
                window.innerHeight - 230
            )
        );

    preview.style.left =
        `${left}px`;

    preview.style.top =
        `${top}px`;
}


function hideSkillHoverPreview() {
    document
        .getElementById(
            "skill-hover-preview"
        )
        ?.classList.add("hidden");
}


// ======================
// Modal
// ======================

function ensureSkillNodeModal() {
    let modal =
        document.getElementById(
            "skill-node-modal"
        );

    if (modal) {
        return modal;
    }

    modal = document.createElement("div");
    modal.id = "skill-node-modal";
    modal.className =
        "skill-node-modal hidden";

    modal.innerHTML = `
        <div class="skill-node-modal-backdrop"></div>

        <div class="skill-node-modal-card">
            <button
                id="skill-node-modal-close"
                class="skill-node-modal-close"
                type="button"
                aria-label="閉じる"
            >
                ×
            </button>

            <div id="skill-node-modal-content"></div>
        </div>
    `;

    document.body.appendChild(modal);

    modal
        .querySelector(
            ".skill-node-modal-backdrop"
        )
        .addEventListener(
            "click",
            closeSkillNodeModal
        );

    modal
        .querySelector(
            "#skill-node-modal-close"
        )
        .addEventListener(
            "click",
            closeSkillNodeModal
        );

    return modal;
}


function closeSkillNodeModal() {
    document
        .getElementById(
            "skill-node-modal"
        )
        ?.classList.add("hidden");
}


function showSkillNodeModal(nodeId) {
    hideSkillHoverPreview();

    const node = skillTree[nodeId];

    if (!node) {
        return;
    }

    const modal =
        ensureSkillNodeModal();

    const content =
        modal.querySelector(
            "#skill-node-modal-content"
        );

    const unlocked =
        isNodeUnlocked(nodeId);

    const available =
        isNodeAvailable(nodeId);

    const choiceLocked =
        isChoiceLocked(nodeId);

    const isStart =
        node.type === "start";

    const isMainRouteChoice =
        node.choiceGroup ===
        `${skillTreeCharacter}_main_route_choice`;

    const choiceNote =
        node.choiceGroup
            ? (
                choiceLocked
                    ? `<div class="skill-modal-choice locked">🔒 ${
                        isMainRouteChoice
                            ? "別のメインルートを選択済み。リセットすると選び直せます。"
                            : "この二択では別のスキルを選択済み"
                    }</div>`
                    : `<div class="skill-modal-choice">◇ ${
                        isMainRouteChoice
                            ? "3つのメインルートから1つだけ選択。リセットで選び直せます。"
                            : "この段階ではどちらか1つだけ選択"
                    }</div>`
            )
            : "";

    let buttonText = "";

    if (unlocked) {
        buttonText = "解放済み";
    } else if (choiceLocked) {
        buttonText = "別の選択を取得済み";
    } else if (available) {
        buttonText = `${node.cost} SPで解放`;
    } else if (areRequirementsMet(nodeId)) {
        buttonText = `SPが${node.cost}必要`;
    } else {
        buttonText = "まだ解放できない";
    }

    content.innerHTML = `
        <div class="skill-modal-kicker">
            ${getNodeTypeLabel(node)}
        </div>

        <div class="skill-modal-icon">
            ${node.icon || "◆"}
        </div>

        <h3>${node.name}</h3>

        ${choiceNote}

        <div class="skill-modal-effect-preview">
            ${getSkillUnlockPreview(node)}
        </div>

        ${
            isStart
                ? ""
                : `
                    <div class="skill-modal-actions">
                        <button
                            id="skill-modal-unlock"
                            class="skill-modal-unlock"
                            ${available ? "" : "disabled"}
                        >
                            ${buttonText}
                        </button>

                        ${
                            !unlocked &&
                            !choiceLocked &&
                            !isMainRouteChoice
                                ? `
                                    <div class="skill-batch-entry">
                                        <button
                                            id="skill-modal-batch-unlock"
                                            class="skill-modal-batch-unlock"
                                            type="button"
                                        >
                                            ここまでまとめて解放
                                        </button>
                                        <small>
                                            一本道は自動取得。途中に分岐があれば、その場で選択します。
                                        </small>
                                    </div>
                                `
                                : ""
                        }
                    </div>
                `
        }
    `;

    const button =
        content.querySelector(
            "#skill-modal-unlock"
        );

    if (
        button &&
        available
    ) {
        button.addEventListener(
            "click",
            () => unlockNode(nodeId)
        );
    }

    const batchButton =
        content.querySelector(
            "#skill-modal-batch-unlock"
        );

    if (batchButton) {
        const batchPlan =
            buildBatchUnlockPlan(nodeId);

        if (batchPlan.blocked) {
            batchButton.disabled = true;
            batchButton.textContent =
                "まとめて解放できません";
        } else if (!batchPlan.choice) {
            const batchCost =
                getBatchUnlockCost(
                    batchPlan.nodes
                );

            batchButton.textContent =
                batchCost > 0
                    ? `ここまでまとめて解放（${batchCost} SP）`
                    : "ここまで解放済み";

            if (
                batchCost <= 0 ||
                getAvailableSkillPoints() < batchCost
            ) {
                batchButton.disabled = true;
            }
        } else {
            batchButton.textContent =
                "ここまでまとめて解放（途中で選択）";
        }

        if (!batchButton.disabled) {
            batchButton.addEventListener(
                "click",
                () =>
                    startBatchUnlock(nodeId)
            );
        }
    }

    modal.classList.remove("hidden");
}


// ======================
// Graph
// ======================

function getGraphPoint(tree, pointId) {
    return (
        tree.layout?.[pointId] ||
        tree.junctions?.[pointId] ||
        null
    );
}


function getJunctionConnectedSkillIds(
    tree,
    junctionId,
    direction
) {
    if (direction === "incoming") {
        return (tree.edges || [])
            .filter(([, to]) => to === junctionId)
            .map(([from]) => from)
            .filter(id => Boolean(skillTree[id]));
    }

    return (tree.edges || [])
        .filter(([from]) => from === junctionId)
        .map(([, to]) => to)
        .filter(id => Boolean(skillTree[id]));
}


function getEdgeState(
    tree,
    fromId,
    toId,
    characterId
) {
    const fromIsJunction =
        Boolean(tree.junctions?.[fromId]);

    const toIsJunction =
        Boolean(tree.junctions?.[toId]);

    if (toIsJunction) {
        const fromUnlocked =
            isNodeUnlocked(
                fromId,
                characterId
            );

        return fromUnlocked
            ? "unlocked"
            : "locked";
    }

    if (fromIsJunction) {
        if (
            isNodeUnlocked(
                toId,
                characterId
            )
        ) {
            return "unlocked";
        }

        if (
            isChoiceLocked(
                toId,
                characterId
            )
        ) {
            return "choice-locked";
        }

        if (
            isNodeAvailable(
                toId,
                characterId
            )
        ) {
            return "ready";
        }

        if (
            areRequirementsMet(
                toId,
                characterId
            )
        ) {
            return "reachable";
        }

        return "locked";
    }

    const fromUnlocked =
        isNodeUnlocked(
            fromId,
            characterId
        );

    const toUnlocked =
        isNodeUnlocked(
            toId,
            characterId
        );

    if (
        fromUnlocked &&
        toUnlocked
    ) {
        return "unlocked";
    }

    if (
        isChoiceLocked(
            toId,
            characterId
        )
    ) {
        return "choice-locked";
    }

    if (
        fromUnlocked &&
        isNodeAvailable(
            toId,
            characterId
        )
    ) {
        return "ready";
    }

    if (fromUnlocked) {
        return "reachable";
    }

    return "locked";
}


function renderSkillGraphEdges(
    svg,
    tree,
    characterId
) {
    const ns =
        "http://www.w3.org/2000/svg";

    const defs =
        document.createElementNS(
            ns,
            "defs"
        );

    defs.innerHTML = `
        <marker
            id="skill-arrow-locked"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
        >
            <path
                d="M0 0 L10 5 L0 10 z"
                class="skill-arrow locked"
            ></path>
        </marker>

        <marker
            id="skill-arrow-ready"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
        >
            <path
                d="M0 0 L10 5 L0 10 z"
                class="skill-arrow ready"
            ></path>
        </marker>

        <marker
            id="skill-arrow-unlocked"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
        >
            <path
                d="M0 0 L10 5 L0 10 z"
                class="skill-arrow unlocked"
            ></path>
        </marker>
    `;

    svg.appendChild(defs);

    (tree.edges || [])
        .forEach(([fromId, toId]) => {
            const from =
                getGraphPoint(
                    tree,
                    fromId
                );

            const to =
                getGraphPoint(
                    tree,
                    toId
                );

            if (!from || !to) {
                return;
            }

            const line =
                document.createElementNS(
                    ns,
                    "line"
                );

            line.setAttribute(
                "x1",
                `${from.x}%`
            );

            line.setAttribute(
                "y1",
                `${from.y}%`
            );

            line.setAttribute(
                "x2",
                `${to.x}%`
            );

            line.setAttribute(
                "y2",
                `${to.y}%`
            );

            line.classList.add(
                "skill-graph-edge"
            );

            const state =
                getEdgeState(
                    tree,
                    fromId,
                    toId,
                    characterId
                );

            line.classList.add(state);

            if (state === "unlocked") {
                line.setAttribute(
                    "marker-end",
                    "url(#skill-arrow-unlocked)"
                );
            } else if (
                state === "ready" ||
                state === "reachable"
            ) {
                line.setAttribute(
                    "marker-end",
                    "url(#skill-arrow-ready)"
                );
            } else {
                line.setAttribute(
                    "marker-end",
                    "url(#skill-arrow-locked)"
                );
            }

            svg.appendChild(line);
        });
}


function renderSkillJunctions(
    graph,
    tree
) {
    Object.entries(
        tree.junctions || {}
    ).forEach(([, pos]) => {
        const junction =
            document.createElement(
                "div"
            );

        junction.className =
            "skill-graph-junction";

        junction.style.left =
            `${pos.x}%`;

        junction.style.top =
            `${pos.y}%`;

        graph.appendChild(junction);
    });
}


// ======================
// UI
// ======================

function showSkillTreeScreen() {
    skillTreeCharacter =
        selectedCharacter ||
        skillTreeCharacter ||
        "warrior";

    closeSkillNodeModal();
    hideSkillHoverPreview();

    changeScene("skill-tree");
    renderSkillTree();
}


function renderCharacterTabs(container) {
    const tabs =
        document.createElement("div");

    tabs.className =
        "skill-character-tabs skill-character-tabs-compact";

    SKILL_CHARACTERS.forEach(
        characterId => {
            const tree =
                skillTrees[characterId];

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "skill-character-tab" +
                (
                    characterId === skillTreeCharacter
                        ? " active"
                        : ""
                );

            const tabIcon =
                characterId === "common"
                    ? `<span class="skill-tab-fallback">${tree.icon}</span>`
                    : `<img class="skill-tab-character-icon"
                            src="assets/characters/${characterId}.webp"
                            alt=""
                            draggable="false">`;

            button.innerHTML = `
                ${tabIcon}
                <small>${tree.name}</small>
            `;

            button.addEventListener(
                "click",
                () => {
                    skillTreeCharacter =
                        characterId;

                    closeSkillNodeModal();
                    hideSkillHoverPreview();
                    renderSkillTree();
                }
            );

            tabs.appendChild(button);
        }
    );

    container.appendChild(tabs);
}


function renderSkillTree() {
    const pointsDisplay =
        document.getElementById(
            "skill-points-display"
        );

    const container =
        document.getElementById(
            "skill-tree-area"
        );

    if (
        !pointsDisplay ||
        !container
    ) {
        return;
    }

    const tree =
        skillTrees[skillTreeCharacter];

    const unlockedCount =
        getUnlockedForCharacter(
            skillTreeCharacter
        ).length;

    const totalNodes =
        Object.keys(
            tree.layout || {}
        ).length;

    pointsDisplay.innerHTML = `
        <span>
            ${tree.icon} ${tree.name}
        </span>

        <span>
            ${unlockedCount}/${totalNodes}
        </span>
    `;

    container.innerHTML = "";

    renderCharacterTabs(container);

    const shell =
        document.createElement(
            "section"
        );

    shell.className =
        "skill-graph-shell";

    const head =
        document.createElement("div");

    head.className =
        "skill-graph-header";

    head.innerHTML = `
        <div>
            <strong>${tree.name}</strong>
            <span>${tree.theme}</span>
        </div>

        <button
            id="skill-graph-reset"
            class="skill-graph-reset"
            type="button"
        >
            リセット
        </button>
    `;

    shell.appendChild(head);

    const viewport =
        document.createElement("div");

    viewport.className =
        "skill-graph-viewport-horizontal";

    const graph =
        document.createElement("div");

    graph.className =
        "skill-graph";

    const svg =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );

    svg.classList.add(
        "skill-graph-lines"
    );

    svg.setAttribute(
        "viewBox",
        "0 0 100 100"
    );

    svg.setAttribute(
        "preserveAspectRatio",
        "none"
    );

    renderSkillGraphEdges(
        svg,
        tree,
        skillTreeCharacter
    );

    graph.appendChild(svg);

    renderSkillJunctions(
        graph,
        tree
    );

    Object.entries(
        tree.layout || {}
    ).forEach(([nodeId, pos]) => {
        const node =
            skillTree[nodeId];

        if (!node) {
            return;
        }

        const unlocked =
            isNodeUnlocked(nodeId);

        const choiceLocked =
            isChoiceLocked(nodeId);

        const available =
            isNodeAvailable(nodeId);

        const requirementsMet =
            areRequirementsMet(nodeId);

        const button =
            document.createElement(
                "button"
            );

        button.type = "button";

        let stateClass = "locked";

        if (unlocked) {
            stateClass = "unlocked";
        } else if (choiceLocked) {
            stateClass = "choice-locked";
        } else if (available) {
            stateClass = "available";
        } else if (requirementsMet) {
            stateClass = "need-points";
        }

        button.className =
            `skill-graph-node ${node.type || "card"} ${stateClass}`;

        if (node.choiceGroup) {
            button.classList.add(
                "choice-node"
            );
        }

        if (
            nodeId === tree.startNode
        ) {
            button.classList.add(
                "start-node"
            );
        }

        button.style.left =
            `${pos.x}%`;

        button.style.top =
            `${pos.y}%`;

        button.innerHTML = `
            ${
                node.choiceGroup
                    ? `<span class="skill-choice-mark">◇</span>`
                    : ""
            }

            <span class="skill-graph-node-icon">
                ${node.icon || "◆"}
            </span>

            <span class="skill-graph-node-cost">
                ${
                    node.type === "start" ||
                    unlocked
                        ? "✓"
                        : choiceLocked
                            ? "🔒"
                            : node.cost
                }
            </span>
        `;

        button.title =
            node.name;

        button.addEventListener(
            "click",
            () =>
                showSkillNodeModal(
                    nodeId
                )
        );

        button.addEventListener(
            "mouseenter",
            () =>
                showSkillHoverPreview(
                    nodeId,
                    button
                )
        );

        button.addEventListener(
            "mouseleave",
            hideSkillHoverPreview
        );

        button.addEventListener(
            "focus",
            () =>
                showSkillHoverPreview(
                    nodeId,
                    button
                )
        );

        button.addEventListener(
            "blur",
            hideSkillHoverPreview
        );

        graph.appendChild(button);
    });

    viewport.appendChild(graph);
    shell.appendChild(viewport);
    container.appendChild(shell);

    // v73: 開いた瞬間にSTART（ツリー中央）を画面中央へ。
    // CSSのsmoothを使わず即座に合わせることで、初期表示の横滑り感をなくす。
    requestAnimationFrame(() => {
        const maxScrollLeft =
            Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        viewport.scrollLeft = Math.round(maxScrollLeft / 2);
    });

    // 通常ホイールはページの縦スクロール。
    // Shift+ホイール、またはトラックパッドの明確な横ジェスチャーだけツリーを横移動する。
    viewport.addEventListener(
        "wheel",
        event => {
            if (viewport.scrollWidth <= viewport.clientWidth) return;

            const horizontalGesture =
                Math.abs(event.deltaX) > Math.abs(event.deltaY);

            if (!event.shiftKey && !horizontalGesture) return;

            event.preventDefault();
            const delta = event.shiftKey
                ? (event.deltaY || event.deltaX)
                : event.deltaX;

            viewport.scrollLeft += delta;
        },
        { passive: false }
    );

    const footer =
        document.createElement("div");

    footer.className =
        "skill-tree-footer-bar";

    footer.innerHTML = `
        <span>
            ${tree.name} 使用可能SP
        </span>

        <strong>
            ${getAvailableSkillPoints(
                skillTreeCharacter
            )}
        </strong>
    `;

    container.appendChild(footer);

    head
        .querySelector(
            "#skill-graph-reset"
        )
        .addEventListener(
            "click",
            resetSkillTree
        );
}


const skillTreeButton =
    document.getElementById(
        "skill-tree-button"
    );

if (skillTreeButton) {
    skillTreeButton.addEventListener(
        "click",
        showSkillTreeScreen
    );
}


const skillResetButton =
    document.getElementById(
        "skill-reset-button"
    );

if (skillResetButton) {
    skillResetButton.classList.add(
        "hidden"
    );
}


const skillBackButton =
    document.getElementById(
        "skill-back-button"
    );

if (skillBackButton) {
    skillBackButton.addEventListener(
        "click",
        () => {
            closeSkillNodeModal();
            hideSkillHoverPreview();
            changeScene("title");
        }
    );
}


document.addEventListener(
    "keydown",
    event => {
        if (event.key === "Escape") {
            closeSkillNodeModal();
            hideSkillHoverPreview();
        }
    }
);
