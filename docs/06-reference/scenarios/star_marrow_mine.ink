# title: 星髄の坑道
// =====================================================================
//  星髄の坑道 v2.3 — サバイバル・RPG worked example (Issue #20)
//  探索×謎解き重心版。全編を固定コマンドパレットで統一する:
//    しらべる（固定物→事実のみ） / とる（携行品） / たたく（力を加える）
//    つかう（道具→対象） / うごく（場所） / もちもの（HP・薬草・装備） / はなす
//  設計規律:
//   - 完全決定論（RANDOM 不使用）
//   - 本文は平易な言葉で書く（難読語は難しさではない）。固有語は「星髄」のみ
//   - 謎の手がかりは事実のみ。必要前提と、謎ではない目的・武器の説明は短く明示する
//   - 大目的は開幕で明示（薬に使える固い星髄をひとかけら、生きて帰る）。最後まで変えない
//   - 総当たり抑止 = 誤打・誤順の HP コスト（すべて予兆つき・決定論）
//   - 詰みは事前示唆ある選択の結果のみ。HP0 は必ず終端の敗北 ED
//  回復リソース設計（緊張の核）:
//   - 最適ルートの通行料: ねずみ3・カニ4・クモ5・岩ガメ1・B5経路2・ボス5+3
//     ＝累積23 > 初期HP20。正解装備・ノーミスでも薬草を挟まないとクリア不能
//   - 薬草: 生命線(+6・計3本)。供給はわざと前積み＝どこで切るかの配分判断が全員に発生
//   - 泉(B5): 解毒専用。回復はしない＝薬草の価値を食わない。岩ガメの関門の先にある
//   - 革のよろい(B3 南・毒の霧): リスク購入。被ダメ-2 の保険（ただし最低 1 は通る＝
//     総当たり抑止の HP コスト経済は常に生きる）。支払い＝現在HPの半減＋解毒まで薬草ロック。
//     岩山には強いが、せまい水路では厚みが負担になるため、完全攻略時の純利益にはしない
//   - フェアネス: 「毒に薬草が効かない」は取得前に現場で読める
//     （なきがらの周りに、かみかけの薬草が散らばっている）
//  進行の背骨（謎）:
//   B2 ①排水: 三つの水門の底の高さを観察し、水の行き先が開くよう低い方から開ける
//   B3 ③降り口: 鎖でつながった重り台車と鉄格子から、二つの止めを外す
//   B4 ②武器庫: 天井を支える横棒を、外れたレールで支え直してから抜く
//   B5 岩ガメ: 呼吸と突進で変わるこうらの状態を観察し、開いた時だけ有効打を重ねる
//   B6 ボス: 小さい水門（水のにげ道）を先に開けてから大きい水門=①の二段再演。
//            背中の星髄へ近づくと襲われる。決着はB4で得た白い剣
// =====================================================================

VAR player_hp = 20
VAR herb_count = 1
VAR depth = 1
VAR place = "[B1] 山みち"
LIST equipment = pickaxe, lantern, star_blade, hide_armor
LIST conditions = poisoned
VAR public_status = "player_hp, herb_count, equipment, conditions, depth, place"

// ---- 非公開の進行フラグ ----
VAR ghost_met = false
VAR rat_beaten = false
VAR crab_beaten = false
VAR aid_taken = false
// B2 水門（正しい順の進み具合。まちがえると backflow で全部もどる）
VAR gate_a = false
VAR gate_b = false
VAR gate_c = false
VAR gate_step = 0
VAR drained = false
// B3
VAR spider_beaten = false
VAR south_herb_taken = false
VAR b3_cart_released = false
VAR b3_bar_removed = false
VAR b3_gate_open = false
// B4
VAR met_the_thing = false
VAR support_rail_set = false
VAR weapon_room_open = false
// B5-B6
VAR guard_beaten = false
VAR guard_phase = 0
VAR guard_openings = 0
VAR spillway_open = false
VAR lake_drained = false
VAR boss_engaged = false
VAR boss_wounded = false
VAR boss_beaten = false

-> intro

// ---------------- 関数 ----------------

=== function carries(item) ===
~ return equipment ? item

=== function heal(amount) ===
~ player_hp = player_hp + amount
{ player_hp > 20:
    ~ player_hp = 20
}

=== function take_hit(dmg) ===
// 革のよろいは被ダメを 2 やわらげる。ただし、しんまでは守れない＝最低 1 は通る
~ temp actual = dmg
{ carries(hide_armor):
    ~ actual = dmg - 2
    { actual < 1:
        ~ actual = 1
    }
}
~ player_hp = player_hp - actual

// ---------------- 共有: もちもの / つかう ----------------

=== show_bag(-> ret) ===
体力は {player_hp}／20。薬草が {herb_count} たば。
持ち物——{carries(pickaxe):つるはし。}{carries(lantern):ランプ。}{carries(star_blade):白い剣。}{carries(hide_armor):革のよろい。}{LIST_COUNT(equipment) == 0:めぼしい物は何もない。}
{conditions ? poisoned:毒が回っている。薬草をかんでも効かない。どこかで洗い流さないと、傷は癒せない。}
-> ret

=== use_menu(-> ret) ===
何をつかう？
+ {herb_count > 0} [薬草（自分に）] -> use_herb(ret)
+ [やめる] -> ret

=== use_herb(-> ret) ===
{ conditions ? poisoned:
    薬草をかんでみる。だが毒が回っていて、きずの熱はいっこうに引かない。この毒は、どこかで洗い流すしかなさそうだ。
    -> ret
}
~ herb_count = herb_count - 1
~ heal(6)
にがい薬草をかむ。きずの熱が、すっと引いていく（体力 {player_hp}、薬草 {herb_count}）。
-> ret

// ---------------- 導入 ----------------

=== intro ===
あなたの村で、悪い病気がはやっている。
薬をつくるには、白く光る石「星髄」がいる。薬師に言われたのは、白い光を保った、固いかたまりをひとつ。粉や燃えかすでは、薬にならない。
星髄が残っているのは、この山の捨てられた鉱山だけだ。
鉱山のいちばん深いところまで降り、薬に使える星髄をひとかけら取って、生きて村へ持ち帰る。
それが、あなたのやることだ。
+ [つぎへ] -> r_plaza

// ================= B1 一の坑（入り口） =================

=== r_plaza ===
~ depth = 1
~ place = "[B1] 鉱山の入り口の広場"
鉱山の入り口の広場。さびたトロッコがレールの上で止まったまま、ほこりをかぶっている。
事務所と道具小屋の戸は、開けっぱなしだ。
山はだに大きな坑口が開いて、レールが暗やみの奥へつづいている。
入り口のわきの岩に、年よりの坑夫のゆうれいが、ひとり、こしかけている。すきとおった体が、うしろの岩はだにうっすら重なって見えた。
+ [しらべる] -> plaza_look
+ [たたく] -> plaza_hit
+ [うごく] -> plaza_move
+ [もちもの] -> show_bag(-> r_plaza)
+ {herb_count > 0} [つかう] -> use_menu(-> r_plaza)
+ [はなす] -> plaza_talk

=== plaza_look ===
何をしらべる？
+ [トロッコ] -> look_minecart
+ [レール] -> look_rails_b1
+ [坑夫のゆうれい] -> look_ghost
+ [やめる] -> r_plaza

=== look_minecart ===
からっぽのトロッコだ。ふちに弁当箱が置きっぱなしになっている。
開けてみると、食べかけのめしが、ひからびて石のようになっていた。
食べ終わるひまもなく、ここをはなれたらしい。
-> plaza_look

=== look_rails_b1 ===
トロッコのレールだ。まくら木に太い釘が打たれて、レールをしっかりとめている。
坑口の奥まで、点々とつづいているのが見えた。
-> plaza_look

=== look_ghost ===
古いかたちの仕事着を着た、坑夫のゆうれいだ。ずっと昔、この山で死んだ者だろう。こちらを見ても、おどろくようすはない。
-> plaza_look

=== plaza_hit ===
何をたたく？
+ [トロッコ] -> hit_minecart
+ [やめる] -> r_plaza

=== hit_minecart ===
こぶしでたたくと、にぶい音が広場にひびいた。さびがはがれて落ちる。それだけだ。
-> plaza_hit

=== plaza_move ===
どこへうごく？
+ [事務所] -> r_office
+ [道具小屋] -> r_toolshed
+ [鉱山の中へ] -> r_east
+ [やめる] -> r_plaza

=== plaza_talk ===
{ not ghost_met:
    ~ ghost_met = true
    「星髄かね」ゆうれいは、こちらを見もせずに言った。
    「止めはせん。わしらもほったんだ。だがな——下の坑には、もうだれも降りん」
- else:
    ゆうれいは、坑口の暗がりをながめている。
}
+ [下の坑のことを聞く] -> talk_shimo
+ [星喰いのことを聞く] -> talk_hoshikui
+ [みんなが逃げた朝のことを聞く] -> talk_lastday
+ [やめる] -> r_plaza

=== talk_shimo ===
「三の坑の、そのまた下よ。いちばんいい星髄が出た。わしが生きとったころの話だがね」
「いまは、降り方もありゃせんよ」
-> plaza_talk

=== talk_hoshikui ===
「星喰い。わしらは、そう呼んどった。地面の中で星髄を食って生きとる、この山のぬしよ」
「下の坑に残った星髄は、あれが食った。いまも背中で、白く光っとる」
「十二年前、白い剣で一度だけ傷をつけた。剣は下の武器庫に置いたままだ。星髄を取るなら、あれがじゃまになる」
ゆうれいは、それきりだまった。
-> plaza_talk

=== talk_lastday ===
「十二年前、みんなが出ていった朝のことは、上から見とったよ。だれもかれも、うしろをふり返りふり返り、走っていきよった」
「水が悪くなって、変な霧がわいて——あれの気配が、上までのぼって来とったんだ」
「わしかね。わしは、そのずっと前から、こうだ」
-> plaza_talk

// ---- 事務所 ----

=== r_office ===
~ place = "[B1] 事務所"
事務所の中。机に書類が積まれ、かべに大きな坑内の地図がはってある。すみのたなに救急箱。
+ [しらべる] -> office_look
+ {not aid_taken} [とる] -> office_take
+ [うごく] -> office_move
+ [もちもの] -> show_bag(-> r_office)
+ {herb_count > 0} [つかう] -> use_menu(-> r_office)

=== office_look ===
何をしらべる？
+ [坑内の地図] -> look_map
+ [机] -> look_desk
+ [救急箱] -> look_aid
+ [やめる] -> r_office

=== look_map ===
きちんと測って書かれた、きれいな地図だ。一の坑、二の坑、三の坑。三つの坑道が書きこまれ、すみに会社のはんこがおしてある。
それで全部だった。
-> office_look

=== look_desk ===
給料のふくろが、名札をつけたままいくつもならんでいる。
受け取りにもどった者は、ひとりもいなかったらしい。
-> office_look

=== look_aid ===
古い救急箱だ。中に、ほした薬草がひとたば残っている。
-> office_look

=== office_take ===
何をとる？
+ {not aid_taken} [救急箱の薬草] -> take_aid
+ [やめる] -> r_office

=== take_aid ===
~ aid_taken = true
~ herb_count = herb_count + 1
薬草をひとたば、ふくろに入れた（薬草 {herb_count}）。
-> r_office

=== office_move ===
どこへうごく？
+ [広場へ] -> r_plaza
+ [やめる] -> r_office

// ---- 道具小屋 ----

=== r_toolshed ===
~ place = "[B1] 道具小屋"
道具小屋。道具かけはほとんどからっぽだが、まだ使えそうな物がいくつか残っている。
+ [しらべる] -> shed_look
+ {not carries(pickaxe) || not carries(lantern)} [とる] -> shed_take
+ [うごく] -> shed_move
+ [もちもの] -> show_bag(-> r_toolshed)
+ {herb_count > 0} [つかう] -> use_menu(-> r_toolshed)

=== shed_look ===
何をしらべる？
+ [道具かけ] -> look_toolrack
+ [やめる] -> r_toolshed

=== look_toolrack ===
つるはしが一本、ランプがひとつ。どちらもまだ使える。油のつぼには、油がなみなみ残っていた。
-> shed_look

=== shed_take ===
何をとる？
+ {not carries(pickaxe)} [つるはし] -> take_pickaxe
+ {not carries(lantern)} [ランプ] -> take_lantern
+ [やめる] -> r_toolshed

=== take_pickaxe ===
~ equipment += pickaxe
つるはしを取った。手になじむ重さだ。
-> shed_take

=== take_lantern ===
~ equipment += lantern
ランプを取り、油を入れて火をつけた。
-> shed_take

=== shed_move ===
どこへうごく？
+ [広場へ] -> r_plaza
+ [やめる] -> r_toolshed

// ---- 一の坑・坑道 ----

=== r_east ===
~ depth = 1
~ place = "[B1] 一の坑"
一の坑。レールにそって、坑道がゆるやかに下っている。
{ not rat_beaten:
    行く手の暗がりで、何かが動いた。犬ほどもある大ねずみだ。歯を鳴らして、レールの上に立ちふさがっている。
- else:
    大ねずみのしがいのわきを、レールが奥へつづいている。奥に、二の坑への下り階段が口を開けていた。
}
+ [しらべる] -> east_look
+ [たたく] -> east_hit
+ [うごく] -> east_move
+ [もちもの] -> show_bag(-> r_east)
+ {herb_count > 0} [つかう] -> use_menu(-> r_east)

=== east_look ===
何をしらべる？
+ [レール] -> look_rails_east
+ {not rat_beaten} [大ねずみ] -> look_rat
+ {rat_beaten} [下り階段] -> look_descent1
+ [やめる] -> r_east

=== look_rails_east ===
釘はどれもしっかり打たれ、レールは奥の暗がりへつづいている。ほこりの下で、まだにぶく光っていた。
-> east_look

=== look_rat ===
毛はぬけ、目は白くにごっている。だが歯は本物だ。近づけば、とびかかってくるだろう。
-> east_look

=== look_descent1 ===
木の階段が下へつづいている。ふみ板は、まだしっかりしていた。
-> east_look

=== east_hit ===
何をたたく？
+ {not rat_beaten} [大ねずみ] -> fight_rat
+ [岩はだ] -> hit_rock_east
+ [やめる] -> r_east

=== hit_rock_east ===
たたくと、かたい音が返って、坑道の奥へすいこまれていった。岩はびくともしない。
-> east_hit

=== fight_rat ===
{ carries(pickaxe):
    とびかかってくる大ねずみを、つるはしのひとふりで打ちたおした。だがすれちがいざま、歯がうでに食いこんでいた。
    ~ take_hit(3)
- else:
    素手でなぐり合うはめになった。二度、三度——ようやく動かなくなったが、うではかみ傷だらけだ。
    ~ take_hit(6)
}
~ rat_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_east

=== east_move ===
どこへうごく？
+ [広場へ] -> r_plaza
+ {rat_beaten} [二の坑へ下りる] -> try_descend_b2
+ {not rat_beaten} [奥へ進む] -> east_blocked
+ [やめる] -> r_east

=== east_blocked ===
足をふみ出したとたん、大ねずみが身を低くして歯をむいた。あれをなんとかしないと、奥へは進めない。
-> r_east

=== try_descend_b2 ===
{ not carries(lantern):
    数段も降りないうちに、真っ暗になった。明かりがなければ、ここから先は一歩も進めない。
    -> r_east
- else:
    -> r_winch
}

// ================= B2 二の坑（水びたしの坑道） =================

=== r_winch ===
~ depth = 2
~ place = "[B2] 二の坑・機械室"
二の坑、機械室。ランプの明かりが、大きな巻き上げ機と、床をはうレールを照らし出す。
奥は水びたしだ。黒い水面が、明かりをすいこんで、ゆれもしない。
かべぎわの小さな机に、日誌が開いたまま残されていた。
+ [しらべる] -> winch_look
+ [たたく] -> winch_hit
+ [うごく] -> winch_move
+ [もちもの] -> show_bag(-> r_winch)
+ {herb_count > 0} [つかう] -> use_menu(-> r_winch)

=== winch_look ===
何をしらべる？
+ [日誌] -> look_journal
+ [巻き上げ機] -> look_winch
+ [水面] -> look_water
+ [やめる] -> r_winch

=== look_journal ===
水番の日誌だ。ていねいな字で、こう書いてある。
「水は、低いほうへ流れる。行き場のない水は、あふれて人を取る。水をぬく者は、水の行き先を先に考えること」
さいごのページに、走り書きがひとつ。「一の水門から開けたばかがいる。二人流された」
-> winch_look

=== look_winch ===
巻き上げ機のつなは、切れたのではなく、外してていねいに巻き取ってある。
かたづけだけは、きちんとやってあるらしい。
-> winch_look

=== look_water ===
黒い水が、奥の坑道をまるごとのみこんでいる。
しずんだレールが、明かりのとどくところで水に消えていた。
-> winch_look

=== winch_hit ===
何をたたく？
+ [巻き上げ機] -> hit_winch
+ [やめる] -> r_winch

=== hit_winch ===
どうをたたくと、うつろな音が長く尾を引いた。動かすには、人手も蒸気も足りない。
-> winch_hit

=== winch_move ===
どこへうごく？
+ [一の坑へ上る] -> r_east
+ [水門の部屋へ] -> r_gates
+ {drained} [水のひいた坑道へ] -> r_drained
+ {not drained} [水びたしの坑道へ] -> water_blocked
+ [やめる] -> r_winch

=== water_blocked ===
数歩も行かないうちに、冷たい水がひざをこえた。この先は、立っていられる深さでもない。
-> r_winch

// ---- 水門の部屋（①排水の謎） ----

=== r_gates ===
~ place = "[B2] 二の坑・水門の部屋"
水門の部屋。岩をけずった水路に、木の水門が三つならんで、水をせき止めている。
どの水門にも太いくさびが打ちこまれ、札がかかっていた。手前から、一、二、三。
{ gate_step == 3:
    いまは三つとも開いて、水はとうに流れ去った。からっぽの水路が、奥へつづいている。
}
+ [しらべる] -> gates_look
+ [たたく] -> gates_hit
+ [うごく] -> gates_move
+ [もちもの] -> show_bag(-> r_gates)
+ {herb_count > 0} [つかう] -> use_menu(-> r_gates)

=== gates_look ===
どれをしらべる？
+ [一の水門] -> look_gate_a
+ [二の水門] -> look_gate_b
+ [三の水門] -> look_gate_c
+ [やめる] -> r_gates

=== look_gate_a ===
{ gate_a:
    開いた水門の奥で、水路の底が、胸の高さにぬれて光っている。
- else:
    一の水門。水の通る底は、胸の高さにある。くさびはかたいが、つるはしでたたけば外れそうだ。
}
-> gates_look

=== look_gate_b ===
{ gate_b:
    開いた水門の奥で、水路の底が、ひざの高さに見えている。
- else:
    二の水門。水の通る底は、ひざの高さにある。くさびはかたいが、つるはしでたたけば外れそうだ。
}
-> gates_look

=== look_gate_c ===
{ gate_c:
    開いた水門の奥で、水路の底が、こしの高さにぬれている。
- else:
    三の水門。水の通る底は、こしの高さにある。くさびはかたいが、つるはしでたたけば外れそうだ。
}
-> gates_look

=== gates_hit ===
どの水門のくさびをたたく？
+ {not gate_a} [一の水門] -> open_a
+ {not gate_b} [二の水門] -> open_b
+ {not gate_c} [三の水門] -> open_c
+ [やめる] -> r_gates

=== open_a ===
{ gate_step == 2:
    ~ gate_a = true
    ~ gate_step = 3
    ~ drained = true
    さいごのくさびがとんだ。一の水門が上がり、残った水が、先に開けた低い水路へすなおにすいこまれていく。
    やがて音がやみ、奥の坑道から、ひたひたと水の引いていく気配がした。
    -> r_gates
- else:
    -> backflow
}

=== open_b ===
{ gate_step == 0:
    ~ gate_b = true
    ~ gate_step = 1
    くさびがとび、二の水門がはね上がった。黒い水がうずを巻いて、いちばん低い水路へ流れこみ、ごうごうと音を立てて落ちていく。
    -> r_gates
- else:
    -> backflow
}

=== open_c ===
{ gate_step == 1:
    ~ gate_c = true
    ~ gate_step = 2
    三の水門が開く。水は、先に開いた低い水路へ、順に落ちていった。
    -> r_gates
- else:
    -> backflow
}

=== backflow ===
くさびがとんだとたん、行き場のない水がかべのようにせり上がって、こちらへたたきつけてきた。
にごった流れにもまれ、したたかに岩へ打ちつけられる。
~ take_hit(3)
{ player_hp <= 0: -> game_over }
水は水門という水門をたたき、外れかけたくさびをもとの場所へおしもどして、しずまっていった（体力 {player_hp}）。
~ gate_a = false
~ gate_b = false
~ gate_c = false
~ gate_step = 0
-> r_gates

=== gates_move ===
どこへうごく？
+ [機械室へ] -> r_winch
+ [やめる] -> r_gates

// ---- 水のひいた坑道 ----

=== r_drained ===
~ place = "[B2] 二の坑・水のひいた坑道"
水のひいた坑道。床はまだぬかるみ、かべの高いところまで水のあとが残っている。
どろに半分うまって、トロッコが一台よこだおしになっていた。
{ not crab_beaten:
    ぬかるみのむこうで、どろをかぶった大ガニがはさみを鳴らした。こうらが岩のようにぶあつい。
- else:
    奥に、三の坑への下り坑道が、黒々と口を開けている。
}
+ [しらべる] -> drained_look
+ [たたく] -> drained_hit
+ [うごく] -> drained_move
+ [もちもの] -> show_bag(-> r_drained)
+ {herb_count > 0} [つかう] -> use_menu(-> r_drained)

=== drained_look ===
何をしらべる？
+ [よこだおしのトロッコ] -> look_mudcart
+ [レール] -> look_rails_b2
+ {not crab_beaten} [大ガニ] -> look_crab
+ [やめる] -> r_drained

=== look_mudcart ===
どろをかき分けると、座席の下から、水番のものらしい古い手帳が出てきた。
ぬれてふやけ、字はもう読めない。ここまで水が来ていたのだ。
-> drained_look

=== look_rails_b2 ===
レールはどろをかぶっても、まっすぐ奥の下り坑道へつづいている。
レールをとめる釘の頭が、どろの下で、きちんとならんでいた。
-> drained_look

=== look_crab ===
こうらは岩そのものだ。はさみの一撃は、当たりどころが悪ければ骨まで割るだろう。
-> drained_look

=== drained_hit ===
何をたたく？
+ {not crab_beaten} [大ガニ] -> fight_crab
+ [よこだおしのトロッコ] -> hit_mudcart
+ [やめる] -> r_drained

=== hit_mudcart ===
たたいても、どろがはねるばかりだ。
-> drained_hit

=== fight_crab ===
{ carries(pickaxe):
    はさみをかいくぐって、つるはしをこうらのつなぎ目へ打ちおろす。二度目でひびが走り、三度目で大ガニはどろにしずんだ。はさみの一撃を、すねに深くもらっていた。
    ~ take_hit(4)
- else:
    素手ではこうらにつめも立たない。はさみに打ちはらわれ、どろにたたきつけられながら、どうにか目の間をなぐりつけて、しとめた。
    ~ take_hit(8)
}
~ crab_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_drained

=== drained_move ===
どこへうごく？
+ [機械室へ] -> r_winch
+ {crab_beaten} [三の坑へ下りる] -> r_b3_hub
+ {not crab_beaten} [奥の下り坑道へ] -> crab_blocked
+ [やめる] -> r_drained

=== crab_blocked ===
下り坑道へ近づいたとたん、大ガニがはさみをふりかぶって立ちふさがった。
-> r_drained

// ================= B3 三の坑（③重り台車と鉄格子） =================

=== r_b3_hub ===
~ depth = 3
~ place = "[B3] 三の坑・分かれ道"
三の坑。降り立った先で、坑道が三つに分かれている。
東の坑道へレールが下っている。そのわきから太い鎖がのび、天じょうの大きな鉄の車を回って、西の坑道へつづいていた。
+ [しらべる] -> b3hub_look
+ [うごく] -> b3hub_move
+ [もちもの] -> show_bag(-> r_b3_hub)
+ {herb_count > 0} [つかう] -> use_menu(-> r_b3_hub)

=== b3hub_look ===
何をしらべる？
+ [太い鎖] -> look_b3_chain
+ [東の入り口] -> look_east_mouth
+ [南の入り口] -> look_south_mouth
+ [西の入り口] -> look_west_mouth
+ [やめる] -> r_b3_hub

=== look_b3_chain ===
{ b3_gate_open:
    鎖はぴんと張り、天じょうの鉄の車のところで止まっている。東の坂から西の鉄格子まで、一本につながっていた。
- else:
    東から来た一本の鎖が、天じょうの鉄の車にかかり、そのまま西へつづいている。
}
-> b3hub_look

=== look_east_mouth ===
レールは東へ向かって下っている。鎖もレールにそって、暗がりへつづいていた。
-> b3hub_look

=== look_south_mouth ===
南の入り口はせまい。床はもとの岩のままで、白っぽい霧がうすく流れてくる。
-> b3hub_look

=== look_west_mouth ===
西の奥には、太い鉄格子が見える。天じょう近くまでのびた鎖が、その上につながっていた。
-> b3hub_look

=== b3hub_move ===
どこへうごく？
+ [東の坑道へ] -> r_east3
+ [南の坑道へ] -> r_south3
+ [西の坑道へ] -> r_west3
+ [二の坑へ上る] -> r_drained
+ [やめる] -> r_b3_hub

// ---- 東坑道（重り台車・大グモ） ----

=== r_east3 ===
~ place = "[B3] 三の坑・東の坑道"
東の坑道。レールが急な坂を下っている。
{ b3_cart_released:
    石を積んだ台車は坂の下へ消えた。太い鎖だけが、レールの上でぴんと張っている。
- else:
    坂の手前に、石を山ほど積んだ台車が止まっている。後ろにつながった鎖は、分かれ道の天じょうへつづいていた。
    前輪の下には、三角の木の車止めがかませてある。
}
{ not spider_beaten:
    大グモが台車の上にうずくまり、車止めまで白い糸を張っている。
}
+ [しらべる] -> east3_look
+ [たたく] -> east3_hit
+ {not b3_cart_released} [とる] -> east3_take
+ [うごく] -> east3_move
+ [もちもの] -> show_bag(-> r_east3)
+ {herb_count > 0} [つかう] -> use_menu(-> r_east3)

=== east3_look ===
何をしらべる？
+ [石を積んだ台車] -> look_weight_cart
+ [太い鎖] -> look_cart_chain
+ [車止め] -> look_wheel_chock
+ {not spider_beaten} [大グモ] -> look_spider
+ [やめる] -> r_east3

=== look_weight_cart ===
{ b3_cart_released:
    台車は坂の下へ走り去り、ここにはもうない。
- else:
    荷台は石でいっぱいだ。レールは台車の先から急に下り、車輪は坂へ向いている。
}
-> east3_look

=== look_cart_chain ===
{ b3_cart_released:
    鎖は坂の下へ強く引かれ、動かない。
- else:
    鎖の一方は台車の後ろにつながり、もう一方は分かれ道の天じょうへつづいている。
}
-> east3_look

=== look_wheel_chock ===
{ b3_cart_released:
    前輪を止めていた木は、もう外れている。
- else:
    三角の木が前輪とレールの間に深くはまり、石を積んだ台車を坂の手前で止めている。
}
-> east3_look

=== look_spider ===
どうだけで人の頭ほどある。糸は台車から車止めまで重なり、近づく物を待ちかまえていた。
-> east3_look

=== east3_hit ===
何をたたく？
+ {not spider_beaten} [大グモ] -> fight_spider
+ [石を積んだ台車] -> hit_weight_cart
+ [太い鎖] -> hit_cart_chain
+ [やめる] -> r_east3

=== fight_spider ===
{ carries(star_blade):
    白い剣が、糸ごと大グモをなぎはらった。ひとふりでどうがさけ、大グモはレールの上へころげ落ちる。とびちった糸が、うでを深くこすった。
    ~ take_hit(3)
- else:
    { carries(pickaxe):
        糸をはらい、とびかかる大グモへつるはしをたたきこむ。二撃目でどうがさけ、大グモはレールの上へころげ落ちて動かなくなった。かたに、きばが深くささっていた。
        ~ take_hit(5)
    - else:
        素手ではらったうでに、きばが食いこむ。長いもみ合いの末に石でたたきつぶしたが、体じゅう傷だらけだ。
        ~ take_hit(10)
    }
}
~ spider_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_east3

=== hit_weight_cart ===
{ not spider_beaten:
    台車へ近づいたとたん、大グモが糸を伝って飛びかかってきた。
    -> fight_spider
- else:
    { b3_cart_released:
        台車はもう坂の下だ。
    - else:
        荷台をたたくと石が鳴った。前輪は車止めに押さえられたまま、台車は動かない。
    }
    -> r_east3
}

=== hit_cart_chain ===
鎖をたたくと、重い音が天じょうの鉄の車を通り、西の坑道までひびいた。鎖は切れない。
-> r_east3

=== east3_take ===
何をとる？
+ [車止め] -> take_wheel_chock
+ [やめる] -> r_east3

=== take_wheel_chock ===
{ not spider_beaten:
    車止めへ手をかけたとたん、頭の上で糸が鳴った。大グモが飛びかかってくる。
    -> fight_spider
}
~ b3_cart_released = true
車止めを引きぬく。石を積んだ台車が坂へ動き出し、鎖が音を立てて走った。
{ not b3_bar_removed:
    数歩ぶん下ったところで鎖が張り、台車は急に止まった。西のほうで、鉄がきしむ音がした。
}
-> check_b3_gate(-> r_east3)

=== east3_move ===
どこへうごく？
+ [分かれ道へ] -> r_b3_hub
+ [やめる] -> r_east3

// ---- 南坑道（ほりかけの道・毒の霧とリスク購入） ----

=== r_south3 ===
~ place = "[B3] 三の坑・南の坑道"
南の坑道。せまいためし掘りの道らしく、数十歩で、のっぺりした岩の行き止まりに突き当たる。
行き止まりの手前、床のひび割れから、白っぽい霧がわき出ていた。鼻をつく、いやなにおいだ。
{ not carries(hide_armor):
    霧のたまった奥に、革のよろいを着た人がたおれている。手元には、かみかけの薬草がいくつも散らばっていた。
}
+ [しらべる] -> south3_look
+ {not south_herb_taken || not carries(hide_armor)} [とる] -> south3_take
+ [うごく] -> south3_move
+ [もちもの] -> show_bag(-> r_south3)
+ {herb_count > 0} [つかう] -> use_menu(-> r_south3)

=== south3_look ===
何をしらべる？
+ [行き止まり] -> look_south_end
+ [道具ぶくろ] -> look_toolbag
+ {not carries(hide_armor)} [たおれている人] -> look_corpse
+ [やめる] -> r_south3

=== look_south_end ===
ほりかけのまま、ほうり出された岩のかべだ。のみのあとが、とちゅうで切れている。
かべの手前の床がひび割れ、下から毒の霧がわき出ている。掘るのをやめたのは、これのせいだろう。
-> south3_look

=== look_toolbag ===
かべぎわに、置きわすれられた道具ぶくろがある。
中に、ほした薬草がひとたば、油紙にくるんでおしこんであった。
-> south3_look

=== look_corpse ===
霧ごしに目をこらす。ぶあつい革のよろいを着た男だ。手にまめがなく、体つきもちがう——坑夫ではない。星髄の荷を守っていた、やとわれの護衛だろう。
体のまわりに、かみかけの薬草が、いくつも散らばっている。毒の霧には、薬草も効かなかったのだ。
よろいは、まだじゅうぶんに使えそうに見える。だが、あの霧のたまりの中だ。
-> south3_look

=== south3_take ===
何をとる？
+ {not south_herb_taken} [道具ぶくろの薬草] -> take_south_herb
+ {not carries(hide_armor)} [護衛の革のよろい] -> take_armor
+ [やめる] -> r_south3

=== take_south_herb ===
~ south_herb_taken = true
~ herb_count = herb_count + 1
薬草をふくろにうつした（薬草 {herb_count}）。
-> r_south3

=== take_armor ===
~ equipment += hide_armor
~ conditions += poisoned
息を止めて霧にとびこみ、なきがらから革のよろいをはぎ取って、身につけた。ぶあつい革が、体をぐるりと包む。まともに当たっても、これでいくらか浅くてすむ。
だが、もどる途中で息がつづかなかった。のどの奥が焼け、目の前が白くかすむ。
~ player_hp = player_hp - player_hp / 2
毒が、体のしんまでしみこんだ。あの護衛とおなじだ——薬草は、もう効かない。どこかで、洗い流すしかない（体力 {player_hp}）。
-> r_south3

=== south3_move ===
どこへうごく？
+ [分かれ道へ] -> r_b3_hub
+ [やめる] -> r_south3

// ---- 西坑道（鉄格子と横木） ----

=== r_west3 ===
~ place = "[B3] 三の坑・西の坑道"
西の坑道。下り道を、天じょうまである太い鉄格子がふさいでいる。
格子の上には、東から来た鎖がつながっていた。
{ b3_gate_open:
    鉄格子は高く持ち上がり、下の坑へつづく道が開いている。
- else:
    格子の横には太い横木が渡され、両端がかべの金具にはまっている。
}
+ [しらべる] -> west3_look
+ [つかう] -> west3_use
+ [うごく] -> west3_move
+ [もちもの] -> show_bag(-> r_west3)

=== west3_look ===
何をしらべる？
+ [鉄格子] -> look_descent_gate
+ [横木] -> look_gate_bar
+ [太い鎖] -> look_gate_chain
+ [やめる] -> r_west3

=== look_descent_gate ===
{ b3_gate_open:
    鉄格子は人の背より高く上がり、下をくぐれる。
- else:
    鉄格子は道の幅いっぱいに下りている。下へ押しても、横へゆすっても動かない。
}
-> west3_look

=== look_gate_bar ===
{ b3_bar_removed:
    横木は外れ、かべの金具だけが残っている。
- else:
    横木の両端が、かべの金具へ深くはまっている。横木の下には、つるはしの先が入るほどのすき間があった。
}
-> west3_look

=== look_gate_chain ===
一本の鎖が鉄格子の上からのび、分かれ道の天じょうを通って東へつづいている。
-> west3_look

=== west3_use ===
何をつかう？
+ {carries(pickaxe)} [つるはし] -> west3_use_pickaxe
+ {herb_count > 0} [薬草（自分に）] -> use_herb(-> r_west3)
+ [やめる] -> r_west3

=== west3_use_pickaxe ===
どこにつかう？
+ [横木] -> pry_gate_bar
+ [鉄格子] -> pry_descent_gate
+ [太い鎖] -> pry_gate_chain
+ [やめる] -> r_west3

=== pry_gate_bar ===
{ b3_bar_removed:
    横木はもう外れている。
    -> r_west3
}
~ b3_bar_removed = true
つるはしの先を横木の下へ差しこみ、体重をかける。横木が金具から外れ、床へ重い音を立てて落ちた。
{ not b3_cart_released:
    鉄格子がわずかにゆれた。だが、上へ引く鎖は動かない。
}
-> check_b3_gate(-> r_west3)

=== pry_descent_gate ===
つるはしを鉄格子の下へ入れて持ち上げようとする。格子は重く、先がすべるだけだ。
-> r_west3

=== pry_gate_chain ===
つるはしの先を鎖の輪へかけて引く。鎖は東へ強く張り、びくともしない。
-> r_west3

=== check_b3_gate(-> ret) ===
{ b3_gate_open:
    -> ret
}
{ b3_cart_released && b3_bar_removed:
    ~ b3_gate_open = true
    二つの止めがなくなった。石を積んだ台車が坂を走り、鎖が天じょうの鉄の車を回って西へ引かれる。
    重い鉄格子が、地面をこすりながら上がっていった。下の坑へつづく道が開いた。
}
-> ret

=== west3_move ===
どこへうごく？
+ [分かれ道へ] -> r_b3_hub
+ [鉄格子の向こうへ] -> try_descend_b4
+ [やめる] -> r_west3

=== try_descend_b4 ===
{ b3_gate_open:
    -> r_b4_hub
- else:
    鉄格子が道をふさいでいる。人が通れるすき間はない。
    -> r_west3
}

// ================= B4 下の坑（②崩れた武器庫・はじめての遭遇） =================

=== r_b4_hub ===
~ depth = 4
~ place = "[B4] 下の坑・分かれ道"
{ not met_the_thing:
    -> b4_meet
}
下の坑の分かれ道。折れたレールが暗がりにちらばり、坑道がいく筋にも分かれている。
どのかべも黒くしめり、遠くで水の落ちる重い音がしている。
くずれた階段のわきに、親方の書き置きが落ちていた。
+ [しらべる] -> b4hub_look
+ [うごく] -> b4hub_move
+ [もちもの] -> show_bag(-> r_b4_hub)
+ {herb_count > 0} [つかう] -> use_menu(-> r_b4_hub)

=== b4_meet ===
~ met_the_thing = true
降り立ったしゅんかん、やみの奥で、何かが身じろぎした。
ランプの明かりのきわを、岩の板を何枚も重ねたような背中が横切っていく。坑道いっぱいの、とほうもない大きさだ。
背中には太い白い光のすじが走り、その横に、古い大きな切り傷が一本残っていた。
+ [たたく] -> meet_hit
+ [うごく（物かげにかくれる）] -> meet_wait

=== meet_hit ===
{ carries(pickaxe):
    つるはしを、力いっぱい打ちこんだ。
- else:
    足元の石をひろい、力いっぱいたたきつけた。
}
——手ごたえが、まるでない。得物は岩のような背中をすべった。
巨体がわずかにゆれ、尾のようなものがなぎはらわれる。かべにたたきつけられた。
~ take_hit(3)
{ player_hp <= 0: -> game_over }
巨体は岩の割れ目へ体を押しこんだ。重なった背中の板がずれ、白く光る部分が一瞬むき出しになる。
そのまま底のほうへ消え、重い水音がひびいた（体力 {player_hp}）。
-> r_b4_hub

=== meet_wait ===
息をころす。巨体は岩の割れ目へ体を押しこんだ。
重なった背中の板がずれ、白く光る部分と、その横の古い切り傷が一瞬むき出しになる。
巨体はそのまま底のほうへ消え、重い水音がひびいた。
-> r_b4_hub

=== b4hub_look ===
何をしらべる？
+ [親方の書き置き] -> look_foreman_note
+ [折れたレール] -> look_b4_rails
+ [岩の割れ目] -> look_crevice
+ [やめる] -> r_b4_hub

=== look_foreman_note ===
ぬれた紙に、短い文が残っている。
「星髄は、星喰いの背中にある」
「白い剣なら、あれを傷つけられる」
「剣は、作業場の武器庫に残した。——親方」
-> b4hub_look

=== look_b4_rails ===
レールは折られ、ねじれ、そこらじゅうにちらばっている。こわしたのは、人の手ではなさそうだ。
-> b4hub_look

=== look_crevice ===
あの巨体がすべりこんでいった割れ目だ。人ひとり通れないはばなのに、あれは重なった背中の板をずらして通りぬけた。
のぞきこむと、はるか底に、黒い水がかすかに光っている。
-> b4hub_look

=== b4hub_move ===
どこへうごく？
+ [ほこらへ] -> r_shrine
+ [作業場へ] -> r_gallery
+ [さらに下りる] -> r_b5_hub
+ [三の坑へ上る] -> r_west3
+ [やめる] -> r_b4_hub

// ---- ほこら ----

=== r_shrine ===
~ place = "[B4] 下の坑・ほこらの間"
ほこらの間。岩をほった小さなほこらに、すりへった山の神さまの石像がすえられている。
石像の前には、ひからびたお供えのわんが置かれていた。かべには深いひびが走っている。
+ [しらべる] -> shrine_look
+ [うごく] -> shrine_move
+ [もちもの] -> show_bag(-> r_shrine)
+ {herb_count > 0} [つかう] -> use_menu(-> r_shrine)

=== shrine_look ===
何をしらべる？
+ [山の神さまの石像] -> look_god
+ [お供えのわん] -> look_offering_bowl
+ [やめる] -> r_shrine

=== look_god ===
顔はすりへって読めない。両手で山をかかえ、落ちてくる岩を支える形をしている。
-> shrine_look

=== look_offering_bowl ===
からの木のわんだ。底に、しなびた草の葉が一枚だけ残っている。
-> shrine_look

=== shrine_move ===
どこへうごく？
+ [分かれ道へ] -> r_b4_hub
+ [やめる] -> r_shrine

// ---- 作業場（崩れた武器庫） ----

=== r_gallery ===
~ place = "[B4] 下の坑・作業場"
作業場。奥に、二つの輪へ太い鉄棒を通した鉄戸がある。
落ちた天じょう石が、横に渡された鉄棒のまん中へのしかかり、鉄棒は下へ大きくたわんでいた。
鉄戸の手前には床の丸い穴と、一本だけ外れたレールがある。
{ support_rail_set:
    外れたレールは床の穴へ立てられ、天じょう石を下から支えている。
}
{ weapon_room_open:
    横の鉄棒は抜け、鉄戸は開いている。
}
+ [しらべる] -> gallery_look
+ [とる] -> gallery_take
+ [つかう] -> gallery_use
+ [うごく] -> gallery_move
+ [もちもの] -> show_bag(-> r_gallery)

=== gallery_look ===
何をしらべる？
+ [鉄戸] -> look_weapon_door
+ [横の鉄棒] -> look_crossbar
+ [床の丸い穴] -> look_floor_socket
+ [外れたレール] -> look_loose_rail
+ [鉄戸のすき間] -> look_door_gap
+ [やめる] -> r_gallery

=== look_weapon_door ===
{ weapon_room_open:
    鉄戸は開き、武器庫の中が見えている。
- else:
    ぶあつい鉄戸だ。取っ手はあるが、二つの輪を通る横の鉄棒が、かんぬきになっている。
}
-> gallery_look

=== look_crossbar ===
{ weapon_room_open:
    抜いた鉄棒が床に転がっている。
- else:
    鉄棒の中央へ、落ちた天じょう石が直接のしかかっている。鉄棒は重さで下へ曲がり、こすれたところから石の粉が落ちていた。
}
-> gallery_look

=== look_floor_socket ===
深い丸い穴だ。中には、折れた木のくずが残っている。穴の真上には、天じょう石の平らな下面がある。
-> gallery_look

=== look_loose_rail ===
{ support_rail_set:
    レールは床の穴へまっすぐ立ち、天じょう石を受けている。
- else:
    床に外れたレールが一本ある。太さは丸い穴に入り、立てれば床から天じょう石まで届く長さだ。
}
-> gallery_look

=== look_door_gap ===
{ weapon_room_open:
    開いた戸のむこうに、白いさやの剣が掛かっている。
- else:
    戸のすき間から、白いさやの剣が一本見える。横の札には「星喰いを傷つけた白い剣」と書かれていた。
}
-> gallery_look

=== gallery_take ===
何をとる？
+ [横の鉄棒] -> take_crossbar
+ [やめる] -> r_gallery

=== take_crossbar ===
{ weapon_room_open:
    鉄棒はもう戸から抜け、床に転がっている。
    -> r_gallery
}
{ not support_rail_set:
    鉄棒へ手をかける。だが天じょう石の重さがかかり、びくともしない。
    頭上から石が落ち、かたを打った。
    ~ take_hit(2)
    { player_hp <= 0: -> game_over }
    （体力 {player_hp}）
    -> r_gallery
}
~ weapon_room_open = true
天じょう石の重さは、立てたレールへ移っている。たわみの戻った鉄棒を輪から引きぬくと、鉄戸が手前へ開いた。
-> r_gallery

=== gallery_use ===
何をつかう？
+ [外れたレール] -> use_loose_rail
+ {herb_count > 0} [薬草（自分に）] -> use_herb(-> r_gallery)
+ [やめる] -> r_gallery

=== use_loose_rail ===
どこにつかう？
+ [床の丸い穴] -> set_support_rail
+ [鉄戸の輪] -> rail_on_door_rings
+ [天じょうの割れ目] -> rail_on_ceiling_crack
+ [やめる] -> r_gallery

=== set_support_rail ===
{ support_rail_set:
    レールはもう床の穴へ立ててある。
    -> r_gallery
}
~ support_rail_set = true
外れたレールの端を床の丸い穴へ入れ、まっすぐ立てる。上の端が天じょう石の平らな面へ当たり、重さを受けた。
横の鉄棒が、きしみながら少しまっすぐにもどった。
-> r_gallery

=== rail_on_door_rings ===
レールは鉄戸の輪より太く、通らない。横にしても、戸を開ける役には立たなかった。
-> r_gallery

=== rail_on_ceiling_crack ===
レールの先を天じょうの割れ目へ入れても、立てておく場所がない。手をはなせば、すぐ床へたおれる。
-> r_gallery

=== gallery_move ===
どこへうごく？
+ [分かれ道へ] -> r_b4_hub
+ [武器庫の中へ] -> try_enter_weapon_room
+ [やめる] -> r_gallery

=== try_enter_weapon_room ===
{ weapon_room_open:
    -> r_weapon_room
- else:
    鉄戸は横の鉄棒で閉じられている。
    -> r_gallery
}

// ---- 武器庫（白い剣） ----

=== r_weapon_room ===
~ place = "[B4] 下の坑・武器庫"
小さな武器庫だ。さびた道具の中で、白いさやに入った剣だけが、かべに掛けられている。
剣の横の札には「星喰いを傷つけた白い剣」と書かれていた。
+ [しらべる] -> weapon_room_look
+ {not carries(star_blade)} [とる] -> weapon_room_take
+ [うごく] -> weapon_room_move
+ [もちもの] -> show_bag(-> r_weapon_room)
+ {herb_count > 0} [つかう] -> use_menu(-> r_weapon_room)

=== weapon_room_look ===
何をしらべる？
+ [白い剣] -> look_white_sword
+ [札] -> look_sword_sign
+ [さびた道具] -> look_rusted_tools
+ [やめる] -> r_weapon_room

=== look_white_sword ===
白いさやから、刃を少しだけ抜く。刃まで白い。
星喰いの背中にあった古い切り傷は、この剣でつけたものだ。これなら、あれを傷つけられる。
-> weapon_room_look

=== look_sword_sign ===
「星喰いを傷つけた白い剣」
それだけが、大きな字で書かれている。
-> weapon_room_look

=== look_rusted_tools ===
古いつるはしや金づちが積まれている。どれもさびつき、柄もくさっていた。
-> weapon_room_look

=== weapon_room_take ===
何をとる？
+ {not carries(star_blade)} [白い剣] -> take_white_sword
+ [やめる] -> r_weapon_room

=== take_white_sword ===
~ equipment += star_blade
白い剣を、さやごと背負った。
十二年前、星喰いを傷つけた剣だ。これなら、背中の星髄へ近づける。
-> r_weapon_room

=== weapon_room_move ===
どこへうごく？
+ [作業場へ] -> r_gallery
+ [やめる] -> r_weapon_room

// ================= B5 崩れた通路（関門・解毒の泉） =================

=== r_b5_hub ===
~ depth = 5
~ place = "[B5] 崩れた通路"
崩れた通路。天じょうの半分が落ちて、岩の山が行く手をふさいでいる。
岩の山のすそを、細い水の流れが、かべぎわのすき間へ流れこんでいた。
わき道の奥から、かすかに水のわく音がする。
{ not guard_beaten:
    { guard_phase == 0:
        そのわき道と下りの道の、ちょうど分かれ目に——岩そっくりのこうらをもつ獣、岩ガメがうずくまっている。首も足も内側へ引き、こうらの板をかたく合わせている。
    - else:
        岩ガメは突進した勢いのまま、こちらを通りすぎている。首と足がのび、こうらの板のあいだが大きく開いていた。
    }
    どちらへ行くにも、あれの前を通るしかない。
}
+ [しらべる] -> b5_look
+ [たたく] -> b5_hit
+ [うごく] -> b5_move
+ [もちもの] -> show_bag(-> r_b5_hub)
+ {herb_count > 0} [つかう] -> use_menu(-> r_b5_hub)

=== b5_look ===
何をしらべる？
+ [岩の山] -> look_rockpile
+ [水の流れ] -> look_b5_water
+ {not guard_beaten} [岩ガメ] -> look_guard
+ [やめる] -> r_b5_hub

=== look_rockpile ===
角の立った岩が、急な斜面をつくっている。上のほうの岩はどれもうき、体重をかければ足元へくずれてきそうだ。
-> b5_look

=== look_b5_water ===
細い流れは岩山をさけて、かべぎわの低いすき間へ入りこんでいる。
すき間は人のかたはばほどしかなく、両がわには、くだけた岩の角がつき出していた。
-> b5_look

=== look_guard ===
{ guard_phase == 0:
    首と足をこうらの内側へ引き、岩のように動かない。息をするたび、かたく合わさったこうらのつなぎ目が、わずかに開いてはとじる。
- else:
    突進のあとで首と足がのびきっている。岩のようなこうらの板もずれ、つなぎ目の奥まで見えていた。
}
-> b5_look

=== b5_hit ===
何をたたく？
+ {not guard_beaten} [岩ガメ] -> fight_guard
+ [やめる] -> r_b5_hub

=== fight_guard ===
{ guard_phase == 0:
    得物をふりおろす。だが、かたく合わさったこうらにはじかれた。
    岩ガメが身を起こし、こうらごと体をぶつけてくる。
    ~ take_hit(4)
    { player_hp <= 0: -> game_over }
    （体力 {player_hp}）
    -> r_b5_hub
}
~ guard_openings = guard_openings + 1
{ carries(star_blade):
    白い剣を、開いたこうらのあいだへ打ちこむ。刃は岩のような板の奥まで通った。
    ~ take_hit(1)
    ~ guard_beaten = true
- else:
    { carries(pickaxe):
        { guard_openings >= 2:
            二度目に開いたこうらへ、つるはしを深く打ちこむ。岩ガメは大きくのけぞり、そのままくずれ落ちた。
            ~ take_hit(6)
            ~ guard_beaten = true
        - else:
            つるはしの先が、開いたこうらの奥へ食いこんだ。岩ガメは身をよじって得物をはねのけ、ふたたび首と足を引っこめる。
            ~ guard_phase = 0
        }
    - else:
        { guard_openings >= 3:
            三度目に開いたこうらへ、ひろった石を力いっぱい打ちこむ。岩ガメはようやく体をのばし、動かなくなった。
            ~ take_hit(12)
            ~ guard_beaten = true
        - else:
            開いたこうらの奥へ、ひろった石をたたきつける。岩ガメは身をよじり、ふたたび首と足を引っこめた。
            ~ guard_phase = 0
        }
    }
}
{ guard_beaten:
    ~ guard_phase = 0
    { player_hp <= 0: -> game_over }
    こちらも傷を負ったが、岩ガメはもう動かない（体力 {player_hp}）。
- else:
    岩ガメはまた、岩のように道をふさいだ。
}
-> r_b5_hub

=== b5_move ===
どこへうごく？
+ {guard_beaten} [わき道の奥へ] -> r_spring
+ {guard_beaten} [岩の山をのりこえて下りる] -> climb_rockpile
+ {guard_beaten} [水が流れこむすき間を抜ける] -> through_gap
+ {not guard_beaten} [先へ進む] -> guard_advance
+ [下の坑の分かれ道へ] -> leave_b5
+ [やめる] -> r_b5_hub

=== guard_advance ===
{ guard_phase == 0:
    一歩ふみ出したとたん、岩と見えたこうらが、ぬっと持ち上がった。
    岩ガメがまっすぐ突っこんでくる。横へとびのくと、巨体はすぐわきを走りぬけた。
    ~ guard_phase = 1
- else:
    先へ走ろうとしたが、岩ガメが首をこちらへ向けた。足を止めて距離を取るうちに、首も足もこうらの中へもどっていった。
    ~ guard_phase = 0
}
-> r_b5_hub

=== leave_b5 ===
{ not guard_beaten:
    ~ guard_phase = 0
    ~ guard_openings = 0
}
-> r_b4_hub

=== climb_rockpile ===
ういた岩に手をかけたとたん、足元から山がくずれた。角の立った岩といっしょに、斜面をころげ落ちる。
~ take_hit(4)
{ player_hp <= 0: -> game_over }
したたかに打った体を起こすと、くずれた岩の先に、下りの道がつづいていた（体力 {player_hp}）。
-> r_lake

=== through_gap ===
{ carries(hide_armor):
    水の流れに身をふせて、せまいすき間へ体をねじこむ。ぶあつい革が両がわの岩に引っかかり、動くたび、岩の角がよろいごと体へ食いこんだ。
    ~ take_hit(6)
- else:
    水の流れに身をふせて、せまいすき間をくぐりぬける。岩の角であちこちをすりむいた。
    ~ take_hit(2)
}
{ player_hp <= 0: -> game_over }
流れにみちびかれるまま、下りの道へ出た（体力 {player_hp}）。
-> r_lake

// ---- 泉 ----

=== r_spring ===
~ place = "[B5] わき道の泉"
岩のくぼみに、すんだ泉がわいている。底で白い砂がゆっくりまき上がり、水はあわく光って見えた。
+ [しらべる] -> spring_look
+ [つかう] -> spring_use
+ [うごく] -> spring_move
+ [もちもの] -> show_bag(-> r_spring)

=== spring_look ===
何をしらべる？
+ [泉] -> look_spring
+ [やめる] -> r_spring

=== look_spring ===
水底で、白い砂があわく光っている。すきとおって、つめたそうな水だ。
{ conditions ? poisoned:
    この水なら、体にしみこんだ毒も、洗い流せるかもしれない。
}
-> spring_look

=== spring_use ===
何をつかう？
+ [泉の水（あびる）] -> bathe_spring
+ {herb_count > 0} [薬草（自分に）] -> use_herb(-> r_spring)
+ [やめる] -> r_spring

=== bathe_spring ===
{ conditions ? poisoned:
    ~ conditions -= poisoned
    頭から水をかぶり、毒ごと洗い流す。体のしんを焼いていた熱が、すっと引いていった。
    きずまではふさがらない。だが——これで薬草が、また効くはずだ。
- else:
    頭から水をかぶる。つめたさに、息が止まりそうになる。目はさえたが、きずはきずのままだ。
}
-> r_spring

=== spring_move ===
どこへうごく？
+ [崩れた通路へ] -> r_b5_hub
+ [やめる] -> r_spring

// ================= B6 いちばん深いところ（地底の湖・星喰い） =================

=== r_lake ===
~ depth = 6
~ place = "[B6] いちばん深いところ・地底の湖"
いちばん深いところ。坑道がとぎれ、黒い地底の湖が広がっている。
{ not lake_drained:
    湖のまん中あたりで、白い光のすじが、水ごしにゆっくりと明滅している。星喰いだ。水の底で、ねむるようにうずくまっている。
    岸のむこうに、大きい水門がひとつ。太いくさびでとめてある。
    岸にそっては、かわいた水路が地面の割れ目までつづき、その入り口を、小さい水門がふさいでいた。
- else:
    { not boss_beaten:
        { boss_engaged:
            水のなくなった湖の底で、星喰いが巨体を起こしている。背中の星髄を守るように、こちらの道をふさいでいた。
        - else:
            水のなくなった湖の底の、どろの上に、星喰いが横たわっている。背中の白い光の中に、固い星髄のかたまりが見えた。村へ持ち帰る物は、あれだ。
        }
    - else:
        水のなくなった湖の底の、どろの上に、星喰いが横たわっている。星髄の光は、もうあわく残るのみだ。
    }
}
+ [しらべる] -> lake_look
+ {not lake_drained || (boss_engaged && not boss_beaten)} [たたく] -> lake_hit
+ [うごく] -> lake_move
+ [もちもの] -> show_bag(-> r_lake)
+ {herb_count > 0} [つかう] -> use_menu(-> r_lake)

=== lake_look ===
何をしらべる？
+ {not lake_drained} [地底の湖] -> look_lake
+ {not lake_drained} [大きい水門] -> look_sluice
+ {not lake_drained} [小さい水門] -> look_spillway
+ {lake_drained && not boss_beaten} [星喰い] -> look_boss
+ [やめる] -> r_lake

=== look_lake ===
水は深い。岸から石を投げても、あの巨体まではとどきそうにない。
水面は、大きい水門のほうへ、ごくゆっくりと流れている。
-> lake_look

=== look_sluice ===
湖の水位をたもつための水門らしい。くさびは太いが、打ち方は上の水門と同じだ。
水門のこちら側に、水のにげ場はない。足元の岸は、湖面とほとんど同じ高さだ。
-> lake_look

=== look_spillway ===
{ spillway_open:
    開いた門の底を、湖の水が細い糸になって走り、割れ目へ落ちていく。
- else:
    かわいた水路が、岸にそって地面の割れ目までつづいている。水路の底は、湖面より低い。
    入り口の門は小さく、くさびもひとまわり細い。
}
-> lake_look

=== look_boss ===
どろに半分しずんだ巨体が、ゆっくりと身をよじっている。水を失って、動きがにぶい。
背中には、武器庫で聞いた古い切り傷がある。そのそばで、薬に使える固い星髄が白く光っていた。
{ boss_engaged:
    星喰いはこちらを向き、星髄へ近づく道をふさいでいる。
}
-> lake_look

=== lake_hit ===
何をたたく？
+ {not lake_drained && not spillway_open} [小さい水門] -> open_spillway
+ {not lake_drained} [大きい水門] -> break_sluice
+ {not lake_drained} [星喰い（水の中の）] -> hit_boss_in_water
+ {lake_drained && boss_engaged && not boss_beaten} [襲ってくる星喰い] -> fight_boss
+ [やめる] -> r_lake

=== hit_boss_in_water ===
岸から得物をふっても、水をたたくだけだ。巨体は水の底で、身じろぎひとつしない。
-> r_lake

=== open_spillway ===
~ spillway_open = true
細いくさびは、ひと打ちでとんだ。小さい水門が開き、湖の水が細い糸になって、かわいた水路を走り、割れ目へ落ちていく。
この細さでは、湖はへりもしない。だが——水のにげ道は、これでできた。
-> r_lake

=== break_sluice ===
{ spillway_open:
    ~ lake_drained = true
    くさびへ、力いっぱいの一撃。大きい水門がきしんで開き、黒い水がどうっと水路へなだれこんで、割れ目へぬけていく。
    みるみる水が引いていく。やがて、どろの湖の底があらわれた——星喰いが、水を失って横たわっている。
- else:
    くさびへ、力いっぱいの一撃。水門がきしんで開きかけ——行き場のない水が、まっ先にこちらの岸へあふれ返ってきた。
    水のかべになぎたおされ、石の縁にたたきつけられる。
    ~ take_hit(4)
    { player_hp <= 0: -> game_over }
    水のいきおいが、開きかけた水門を、もとの場所へおしもどしていった（体力 {player_hp}）。
}
-> r_lake

=== fight_boss ===
{ carries(star_blade):
    { not boss_wounded:
        ~ boss_wounded = true
        白い剣を抜き、十二年前の切り傷へたたきこむ。剣はかたい背中を切り、白く光る部分へ深々と入った。
        星喰いが坑道をゆらしてあばれ、ふり回された尾が、まともに当たる。
        ~ take_hit(5)
        { player_hp <= 0: -> game_over }
        ゆうれいの話どおりだ。この剣なら、星喰いを傷つけられる（体力 {player_hp}）。
        -> r_lake
    - else:
        ~ boss_beaten = true
        のたうつ巨体の、開いた古傷へ。白い剣を、体ごとしずみこませた。
        背中の光がひときわ強く燃え上がり——ふつりと、弱くなった。
        たおれこむ巨体の尾が、さいごの力で、まともにこちらをはらっていく。
        ~ take_hit(3)
        { player_hp <= 0: -> game_over }
        どろにたたきつけられた体を起こすと、巨体はもう、動かなくなっていた（体力 {player_hp}）。
        -> boss_won
    }
- else:
    { carries(pickaxe):
        つるはしを打ちこむ。だが、かたい背中をすべり、傷ひとつつかない。
    - else:
        ひろった石をたたきつける。だが、かたい背中ではね返った。
    }
    星喰いの尾が、どうをまともに打った。
    ~ take_hit(6)
    { player_hp <= 0: -> game_over }
    白い剣を取りにもどるなら、いまのうちだ（体力 {player_hp}）。
    -> r_lake
}

=== lake_move ===
どこへうごく？
+ [崩れた通路へ上る] -> r_b5_hub
+ {lake_drained && not boss_engaged && not boss_beaten} [背中の星髄へ近づく] -> approach_marrow
+ {boss_beaten} [背中の星髄を取りに行く] -> boss_corpse
+ [やめる] -> r_lake

=== approach_marrow ===
~ boss_engaged = true
村へ持ち帰る星髄は、あの背中にある。
湖の底へ足をふみ出すと、星喰いが巨体を起こした。背中の星髄を守るように道をふさぎ、尾を持ち上げる。
近づくには、あれをしりぞけるしかない。
-> r_lake

=== boss_won ===
静けさが、山の底に満ちていく。
-> r_lake

=== boss_corpse ===
星喰いの背中で、星髄のすじは、まだあわく光を残している。
+ [とる] -> corpse_take
+ [うごく] -> corpse_move
+ [もちもの] -> show_bag(-> boss_corpse)

=== corpse_take ===
何をとる？
+ [星髄] -> take_marrow

=== take_marrow ===
白い剣の先で、背中の光るところから、固いかたまりをひとつ取り出した。
粉でも燃えかすでもない。薬師に言われたとおり、白い光を保った星髄だ。
-> ending_clear

=== corpse_move ===
どこへうごく？
+ [崩れた通路へ上る] -> r_b5_hub
+ [やめる] -> boss_corpse

// ---------------- 終端 ----------------

=== ending_clear ===
帰り道は、長いのぼり坂だった。
水門の部屋をわたり、上がった鉄格子をくぐり、水のひいた坑道をぬけて——入り口の光が見えたとき、ふくろの中の星髄は、まだあたたかかった。
{ ghost_met:
    広場の岩の上に、もう、ゆうれいのすがたは無かった。
}
星髄をひとかけら。約束どおり、生きて持ち帰った。村への道を歩き出した。
村にもどると、薬師が星髄をくだいて、薬をつくった。病気は、ゆっくりと治っていった。
-> END

=== game_over ===
ひざが折れ、ランプが手からはなれて、ころがった。明かりはどろを照らし、やがてゆれて、消えた。
星髄は、だれの手にもとどかないまま、山の底で白く燃えつづけている。
-> END
