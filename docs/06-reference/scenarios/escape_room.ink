# title: 書斎からの脱出
// =====================================================================
//  脱出ゲーム / 汎用コマンド × アイテム制（Issue #12 / PUZZLE_DESIGN.md §0）
//
//  ＜インターフェースの肝＞
//   トップの動詞は「あたりを調べる」「道具を使う」「持ち物を確認する」で**固定**。
//   解決のたびに専用コマンドが湧くことはない（appearance-gating を避ける）。
//   謎は「どの道具を・どこに使うか」を自分で思いつくこと（道具×対象の組み合わせ）。
//   誤った組み合わせはフェアに空振り（「効果がない」）し、デッドエンドにしない。
//
//  ＜攻略の連鎖＞
//   本棚の飛び出た本を引く → 隠し棚が回り「真鍮の鍵」
//   真鍮の鍵を机の引き出しに使う → 「火かき棒」と暖炉のヒントのメモ
//   火かき棒を暖炉に使う（灰をかき分ける）→ 灰の底から「鉄の鍵」
//   鉄の鍵を扉に使う → 脱出
// =====================================================================

VAR has_brass = false
VAR has_poker = false
VAR has_note = false
VAR has_iron = false
VAR shelf_moved = false
VAR drawer_open = false
VAR ashes_raked = false

-> hub

=== hub ===
古い書斎に閉じ込められた。机、本棚、暖炉、壁には風景画、そして施錠された樫の扉。ここから出る方法を探さねば。
+ [あたりを調べる] -> look_menu
+ {has_brass || has_poker || has_iron} [道具を使う] -> use_menu
+ [持ち物を確認する] -> inventory

// ---------------- 調べる（対象を選ぶ） ----------------
=== look_menu ===
何を調べる？
+ [机] -> look_desk
+ [本棚] -> look_shelf
+ [暖炉] -> look_fireplace
+ [壁の風景画] -> look_painting
+ [樫の扉] -> look_door
+ [やめる] -> hub

=== look_desk ===
{
- drawer_open: 引き出しは開いている。中はもう空だ。
- else: 古い書き物机。引き出しには小さな鍵穴があり、施錠されている。
}
-> look_menu

=== look_shelf ===
{
- not shelf_moved: 天井までの本棚。よく見ると、一冊だけ背表紙が飛び出している。
- else: 本棚は回転し、奥の隠し棚は空になっている。
}
+ {not shelf_moved} [飛び出た本を引く] -> pull_book
+ [本棚から離れる] -> look_menu

=== pull_book ===
飛び出た本に手をかけて引くと、ごとりと音を立てて本棚が回転した。奥の隠し棚に、真鍮の鍵が一本置かれている。手に取った。
~ shelf_moved = true
~ has_brass = true
-> look_menu

=== look_fireplace ===
{
- ashes_raked: 灰はかき分けたあとだ。
- not has_poker: 暖炉には冷えた灰が厚く積もっている。素手でかき分けても、汚れるだけで何も出てこない。
- else: 冷えた灰が厚く積もっている。何か硬い道具があれば、底までかき分けられそうだ。
}
-> look_menu

=== look_painting ===
穏やかな風景画。額をずらして裏を検めても、古い壁があるだけだ。（どうやら関係なさそうだ）
-> look_menu

=== look_door ===
頑丈な樫の扉。大きな鍵穴がひとつ。大ぶりの鍵でなければ回らないだろう。
-> look_menu

// ---------------- 道具を使う（道具→対象） ----------------
=== use_menu ===
どの道具を使う？
+ {has_brass} [真鍮の鍵] -> use_brass
+ {has_poker} [火かき棒] -> use_poker
+ {has_iron} [鉄の鍵] -> use_iron
+ [やめる] -> hub

=== use_brass ===
真鍮の鍵を、どこに使う？
+ [机の引き出し] -> brass_drawer
+ [樫の扉] -> brass_door
+ [やめる] -> hub
=== brass_drawer ===
{
- not drawer_open:
    真鍮の鍵を引き出しの鍵穴に挿すと、かちりと回った。中から火かき棒と、一枚のメモが出てきた。メモには「暖炉の灰の下、冷えてもなお隠れしもの」とある。
    ~ drawer_open = true
    ~ has_poker = true
    ~ has_note = true
- else:
    引き出しはもう開いている。
}
-> hub
=== brass_door ===
真鍮の鍵は小さすぎて、扉の大きな鍵穴には合わない。効果がない。
-> hub

=== use_poker ===
火かき棒を、どこに使う？
+ [暖炉の灰] -> poker_fire
+ [樫の扉] -> poker_door
+ [やめる] -> hub
=== poker_fire ===
{
- not ashes_raked:
    火かき棒で冷えた灰を底までかき分けると、金属の光が覗いた。灰に埋もれていた鉄の鍵を拾い上げた。
    ~ ashes_raked = true
    ~ has_iron = true
- else:
    灰はもうかき分けたあとだ。
}
-> hub
=== poker_door ===
火かき棒を扉の隙間に差し込んでこじ開けようとしたが、樫の扉はびくともしない。効果がない。
-> hub

=== use_iron ===
鉄の鍵を、どこに使う？
+ [樫の扉] -> iron_door
+ [机の引き出し] -> iron_drawer
+ [やめる] -> hub
=== iron_door ===
鉄の鍵を扉の大きな鍵穴に挿して回すと、重い手応えとともに錠が外れた。
-> escape
=== iron_drawer ===
鉄の鍵は引き出しの小さな鍵穴には大きすぎる。効果がない。
-> hub

// ---------------- 持ち物 ----------------
=== inventory ===
持ち物: {has_brass:真鍮の鍵 }{has_poker:火かき棒 }{has_note:メモ }{has_iron:鉄の鍵 }{not (has_brass || has_poker || has_note || has_iron):なし}
-> hub

=== escape ===
樫の扉が開いた。差し込む光の中へ、あなたは書斎から脱出した。一冊の本から始まった、鍵の連なりを解き明かして。
-> DONE
