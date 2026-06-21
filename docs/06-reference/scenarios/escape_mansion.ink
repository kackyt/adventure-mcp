# title: 屋敷からの脱出
// =====================================================================
//  脱出ゲーム（複数部屋・場所移動あり） / 汎用コマンド×アイテム制（Issue #12）
//
//  ＜場所移動＞ 部屋＝ノット、移動＝divert。各部屋ハブに「○○へ移動する」を常設。
//  ＜固定動詞＞ 「あたりを調べる」「道具を使う」「持ち物を確認する」＋移動。専用の
//   解決コマンドは湧かない（appearance-gating 回避）。謎は道具×対象の組み合わせと、
//   部屋をまたいだ手がかりの結合。
//  ＜部屋をまたぐ連鎖（空間的距離）＞
//   書斎: 本を引く→真鍮の鍵／真鍮の鍵で引き出し→ランタン
//   地下室: ランタンの灯りがあって初めて探索可→鉄の鍵
//   廊下: 鉄の鍵で玄関扉→脱出
//  ＜接続＞ 書斎 ↔ 廊下 ↔ 地下室
// =====================================================================

VAR has_brass = false
VAR has_lantern = false
VAR has_iron = false
VAR shelf_moved = false
VAR drawer_open = false
VAR back = -> study_hub

-> study_hub

// =================== 書斎 ===================
=== study_hub ===
~ back = -> study_hub
古い書斎。机と本棚があり、廊下へ続く扉が開いている。
+ [あたりを調べる] -> s_look
+ {has_brass || has_iron} [道具を使う] -> s_use
+ [持ち物を確認する] -> inventory
+ [廊下へ移動する] -> hall_hub

=== s_look ===
何を調べる？
+ [机] -> s_desk
+ [本棚] -> s_shelf
+ [やめる] -> study_hub
=== s_desk ===
{ drawer_open: 引き出しは開いており、空だ。 - else: 机の引き出しは小さな鍵穴で施錠されている。 }
-> s_look
=== s_shelf ===
{ not shelf_moved: 天井までの本棚。一冊だけ背表紙が飛び出している。 - else: 本棚は回転し、奥の隠し棚は空だ。 }
+ {not shelf_moved} [飛び出た本を引く] -> s_pull
+ [やめる] -> s_look
=== s_pull ===
本を引くと本棚が回転し、奥の隠し棚に真鍮の鍵があった。手に取った。
~ shelf_moved = true
~ has_brass = true
-> s_look

=== s_use ===
どの道具を使う？
+ {has_brass} [真鍮の鍵] -> s_use_brass
+ {has_iron} [鉄の鍵] -> s_iron_nowhere
+ [やめる] -> study_hub
=== s_use_brass ===
真鍮の鍵をどこに使う？
+ [机の引き出し] -> s_brass_drawer
+ [やめる] -> study_hub
=== s_brass_drawer ===
{ not drawer_open:
    真鍮の鍵で引き出しが開いた。中から古いランタンが見つかった。
    ~ drawer_open = true
    ~ has_lantern = true
- else:
    引き出しはもう開いている。
}
-> study_hub
=== s_iron_nowhere ===
鉄の鍵を使えそうな鍵穴は、この書斎にはない。効果がない。
-> study_hub

// =================== 廊下 ===================
=== hall_hub ===
~ back = -> hall_hub
薄暗い廊下。重厚な玄関扉と、地下へ降りる石段がある。
+ [あたりを調べる] -> h_look
+ {has_brass || has_iron} [道具を使う] -> h_use
+ [持ち物を確認する] -> inventory
+ [書斎へ移動する] -> study_hub
+ [地下室へ移動する] -> cellar_hub

=== h_look ===
何を調べる？
+ [玄関扉] -> h_door
+ [石段] -> h_stairs
+ [やめる] -> hall_hub
=== h_door ===
頑丈な玄関扉。大きな鍵穴がひとつ。大ぶりの鍵でなければ回らないだろう。
-> h_look
=== h_stairs ===
地下へ続く石段。下りれば地下室だ。
-> h_look

=== h_use ===
どの道具を使う？
+ {has_iron} [鉄の鍵] -> h_use_iron
+ {has_brass} [真鍮の鍵] -> h_brass_nowhere
+ [やめる] -> hall_hub
=== h_use_iron ===
鉄の鍵をどこに使う？
+ [玄関扉] -> h_iron_door
+ [やめる] -> hall_hub
=== h_iron_door ===
鉄の鍵を玄関扉の鍵穴に挿して回すと、重い錠が外れた。
-> escape
=== h_brass_nowhere ===
真鍮の鍵は小さすぎて、玄関扉の大きな鍵穴には合わない。効果がない。
-> hall_hub

// =================== 地下室 ===================
=== cellar_hub ===
~ back = -> cellar_hub
{ has_lantern:
    ランタンの灯りが地下室を照らす。古い棚が浮かび上がる。
- else:
    地下室は真っ暗だ。明かりがなければ、手元すら見えず何も探せない。
}
+ {has_lantern} [あたりを調べる] -> c_look
+ [持ち物を確認する] -> inventory
+ [廊下へ移動する] -> hall_hub

=== c_look ===
何を調べる？
+ [古い棚] -> c_shelf
+ [やめる] -> cellar_hub
=== c_shelf ===
{ not has_iron:
    棚の上に、大ぶりの鉄の鍵が置かれていた。手に取った。
    ~ has_iron = true
- else:
    棚の上にはもう何もない。
}
-> c_look

// =================== 共通 ===================
=== inventory ===
持ち物: {has_brass:真鍮の鍵 }{has_lantern:ランタン }{has_iron:鉄の鍵 }{not (has_brass || has_lantern || has_iron):なし}
-> back

=== escape ===
玄関扉が開き、外の光が差し込んだ。書斎の一冊から始まり、地下室の灯りを経て、あなたは屋敷からの脱出に成功した。
-> DONE
