# title: 星髄の坑道
// =====================================================================
//  星髄の坑道 (Star-Marrow Mine) — サバイバル・RPG worked example (Issue #20)
//
//  survival_rpg_gimmicks.md の全テンプレを使ったウィザードリィ型5階層ダンジョン。
//   - 完全決定論: RANDOM/シャッフル不使用。勝敗は装備とHP収支で決まる。
//   - 公開: player_hp / herb_count / equipment(LIST) / conditions(LIST) / depth
//     非公開: 勝敗フラグ (rat_beaten 等) と last_battle_won
//   - 前提ゲート戦闘×2: 蜘蛛(坑夫灯必須) / 星喰らい(欠月の護符必須)
//     → 必須装備なしでは attack_power が 0 になり数値上勝てない
//   - 成長ガード: 岩盤(B3→B4)は鋼の鶴嘴が無いと砕けない
//   - 一度きり戦闘は真偽フラグ管理 (落とし穴1) / tunnel 勝敗はフラグで判別 (落とし穴5)
//
//  階層設計表（またぎ制約: 取得階→使用階の階差2まで）
//   | 階 | 敵                     | 必須アイテム(入手→使用)      | ヒント(入手→使用)        | 回復・補給 |
//   | B1 | 大鼠(ざこ・素手で可)   | 錆びた短剣(B1→B1以降)        | 日誌「門番は光を嫌う」(B1→B3) | 薬草+1 |
//   | B2 | なし(リスク選択)       | 銀の坑夫灯(B2→B3)            | —                        | 薬草+1 |
//   | B3 | 闇綴りの蜘蛛(中ボス)   | 鋼の鶴嘴(B3→B4岩盤・B5戦闘)  | 石版「欠けゆく月」(B3→B5) | —      |
//   | B4 | なし(瘴気=状態異常)    | 欠月の護符(B4→B5)            | —                        | 回復の泉 |
//   | B5 | 星喰らい(ラスボス)     | —                            | —                        | —      |
//
//  生存マージン: 開始HP20 / 薬草回復8×最大3個。最短経路の被ダメ合計 ≈ 20〜26
//  （大鼠4・落石6・蜘蛛6・星喰らい10）→ 余剰マージン ≈ 被弾2〜3回分。
// =====================================================================

VAR player_hp = 20
VAR herb_count = 1
VAR depth = 1
LIST equipment = rusty_dagger, miners_lamp, steel_pick, waning_charm
LIST conditions = poisoned
VAR public_status = "player_hp, herb_count, equipment, conditions, depth"

// 非公開の進行フラグ（勝敗・開通）
VAR last_battle_won = false
VAR rat_beaten = false
VAR spider_beaten = false
VAR boss_beaten = false
VAR passage_cleared = false
VAR rock_broken = false

-> intro

// ---------------- 関数 ----------------

=== function carries(item) ===
~ return equipment ? item

// 前提ゲート: gate 1=坑夫灯が要る敵 / 2=欠月の護符が要る敵
=== function attack_power(gate) ===
{ gate == 1 && not carries(miners_lamp):
    ~ return 0
}
{ gate == 2 && not carries(waning_charm):
    ~ return 0
}
{ carries(steel_pick):
    ~ return 8
}
{ carries(rusty_dagger):
    ~ return 4
}
~ return 2

=== function heal(amount) ===
~ player_hp = player_hp + amount
{ player_hp > 20:
    ~ player_hp = 20
}

=== function take_hit(dmg) ===
{ conditions ? poisoned:
    ~ player_hp = player_hp - dmg - 1
- else:
    ~ player_hp = player_hp - dmg
}

// ---------------- 導入 ----------------

=== intro ===
村を蝕む石咳病に、薬師の師は言い遺した——「特効の薬礎は、星髄。落ちた星の芯だけだ」と。
星髄が眠るのは、とうに封じられた星髄の坑道。あなたは薬袋ひとつを腰に、地下への梯子に足をかけた。
-> floor_1

// ---------------- 地下一階: 坑道口 ----------------

=== floor_1 ===
~ depth = 1
地下一階。朽ちた坑道口に、がらくたと坑夫たちの残した棚が並ぶ。
{ not rat_beaten:
    がらくたの山が崩れ、犬ほどもある大鼠が牙を剥いて躍りかかってきた！
    -> combat("大鼠", 6, 2, 0) ->
    { last_battle_won:
        ~ rat_beaten = true
        大鼠は動かなくなった。坑道口に静けさが戻る。
    - else:
        大鼠はまだ、下り梯子のまわりを徘徊している。
    }
}
-> f1_hub

=== f1_hub ===
+ [坑夫の日誌を読む]
    ひび割れた革表紙の日誌。走り書きが読める。
    「三の層の門番は光を嫌う。灯を持たぬ者、進むべからず」
    -> f1_hub
* {rat_beaten} [道具箱の錆びた短剣を取る]
    刃こぼれしているが、素手よりはずっといい。
    ~ equipment += rusty_dagger
    -> f1_hub
* {rat_beaten} [棚の薬草を摘み取る]
    乾いた薬草をひと束、薬袋に足した。
    ~ herb_count = herb_count + 1
    -> f1_hub
+ {herb_count > 0 && player_hp < 20} [薬草を噛んで傷を癒す]
    ~ herb_count = herb_count - 1
    ~ heal(8)
    苦い汁が傷に沁みて、痛みが引いていく。（HP {player_hp}）
    -> f1_hub
+ {not rat_beaten} [大鼠に立ち向かう] -> floor_1
+ {rat_beaten} [下り梯子で地下二階へ] -> floor_2

// ---------------- 地下二階: 坑夫小屋 ----------------

=== floor_2 ===
~ depth = 2
地下二階。半ば土に埋もれた坑夫小屋と、二手に分かれた下り坑道がある。
-> f2_hub

=== f2_hub ===
* [小屋の吊り棚から銀の坑夫灯を取る]
    磨き上げられた銀の坑夫灯。芯に火を入れると、青白い光が闇を押し返した。
    ~ equipment += miners_lamp
    -> f2_hub
* [小屋の薬箱から薬草を取る]
    薬箱の底に、まだ使える薬草が残っていた。
    ~ herb_count = herb_count + 1
    -> f2_hub
+ {herb_count > 0 && player_hp < 20} [薬草を噛んで傷を癒す]
    苦い汁が傷に沁みて、痛みが引いていく。
    ~ herb_count = herb_count - 1
    ~ heal(8)
    -> f2_hub
+ [上り梯子で地下一階へ] -> floor_1
+ {not passage_cleared} [地下三階への坑道へ向かう] -> crossroad
+ {passage_cleared} [均した坑道を通って地下三階へ] -> floor_3

// リスク選択: 安全だが遅い vs 危険だが速い（対価は固定値・事前示唆あり）
=== crossroad ===
下り坑道は二手。近道は天井が崩れかけ、今にも岩が落ちてきそうだ。もう一方は水路づたいの迂回路——長いが、足場は確かだ。
+ [崩れた坑道を駆け抜ける（危険だが速い）]
    ~ passage_cleared = true
    駆け抜けた背へ、落石が肩を打った。（HP -6）
    ~ player_hp = player_hp - 6
    { player_hp <= 0:
        -> game_over
    }
    -> floor_3
+ [水路づたいの迂回路をゆく（安全だが遅い）]
    ~ passage_cleared = true
    腰まで水に浸かる長い道のり。薬袋が濡れ、薬草がひと束駄目になった。
    { herb_count > 0:
        ~ herb_count = herb_count - 1
    }
    -> floor_3
+ [引き返す] -> f2_hub

// ---------------- 地下三階: 門番の間 ----------------

=== floor_3 ===
~ depth = 3
地下三階。天井の高い広間の奥に、下り坑道を塞ぐ厚い岩盤が見える。
{ not spider_beaten:
    広間の闇がうごめいた——梁ほどもある脚。闇綴りの蜘蛛が、糸を鳴らして降りてくる！
    -> combat("闇綴りの蜘蛛", 12, 3, 1) ->
    { last_battle_won:
        ~ spider_beaten = true
        蜘蛛は縮れて動かなくなり、広間の闇が薄らいだ。
    - else:
        蜘蛛は闇の奥へ退いたが、まだこの広間に潜んでいる。
    }
}
-> f3_hub

=== f3_hub ===
+ [壁の石版を読む]
    坑夫たちより古い、刻み文字の石版。
    「星を喰らう者は、欠けゆく月のしるしにのみ、牙を鈍らせる」
    -> f3_hub
* {spider_beaten} [蜘蛛の巣から鋼の鶴嘴を取る]
    糸の繭に、坑夫の置き土産——鋼の鶴嘴。ずしりと重く、頼もしい。
    ~ equipment += steel_pick
    -> f3_hub
+ {herb_count > 0 && player_hp < 20} [薬草を噛んで傷を癒す]
    苦い汁が傷に沁みて、痛みが引いていく。
    ~ herb_count = herb_count - 1
    ~ heal(8)
    -> f3_hub
+ {not rock_broken && not carries(steel_pick)} [岩盤を調べる]
    拳で叩いても、短剣で突いても、傷ひとつ付かない。道具がなければ砕けそうにない。
    -> f3_hub
* {not rock_broken && carries(steel_pick)} [鶴嘴で岩盤を砕く]
    鶴嘴を振るうたび、岩盤に亀裂が走る。三度目の一撃で、人ひとり通れる裂け目がひらいた。
    ~ rock_broken = true
    -> f3_hub
+ {not spider_beaten} [闇綴りの蜘蛛に立ち向かう] -> floor_3
+ [坑道を戻って地下二階へ] -> floor_2
+ {rock_broken} [岩盤の裂け目を抜けて地下四階へ] -> miasma_pass(-> floor_4)

// 瘴気の間: B3⇔B4 の通路。通るたび毒を受ける（泉で治る）
=== miasma_pass(-> dest) ===
裂け目の先は、緑がかった瘴気の淀む間だ。息を詰めて駆け抜ける。
{ not (conditions ? poisoned):
    ~ conditions += poisoned
    それでも肺の奥がちり、と痺れた。（状態異常: 毒——戦いのさなか、傷が深くなる）
}
-> dest

// ---------------- 地下四階: 泉の間 ----------------

=== floor_4 ===
~ depth = 4
地下四階。岩肌が淡く光り、澄んだ泉が音もなく湧いている。奥には小さな祭壇。
-> f4_hub

=== f4_hub ===
+ [泉の水を浴びる]
    冷たい水が傷を洗い、体の芯まで澄んでいく。
    { conditions ? poisoned:
        ~ conditions -= poisoned
        肺の痺れも消えた。（毒が治った）
    }
    ~ heal(20)
    （HP {player_hp}）
    -> f4_hub
* [祭壇の欠月の護符を取る]
    祭壇の中央に、欠けた月をかたどった黒曜の護符。手に取ると、ひやりと重い。
    ~ equipment += waning_charm
    -> f4_hub
+ {herb_count > 0 && player_hp < 20} [薬草を噛んで傷を癒す]
    苦い汁が傷に沁みて、痛みが引いていく。
    ~ herb_count = herb_count - 1
    ~ heal(8)
    -> f4_hub
+ [瘴気の間を戻って地下三階へ] -> miasma_pass(-> floor_3)
+ [最深部——地下五階へ降りる] -> floor_5

// ---------------- 地下五階: 星の底 ----------------

=== floor_5 ===
~ depth = 5
地下五階、星の底。落ちた星の芯——星髄が、岩の台座で青く脈打っている。
その前に、岩と夜を継ぎ合わせたような巨躯がわだかまる。星喰らいだ。
-> f5_hub

=== f5_hub ===
{ boss_beaten:
    星喰らいは崩れ、星髄への道はひらいている。
- else:
    挑めば退く道はある。だが倒れれば、それまでだ。
}
+ {not boss_beaten} [星喰らいに挑む]
    -> combat("星喰らい", 20, 5, 2) ->
    { last_battle_won:
        ~ boss_beaten = true
        星喰らいの巨躯が砕け、坑道の底にただの岩くれとなって崩れ落ちた。
    - else:
        あなたは間合いの外まで退いた。星喰らいは星髄の前から動かない。
    }
    -> f5_hub
* {boss_beaten} [星髄を穿ち取る] -> ending_clear
+ {herb_count > 0 && player_hp < 20} [薬草を噛んで傷を癒す]
    苦い汁が傷に沁みて、痛みが引いていく。
    ~ herb_count = herb_count - 1
    ~ heal(8)
    -> f5_hub
+ [地下四階へ戻る] -> floor_4

// ---------------- 戦闘 (tunnel・完全決定論) ----------------
// gate: 0=なし / 1=坑夫灯必須 / 2=欠月の護符必須
// 勝利時のみ last_battle_won を立てる（逃走と取り違えない＝落とし穴5）

=== combat(foe, foe_hp, dmg, gate) ===
~ last_battle_won = false
- (round)
{ player_hp <= 0:
    -> defeat
}
{ foe_hp <= 0:
    -> victory
}
（{foe}の手応え {foe_hp} ／ あなたのHP {player_hp}）
+ [得物を振るう]
    ~ temp power = attack_power(gate)
    { power == 0:
        あなたの一撃は届かない。手応えがまるでない。
    - else:
        ~ foe_hp = foe_hp - power
        確かな手応え！
    }
    { foe_hp > 0:
        ~ take_hit(dmg)
        {foe}の反撃があなたを打つ。（HP {player_hp}）
    }
    -> round
+ {herb_count > 0} [薬草を噛む]
    ~ herb_count = herb_count - 1
    ~ heal(8)
    苦い汁で息を継ぐ。（HP {player_hp}）
    ~ take_hit(dmg)
    その隙を、{foe}は容赦なく打ってくる。（HP {player_hp}）
    -> round
+ [退いて間合いを離れる]
    あなたは身を翻し、間合いの外へ逃れた。
    ->->
- (victory)
{foe}を打ち倒した！
~ last_battle_won = true
->->
- (defeat)
-> game_over

// ---------------- 終端エンディング ----------------

=== game_over ===
視界が昏れる。あなたは冷たい坑道の底に倒れ、二度と起き上がらなかった。
星髄は届かず、村に薬が届くことも、ない。
-> END

=== ending_clear ===
鶴嘴のひと突きで、星髄は台座から剥がれ落ちた。掌の中で、それは小さな星のように脈打っている。
長い梯子を上りきると、夜明けの風が坑道口を吹き抜けた。薬研の前に立つ日は、もう遠くない。
あなたは星髄を携え、村への道を歩き出した。
-> DONE
