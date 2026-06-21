# title: 公開ステータスのデモ
// =====================================================================
//  public_status 予約変数のデモ（INK_GUIDE.md §4.5 / ink-scenario-creator スキル）
//  - player_hp / gold / location は AI に公開してよいステータス → public_status に列挙
//  - has_master_key は解法フラグ（公開するとネタバレ） → public_status に載せない
// =====================================================================

VAR player_hp = 20
VAR gold = 0
VAR location = "entrance"
VAR has_master_key = false       // 解法フラグ：公開しない

// player_hp / gold / location のみ公開。has_master_key と public_status 自体は出力に含まれない。
VAR public_status = "player_hp,gold,location"

-> entrance

=== entrance ===
~ location = "entrance"
あなたは古城の入口に立っている。
正面には錆びた鉄格子の門があり、傍らには小さな宝箱が置かれている。

* [宝箱を開ける]
    宝箱の中には金貨が入っていた。
    ~ gold = gold + 10
    -> entrance
* {not has_master_key} [門の足元を調べる]
    冷たい石畳の隙間に、古びたマスターキーが落ちていた。
    ~ has_master_key = true
    -> entrance
* {has_master_key} [マスターキーで門を開ける]
    マスターキーを鍵穴に差し込むと、重い音とともに鉄格子が持ち上がった。
    -> escape
+ [周囲を見回す]
    苔むした石壁に囲まれた、静かな入口だ。
    -> entrance

=== escape ===
~ location = "outside"
あなたは古城から脱出した！
-> DONE
