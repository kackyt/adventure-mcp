# title: 星髄の坑道
// =====================================================================
//  星髄の坑道 v2 — サバイバル・RPG worked example (Issue #20)
//  探索×謎解き重心版。全編を固定コマンドパレットで統一する:
//    しらべる（固定物→事実のみ） / とる（携行品） / たたく（力を加える）
//    つかう（道具→対象） / うごく（場所） / もちもの（HP・薬草・装備） / はなす
//  設計規律:
//   - 完全決定論（RANDOM 不使用）
//   - 手がかりは事実のみ。答え・解法・「○○が効く」式の結論を本文に書かない
//   - 大目的は開幕で明示（星髄をひと欠片、生きて戻る）。中間目標は世界から読み取る
//   - 総当たり抑止 = 誤打・誤順の HP コスト（すべて予兆つき・決定論）
//   - 詰みは事前示唆ある選択の結果のみ。HP0 は必ず終端の敗北 ED
//  進行の背骨（謎）:
//   B2 ①排水: 三つの堰の敷居の高さを観察し、水の行き先が開くよう低い方から切る
//   B3 ③降り口: 剥がされた軌道の犬釘穴が行き止まりの壁の先へ続く矛盾
//   B4 ②見立て: 石片二枚を頭の中で重ねると一枚の絵になり、無印の壁を指す
//   B6 ボス: 捨て水路（水の行き先）を先に開けてから大水門を叩く=①の二段再演。
//            誤順は行き場のない水の逆流ダメージ。決着は星髄の刃（B4 の成果）
// =====================================================================

VAR player_hp = 20
VAR herb_count = 1
VAR depth = 1
LIST equipment = pickaxe, lantern, star_blade, shard_a, shard_b
LIST conditions = poisoned
VAR public_status = "player_hp, herb_count, equipment, conditions, depth"

// ---- 非公開の進行フラグ ----
VAR ghost_met = false
VAR rat_beaten = false
VAR crab_beaten = false
VAR aid_taken = false
VAR mud_herb_seen = false
VAR mud_herb_taken = false
// B2 堰（正順の進捗。誤順は backflow で全復元）
VAR gate_a = false
VAR gate_b = false
VAR gate_c = false
VAR gate_step = 0
VAR drained = false
// B3
VAR spider_beaten = false
VAR south_herb_taken = false
VAR rubble_shard_seen = false
VAR wall_opened = false
// B4
VAR met_the_thing = false
VAR forge_found = false
VAR blade_forged = false
VAR pit_herb_taken = false
// B5-B6
VAR guard_beaten = false
VAR spring_used = false
VAR spillway_open = false
VAR lake_drained = false
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
{ conditions ? poisoned:
    ~ player_hp = player_hp - dmg - 1
- else:
    ~ player_hp = player_hp - dmg
}

// ---------------- 共有: もちもの / つかう ----------------

=== show_bag(-> ret) ===
体力は {player_hp}／20。薬草が {herb_count} 束。
持ち物——{carries(pickaxe):つるはし。}{carries(lantern):カンテラ。}{carries(star_blade):星髄の刃。}{carries(shard_a):割れた石片。}{carries(shard_b):石片の片割れ。}{LIST_COUNT(equipment) == 0:めぼしい物は何もない。}
{conditions ? poisoned:毒が、まだ体の芯に痺れを残している。}
{ carries(shard_a) || carries(shard_b):
    -> bag_menu(ret)
- else:
    -> ret
}

=== bag_menu(-> ret) ===
+ {carries(shard_a)} [割れた石片を検める] -> bag_shard_a(ret)
+ {carries(shard_b)} [石片の片割れを検める] -> bag_shard_b(ret)
+ [戻る] -> ret

=== bag_shard_a(-> ret) ===
平たい石片。深い線が一本、大きく「く」の字に折れ曲がり、折れの内側には短い刻みがびっしりと並んでいる。
割れ口は右側で、鋭く途切れていた。
-> bag_menu(ret)

=== bag_shard_b(-> ret) ===
石片の片割れ。上の端から点が三つ、縦に並んで落ち、いちばん下で小さな丸に開いている。
割れ口は左側だ。
-> bag_menu(ret)

=== use_menu(-> ret) ===
何をつかう？
+ {herb_count > 0} [薬草（自分に）] -> use_herb(ret)
+ [やめる] -> ret

=== use_herb(-> ret) ===
~ herb_count = herb_count - 1
~ heal(6)
苦い薬草を噛む。傷の熱がすっと引いていく（体力 {player_hp}、薬草 {herb_count}）。
-> ret

// ---------------- 導入 ----------------

=== intro ===
流行り病が村を回っている。薬師は言った——薬の礎になるのは星髄、この山の廃坑の底で採れる、仄白く燃える鉱石だけだ、と。
坑夫たちが一夜で山を捨てて、十二年になる。理由を知る者はいない。
やることは決まっている。星髄をひと欠片、穿って、生きて戻る。それだけだ。
-> r_plaza

// ================= B1 一ノ坑（坑口） =================

=== r_plaza ===
~ depth = 1
坑口の広場。錆びた鉱車が軌道の上で朽ち、詰所と工具庫の戸が半開きのまま埃をかぶっている。
山肌に大きく坑口が開き、軌道が暗がりの奥へ続いていた。
坑口の脇の岩に、老いた坑夫がひとり腰かけている。
+ [しらべる] -> plaza_look
+ [たたく] -> plaza_hit
+ [うごく] -> plaza_move
+ [もちもの] -> show_bag(-> r_plaza)
+ {herb_count > 0} [つかう] -> use_menu(-> r_plaza)
+ [はなす] -> plaza_talk

=== plaza_look ===
何をしらべる？
+ [鉱車] -> look_minecart
+ [軌道] -> look_rails_b1
+ [老いた坑夫] -> look_ghost
+ [やめる] -> r_plaza

=== look_minecart ===
空の鉱車だ。縁に弁当箱が置きっぱなしになっている。開けると、食いかけの飯が干からびて石のようになっていた。
食べ終える間もなく、ここを離れたらしい。
-> plaza_look

=== look_rails_b1 ===
鉱車の軌道。枕木に太い犬釘が打たれ、レールをしっかり留めている。坑口の奥まで、点々と続いているのが見えた。
-> plaza_look

=== look_ghost ===
古い型の坑夫装束だ。よく見ると、体の向こうに岩肌がうっすら透けている。
-> plaza_look

=== plaza_hit ===
何をたたく？
+ [鉱車] -> hit_minecart
+ [やめる] -> r_plaza

=== hit_minecart ===
拳で叩くと、鈍い音が広場に響いた。錆が剥がれて落ちる。それだけだ。
-> plaza_hit

=== plaza_move ===
どこへうごく？
+ [詰所] -> r_office
+ [工具庫] -> r_toolshed
+ [坑口の中へ] -> r_east
+ [やめる] -> r_plaza

=== plaza_talk ===
{ not ghost_met:
    ~ ghost_met = true
    「星髄かね」老人は袋も見ずに言った。「止めはせん。わしらも掘った。ただな——下ノ坑にゃ、もう誰も降りん」
- else:
    老人は坑口の暗がりを眺めている。
}
+ [下ノ坑のことを聞く] -> talk_shimo
+ [坑夫たちのことを聞く] -> talk_lastday
+ [やめる] -> r_plaza

=== talk_shimo ===
「三ノ坑の、さらに下よ。いちばん良い髄が出た。わしが生きとった頃の話だがね」
老人はそれきり黙った。
-> plaza_talk

=== talk_lastday ===
「連中が出ていった朝のことは、上から見とったよ。誰も彼も、後ろを振り返り振り返り、走っていきよった」
「わしかね。わしは、そのずっと前からこうだ」
-> plaza_talk

// ---- 詰所 ----

=== r_office ===
詰所の中。帳場机に書類が積まれ、壁に大きな坑内図が貼られている。隅の棚に救急箱。
+ [しらべる] -> office_look
+ {not aid_taken} [とる] -> office_take
+ [うごく] -> office_move
+ [もちもの] -> show_bag(-> r_office)
+ {herb_count > 0} [つかう] -> use_menu(-> r_office)

=== office_look ===
何をしらべる？
+ [坑内図] -> look_map
+ [帳場机] -> look_desk
+ [救急箱] -> look_aid
+ [やめる] -> r_office

=== look_map ===
測量の行き届いた、きれいな図面だ。一ノ坑、二ノ坑、三ノ坑。三つの坑が引かれ、隅に会社の検印が押してある。
それで全部だった。
-> office_look

=== look_desk ===
給金の袋が、名札を付けたまま幾つも並んでいる。受け取りに戻った者は、ひとりもいなかったらしい。
-> office_look

=== look_aid ===
古い救急箱だ。中に、乾した薬草がひと束残っている。
-> office_look

=== office_take ===
何をとる？
+ {not aid_taken} [救急箱の薬草] -> take_aid
+ [やめる] -> r_office

=== take_aid ===
~ aid_taken = true
~ herb_count = herb_count + 1
薬草をひと束、袋に入れた（薬草 {herb_count}）。
-> r_office

=== office_move ===
どこへうごく？
+ [広場へ] -> r_plaza
+ [やめる] -> r_office

// ---- 工具庫 ----

=== r_toolshed ===
工具庫。道具掛けはほとんど空だが、まだ使えそうな物がいくつか残っている。
+ [しらべる] -> shed_look
+ {not carries(pickaxe) || not carries(lantern)} [とる] -> shed_take
+ [うごく] -> shed_move
+ [もちもの] -> show_bag(-> r_toolshed)
+ {herb_count > 0} [つかう] -> use_menu(-> r_toolshed)

=== shed_look ===
何をしらべる？
+ [道具掛け] -> look_toolrack
+ [やめる] -> r_toolshed

=== look_toolrack ===
つるはしが一本、カンテラがひとつ。どちらもまだ使える。油壺には油がなみなみ残っていた。
-> shed_look

=== shed_take ===
何をとる？
+ {not carries(pickaxe)} [つるはし] -> take_pickaxe
+ {not carries(lantern)} [カンテラ] -> take_lantern
+ [やめる] -> r_toolshed

=== take_pickaxe ===
~ equipment += pickaxe
つるはしを取った。手に馴染む重さだ。
-> shed_take

=== take_lantern ===
~ equipment += lantern
カンテラを取り、油を満たして火を入れた。
-> shed_take

=== shed_move ===
どこへうごく？
+ [広場へ] -> r_plaza
+ [やめる] -> r_toolshed

// ---- 一ノ坑・坑道 ----

=== r_east ===
~ depth = 1
一ノ坑。軌道に沿って、坑道がゆるやかに下っている。
{ not rat_beaten:
    行く手の暗がりで、何かが動いた。犬ほどもある坑鼠だ。牙を鳴らして、軌道の上に陣取っている。
- else:
    坑鼠の骸のわきを、軌道が奥へ続いている。奥に、二ノ坑への下り段が口を開けていた。
}
+ [しらべる] -> east_look
+ [たたく] -> east_hit
+ [うごく] -> east_move
+ [もちもの] -> show_bag(-> r_east)
+ {herb_count > 0} [つかう] -> use_menu(-> r_east)

=== east_look ===
何をしらべる？
+ [軌道] -> look_rails_east
+ {not rat_beaten} [坑鼠] -> look_rat
+ {rat_beaten} [下り段] -> look_descent1
+ [やめる] -> r_east

=== look_rails_east ===
犬釘はどれもしっかり打たれ、レールは奥の暗がりへ続いている。埃の下で、まだ鈍く光っていた。
-> east_look

=== look_rat ===
毛は禿げ、目は白く濁っている。だが牙は本物だ。近づけば飛びかかってくるだろう。
-> east_look

=== look_descent1 ===
木の段が下へ続いている。段板はまだしっかりしていた。
-> east_look

=== east_hit ===
何をたたく？
+ {not rat_beaten} [坑鼠] -> fight_rat
+ [岩肌] -> hit_rock_east
+ [やめる] -> r_east

=== hit_rock_east ===
叩くと硬い音が返り、坑道の奥へ長く吸い込まれていった。岩盤はびくともしない。
-> east_hit

=== fight_rat ===
{ carries(pickaxe):
    飛びかかってくる坑鼠を、つるはしの一撃で打ち据えた。骸が軌道の脇に転がる。だがすれ違いざま、牙が腕をかすめていた。
    ~ take_hit(2)
- else:
    素手で殴り合うはめになった。二度、三度——ようやく動かなくなったが、腕は噛み傷だらけだ。
    ~ take_hit(4)
}
~ rat_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_east

=== east_move ===
どこへうごく？
+ [広場へ] -> r_plaza
+ {rat_beaten} [二ノ坑へ下る] -> try_descend_b2
+ {not rat_beaten} [奥へ進む] -> east_blocked
+ [やめる] -> r_east

=== east_blocked ===
足を踏み出したとたん、坑鼠が身を低くして牙を剥いた。あれを何とかしないと、奥へは進めない。
-> r_east

=== try_descend_b2 ===
{ not carries(lantern):
    数段も降りないうちに、闇が壁のように立ちはだかった。明かりが無ければ、ここから先は一歩も進めない。
    -> r_east
- else:
    -> r_winch
}

// ================= B2 二ノ坑（水没坑） =================

=== r_winch ===
~ depth = 2
二ノ坑、巻揚場。カンテラの明かりが、巻揚機の太い胴と、床を這う軌道を照らし出す。
奥は水没している。黒い水面が、明かりを吸って揺れもしない。
壁際の小机に、帳面が開いたまま残されていた。
+ [しらべる] -> winch_look
+ [たたく] -> winch_hit
+ [うごく] -> winch_move
+ [もちもの] -> show_bag(-> r_winch)
+ {herb_count > 0} [つかう] -> use_menu(-> r_winch)

=== winch_look ===
何をしらべる？
+ [帳面] -> look_journal
+ [巻揚機] -> look_winch
+ [水面] -> look_water
+ [やめる] -> r_winch

=== look_journal ===
水番の当番日誌らしい。几帳面な字で、こうある。
「水は低きへ流れる。行き場のない水は、あふれて人を取る。堰を切る者は、水の行き先をまず考えよ」
最後の頁には走り書きがひとつ。「乙から切った馬鹿がいる。二人流された」
-> winch_look

=== look_winch ===
巻揚機の綱は、切れたのではなく、外して丁寧に巻き取ってある。仕舞い仕事だけは律儀にやってあるらしい。
-> winch_look

=== look_water ===
黒い水が、奥の坑道をまるごと呑んでいる。沈んだ軌道が、明かりの届く際で水に消えていた。
-> winch_look

=== winch_hit ===
何をたたく？
+ [巻揚機] -> hit_winch
+ [やめる] -> r_winch

=== hit_winch ===
胴を叩くと、うつろな音が長く尾を引いた。動かすには人手も蒸気も足りない。
-> winch_hit

=== winch_move ===
どこへうごく？
+ [一ノ坑へ上る] -> r_east
+ [堰の水路へ] -> r_gates
+ {drained} [水の引いた坑道へ] -> r_drained
+ {not drained} [水没した坑道へ] -> water_blocked
+ [やめる] -> r_winch

=== water_blocked ===
数歩も行かないうちに、冷たい水が膝を越えた。この先は、立っていられる深さでもない。
-> r_winch

// ---- 堰の水路（①排水の謎） ----

=== r_gates ===
堰の水路。岩を刻んだ水路に、木の堰が三つ並んで水をせき止めている。どの堰にも太い楔が打ち込まれ、札が掛かっていた。手前から、甲、乙、丙。
{ gate_step == 3:
    いまは三つとも開き、水はとうに流れ去った。空の水路が奥へ続いている。
}
+ [しらべる] -> gates_look
+ [たたく] -> gates_hit
+ [うごく] -> gates_move
+ [もちもの] -> show_bag(-> r_gates)
+ {herb_count > 0} [つかう] -> use_menu(-> r_gates)

=== gates_look ===
どれをしらべる？
+ [甲の堰] -> look_gate_a
+ [乙の堰] -> look_gate_b
+ [丙の堰] -> look_gate_c
+ [やめる] -> r_gates

=== look_gate_a ===
{ gate_a:
    開いた堰の奥で、水路の敷居が膝の高さに濡れて光っている。
- else:
    甲の堰。水路の敷居は膝の高さにある。楔は固いが、峰で叩けば外れそうだ。
}
-> gates_look

=== look_gate_b ===
{ gate_b:
    開いた堰の奥で、水路の敷居が胸の高さに見えている。
- else:
    乙の堰。水路の敷居は胸の高さにある。楔は固いが、峰で叩けば外れそうだ。
}
-> gates_look

=== look_gate_c ===
{ gate_c:
    開いた堰の奥で、水路の敷居が腰の高さに濡れている。
- else:
    丙の堰。水路の敷居は腰の高さにある。楔は固いが、峰で叩けば外れそうだ。
}
-> gates_look

=== gates_hit ===
どの堰の楔をたたく？
+ {not gate_a} [甲の堰] -> open_a
+ {not gate_b} [乙の堰] -> open_b
+ {not gate_c} [丙の堰] -> open_c
+ [やめる] -> r_gates

=== open_a ===
{ gate_step == 0:
    ~ gate_a = true
    ~ gate_step = 1
    楔が飛び、甲の堰が跳ね上がった。黒い水が渦を巻いて低い水路へ流れ込み、ごうごうと音を立てて落ちていく。
    -> r_gates
- else:
    -> backflow
}

=== open_b ===
{ gate_step == 2:
    ~ gate_b = true
    ~ gate_step = 3
    ~ drained = true
    最後の楔が飛んだ。乙の堰が上がり、残った水が低い水路へ素直に吸われていく。
    やがて音が止み、奥の坑道から、ひたひたと水の引いていく気配がした。
    -> r_gates
- else:
    -> backflow
}

=== open_c ===
{ gate_step == 1:
    ~ gate_c = true
    ~ gate_step = 2
    丙の堰が開く。水は先に開いた低い水路へ、順に落ちていった。
    -> r_gates
- else:
    -> backflow
}

=== backflow ===
楔が飛んだ瞬間、行き場を失った水が壁のようにせり上がり、こちらへ叩きつけてきた。
濁流に揉まれ、したたかに岩へ打ちつけられる。
~ take_hit(3)
{ player_hp <= 0: -> game_over }
水は堰という堰を叩き、外れかけた楔を元の座へ押し戻して、淀みへ収まっていった（体力 {player_hp}）。
~ gate_a = false
~ gate_b = false
~ gate_c = false
~ gate_step = 0
-> r_gates

=== gates_move ===
どこへうごく？
+ [巻揚場へ] -> r_winch
+ [やめる] -> r_gates

// ---- 水の引いた坑道 ----

=== r_drained ===
水の引いた坑道。床はまだぬかるみ、壁の高くまで水の痕が残っている。
泥に半ば埋まって、鉱車が一台横倒しになっていた。
{ not crab_beaten:
    ぬかるみの向こうで、泥をまとった大蟹が鋏を鳴らした。甲羅が岩のように厚い。
- else:
    奥に、三ノ坑への下り坑道が黒々と口を開けている。
}
+ [しらべる] -> drained_look
+ [たたく] -> drained_hit
+ {mud_herb_seen && not mud_herb_taken} [とる] -> drained_take
+ [うごく] -> drained_move
+ [もちもの] -> show_bag(-> r_drained)
+ {herb_count > 0} [つかう] -> use_menu(-> r_drained)

=== drained_look ===
何をしらべる？
+ [横倒しの鉱車] -> look_mudcart
+ [軌道] -> look_rails_b2
+ {not crab_beaten} [大蟹] -> look_crab
+ [やめる] -> r_drained

=== look_mudcart ===
泥をかき分けると、座席の下に油紙の包みが挟まっていた。固く縛ってあり、中身は無事のようだ。
~ mud_herb_seen = true
-> drained_look

=== look_rails_b2 ===
軌道は泥をかぶってもなお、まっすぐ奥の下り坑道へ続いている。犬釘の頭が、泥の下で規則正しく並んでいた。
-> drained_look

=== look_crab ===
甲羅は岩そのものだ。鋏の一撃は、当たりどころが悪ければ骨まで割るだろう。
-> drained_look

=== drained_hit ===
何をたたく？
+ {not crab_beaten} [大蟹] -> fight_crab
+ [横倒しの鉱車] -> hit_mudcart
+ [やめる] -> r_drained

=== hit_mudcart ===
叩いても、泥が跳ねるばかりだ。
-> drained_hit

=== fight_crab ===
{ carries(pickaxe):
    鋏をかいくぐり、つるはしを甲羅の継ぎ目へ打ち下ろす。二度目で罅が走り、三度目で大蟹は泥に沈んだ。鋏の一撃を、脛にもらっていた。
    ~ take_hit(3)
- else:
    素手では甲羅に爪も立たない。鋏に打ち払われ、泥に叩きつけられながら、どうにか目の間を殴りつけて仕留めた。
    ~ take_hit(6)
}
~ crab_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_drained

=== drained_take ===
何をとる？
+ {mud_herb_seen && not mud_herb_taken} [油紙の包み] -> take_mudherb
+ [やめる] -> r_drained

=== take_mudherb ===
~ mud_herb_taken = true
~ herb_count = herb_count + 1
包みを解くと、乾した薬草が出てきた（薬草 {herb_count}）。
-> r_drained

=== drained_move ===
どこへうごく？
+ [巻揚場へ] -> r_winch
+ {crab_beaten} [三ノ坑へ下る] -> r_b3_hub
+ {not crab_beaten} [奥の下り坑道へ] -> crab_blocked
+ [やめる] -> r_drained

=== crab_blocked ===
下り坑道へ近づいたとたん、大蟹が鋏を振りかぶって立ちはだかった。
-> r_drained

// ================= B3 三ノ坑（③降り口の謎） =================

=== r_b3_hub ===
~ depth = 3
三ノ坑。降り立った先で、坑道が三つに分かれている。
レールは東の坑道へだけ延びていて、南と西の口は暗い。
+ [しらべる] -> b3hub_look
+ [うごく] -> b3hub_move
+ [もちもの] -> show_bag(-> r_b3_hub)
+ {herb_count > 0} [つかう] -> use_menu(-> r_b3_hub)

=== b3hub_look ===
何をしらべる？
+ [レール] -> look_rails_b3
+ [南の口] -> look_south_mouth
+ [西の口] -> look_west_mouth
+ [やめる] -> r_b3_hub

=== look_rails_b3 ===
下り段の際からまっすぐ、東の坑道へ延びている。犬釘も枕木も、上の坑と同じ打ち方だ。
-> b3hub_look

=== look_south_mouth ===
南の口は狭い。床は素の岩のままで、レールを敷いた形跡はない。
-> b3hub_look

=== look_west_mouth ===
西の口は、東と同じくらい広い。だがレールは無い。
-> b3hub_look

=== b3hub_move ===
どこへうごく？
+ [東の坑道へ] -> r_east3
+ [南の坑道へ] -> r_south3
+ [西の坑道へ] -> r_west3
+ [二ノ坑へ上る] -> r_drained
+ [やめる] -> r_b3_hub

// ---- 東坑道（崩落・影蜘蛛・石片A） ----

=== r_east3 ===
東の坑道。レールの先で天井が破れ、崩れ落ちた岩が斜面をなして道を塞いでいる。
{ not spider_beaten:
    斜面の上、天井の破れ目に大きな影蜘蛛がうずくまり、こちらの明かりへじっと目を向けていた。
}
+ [しらべる] -> east3_look
+ [たたく] -> east3_hit
+ {rubble_shard_seen && not carries(shard_a)} [とる] -> east3_take
+ [うごく] -> east3_move
+ [もちもの] -> show_bag(-> r_east3)
+ {herb_count > 0} [つかう] -> use_menu(-> r_east3)

=== east3_look ===
何をしらべる？
+ [崩れた岩] -> look_rubble
+ {not spider_beaten} [影蜘蛛] -> look_spider
+ [やめる] -> r_east3

=== look_rubble ===
{ not spider_beaten:
    斜面へ近づいたとたん、頭上で糸の鳴る音がした。影蜘蛛が脚を立てている。これ以上は寄れない。
    -> east3_look
- else:
    石の大きさはばらばらで、天井の破れ目からいまも砂がこぼれている。浮いた岩も見える。
    { not rubble_shard_seen:
        ~ rubble_shard_seen = true
        岩の隙間に、平たい石片が挟まっていた。表面に、引っかき傷のような細い線が刻まれている。
    }
    -> east3_look
}

=== look_spider ===
胴だけで人の頭ほど——いや、それより大きい。糸は崩れた岩の斜面いちめんに張られている。
-> east3_look

=== east3_hit ===
何をたたく？
+ {not spider_beaten} [影蜘蛛] -> fight_spider
+ [崩れた岩] -> hit_rubble
+ [やめる] -> r_east3

=== fight_spider ===
{ carries(star_blade):
    仄白い刃が、糸ごと影蜘蛛を薙ぎ払った。ひと振りで胴が裂け、蜘蛛は斜面を転げ落ちる。飛び散った糸が腕を擦った。
    ~ take_hit(2)
- else:
    { carries(pickaxe):
        糸を払い、飛びかかる影蜘蛛へつるはしを叩き込む。二撃目で胴が裂け、蜘蛛は斜面を転げ落ちて動かなくなった。肩に、牙の痛みが残った。
        ~ take_hit(4)
    - else:
        素手で払った腕に牙が食い込む。長い揉み合いの末に石で叩き潰したが、体じゅうが傷だらけだ。
        ~ take_hit(8)
    }
}
~ spider_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_east3

=== hit_rubble ===
{ not spider_beaten:
    斜面へ踏み込む前に、影蜘蛛が糸を鳴らした。まずあれをどうにかするしかない。
    -> r_east3
- else:
    浮いた岩を叩いたとたん、天井の破れ目から石が降ってきた。
    ~ take_hit(2)
    { player_hp <= 0: -> game_over }
    崩落の斜面はかえって深くなった。この先は掘り抜けそうにない（体力 {player_hp}）。
    -> r_east3
}

=== east3_take ===
何をとる？
+ {rubble_shard_seen && not carries(shard_a)} [平たい石片] -> take_shard_a
+ [やめる] -> r_east3

=== take_shard_a ===
~ equipment += shard_a
石片を引き出した。割れ口が鋭い。傷のような線は、何かの模様の切れ端にも見える。
-> r_east3

=== east3_move ===
どこへうごく？
+ [分かれ道へ] -> r_b3_hub
+ [やめる] -> r_east3

// ---- 南坑道（探検坑・小報酬） ----

=== r_south3 ===
南の坑道。狭い探検坑らしく、数十歩でのっぺりとした岩の行き止まりに突き当たる。
天井からは、時おり砂がこぼれている。
+ [しらべる] -> south3_look
+ [たたく] -> south3_hit
+ {not south_herb_taken} [とる] -> south3_take
+ [うごく] -> south3_move
+ [もちもの] -> show_bag(-> r_south3)
+ {herb_count > 0} [つかう] -> use_menu(-> r_south3)

=== south3_look ===
何をしらべる？
+ [行き止まり] -> look_south_end
+ [道具袋] -> look_toolbag
+ [やめる] -> r_south3

=== look_south_end ===
掘りかけのまま放り出された岩盤だ。鑿の跡が途中で途切れている。床は素の岩で、何かを運び出した様子もない。
-> south3_look

=== look_toolbag ===
壁際に、置き忘れられた道具袋がある。中に乾した薬草がひと束、油紙にくるんで押し込んであった。
-> south3_look

=== south3_hit ===
何をたたく？
+ [行き止まり] -> hit_south_end
+ [やめる] -> r_south3

=== hit_south_end ===
一撃で、天井の砂がどっと肩へ落ちてきた。続けて拳ほどの石がひとつ、二つ。
~ take_hit(2)
{ player_hp <= 0: -> game_over }
岩盤には罅ひとつ入っていない（体力 {player_hp}）。
-> r_south3

=== south3_take ===
何をとる？
+ {not south_herb_taken} [道具袋の薬草] -> take_south_herb
+ [やめる] -> r_south3

=== take_south_herb ===
~ south_herb_taken = true
~ herb_count = herb_count + 1
薬草を袋に移した（薬草 {herb_count}）。
-> r_south3

=== south3_move ===
どこへうごく？
+ [分かれ道へ] -> r_b3_hub
+ [やめる] -> r_south3

// ---- 西坑道（剥がされた軌道・埋め戻しの壁） ----

=== r_west3 ===
西の坑道。広さは東と変わらないのに、レールも枕木も無い。
{ not wall_opened:
    突き当たりは壁だ。
- else:
    突き当たりの石積みは崩れ、その先に下りの坑道が黒々と口を開けている。
}
+ [しらべる] -> west3_look
+ [たたく] -> west3_hit
+ [うごく] -> west3_move
+ [もちもの] -> show_bag(-> r_west3)
+ {herb_count > 0} [つかう] -> use_menu(-> r_west3)

=== west3_look ===
何をしらべる？
+ [床] -> look_west_floor
+ [行き止まりの壁] -> look_west_wall
+ [やめる] -> r_west3

=== look_west_floor ===
埃の下に、四角い小さな穴が二列、規則正しく並んでいる。穴の列は、行き止まりの壁の際までまっすぐ続いていた。
-> west3_look

=== look_west_wall ===
{ not wall_opened:
    大きさの揃った石が、隙間なく積み上げてある。積み口の埃は、まわりの岩肌と同じくらい古い。
- else:
    崩した石積みの向こうで、レールの残骸が下りの闇へ落ち込んでいる。
}
-> west3_look

=== west3_hit ===
何をたたく？
+ {not wall_opened} [行き止まりの壁] -> open_wall
+ [やめる] -> r_west3

=== open_wall ===
~ wall_opened = true
振り下ろした一撃で、積まれた石があっけなく揺らいだ。岩盤を穿つのとは、まるで手応えが違う。
石と石の隙間から、冷たい風が噴き出してくる。夢中で崩していくと——下りの坑道が現れた。
折れたレールの残骸が、闇の奥へ落ち込んでいる。
-> r_west3

=== west3_move ===
どこへうごく？
+ [分かれ道へ] -> r_b3_hub
+ {wall_opened} [下ノ坑へ降りる] -> r_b4_hub
+ [やめる] -> r_west3

// ================= B4 下ノ坑（②見立ての謎・初遭遇・炉） =================

=== r_b4_hub ===
~ depth = 4
{ not met_the_thing:
    -> b4_meet
}
下ノ坑の辻。折れたレールが暗がりに散らばり、坑道が幾筋にも分かれている。
どの壁も黒く湿り、天井のあちこちで岩が浮いていた。遠くで、水の落ちる重い音がしている。
+ [しらべる] -> b4hub_look
+ [たたく] -> b4hub_hit
+ [うごく] -> b4hub_move
+ [もちもの] -> show_bag(-> r_b4_hub)
+ {herb_count > 0} [つかう] -> use_menu(-> r_b4_hub)

=== b4_meet ===
~ met_the_thing = true
降り立った瞬間、闇の奥で何かが身じろぎした。
カンテラの明かりの際を、岩のような背がゆっくりと横切っていく。大きい。坑道いっぱいの、途方もない大きさだ。
仄白い光の筋が、その背の上で脈打つように明滅していた。
+ [たたく] -> meet_hit
+ [うごく（物陰へ退く）] -> meet_wait

=== meet_hit ===
つるはしを渾身の力で打ち込んだ。
——手応えが、まるでない。刃は岩とも肉ともつかぬ背を滑り、柄から腕まで痺れが走った。
巨体がわずかに揺れ、尾のようなものが薙ぎ払われる。壁に叩きつけられた。
~ take_hit(3)
{ player_hp <= 0: -> game_over }
巨体はそれきり興味を失ったように岩の裂け目へ滑り込み、底の方で重い水音が響いた（体力 {player_hp}）。
-> r_b4_hub

=== meet_wait ===
息を殺す。巨体はこちらへ一瞥もくれず、岩の裂け目へゆっくりと滑り込んでいった。
しばらくして、底の方から重い水音が響いた。
-> r_b4_hub

=== b4hub_look ===
何をしらべる？
+ [折れたレール] -> look_b4_rails
+ [岩の裂け目] -> look_crevice
+ [やめる] -> r_b4_hub

=== look_b4_rails ===
レールは折られ、ねじれ、そこらじゅうに散らばっている。壊したのは人の手ではなさそうだ。
-> b4hub_look

=== look_crevice ===
あの巨体が滑り込んでいった裂け目だ。人ひとり通れない幅なのに、あれが消えていった。
覗き込むと、はるか底に黒い水がかすかに光っている。
-> b4hub_look

=== b4hub_hit ===
何をたたく？
+ [壁] -> hit_b4hub_wall
+ [やめる] -> r_b4_hub

=== hit_b4hub_wall ===
一撃で、浮いていた天井の岩がばらばらと降ってきた。
~ take_hit(2)
{ player_hp <= 0: -> game_over }
壁は硬い岩盤のままだ（体力 {player_hp}）。
-> r_b4_hub

=== b4hub_move ===
どこへうごく？
+ [祠の間へ] -> r_shrine
+ [旧作業場へ] -> r_gallery
+ [瘴気の坑道へ] -> r_pit
+ {forge_found} [炉の間へ] -> r_forge
+ [さらに下る] -> r_b5_hub
+ [三ノ坑へ上る] -> r_west3
+ [やめる] -> r_b4_hub

// ---- 祠の間（石片B） ----

=== r_shrine ===
祠の間。岩を穿った小さな祠に、摩耗した山ノ神の像が据えられている。
壁には深い亀裂が走り、天井の岩は罅で網の目に浮いて、いまにも剥がれ落ちそうだ。
像の前の台座に、干からびた供え物の椀と、平たい石片がひとつ載っていた。
+ [しらべる] -> shrine_look
+ {not carries(shard_b)} [とる] -> shrine_take
+ [たたく] -> shrine_hit
+ [うごく] -> shrine_move
+ [もちもの] -> show_bag(-> r_shrine)
+ {herb_count > 0} [つかう] -> use_menu(-> r_shrine)

=== shrine_look ===
何をしらべる？
+ [山ノ神の像] -> look_god
+ [台座の石片] -> look_shard_b
+ [やめる] -> r_shrine

=== look_god ===
顔は磨り減って読めない。ただ、両手で何かを胸に抱えこむ形だけが残っている。
-> shrine_look

=== look_shard_b ===
{ carries(shard_b):
    台座には、石片の載っていた跡だけが埃に残っている。
- else:
    供え物と並べて、わざわざ台座に置いてある。細い線の刻まれた、平たい石片だ。
}
-> shrine_look

=== shrine_take ===
何をとる？
+ {not carries(shard_b)} [台座の石片] -> take_shard_b
+ [やめる] -> r_shrine

=== take_shard_b ===
~ equipment += shard_b
石片を手に取った。上の端から点が三つ縦に落ち、いちばん下で小さな丸に開いている。割れ口は左側だ。
-> r_shrine

=== shrine_hit ===
何をたたく？
+ [壁] -> hit_shrine_wall
+ [やめる] -> r_shrine

=== hit_shrine_wall ===
一撃の反動で、祠の天井から石くずが降った。
~ take_hit(2)
{ player_hp <= 0: -> game_over }
岩盤は罅ひとつ入らない（体力 {player_hp}）。
-> r_shrine

=== shrine_move ===
どこへうごく？
+ [辻へ] -> r_b4_hub
+ [やめる] -> r_shrine

// ---- 旧作業場（見立ての指す一点） ----

=== r_gallery ===
旧作業場。広い岩室の壁際で、軌道の残骸が大きく「く」の字に曲がって途切れている。
天井の罅から水がひと筋、糸を引いて落ち、床の窪みに小さな水たまりを作っていた。
{ forge_found:
    曲がりの内側の壁は崩れ落ち、奥に炉の間が覗いている。
}
+ [しらべる] -> gallery_look
+ [たたく] -> gallery_hit
+ [うごく] -> gallery_move
+ [もちもの] -> show_bag(-> r_gallery)
+ {herb_count > 0} [つかう] -> use_menu(-> r_gallery)

=== gallery_look ===
何をしらべる？
+ [軌道の残骸] -> look_bent_rail
+ [水たまり] -> look_drip
+ [壁] -> look_gallery_wall
+ [やめる] -> r_gallery

=== look_bent_rail ===
壁際で大きく折れ曲がったまま、途切れている。曲がりの内側は、ちょうど水たまりを抱え込む形だ。
-> gallery_look

=== look_drip ===
天井から点々と、滴が糸を引いて落ちている。窪みの水は澄んでいて、底に岩粉が薄く沈んでいた。
-> gallery_look

=== look_gallery_wall ===
{ forge_found:
    崩れた壁の奥に、小さな部屋が続いている。
- else:
    見たところ、ほかと変わらない岩壁だ。
}
-> gallery_look

=== gallery_hit ===
何をたたく？
+ {not forge_found} [壁] -> open_forge
+ [やめる] -> r_gallery

=== open_forge ===
~ forge_found = true
曲がりの内側へ、一撃。
乾いた音が、ほかの岩とは違って高く抜けた。二撃目で壁面がまとめて剥がれ落ちる——石積みの表に岩粉を塗り込め、岩肌に見せかけてあったのだ。
その奥に、小さな部屋が口を開けていた。
-> r_gallery

=== gallery_move ===
どこへうごく？
+ [辻へ] -> r_b4_hub
+ {forge_found} [炉の間へ] -> r_forge
+ [やめる] -> r_gallery

// ---- 炉の間（鍛刀） ----

=== r_forge ===
炉の間。ふいごも金床も埃をかぶっているが、火床だけが生きていた。
炭の代わりに仄白い欠片が積まれ、静かに燃えている。熱はないのに、金床の上の空気だけが陽炎のように揺れていた。
+ [しらべる] -> forge_look
+ [たたく] -> forge_hit
+ [つかう] -> forge_use
+ [うごく] -> forge_move
+ [もちもの] -> show_bag(-> r_forge)

=== forge_look ===
何をしらべる？
+ [火床] -> look_hearth
+ [金床] -> look_anvil
+ [やめる] -> r_forge

=== look_hearth ===
仄白い欠片が、燃え尽きもせず燃え続けている。星髄だ。あの巨体の背で明滅していた光と、同じ色をしている。
-> forge_look

=== look_anvil ===
使い込まれた金床だ。表面に、刃物を打った細かい傷が無数に残っている。ここで何かを、繰り返し鍛えた者がいる。
-> forge_look

=== forge_hit ===
何をたたく？
+ [金床] -> hit_anvil
+ [やめる] -> r_forge

=== hit_anvil ===
高く澄んだ音が、炉の間いっぱいに鳴り渡った。
-> forge_hit

=== forge_use ===
何をつかう？
+ {carries(pickaxe) && not blade_forged} [つるはし（火床に）] -> forge_blade
+ {herb_count > 0} [薬草（自分に）] -> use_herb(-> r_forge)
+ [やめる] -> r_forge

=== forge_blade ===
~ equipment -= pickaxe
~ equipment += star_blade
~ blade_forged = true
つるはしの頭を、仄白い火床へ沈める。
打ち直すまでもなかった。髄の火が金属に絡みつき、吸い込まれるように染みていく。
引き上げた刃先には、光の脈がひと筋。闇の中で、ほのかに燃えている。
-> r_forge

=== forge_move ===
どこへうごく？
+ [旧作業場へ] -> r_gallery
+ [やめる] -> r_forge

// ---- 瘴気の坑道（リスク選択） ----

=== r_pit ===
瘴気の坑道。むっとする臭いが奥から漂い、カンテラの炎が心なし細る。
明かりの届く奥に、崩れた薬箱がいくつも積まれているのが見えた。
+ [しらべる] -> pit_look
+ {not pit_herb_taken} [とる] -> pit_take
+ [うごく] -> pit_move
+ [もちもの] -> show_bag(-> r_pit)
+ {herb_count > 0} [つかう] -> use_menu(-> r_pit)

=== pit_look ===
何をしらべる？
+ [薬箱] -> look_pitbox
+ [やめる] -> r_pit

=== look_pitbox ===
ここからでも、油紙の包みが幾つも覗いているのが分かる。だが薬箱までの奥半分は、臭いがひときわ濃い。
取りに行くなら、あの淀みを抜けることになる。
-> pit_look

=== pit_take ===
何をとる？
+ {not pit_herb_taken} [薬箱の薬草（奥へ踏み込む）] -> take_pit_herb
+ [やめる] -> r_pit

=== take_pit_herb ===
~ pit_herb_taken = true
~ herb_count = herb_count + 2
~ conditions += poisoned
息を止めて駆け込み、包みを二つ掴んで駆け戻った。
それでも足りなかった。喉の奥が焼け、体の芯にじんと痺れが残っている（薬草 {herb_count}）。
-> r_pit

=== pit_move ===
どこへうごく？
+ [辻へ] -> r_b4_hub
+ [やめる] -> r_pit

// ================= B5 崩落回廊（小関門・泉） =================

=== r_b5_hub ===
~ depth = 5
崩落回廊。天井の半分が落ち、行く手を岩の山が塞いでいる。
岩の山の裾を、細い水の流れが壁際の隙間へと吸い込まれていた。
{ not guard_beaten:
    岩山の手前に、岩そっくりの甲殻をまとった獣がうずくまっている。息をするたび、殻の継ぎ目が仄かに開いた。
}
脇道の奥から、かすかに水の湧く音がする。
+ [しらべる] -> b5_look
+ [たたく] -> b5_hit
+ [うごく] -> b5_move
+ [もちもの] -> show_bag(-> r_b5_hub)
+ {herb_count > 0} [つかう] -> use_menu(-> r_b5_hub)

=== b5_look ===
何をしらべる？
+ [岩の山] -> look_rockpile
+ [水の流れ] -> look_b5_water
+ {not guard_beaten} [甲殻の獣] -> look_guard
+ [やめる] -> r_b5_hub

=== look_rockpile ===
崩れたばかりのように角の立った岩ばかりだ。上のほうの岩は、どれも浮いてぐらついている。
-> b5_look

=== look_b5_water ===
細い流れは岩山を避け、壁際の低い隙間へ迷いなく吸い込まれていく。水が通るなら、その先に道がある。
-> b5_look

=== look_guard ===
甲殻は岩と見分けがつかない。ただ、殻の継ぎ目だけが、息に合わせて開いたり閉じたりしている。
-> b5_look

=== b5_hit ===
何をたたく？
+ {not guard_beaten} [甲殻の獣] -> fight_guard
+ [やめる] -> r_b5_hub

=== fight_guard ===
{ carries(star_blade):
    躍りかかる獣の、開いた殻の継ぎ目へ、仄白い刃を差し込む。刃は吸い込まれるように通り、獣はひと声も立てず崩れ落ちた。振り抜きざま、殻の角が腕を裂いていた。
    ~ take_hit(2)
- else:
    { carries(pickaxe):
        つるはしを何度打ち込んでも、殻に弾かれる。長い消耗戦の末、ようやく継ぎ目を割ったときには、こちらも満身創痍だった。
        ~ take_hit(7)
    - else:
        素手で挑む相手ではなかった。踏み潰され、突き上げられ、それでも殻の継ぎ目に石を打ち込んで、どうにか動きを止めた。
        ~ take_hit(12)
    }
}
~ guard_beaten = true
{ player_hp <= 0: -> game_over }
（体力 {player_hp}）
-> r_b5_hub

=== b5_move ===
どこへうごく？
+ [脇道の奥へ] -> r_spring
+ {guard_beaten} [岩の山を乗り越えて下る] -> climb_rockpile
+ {guard_beaten} [水の吸い込まれる隙間を抜ける] -> through_gap
+ {not guard_beaten} [先へ進む] -> guard_blocked
+ [下ノ坑の辻へ戻る] -> r_b4_hub
+ [やめる] -> r_b5_hub

=== guard_blocked ===
一歩踏み出したとたん、岩と見えた甲殻がぬっと持ち上がった。あれを退けない限り、先へは進めない。
-> r_b5_hub

=== climb_rockpile ===
浮いた岩に手をかけたとたん、足元から山が崩れた。岩と一緒に転げ落ちる。
~ take_hit(3)
{ player_hp <= 0: -> game_over }
したたかに打った体を起こすと、崩れた岩の先に下りの道が続いていた（体力 {player_hp}）。
-> r_lake

=== through_gap ===
水の流れに身を伏せ、壁際の隙間をくぐり抜ける。
流れの導くまま、下りの道へ出た。
-> r_lake

// ---- 泉 ----

=== r_spring ===
岩の窪みに、澄んだ泉が湧いている。底で仄白い砂がゆっくりと巻き上がり、水は淡く光って見えた。
+ [しらべる] -> spring_look
+ [つかう] -> spring_use
+ [うごく] -> spring_move
+ [もちもの] -> show_bag(-> r_spring)

=== spring_look ===
何をしらべる？
+ [泉] -> look_spring
+ [やめる] -> r_spring

=== look_spring ===
{ spring_used:
    あれきり、水の光は失せてしまった。いまはただの湧き水だ。
- else:
    水底の砂は、炉の火床と同じ色に光っている。手を浸すと、指先の擦り傷がすっと軽くなった。
}
-> spring_look

=== spring_use ===
何をつかう？
+ {not spring_used} [泉の水（浴びる）] -> bathe_spring
+ {herb_count > 0} [薬草（自分に）] -> use_herb(-> r_spring)
+ [やめる] -> r_spring

=== bathe_spring ===
~ spring_used = true
~ player_hp = 20
~ conditions -= poisoned
頭から水をかぶる。傷という傷から熱が抜け、体の芯の痺れまで溶けて流れた（体力 {player_hp}）。
水の光は、それきり薄れていった。
-> r_spring

=== spring_move ===
どこへうごく？
+ [崩落回廊へ] -> r_b5_hub
+ [やめる] -> r_spring

// ================= B6 最深部（地底湖・星喰らい） =================

=== r_lake ===
~ depth = 6
最深部。坑道が尽き、黒い地底湖がひろがっている。
{ not lake_drained:
    湖の中ほどで、仄白い光の筋が水越しにゆっくりと明滅している。あれだ。水の底で、眠るように蟠っている。
    湖の際には石の縁が組まれ、対岸寄りに大きな水門がひとつ。堰と同じ、太い楔で締めてあった。
    岸に沿っては乾いた捨て水路が下りの裂け目まで続き、その口元を小さな門が締めている。
- else:
    水の引いた湖底の泥の上に、あれが横たわっている。岩のような巨体の背で、星髄の筋が忙しなく明滅していた。
}
+ [しらべる] -> lake_look
+ [たたく] -> lake_hit
+ [うごく] -> lake_move
+ [もちもの] -> show_bag(-> r_lake)
+ {herb_count > 0} [つかう] -> use_menu(-> r_lake)

=== lake_look ===
何をしらべる？
+ {not lake_drained} [地底湖] -> look_lake
+ {not lake_drained} [大水門] -> look_sluice
+ {not lake_drained} [捨て水路の門] -> look_spillway
+ {lake_drained && not boss_beaten} [あれ] -> look_boss
+ [やめる] -> r_lake

=== look_lake ===
水は深い。岸から石を投げても、あの巨体までは届きそうにない。
水面は、対岸の水門の方へごくゆっくりと流れている。
-> lake_look

=== look_sluice ===
湖の水位を保つための水門らしい。楔は太いが、打ち方は堰と同じだ。
門のこちら側に、水の逃げ場はない。足元の岸辺は、湖面とほとんど同じ高さだ。
-> lake_look

=== look_spillway ===
{ spillway_open:
    開いた門の底を、湖の水が細い糸になって走り、裂け目へ落ちていく。
- else:
    乾いた水路が、岸に沿って下りの裂け目まで続いている。敷居は湖面より低い。口元の門は小さく、楔もひとまわり細い。
}
-> lake_look

=== look_boss ===
泥に半ば沈んだ巨体が、緩慢に身をよじっている。水を失って、動きは鈍い。
背の光の筋は、炉の火床と同じ色で明滅していた。
-> lake_look

=== lake_hit ===
何をたたく？
+ {not lake_drained && not spillway_open} [捨て水路の門] -> open_spillway
+ {not lake_drained} [大水門] -> break_sluice
+ {not lake_drained} [あれ（水の中の）] -> hit_boss_in_water
+ {lake_drained && not boss_beaten} [あれ] -> fight_boss
+ [やめる] -> r_lake

=== hit_boss_in_water ===
岸から得物を振っても、水を叩くだけだ。巨体は水の底で、身じろぎひとつしない。
-> r_lake

=== open_spillway ===
~ spillway_open = true
細い楔は、ひと打ちで飛んだ。小さな門が開き、湖の水が細い糸になって乾いた水路を走り、裂け目へ落ちていく。
この細さでは、湖は痩せもしない。だが——水の行き先は、これでできた。
-> r_lake

=== break_sluice ===
{ spillway_open:
    ~ lake_drained = true
    楔へ、渾身の一撃。水門が軋みを上げて開き、黒い水が轟音とともに捨て水路へ雪崩れ込み、裂け目へ抜けていく。
    みるみる水位が下がっていく。やがて泥の湖底があらわれ——あれが、水を失って横たわっていた。
- else:
    楔へ、渾身の一撃。門が軋んで開きかけ——行き場のない水が、真っ先にこちらの岸へ噴き返した。
    水の壁に薙ぎ倒され、石の縁へ叩きつけられる。
    ~ take_hit(4)
    { player_hp <= 0: -> game_over }
    水圧が、開きかけた門を元の座へ押し戻していった（体力 {player_hp}）。
}
-> r_lake

=== fight_boss ===
{ carries(star_blade):
    { not boss_wounded:
        ~ boss_wounded = true
        泥を蹴って駆け寄り、仄白い刃を光の筋へ叩き込む。刃は今度こそ深々と食い込み、巨体が坑道を揺らして暴れた。薙ぎ払われた尾をまともに受ける。
        ~ take_hit(4)
        { player_hp <= 0: -> game_over }
        それでも、手の中の刃は確かな手応えを残している（体力 {player_hp}）。
        -> r_lake
    - else:
        ~ boss_beaten = true
        のたうつ巨体の、明滅の根元へ。最後の一撃を、体ごと沈み込ませた。
        光の筋がひときわ強く燃え上がり——ふつりと、消えた。
        巨体は泥に沈み込み、動かなくなった。
        -> boss_won
    }
- else:
    得物を打ち込む。だが手応えが、まるでない。岩とも肉ともつかぬ体は、刃という刃を滑らせてしまう。
    お返しとばかりに薙ぎ払われた尾が、胴を打った。
    ~ take_hit(6)
    { player_hp <= 0: -> game_over }
    退くなら、いまのうちだ（体力 {player_hp}）。
    -> r_lake
}

=== lake_move ===
どこへうごく？
+ [崩落回廊へ上る] -> r_b5_hub
+ {boss_beaten} [骸のもとへ] -> boss_corpse
+ [やめる] -> r_lake

=== boss_won ===
静けさが、坑の底に満ちていく。
-> r_lake

=== boss_corpse ===
骸の背で、星髄の筋はまだ淡く光を残している。
+ [とる] -> corpse_take
+ [うごく] -> corpse_move
+ [もちもの] -> show_bag(-> boss_corpse)

=== corpse_take ===
何をとる？
+ [星髄] -> take_marrow

=== take_marrow ===
刃の先で、光の筋からひと欠片を穿ち取った。掌の上で、仄白い炎が静かに燃えている。
-> ending_clear

=== corpse_move ===
どこへうごく？
+ [崩落回廊へ上る] -> r_b5_hub
+ [やめる] -> boss_corpse

// ---------------- 終端 ----------------

=== ending_clear ===
帰り道は、長い上り坂だった。
堰の水路を渡り、崩した石積みをくぐり、干上がった坑道を抜けて——坑口の光が見えたとき、袋の中の欠片はまだ温かかった。
{ ghost_met:
    広場の岩の上に、もう老人の姿はなかった。
}
星髄をひと欠片。約束どおり、生きて持ち帰った。村への道を歩き出した。
-> END

// ---------------- 終端 ----------------

=== game_over ===
膝が落ち、カンテラが手を離れて転がった。明かりが泥を照らし、やがて揺れて、消えた。
星髄は、また誰の手にも届かぬまま、坑の底で仄白く燃え続けている。
-> END
