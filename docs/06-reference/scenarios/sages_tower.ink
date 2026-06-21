# title: 賢者の塔
// =====================================================================
//  賢者の塔 (Sage's Tower)
//  docs/06-reference/inkfiles の各要素を CLI で総合検証するための複雑シナリオ。
//  - 変数: 数値 / 真偽 / 文字列 / リスト(インベントリ・ステートマシン)
//  - 選択肢: once-only(*) / sticky(+) / 条件付き / フォールバック
//  - 構造: weave + ラベル付き gather / thread(<-) / tunnel / 変数 divert target / 関数
//  - テキスト: シーケンス(cycle/shuffle/stopping) / 変数埋め込み / glue / 条件 / switch
//  - builtins: 訪問回数 / gather 読み取り回数 / TURNS_SINCE
//
//  ＜ゲームオーバー検証用の分岐（いずれも任意・回避可能でクリアは阻害しない）＞
//   1. trap   : 一階の古井戸に「縄なし」で素手で降りる（縄があれば安全＋報酬）
//   2. combat : 三階の任意ボス「石像の番人」に無謀に挑んで敗北（逃走可・剣+ポーションで勝てる）
//   3. sage   : 四階で賢者を殴り続けて HP 0（話しかけて正攻法で進める）
//   死因は VAR death_cause に記録し、game_over で switch して文面を変える。
// =====================================================================

// --- 数値・真偽・文字列の変数 ---
VAR hp = 20
VAR max_hp = 20
VAR gold = 0
VAR floor = 1
VAR hero_name = "旅人"
VAR has_amulet = false
VAR riddle_solved = false

// --- 一度きりイベント用フラグ（自己ループする部屋では訪問回数に頼らない） ---
VAR visited_floor_1 = false
VAR goblin_beaten = false
VAR guardian_beaten = false
VAR last_battle_won = false  // 直前の戦闘に勝利したか（逃走と区別する）

// --- ゲームオーバーの死因（game_over で switch して文面を変える） ---
VAR death_cause = ""

// --- リスト: インベントリ（初期は空） ---
LIST Inventory = torch, rope, sword, shield, potion, gold_key
VAR bag = ()

// --- リスト: 扉のステートマシン ---
LIST DoorState = sealed, runed, unlocked, opened
VAR gate = sealed

// --- 変数 divert target（共通選択肢からの戻り先を保持） ---
VAR back = -> floor_1

// --- 定数 ---
CONST POTION_HEAL = 8
CONST GOBLIN_REWARD = 10
CONST GUARD_REWARD = 15

-> intro

// =====================================================================
//  関数（純粋ロジック・副作用あり。ダイバートは含まない）
// =====================================================================
=== function heal(amount) ===
~ hp = hp + amount
{ hp > max_hp:
    ~ hp = max_hp
}
~ return hp

=== function hurt(amount) ===
~ hp = hp - amount
{ hp < 0:
    ~ hp = 0
}
~ return hp

=== function carries(item) ===
~ return bag ? item

=== function final_score() ===
~ temp s = gold * 10 + hp
{ riddle_solved:
    ~ s = s + 50
}
~ return s

// =====================================================================
//  共通スレッド: どの部屋にも差し込む観察・所持品確認の選択肢群
//  ＊ thread から呼び出し元へ戻るために変数 divert target `back` を使う
// =====================================================================
=== observe ===
+ [あたりを観察する]
    {&松明の影が壁で揺れている。|どこかで石の崩れる音がした。|かび臭い空気が漂う。|遠くで風がうなりを上げている。}
    -> back
+ [持ち物を確認する]
    バッグの中身: {bag}。所持金 {gold} 枚、HP {hp}/{max_hp}。
    -> back

// =====================================================================
//  導入: 文字列変数を選択で設定する weave + gather
// =====================================================================
=== intro ===
古びた扉の前に立つ。塔の奥から声が問いかける。「お前の名は？」
* [「アレン」と名乗る]
    ~ hero_name = "アレン"
* [「ミラ」と名乗る]
    ~ hero_name = "ミラ"
* [名乗らない]
    名乗らずにいると、声は「ならば“{hero_name}”と呼ぼう」と言った。
- 「ようこそ、{hero_name}よ。塔の頂で待つ」と声がささやき、扉が開いた。
-> floor_1

// =====================================================================
//  一階: 条件付き once-only 選択肢 / 訪問回数 / stopping シーケンス
// =====================================================================
=== floor_1 ===
~ back = -> floor_1
{ not visited_floor_1:
    重い扉が背後で閉じた。ここは塔の一階、松明に照らされた玄関広間だ。
    ~ visited_floor_1 = true
- else:
    玄関広間に戻ってきた。
}
<- observe
* {not carries(torch)} [壁の松明を取る]
    壁の燭台から燃える松明を<>手にした。これで暗い場所も照らせる。
    ~ bag += torch
    -> floor_1
* {not carries(rope)} [床の縄を拾う]
    丈夫な縄をバッグに入れた。
    ~ bag += rope
    -> floor_1
+ [古井戸を覗き込む]
    -> well
+ {carries(torch)} [松明を掲げて二階へ上る]
    螺旋階段を上り、書庫のある二階へ向かった。
    ~ floor = 2
    -> floor_2
+ {not carries(torch)} [暗い階段を上ろうとする]
    松明がなければ足元が見えず危険だ。引き返した。
    -> floor_1

// 任意の罠: 縄があれば安全に降りて報酬、なければ死亡、やめれば回避（クリア必須ではない）
=== well ===
広間の隅に、底の見えない古井戸がある。降りれば何かありそうだが、滑り落ちれば助かるまい。
* {carries(rope)} [縄を伝って慎重に降りる]
    縄をしっかり結んで降り、底で金貨を 5 枚見つけて戻った。
    ~ gold = gold + 5
    -> floor_1
* [素手で降りようとする]
    手がかりを失って足を滑らせ、闇の底へと真っ逆さまに落ちていった……
    ~ death_cause = "trap"
    -> game_over
+ [危険だ、やめておく]
    井戸から一歩下がった。
    -> floor_1

// =====================================================================
//  二階: tunnel による戦闘 / 訪問回数で初回のみ発生
// =====================================================================
=== floor_2 ===
~ back = -> floor_2
二階は崩れかけた書庫だ。
{ not goblin_beaten:
    本棚の陰から、ゴブリンが飛び出してきた！
    -> combat("ゴブリン", 8, 3, GOBLIN_REWARD) ->
    { last_battle_won:
        ~ goblin_beaten = true
        息を整える。書庫は再び静まり返った。
    - else:
        逃げ切ったものの、ゴブリンはまだこの階を徘徊している。
    }
}
<- observe
* {not carries(sword)} [本棚の裏の錆びた剣を取る]
    錆びてはいるが、まだ斬れそうな剣だ。
    ~ bag += sword
    -> floor_2
* {not carries(potion)} [机の上の小瓶を取る]
    回復のポーションのようだ。
    ~ bag += potion
    -> floor_2
+ [三階へ進む]
    ~ floor = 3
    -> floor_3
+ [一階へ戻る]
    ~ floor = 1
    -> floor_1

// =====================================================================
//  戦闘: 引数付き tunnel / ラベル付き gather による戦闘ループ
//  関数 heal/hurt と carries、shuffle シーケンスを使用
// =====================================================================
=== combat(foe, foe_hp, dmg, reward) ===
~ last_battle_won = false
{foe}が立ちはだかった！
- (round)
{ hp <= 0: -> lose }
{ foe_hp <= 0: -> win }
（{foe}HP {foe_hp} ／ あなたのHP {hp}）
+ {carries(sword)} [剣で斬る]
    ~ foe_hp = foe_hp - 6
    刃が深く食い込んだ。
    -> trade
+ [素手で殴る]
    ~ foe_hp = foe_hp - 2
    拳を叩き込んだ。
    -> trade
+ {carries(potion)} [ポーションを飲む]
    ~ bag -= potion
    傷が癒え、HP {heal(POTION_HEAL)} まで回復した。
    -> round
+ [逃げ出す]
    脱兎のごとくその場を離れた。
    ->->
- (trade)
~ hurt(dmg)
{~{foe}の爪が腕をかすめた。|{foe}の牙が肩に食い込んだ。|{foe}の一撃が脇腹を打った。}（{dmg} ダメージ、HP {hp}）
-> round
- (win)
{foe}を打ち倒した！ 戦利品の金貨を {reward} 枚拾った。
~ gold = gold + reward
~ last_battle_won = true
->->
- (lose)
~ death_cause = "combat"
{foe}の猛攻の前に、あなたは力尽きた……
-> game_over

// =====================================================================
//  三階: ステートマシン(リスト) / インライン switch / 謎解き(weave)
// =====================================================================
=== floor_3 ===
~ back = -> floor_3
三階の中央に、ルーンの刻まれた石の扉がそびえている。
{
- gate == sealed: 扉は固く封印されている。
- gate == runed: 扉では青白いルーンが光っている。
- gate == unlocked: 扉の鍵が外れ、わずかに隙間が開いている。
- else: 扉は大きく開かれている。
}
<- observe
* {gate == sealed} [扉のルーンに触れる]
    触れた瞬間、ルーンが青白く光り出した。
    ~ gate = runed
    -> floor_3
* {gate == runed} [刻まれた謎を読む]
    -> riddle
* {gate == unlocked} [扉を押し開ける]
    重い扉がゆっくりと開いた。
    ~ gate = opened
    -> floor_3
+ {gate == opened && carries(gold_key)} [最上階への階段を上る]
    金の鍵が結界を解き、あなたは最上階へ上った。
    ~ floor = 4
    -> floor_4
+ {gate == opened && not carries(gold_key)} [階段を上ろうとする]
    扉の奥の階段は、金の鍵がなければ進めない結界に阻まれている。
    -> floor_3
+ {not guardian_beaten} [広間の隅に佇む石像の番人に挑む]
    台座に立つ石像が、軋みを上げて動き出した！（剣なしでは勝ち目は薄い。危うければ逃げよ）
    -> combat("石像の番人", 18, 5, GUARD_REWARD) ->
    { last_battle_won:
        ~ guardian_beaten = true
        番人は砕け散り、台座の下から銀貨があふれ出した。
    - else:
        命からがら間合いを取った。番人はゆっくりと石像へ戻っていった。
    }
    -> floor_3
+ [二階へ戻る]
    ~ floor = 2
    -> floor_2

// 謎解き: weave + ラベル付き gather の読み取り回数を条件に使う
=== riddle ===
石の声が響く。「炎を食らい、闇を払い、されど水に弱きもの。我が名は？」
- (ask)
* {carries(torch)} [「松明」と答える]
    「正しい」と声が告げ、ルーンが解けた。扉の前に金の鍵が現れた。
    ~ gate = unlocked
    ~ riddle_solved = true
    ~ bag += gold_key
    -> floor_3
* [「太陽」と答える]
    「否」。石が低く唸った。
    -> ask
* [「灯火」と答える]
    「惜しい、されど否」。
    -> ask
+ {ask >= 3} [当てずっぽうはやめて引き下がる]
    一度頭を冷やすことにした。
    -> floor_3

// =====================================================================
//  四階: NPC 対話(weave) / TURNS_SINCE で賢者の反応が変化
// =====================================================================
=== floor_4 ===
~ back = -> floor_4
最上階。満天の星の下、ひとりの賢者が静かに佇んでいる。
<- observe
+ {not has_amulet} [賢者に話しかける]
    -> talk
+ {not has_amulet && carries(sword)} [いきなり斬りかかる]
    賢者の張った魔法の盾に弾き返され、深い傷を負った。
    ~ hurt(5)
    （HP {hp}）
    { hp <= 0:
        ~ death_cause = "sage"
        -> game_over
    }
    -> floor_4
+ {has_amulet} [塔の頂から外の世界へ踏み出す]
    -> ending
+ [三階へ戻る]
    ~ floor = 3
    -> floor_3

=== talk ===
{ talk == 1:
    「よくぞここまで登ってきた、{hero_name}よ」と賢者は微笑んだ。
- else:
    「まだ何か聞きたいことが？」
}
賢者は{|静かに|やや興味深げに|もう何も言わず}こちらを見つめている。
{ TURNS_SINCE(-> talk) == 0 && talk > 1:
    賢者は少し急かすように、こちらの言葉を待っている。
}
- (hub)
* [「あなたは誰だ？」]
    「塔を守りし最後の賢者。お前の覚悟をずっと試していた」
    -> hub
* {gold >= 10} [「アミュレットを譲ってほしい」]
    「対価を払う覚悟があるのだな。…良かろう」
    ~ gold = gold - 10
    ~ has_amulet = true
    賢者は星のごとく輝くアミュレットを手渡した。
    -> floor_4
* {gold < 10} [「アミュレットを譲ってほしい」（金貨が足りない）]
    「対価が足りぬ。塔の宝を集めてくるがよい」と賢者は首を振った。
    -> hub
* [何も言わずに立ち去る]
    -> floor_4

// =====================================================================
//  エンディング: 複数行 switch で状態に応じた結末 / 関数で最終スコア
// =====================================================================
=== ending ===
アミュレットの光が塔全体を包み、あなたは外の世界へと還ってゆく。
{
- riddle_solved && hp >= max_hp:
    無傷で謎を解き明かした「完全なる賢者」として、その名は永遠に語り継がれた。
- riddle_solved:
    傷を負いながらも知恵で塔を制した「賢き挑戦者」として伝説に名を刻んだ。
- else:
    力ずくで頂に至った「猛き者」として、人々に畏れられた。
}
最終ステータス —— {hero_name} ／ HP {hp}/{max_hp} ／ 金貨 {gold} ／ 探索フロア {floor}。
最終スコア: {final_score()} 点。
-> END

=== game_over ===
{
- death_cause == "combat": 武器を取り落とし、あなたはその場に崩れ落ちた。
- death_cause == "trap": 井戸の底から、もう光は見えなかった。
- death_cause == "sage": 賢者は静かに手をかざし、あなたの意識を眠りへと沈めた。
- else: 力尽きたあなたは、冷たい石床に倒れ伏した。
}
視界が暗転していく……{hero_name}の冒険は、この塔で潰えた。（死因: {death_cause}）
-> END
