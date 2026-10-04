// ======================
// enemies.js
// 敵データ
// ======================

const enemies = {

    // ======================
    // 通常敵
    // ======================

    slime: {
        id: "slime",
        name: "クリスタルスライム",
        icon: "🟢",
        image: "assets/enemies/slime_blue_v82.webp",
        type: "normal",
        maxHp: 35,
        passive: {
            type: "oozeArmor",
            label: "粘液膜",
            description: "攻撃を受けるたび25%で3ブロックを得る。",
            chance: 0.25,
            block: 3
        },
        moves: [
            { type: "attack", value: 8 },
            { type: "block", value: 6 }
        ],
        moveIndex: 0
    },

    slimeGreen: {
        id: "slimeGreen",
        name: "グリーンスライム",
        icon: "🟢",
        image: "assets/enemies/slime_green_v82.webp",
        type: "normal",
        maxHp: 35,
        passive: {
            type: "oozeArmor",
            label: "粘液膜",
            description: "攻撃を受けるたび25%で3ブロックを得る。",
            chance: 0.25,
            block: 3
        },
        moves: [
            { type: "attack", value: 8 },
            { type: "block", value: 6 }
        ],
        moveIndex: 0
    },

    goblin: {
        id: "goblin",
        name: "ゴブリン",
        icon: "👺",
        image: "assets/enemies/b1_goblin_raider.webp",
        type: "normal",
        maxHp: 45,
        passive: {
            type: "coward",
            label: "逃げ腰",
            description: "HP50%以下で一度だけ8ブロックを得るが、攻撃力が2下がる。",
            threshold: 0.5,
            block: 8,
            attackPenalty: 2
        },
        moves: [
            { type: "attack", value: 10 },
            { type: "attack", value: 5, applyStatus: { id: "weak", amount: 1 } }
        ],
        moveIndex: 0
    },

    orc: {
        id: "orc",
        name: "オーク戦士",
        icon: "👹",
        image: "assets/enemies/b1_orc_warrior.webp",
        type: "elite",
        maxHp: 88,
        passive: {
            type: "fury",
            label: "怒号",
            description: "HP50%以下になると攻撃力が4上がる。",
            threshold: 0.5,
            attackBonus: 4
        },
        moves: [
            { type: "attack", value: 14 },
            { type: "block", value: 10 }
        ],
        moveIndex: 0
    },
    // ======================
    // エリート
    // ======================

    goblinKing: {
        id: "goblinKing",
        name: "ゴブリンキング",
        icon: "👑",
        image: "assets/enemies/b1_goblin_warlord.webp",
        type: "elite",
        maxHp: 90,
        passive: {
            type: "fury",
            label: "王の激昂",
            description: "HP50%以下になると攻撃力が5上がり、8ブロックを得る。",
            threshold: 0.5,
            attackBonus: 5,
            block: 8
        },
        moves: [
            { type: "attack", value: 15 },
            { type: "block", value: 12 },
            { type: "attack", value: 20 }
        ],
        moveIndex: 0
    },
    ancientGolem: {
        id: "ancientGolem",
        name: "古代ゴーレム",
        icon: "🪨",
        image: "assets/enemies/ancient_golem_v102.webp",
        type: "elite",
        maxHp: 120,
        passive: {
            type: "fortify",
            label: "岩盤装甲",
            description: "HP50%以下になると一度だけ20ブロックを得る。",
            threshold: 0.5,
            block: 20
        },
        moves: [
            { type: "block", value: 15 },
            { type: "attack", value: 18 },
            { type: "attack", value: 12 },
            { type: "block", value: 10 }
        ],
        moveIndex: 0
    },
    skeletonKnight: {
        id: "skeletonKnight",
        name: "骸骨剣士",
        icon: "🦴",
        image: "assets/enemies/skeleton_knight_v102.webp",
        type: "normal",
        maxHp: 48,
        passive: {
            type: "guardBreak",
            label: "骨の意地",
            description: "HP50%以下になると一度だけ8ブロックを得る。",
            threshold: 0.5,
            block: 8
        },
        moves: [
            { type: "attack", value: 8 },
            { type: "block", value: 9 },
            { type: "attack", value: 10, applyStatus: { id: "vulnerable", amount: 1 } }
        ],
        moveIndex: 0
    },

    // ======================
    // ボス
    // 名前は仮。現在は能力設計を優先する。
    // 固定階層制ではなく、5体すべてがボス候補。
    // 深度による基礎補正は battle.js 側で共通適用する。
    // ======================

    splitBoss: {
        id: "splitBoss",
        name: "仮：分裂スライム",
        icon: "👑",
        image: "assets/enemies/slime_king_v82.webp",
        type: "boss",
        maxHp: 130,
        bossAbility: {
            type: "splitChain",
            threshold: 0.5,
            maxStage: 2
        },
        passive: {
            type: "bossRule",
            label: "分裂",
            description: "HPが50%以下になると2体に分裂する。"
        },
        moves: [
            { type: "attack", value: 13 },
            { type: "block", value: 10 },
            { type: "attack", value: 18 }
        ],
        moveIndex: 0
    },

    summonBoss: {
        id: "summonBoss",
        name: "仮：召喚主",
        icon: "👥",
        image: "assets/enemies/fairy_summoner_v83.webp",
        type: "boss",
        maxHp: 80,
        bossAbility: {
            type: "summonMinions",
            startMinions: 2,
            summonCount: 2,
            maxMinions: 3,
            minionHpMin: 20,
            minionHpMax: 30
        },
        passive: {
            type: "bossRule",
            label: "増援",
            description: "攻撃・防御・支援の妖精から2体と開始。子分が倒されても現在の行動は続行し、次の行動を使って2体まで補充する。子分上限は3体。"
        },
        moves: [
            { type: "attack", value: 11 },
            { type: "block", value: 9 },
            { type: "attack", value: 15 }
        ],
        moveIndex: 0
    },

    chargeBoss: {
        id: "chargeBoss",
        name: "仮：蓄積獣",
        icon: "🔥",
        image: "assets/enemies/charge_beast_stage_0.webp",
        chargeImages: [
            "assets/enemies/charge_beast_stage_0.webp",
            "assets/enemies/charge_beast_stage_1.webp",
            "assets/enemies/charge_beast_stage_2.webp",
            "assets/enemies/charge_beast_stage_3.webp",
            "assets/enemies/charge_beast_stage_4.webp",
            "assets/enemies/charge_beast_stage_5.webp",
            "assets/enemies/charge_beast_stage_6.webp"
        ],
        type: "boss",
        maxHp: 200,
        bossAbility: {
            type: "chargeCycle",
            maxStage: 6,
            attackBonusPerStage: 2,
            finisherDamage: 36
        },
        passive: {
            type: "bossRule",
            label: "六灯蓄積",
            description: "行動するたび灯火が1段階増える。6/6では次の行動が解放攻撃になり、使用後は0/6へ戻る。"
        },
        moves: [
            { type: "attack", value: 13 },
            { type: "block", value: 12 },
            { type: "attack", value: 17 }
        ],
        moveIndex: 0
    },

    thornBoss: {
        id: "thornBoss",
        name: "仮：棘の守護体",
        icon: "🌵",
        image: "assets/enemies/thorn_boss_normal.webp",
        thornImage: "assets/enemies/thorn_boss_active.webp",
        type: "boss",
        maxHp: 230,
        bossAbility: {
            type: "thornCycle",
            damageThreshold: 40,
            thorns: 3,
            thornBlock: 20
        },
        passive: {
            type: "bossRule",
            label: "棘展開",
            description: "一定ダメージを受けると、トゲを展開する。"
        },
        moves: [
            { type: "attack", value: 15 },
            { type: "block", value: 14 },
            { type: "attack", value: 21 }
        ],
        moveIndex: 0
    },

    twinBoss: {
        id: "twinBoss",
        name: "仮：双生体",
        icon: "♊",
        image: "assets/enemies/b2_iron_colossus_v33.webp",
        type: "boss",
        maxHp: 100,
        bossAbility: {
            type: "twinPair",
            reviveTurns: 3,
            reviveHpRate: 0.5
        },
        passive: {
            type: "bossRule",
            label: "双生復活",
            description: "紅蓮の騎士と蒼輪の巫女が2体で出現。片方を倒した後、残った側が3回行動するまでに倒せなければ、倒された方が最大HP50%で復活する。"
        },
        moves: [
            { type: "attack", value: 12 }
        ],
        moveIndex: 0
    },

    // ======================
    // ボス戦専用ユニット
    // type: bossPart なので通常のボス抽選には入らない。
    // ======================

    splitMediumBlue: {
        id: "splitMediumBlue",
        name: "青の中型スライム",
        icon: "🔵",
        image: "assets/enemies/slime_blue_v82.webp",
        type: "bossPart",
        splitColor: "blue",
        maxHp: 130,
        moves: [
            { type: "attack", value: 9 },
            { type: "block", value: 6 },
            { type: "attack", value: 12 }
        ],
        moveIndex: 0
    },

    splitMediumGreen: {
        id: "splitMediumGreen",
        name: "緑の中型スライム",
        icon: "🟢",
        image: "assets/enemies/slime_green_v82.webp",
        type: "bossPart",
        splitColor: "green",
        maxHp: 130,
        moves: [
            { type: "attack", value: 9 },
            { type: "block", value: 6 },
            { type: "attack", value: 12 }
        ],
        moveIndex: 0
    },

    splitSmallBlue: {
        id: "splitSmallBlue",
        name: "青の小型スライム",
        icon: "🔵",
        image: "assets/enemies/slime_blue_v82.webp",
        type: "bossPart",
        splitColor: "blue",
        maxHp: 130,
        moves: [
            { type: "attack", value: 6 },
            { type: "attack", value: 8 }
        ],
        moveIndex: 0
    },

    splitSmallGreen: {
        id: "splitSmallGreen",
        name: "緑の小型スライム",
        icon: "🟢",
        image: "assets/enemies/slime_green_v82.webp",
        type: "bossPart",
        splitColor: "green",
        maxHp: 130,
        moves: [
            { type: "attack", value: 6 },
            { type: "attack", value: 8 }
        ],
        moveIndex: 0
    },

    fairyAttackMinion: {
        id: "fairyAttackMinion",
        name: "攻撃の妖精",
        icon: "🔴",
        image: "assets/enemies/fairy_attack_v83.webp",
        type: "bossPart",
        minionRole: "attack",
        maxHp: 25,
        moves: [
            { type: "attack", value: 7 },
            { type: "attack", value: 10 }
        ],
        moveIndex: 0
    },

    fairyDefenseMinion: {
        id: "fairyDefenseMinion",
        name: "防御の妖精",
        icon: "🔵",
        image: "assets/enemies/fairy_defense_v83.webp",
        type: "bossPart",
        minionRole: "defense",
        maxHp: 25,
        moves: [
            { type: "guardAlly", value: 9 },
            { type: "block", value: 7 },
            { type: "guardAlly", value: 12 }
        ],
        moveIndex: 0
    },

    fairySupportMinion: {
        id: "fairySupportMinion",
        name: "支援の妖精",
        icon: "🟡",
        image: "assets/enemies/fairy_support_v83.webp",
        type: "bossPart",
        minionRole: "support",
        maxHp: 25,
        moves: [
            { type: "healAlly", value: 7 },
            { type: "buffAlly", status: "strength", value: 1 },
            { type: "attack", value: 4 }
        ],
        moveIndex: 0
    },

    twinAssault: {
        id: "twinAssault",
        name: "紅蓮の双生騎士",
        icon: "⚔️",
        image: "assets/enemies/twin_assault_v96.webp",
        type: "bossPart",
        maxHp: 120,
        twinRole: "assault",
        passive: {
            type: "bossRule",
            label: "双生復活",
            description: "片方が倒れると、3ターン後に復活する。"
        },
        moves: [
            { type: "attack", value: 16 },
            { type: "attack", value: 7, hits: 3 },
            { type: "buffSelf", status: "strength", value: 2 },
            { type: "attack", value: 24 }
        ],
        moveIndex: 0
    },

    twinSupport: {
        id: "twinSupport",
        name: "蒼輪の双生巫女",
        icon: "✨",
        image: "assets/enemies/twin_support_v96.webp",
        type: "bossPart",
        maxHp: 105,
        twinRole: "support",
        passive: {
            type: "bossRule",
            label: "双生復活",
            description: "片方が倒れると、3ターン後に復活する。"
        },
        moves: [
            { type: "guardAlly", value: 16 },
            { type: "healAlly", value: 12 },
            { type: "debuffPlayer", status: "vulnerable", value: 1 },
            { type: "attack", value: 9 }
        ],
        moveIndex: 0
    }
};
