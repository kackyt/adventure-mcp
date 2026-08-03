# title: 海辺の研究所からの脱出

VAR place = "海側の客室"
VAR public_status = "place"

LIST Inventory = waxed_cord, copper_tool, curved_glass, ceramic_piece, brass_sleeve, notched_brass, optical_glass
VAR bag = ()

VAR locker_entry = ""

VAR shutter_parts_seen = false
VAR high_loop_seen = false
VAR shutter_open = false
VAR rigged_tool = false
VAR mural_parts_seen = false
VAR mural_fact_seen = false
VAR grate_parts_seen = false
VAR grate_target_seen = false
VAR grate_moved = false
VAR cord_exposed = false
VAR dock_door_parts_seen = false

VAR locker_seen = false
VAR locker_open = false
VAR ceramic_exposed = false
VAR rack_seen = false
VAR curved_exposed = false
VAR ledger_seen = false
VAR ledger_clue_seen = false
VAR bench_seen = false

VAR east_bed_seen = false
VAR south_bed_seen = false
VAR west_bed_seen = false
VAR north_bed_seen = false
VAR trellis_seen = false
VAR copper_exposed = false
VAR tank_seen = false
VAR cage_pulled = false

VAR pump_seen = false
VAR priming_seen = false
VAR manifold_seen = false
VAR valve_controls_seen = false
VAR gauge_seen = false
VAR lift_seen = false
VAR curved_installed = false
VAR ceramic_installed = false
VAR pump_prepared = false
VAR valve_count = 0
VAR valve_first = 0
VAR valve_second = 0
VAR valve_third = 0
VAR valve_fourth = 0
VAR pressure_raised = false
VAR lift_open = false

VAR lamp_seen = false
VAR drum_seen = false
VAR counterweight_seen = false
VAR pin_seen = false
VAR glazing_seen = false
VAR optical_installed = false
VAR cord_installed = false
VAR sleeve_installed = false
VAR pin_released = false
VAR beam_set = false
VAR socket_open = false
VAR release_armed = false

VAR bell_seen = false
VAR clamps_seen = false
VAR sleeve_exposed = false
VAR lever_seen = false
VAR plate_seen = false
VAR plate_clue_seen = false
VAR parapet_seen = false
VAR notched_installed = false
VAR cradle_release = false

-> prologue

=== function carries(item) ===
~ return bag ? item

=== prologue ===
海辺の研究所からの脱出

海に突き出た古い植物研究所。使われなくなった今も、客室や仕事場には道具が残っている。
あなたは、建物のいたみを調べに来た。ところが外の桟橋がくずれ、それをきっかけに大きな鉄の戸が閉じた。電気は止まり、海水にさえぎられて歩いて帰ることもできない。
図面には、鐘の形をした一人乗りの脱出船があると書かれていた。昼の光は屋根の光の塔から入っている。残った道具としかけを調べ、鐘を海へ出すしかない。
+ [つぎへ] -> v1_hub

=== v1_hub ===
~ place = "海側の客室"
海側の客室。海側の窓には厚い板があり、壁には天井近くまで白い塩のあとがついている。
北の壁には大きな鉄の戸がある。反対側には建物と川の地図、床には四角い水ぬきふたがある。東の鐘の発進台へ出る海への扉は開いている。
{ shutter_open:
    大きな鉄の戸は天井まで上がり、作業室への道が開いている。
- else:
    大きな鉄の戸が、作業室への道をふさいでいる。
}
+ [しらべる] -> v1_look
+ [とる] -> v1_take
+ [つかう] -> use_menu
+ [おす・うごかす] -> v1_move_things
+ [もちもの] -> inventory
+ [ばしょいどう] -> v1_travel

=== v1_look ===
何をしらべる？
+ [大きな鉄の戸] -> v1_look_shutter
+ [建物と川の地図] -> v1_look_mural
+ [床の水ぬきふた] -> v1_look_grate
+ [海への扉] -> v1_look_dock_door
+ {shutter_parts_seen} [鉄の戸の高い輪] -> v1_look_high_loop
+ {shutter_parts_seen} [鉄の戸の両わきの溝] -> v1_look_shutter_rail
+ {mural_parts_seen} [地図の東西南北] -> v1_look_compass
+ {mural_parts_seen} [地図のまっすぐな線] -> v1_look_meridian
+ {grate_parts_seen} [水ぬきふたの四角い穴] -> v1_look_grate_slot
+ {grate_parts_seen} [水ぬきふたのつなぎ目] -> v1_look_grate_hinge
+ {dock_door_parts_seen} [海への扉のゴムわく] -> v1_look_door_seal
+ {dock_door_parts_seen} [海への扉わきの丸い窓] -> v1_look_return_window
+ [やめる] -> return_to_place

=== v1_look_shutter ===
~ shutter_parts_seen = true
大きな鉄の戸は、桟橋のくずれを見張るひもが切れると、自分の重さで落ちる作りだ。電気で閉じたわけではない。
戸の上近くに、手で開け直すためらしい輪が下がっている。戸の両わきの溝には砂と塩がつまっているが、戸は折れていない。
-> v1_look

=== v1_look_high_loop ===
~ high_loop_seen = true
高い所の輪は、頭よりずっと上にある。背のびをしても指が届かない。
輪は細い。下へ引いたまま、手前にも引き続ける必要がある。短い棒を引っかけるだけでは、重さがかかったときに外れそうだ。
-> v1_look

=== v1_look_shutter_rail ===
戸の両わきの溝にある塩を指でくずす。上から引く力があれば、戸はこの溝を通って上がりそうだ。
戸の下には、上がった戸を止める金具が見える。一度上まで上げれば、また落ちる心配はなさそうだ。
-> v1_look

=== v1_look_mural ===
~ mural_parts_seen = true
建物と川の地図には、研究所、温室、川、海岸が上から見た形でえがかれている。
上には東西南北の印がある。中央には金色の金属でできたまっすぐな一本線があり、川が海へ出る所には「始まり」の印と、丸く回る矢印がある。
-> v1_look

=== v1_look_compass ===
~ mural_fact_seen = true
地図は北が上だ。川は図の右、東で海へ出ている。その場所に「始まり」と書かれている。
「始まり」の印から、丸い矢印の向きへ時計回りに読んでいく作りだ。
-> v1_look

=== v1_look_meridian ===
地図の中央には、南北を結ぶ一本線と、切れこみのある板を置くような四角い穴がある。
ただし穴は浅く、これは形と向きを見せる見本のようだ。同じ印のある本物のしかけを探す必要がありそうだ。
-> v1_look

=== v1_look_grate ===
~ grate_parts_seen = true
床の水ぬきふたは四角い。片側が塩で床にくっついている。ふちには横長の四角い穴があり、反対側のつなぎ目には、前に持ち上げたようなあとがある。
ふたの下には浅い水の通り道がある。ふたをずらせれば、手が入りそうだ。
-> v1_look

=== v1_look_grate_slot ===
~ grate_target_seen = true
横長の穴は、丸い棒ではなく、四角い形の筒を入れるためのようだ。内側には、前に何かを差して動かしたこすれあとがある。
指では穴が浅すぎて、ふたを動かす力をかけられない。
-> v1_look

=== v1_look_grate_hinge ===
ふたのつなぎ目はさびているが、こわれてはいない。床にくっついた側を少し持ち上げて横へ押せば、開きそうだ。
-> v1_look

=== v1_look_dock_door ===
~ dock_door_parts_seen = true
海への扉は外へ開く。高い波も届きにくい場所にあり、わくには太いゴムがついている。わきには、二本の細い管を見る丸い窓がある。
扉の向こうに鐘の発進台が見える。ここだけは今も行き来できる。
-> v1_look

=== v1_look_door_seal ===
扉のゴムわくは乾いている。ここから海水が入ったあともない。
帰り道をふさいでいるのは、この扉ではない。くずれた桟橋と、作業室への大きな鉄の戸だ。
-> v1_look

=== v1_look_return_window ===
丸い窓の向こうに、細い金属の管が二本ある。一方は建物の中へ、もう一方は鐘の発進台の下へ続いている。
どちらの管にも、今は水が動いている様子がない。
-> v1_look

=== v1_take ===
何をとる？
* {cord_exposed && not carries(waxed_cord)} [水をはじく細いひも] -> take_waxed_cord
+ [やめる] -> return_to_place

=== take_waxed_cord ===
~ bag += waxed_cord
水の通り道から、黒い細いひもを引き出した。表面に水をはじく油がしみこませてあり、ぬれてもゆるみにくい。
-> result_to_place

=== v1_move_things ===
何をおす・うごかす？
+ [大きな鉄の戸] -> v1_push_shutter
+ [床の水ぬきふた] -> v1_push_grate
+ [海への扉] -> v1_push_dock_door
+ [やめる] -> return_to_place

=== v1_push_shutter ===
{ shutter_open:
    大きな鉄の戸は、上の金具で止まっている。手で押しても落ちてこない。
- else:
    戸の下へ肩を入れても動かない。上の輪を引き、左右を同じように持ち上げる作りだ。
}
-> result_to_place

=== v1_push_grate ===
{ grate_moved:
    床の水ぬきふたは横へずれたままだ。下の浅い水の通り道まで見える。
- else:
    両手で押しても、塩で床にくっついた側が動かない。横長の四角い穴に、形の合う物を差して動かす必要がある。
}
-> result_to_place

=== v1_push_dock_door ===
海への扉は風に押し返されるが、つなぎ目は動く。押し開けば鐘の発進台へ出られる。
-> result_to_place

=== v1_travel ===
どこへばしょいどうする？
+ [温室へ] -> v3_hub
+ [鐘の発進台へ] -> v6_hub
+ [作業室へ] -> v1_try_v2
+ [やめる] -> return_to_place

=== v1_try_v2 ===
{ shutter_open:
    上がった鉄の戸の下をくぐり、作業室へ入る。
    ~ place = "作業室"
    -> result_to_place
- else:
    大きな鉄の戸が道をふさいでいる。高い所の輪を下へ引かなければ通れない。
    -> result_to_place
}

=== v2_hub ===
~ place = "作業室"
作業室。長い台には乾いた海草がつき、壁ぎわには四けたロッカー、ガラス道具の棚、革の表紙の点検ノートが並んでいる。
窓下の水洗い台は白い塩をかぶっている。奥の扉の先には、ポンプ室へ下りる短い階段がある。
{ locker_open:
    四けたロッカーは開いている。中には浅い皿が一つある。
}
+ [しらべる] -> v2_look
+ [とる] -> v2_take
+ [つかう] -> use_menu
+ [おす・うごかす] -> v2_move_things
+ [もちもの] -> inventory
+ [ばしょいどう] -> v2_travel

=== v2_look ===
何をしらべる？
+ [四けたロッカー] -> v2_look_locker
+ [ガラス道具の棚] -> v2_look_rack
+ [点検ノート] -> v2_look_ledger
+ [窓下の水洗い台] -> v2_look_bench
+ {locker_seen} [ロッカーの数字の輪] -> v2_look_locker_dials
+ {locker_seen} [ロッカーのレバー] -> v2_look_locker_handle
+ {rack_seen} [棚の曲がった受け台] -> v2_look_glass_cradle
+ {rack_seen} [棚の留め金] -> v2_look_rack_clips
+ {ledger_seen} [ノートの順番メモ] -> v2_look_ledger_order
+ {ledger_seen} [ノートの確認印] -> v2_look_ledger_stamps
+ {bench_seen} [水洗い台の小皿] -> v2_look_sample_trays
+ [やめる] -> return_to_place

=== v2_look_locker ===
~ locker_seen = true
四けたロッカーには、横に並んだ四つの数字の輪と、決めた番号を試すレバーがある。
注意書きには「0から9の数字で、ちょうど四けた」とある。まちがえても中がこわれる作りではなく、何度でも試せる。
-> v2_look

=== v2_look_locker_dials ===
四つの数字の輪は左から右へ並ぶ。どの輪にも0から9までがあり、欠けた数字はない。
よく使われた数字も、すりへっていて分からない。四つの数字を決めてレバーを動かすしかない。
-> v2_look

=== v2_look_locker_handle ===
ロッカーのレバーは、四つの数字を中へ伝えるだけの物だ。鍵穴も、別の開け口もない。
番号がちがえば、中の留め具が止まり、また最初から試せる作りだ。
-> v2_look

=== v2_look_rack ===
~ rack_seen = true
ガラス道具の棚は、空の場所と、割れた道具ばかりだ。中央には細い曲がった管を置く受け台があり、奥だけ留め金で守られている。
受け台には、管を同じ曲がりのまま置くための布が残っている。
-> v2_look

=== v2_look_glass_cradle ===
布を上げると、棚の奥に曲がったガラス管が一本あった。両端は欠けておらず、太さも同じだ。
取れるように、手前へすべらせておく。
~ curved_exposed = true
-> v2_look

=== v2_look_rack_clips ===
棚の留め金は、道具が落ちないための物だ。片側はすでに外れているので、棚をこわす必要はない。
-> v2_look

=== v2_look_ledger ===
~ ledger_seen = true
点検ノートには、温室へ水を送るしかけと、鐘の発進台を動かすしかけの記録がある。
ページのはしに順番のメモがあり、最後には担当した人の確認印が並んでいる。
-> v2_look

=== v2_look_ledger_order ===
~ ledger_clue_seen = true
ノートの順番メモに、短い引きつぎが残っている。
「作業室のすぐ後は、必ず温室。管の中に空気を残さないこと」
四つの場所の名は、建物の中の表示と同じ書き方だ。
-> v2_look

=== v2_look_ledger_stamps ===
確認印は月ごとに形がちがうが、どれも同じ四つの場所を回っている。
ほかのページは水でにじんでいる。順番について読める文は、これだけだ。
-> v2_look

=== v2_look_bench ===
~ bench_seen = true
窓下の水洗い台には、浅い小皿が四枚と、つまった水ぬき口がある。皿には、水がかわいた白い輪が残っている。
植物を水で洗い、番号ごとに並べた場所らしい。
-> v2_look

=== v2_look_sample_trays ===
小皿の裏には植物の名前だけが書かれている。ロッカーの番号や、四つの場所の順番を示す印はない。
白い輪も、水がかわいたあとに見える。わざとつけた印ではなさそうだ。
-> v2_look

=== v2_take ===
何をとる？
* {curved_exposed && not carries(curved_glass)} [曲がったガラス管] -> take_curved_glass
* {ceramic_exposed && not carries(ceramic_piece)} [白い焼き物の部品] -> take_ceramic_piece
+ [やめる] -> return_to_place

=== take_curved_glass ===
~ bag += curved_glass
曲がったガラス管を布ごと取り出した。中は乾いており、両端もなめらかだ。
-> result_to_place

=== take_ceramic_piece ===
~ bag += ceramic_piece
ロッカーの皿から、白い焼き物の部品を取った。割れたかけらではなく、片面が丸いくぼみに合う形で焼かれている。
-> result_to_place

=== v2_move_things ===
何をおす・うごかす？
+ {locker_seen} [四けたロッカー] -> v2_locker_controls
+ [ガラス道具の棚] -> v2_push_rack
+ {bench_seen} [水洗い台の水ぬき口] -> v2_push_drain
+ [やめる] -> return_to_place

=== v2_locker_controls ===
四けたロッカーをどうする？
+ [番号を入力する] -> locker_input
+ [レバーだけを動かす] -> v2_locker_handle_only
+ [やめる] -> return_to_place

=== locker_input ===
四つの数字の輪に、0から9の数字でちょうど四けたを入力する。 # input: locker_entry
+ [入力を確定する] -> locker_check

=== locker_check ===
{ locker_entry == "3174":
    { locker_open:
        ロッカーはすでに開いている。
    - else:
        四つの輪が止まると、中で金具がそろう音がした。レバーが奥まで動き、扉が静かに開く。
        中の浅い皿には、白い焼き物の部品が一つ置かれている。
        ~ locker_open = true
        ~ ceramic_exposed = true
    }
    -> result_to_place
- else:
    レバーが途中で止まり、数字の輪が小さくゆれて元へ戻る。中は変わっていない。別の番号なら、また試せる。
    -> result_to_place
}

=== v2_locker_handle_only ===
数字を決めずにレバーを引いても、途中で止まる。四つの数字をそろえてから試す必要がある。
-> result_to_place

=== v2_push_rack ===
ガラス道具の棚を押すと、壁の金具が鳴る。棚は壁に留められていて、裏へ動かせない。
-> result_to_place

=== v2_push_drain ===
水洗い台の水ぬき口は塩で固まっている。押しても水はなく、乾いた音がするだけだ。
-> result_to_place

=== v2_travel ===
どこへばしょいどうする？
+ [海側の客室へ] -> v1_hub
+ [ポンプ室へ] -> v4_hub
+ [やめる] -> return_to_place

=== v3_hub ===
~ place = "温室"
温室。中央の床に、東西南北を示す大きな丸い板がある。Nの矢印は北の壁をまっすぐ指している。海側の客室からの入口は南西にある。
丸い板の東、南、西、北に、土の入った四角い花だんが一つずつある。中央にはつる棚、北東のすみには腰の高さの水そうがある。
{ pressure_raised && not cage_pulled:
    水そうの中で、コルクのうきにつながったかごが、水面近くまで上がっている。
}
{ cage_pulled:
    水そうのかごは、こちらのふちまで引き寄せられている。
}
+ [しらべる] -> v3_look
+ [とる] -> v3_take
+ [つかう] -> use_menu
+ [おす・うごかす] -> v3_move_things
+ [もちもの] -> inventory
+ [ばしょいどう] -> v3_travel

=== v3_look ===
何をしらべる？
+ [北の奥の花だん] -> v3_look_north_bed
+ [東の壁ぎわの花だん] -> v3_look_east_bed
+ [南の入口側の花だん] -> v3_look_south_bed
+ [西の壁ぎわの花だん] -> v3_look_west_bed
+ [中央のつる棚] -> v3_look_trellis
+ [北東すみの水そう] -> v3_look_tank
+ {trellis_seen} [つる棚の小物入れ] -> v3_look_repair_pocket
+ {trellis_seen} [つる棚の銅線] -> v3_look_trellis_ties
+ {tank_seen} [水そうのコルクのうき] -> v3_look_float
+ {tank_seen} [水そうのかご用レール] -> v3_look_cage_guide
+ {pressure_raised} [水面近くのかご] -> v3_look_raised_cage
+ [やめる] -> return_to_place

=== v3_look_east_bed ===
~ east_bed_seen = true
東を示すEの先、温室の東の壁ぎわにある花だんだ。ふちの板には大きく「３」とある。
土には、かわいた草の根が残っている。数字は、この花だんの番号らしい。
-> v3_look

=== v3_look_south_bed ===
~ south_bed_seen = true
南を示すSの先、入口に近い南の花だんだ。ふちの板には大きく「１」とある。
土はかわいて割れ、低い水ぬき口が南の壁へ続いている。
-> v3_look

=== v3_look_west_bed ===
~ west_bed_seen = true
西を示すWの先、温室の西の壁ぎわにある花だんだ。ふちの板には大きく「７」とある。
日かげを好む植物の札が残り、ほかの花だんより土が深い。
-> v3_look

=== v3_look_north_bed ===
~ north_bed_seen = true
北を示すNの先、温室の北の奥にある花だんだ。ふちの板には大きく「４」とある。
屋根から落ちた小さなガラス片が土の上で光っているが、花だんの数字ははっきり読める。
-> v3_look

=== v3_look_trellis ===
~ trellis_seen = true
中央のつる棚は銅線で組まれ、かれたつるが巻きついている。腰くらいの高さに、ふたのついた小物入れがある。
何本かの銅線は曲がっているが、棚はぐらついていない。
-> v3_look

=== v3_look_repair_pocket ===
つる棚の小物入れを開ける。中には、先が浅く曲がった短い銅の棒が一本ある。
持つ所に、細いひもを結ぶ穴がある。曲がった先を輪やかごにかけて、手前へ引くための道具だ。
~ copper_exposed = true
-> v3_look

=== v3_look_trellis_ties ===
つる棚の銅線は、棚を立てておくための物だ。外すと棚が倒れそうなので、持ち出せない。
-> v3_look

=== v3_look_tank ===
~ tank_seen = true
北東の水そうは、腰の高さまである丸い入れ物だ。水面には大きなコルクのうきがあり、内側にはかご用の細いレールが見える。底の管はポンプ室へ続く。
{ pressure_raised:
    下の管から水が入り、水面が上がっている。コルクのうきとかごも、レールにそって水面近くまで上がった。
- else:
    水は少なく、コルクのうきもかごも低い所にある。
}
-> v3_look

=== v3_look_float ===
大きなコルクのうきは、下のかごと細い金属の棒でつながっている。底の管から水が入れば、うきといっしょにかごも上がる作りだ。
コルクはまだ水にうきそうだ。
-> v3_look

=== v3_look_cage_guide ===
かご用のレールは水そうの底から上へ続くが、最後は手前のふちから少し遠い。
かごが上がっても、手だけでは届きにくい。先が曲がった細い道具なら、かごの輪にかけて引き寄せられそうだ。
-> v3_look

=== v3_look_raised_cage ===
水面近くのかごには、ふたがある。その内側に、切れこみのある金属板と、三角の厚いガラスが、別々の帯で留められている。
かごは向こう側で止まり、腕だけでは手前のふちまで寄せられない。
-> v3_look

=== v3_take ===
何をとる？
* {copper_exposed && not carries(copper_tool)} [先が曲がった銅の棒] -> take_copper_tool
* {cage_pulled && not carries(notched_brass)} [切れこみのある金属板] -> take_notched_brass
* {cage_pulled && not carries(optical_glass)} [三角の厚いガラス] -> take_optical_glass
+ [やめる] -> return_to_place

=== take_copper_tool ===
~ bag += copper_tool
先が曲がった銅の棒を取った。先は丸く、物を切る形ではない。輪やかごを引き寄せるための形だ。
-> result_to_place

=== take_notched_brass ===
~ bag += notched_brass
帯を外し、切れこみのある金属板を取った。片側には、地図と同じまっすぐな一本線がある。
-> result_to_place

=== take_optical_glass ===
~ bag += optical_glass
もう一方の帯を外し、三角の厚いガラスを取った。光を曲げるための部品らしい。
-> result_to_place

=== v3_move_things ===
何をおす・うごかす？
+ [東の花だん] -> v3_push_east_bed
+ [中央のつる棚] -> v3_push_trellis
+ [水そう] -> v3_push_tank
+ [やめる] -> return_to_place

=== v3_push_east_bed ===
東の花だんは床に留められている。押しても番号の板が鳴るだけで、場所は動かない。
-> result_to_place

=== v3_push_trellis ===
つる棚はぐらついていない。無理に動かすと、棚を支える銅線をいためるだけだ。
-> result_to_place

=== v3_push_tank ===
{ pressure_raised:
    水そうの下から水が入り続けている。水そうをゆらすより、上がったかごの輪を手前へ引くほうがよい。
- else:
    水そうは床に留められている。底の管から水が来なければ、うきもかごも上がらない。
}
-> result_to_place

=== v3_travel ===
どこへばしょいどうする？
+ [海側の客室へ] -> v1_hub
+ [やめる] -> return_to_place

=== v4_hub ===
~ place = "ポンプ室"
ポンプ室。中央に手押しポンプと水入れがある。壁ぎわには、四つの場所ボタンがついた箱と、水圧メーターが並んでいる。
北の壁には、光の塔へ上がる一人用リフトがある。
{ not lift_open:
    リフトの扉は閉じ、下にある太い押し棒も下がっている。
}
{ pump_prepared:
    ポンプの二つの足りなかった所はふさがっている。水入れから水を送れる状態だ。
}
{ pressure_raised:
    水圧メーターの針は緑の場所で止まり、リフトの扉は開いている。温室へ続く管から、水の流れる音がする。
}
+ [しらべる] -> v4_look
+ [とる] -> v4_take
+ [つかう] -> use_menu
+ [おす・うごかす] -> v4_move_things
+ [もちもの] -> inventory
+ [ばしょいどう] -> v4_travel

=== v4_look ===
何をしらべる？
+ [手押しポンプ] -> v4_look_pump
+ [水入れ] -> v4_look_priming
+ [場所ボタンの箱] -> v4_look_manifold
+ [水圧メーター] -> v4_look_gauge
+ [光の塔へのリフト] -> v4_look_lift
+ {pump_seen} [ポンプの曲がった管のあき] -> v4_look_glass_union
+ {pump_seen} [ポンプの白い丸いあき] -> v4_look_ceramic_seat
+ {priming_seen} [水入れの回し棒] -> v4_look_crank
+ {priming_seen} [水入れの下の口] -> v4_look_inlet
+ {manifold_seen} [四つの場所ボタン] -> v4_look_valves
+ {manifold_seen} [水のもどり管] -> v4_look_manifold_return
+ {lift_seen} [リフトの下の太い押し棒] -> v4_look_ram
+ {lift_seen} [リフト扉の留め具] -> v4_look_lift_lock
+ [やめる] -> return_to_place

=== v4_look_pump ===
~ pump_seen = true
手押しポンプは青みがかった金属でできている。取っ手を押すと、中の棒も動く。
{ curved_installed:
    水が出る側には曲がったガラス管が入り、となりの口までつないでいる。
- else:
    水が出る側は、曲がった管が一本なくなり、皮の輪がついた二つの口が空いている。
}
{ ceramic_installed:
    水を入れる側の白い丸いあきには、白い焼き物の部品が入っている。
- else:
    水を入れる側の白い丸いあきから、丸くふさぐ部品がなくなっている。
}
どちらも道具を使わず、形の合う部品をはめられそうだ。
-> v4_look

=== v4_look_glass_union ===
{ curved_installed:
    入れたガラス管の両端を、皮の輪がすき間なく囲んでいる。曲がった管は、となりの口まで届いている。
- else:
    二つの口には、透明な管を入れる皮の輪が残っている。まっすぐな管では二つの口をつなげない。決まった形に曲がった管が必要だ。
}
-> v4_look

=== v4_look_ceramic_seat ===
{ ceramic_installed:
    白い丸いあきには、白い焼き物の部品が入り、ばねの輪で押さえられている。
- else:
    白い丸いあきは、部品がなく、水を止められない。金属の板ではすき間ができる。丸いあきと同じ形の焼き物が必要だ。
}
-> v4_look

=== v4_look_priming ===
~ priming_seen = true
水入れには、少しだけ水が残っている。横の回し棒は、金属の棒でポンプにつながっている。
下の口からポンプへ水を送り、中の空気を外へ出すための物だ。
-> v4_look

=== v4_look_crank ===
水入れの回し棒は、この部屋に取りつけられた物で、持ち歩けない。持つ所と棒は、なめらかに動く。
ポンプの二つのあきを直してから回せば、中へ水を送れそうだ。
-> v4_look

=== v4_look_inlet ===
水入れの下の口には、少し藻がついているが、ふさがってはいない。残った水は、一度動かすには足りそうだ。
-> v4_look

=== v4_look_manifold ===
~ manifold_seen = true
四つの場所ボタンには、それぞれ館内の場所の名が書かれている。
上の列は左から作業室、光の塔。下の列は左から温室、鐘の発進台だ。どのボタンも同じ形で、押すたびに中のしかけが一回動く。
~ valve_controls_seen = true
-> v4_look

=== v4_look_valves ===
四つの場所ボタンは、どれも今すぐ押せる。同じボタンを続けて押すこともでき、押すたびに一回として中に記録される。
四回押すと、中のしかけが動く。決められた順なら水の道が開いたままになり、ちがえば四つとも元へ戻る。四回目までは、順が合っているか分からない。
-> v4_look

=== v4_look_manifold_return ===
水のもどり管は、鐘の発進台と温室へ分かれている。一度水の力がかかれば、管の中の金具が水をもどりにくくする。
-> v4_look

=== v4_look_gauge ===
~ gauge_seen = true
水圧メーターには、白、緑、赤の三つの場所がある。白は力が弱く、緑はしかけを動かせる強さ、赤はあぶない強さだ。
今の針は0を指している。わきの札には「四つをひと回りさせ、緑で止める」とある。
-> v4_look

=== v4_look_lift ===
~ lift_seen = true
光の塔へ上がる一人用リフトだ。扉は留め具で閉じ、下の太い押し棒も下がっている。
電気のモーターはない。ポンプ室から水の力が来ると、太い押し棒が上がり、扉を開けながらリフトを塔の上へ押し上げる。
-> v4_look

=== v4_look_ram ===
リフトの下の太い押し棒に、大きな傷はない。まわりから液体がもれている様子もない。
水の力が来ていないため、下がっているだけだ。ここへ別の部品をつける場所はない。
-> v4_look

=== v4_look_lift_lock ===
リフト扉の留め具は、下の太い押し棒とつながっている。手で開ける取っ手や鍵穴はなく、水の力が来るまで開かない。
-> v4_look

=== v4_take ===
何をとる？
+ [やめる] -> return_to_place

=== v4_move_things ===
何をおす・うごかす？
+ {priming_seen} [水入れの回し棒] -> v4_turn_crank
+ {valve_controls_seen} [四つの場所ボタン] -> valve_menu
+ {lift_seen} [光の塔へのリフトの扉] -> v4_push_lift
+ {pump_seen} [手押しポンプの取っ手] -> v4_push_pump_handle
+ [やめる] -> return_to_place

=== v4_turn_crank ===
{ pump_prepared:
    回し棒を回す。水入れの水が曲がったガラス管を通り、白い部品が水のもどりを止める。ポンプの中から空気がぬけ、四つの場所ボタンの奥まで水が届いている。
- else:
    { curved_installed && ceramic_installed:
        回し棒を回す。水入れの水が曲がったガラス管を通り、白い部品が水のもどりを止める。ポンプの中から空気がぬけ、四つの場所ボタンの奥まで水が届いた。
        ~ pump_prepared = true
    - else:
        回し棒を回すが、水は足りない所からもれて、ポンプの中にたまらない。
        { not curved_installed:
            曲がった管がないため、水が出る側の二つの口の間で水が切れる。
        }
        { not ceramic_installed:
            白い部品がないため、水を入れる側から水入れへ水がもどる。
        }
    }
}
-> result_to_place

=== v4_push_lift ===
{ lift_open:
    リフトの扉は開いている。乗りこめる。
- else:
    リフトの扉は留め具で閉じている。下の太い押し棒へ、水の力がまだ来ていない。
}
-> result_to_place

=== v4_push_pump_handle ===
{ pump_prepared:
    手押しポンプの取っ手を一度押すと、水の入った中身から重い手ごたえが返る。次は四つの場所ボタンを使う必要がある。
- else:
    手押しポンプの取っ手は軽すぎる。中に水がたまらず、空気だけがぬけている。
}
-> result_to_place

=== valve_menu ===
どの場所ボタンをおす？
+ [作業室] -> valve_press(2)
+ [光の塔] -> valve_press(1)
+ [温室] -> valve_press(3)
+ [鐘の発進台] -> valve_press(4)
+ [やめる] -> return_to_place

=== valve_press(which) ===
{ not pump_prepared:
    ボタンを押す。奥で乾いた音が一度するが、水が届いていないので記録されない。
    -> result_to_place
}
~ valve_count = valve_count + 1
{
- valve_count == 1:
    ~ valve_first = which
- valve_count == 2:
    ~ valve_second = which
- valve_count == 3:
    ~ valve_third = which
- else:
    ~ valve_fourth = which
}
{ valve_count < 4:
    ボタンが入り、奥から毎回同じ音が一度返る。
    -> result_to_place
}
{ valve_first == 1 && valve_second == 2 && valve_third == 3 && valve_fourth == 4:
    -> pressure_success
- else:
    四回目の音がする。中のしかけがひと回りしたあと、四つのボタンは全部元へ戻った。何もこわれていないので、また四回試せる。
    ~ valve_count = 0
    ~ valve_first = 0
    ~ valve_second = 0
    ~ valve_third = 0
    ~ valve_fourth = 0
    -> result_to_place
}

=== pressure_success ===
~ valve_count = 0
~ valve_first = 0
~ valve_second = 0
~ valve_third = 0
~ valve_fourth = 0
{ pressure_raised:
    四つのボタンはすでに働いている。水圧メーターの針は緑の場所から動かない。
    -> result_to_place
}
四回目の音のあと、奥で大きな金具がかかった。手押しポンプの取っ手がゆっくり押し返され、水圧メーターの針が緑の場所まで上がった。
北の壁では、リフトの下の太い押し棒が上がり、扉が開いた。同時に、温室へ向かう管から水の走る音がした。
~ pressure_raised = true
~ lift_open = true
-> result_to_place

=== v4_travel ===
どこへばしょいどうする？
+ [作業室へ] -> v2_hub
+ [光の塔へ] -> v4_try_v5
+ [やめる] -> return_to_place

=== v4_try_v5 ===
{ lift_open:
    開いたリフトに乗る。水の力で上がったリフトから、光の塔へ降りる。
    ~ place = "光の塔"
    -> result_to_place
- else:
    光の塔へのリフトは閉じている。ポンプ室から水の力を送らなければ上がれない。
    -> result_to_place
}

=== v5_hub ===
~ place = "光の塔"
光の塔。天井のガラスから昼の光が入っている。その下に、光を送る鏡、細いひもを巻く車、くさりでつながった大きな石が並ぶ。鏡の手前には、手で動かす大きな輪がある。
{ beam_set:
    光を送る鏡は東を向き、鐘の発進台へ細い光を送り続けている。遠くにある鐘の黒い板が光って見える。
- else:
    { optical_installed:
        三角の厚いガラスは、鏡の三角の受け台に留められている。
    - else:
        鏡の三角の受け台は空だ。
    }
    { sleeve_installed:
        鏡の横のぼうには、四角い穴の金属筒がかぶさっている。
    - else:
        鏡の横のぼうは、白い塩で固くなっている。
    }
    { cord_installed:
        ひもを巻く車には、水をはじく細いひもが巻かれている。
    - else:
        ひもを巻く車の細いみぞは空だ。
    }
    { pin_released:
        くさり付きのピンは外れ、つり合い用の石は動ける。
    - else:
        つり合い用の石は下がったまま、くさり付きのピンで止められている。
    }
}
+ [しらべる] -> v5_look
+ [とる] -> v5_take
+ [つかう] -> use_menu
+ [おす・うごかす] -> v5_move_things
+ [もちもの] -> inventory
+ [ばしょいどう] -> v5_travel

=== v5_look ===
何をしらべる？
+ [光を送る鏡] -> v5_look_lamp
+ [ひもを巻く車] -> v5_look_drum
+ [つり合い用の石] -> v5_look_counterweight
+ [天井のガラス] -> v5_look_glazing
+ {lamp_seen} [鏡の三角の受け台] -> v5_look_lens_holder
+ {lamp_seen} [鏡の横のぼう] -> v5_look_axle
+ {lamp_seen} [鏡の向きを見る輪] -> v5_look_sight
+ {drum_seen} [ひも車の細いみぞ] -> v5_look_drum_groove
+ {drum_seen} [ひも車のひも留め] -> v5_look_drum_eye
+ {counterweight_seen} [石を止めるくさり付きピン] -> v5_look_pin
+ {counterweight_seen} [石からのびるひも] -> v5_look_weight_line
+ {glazing_seen} [まぶしさをへらす板] -> v5_look_shade
+ [やめる] -> return_to_place

=== v5_look_lamp ===
~ lamp_seen = true
光を送る鏡は、天井から入る光を細くして、東の鐘の発進台へ送る道具だ。三角の受け台、横のぼう、向きを見る輪が一つにつながっている。
{ optical_installed:
    三角の受け台には、三角の厚いガラスが留められている。
- else:
    三角の受け台は空だ。
}
{ sleeve_installed:
    横のぼうには四角い穴の金属筒がかぶさり、手を切らずに力をかけられる。
- else:
    横のぼうは塩で固い。先は四角く、前に筒をかぶせたようなこすれあとがある。
}
-> v5_look

=== v5_look_lens_holder ===
鏡の受け台は三角で、厚い物を入れる深さがある。光を細くする部品を置く場所らしい。
三つの留め具はこわれていない。形の合う物なら、押しこむだけで止まりそうだ。
-> v5_look

=== v5_look_axle ===
鏡の横のぼうの先は細く、四角い。直接回すと手を切りそうで、塩のせいで動きも重い。
四角い穴のある丈夫な筒をかぶせれば、手を守りながら力をかけられそうだ。
-> v5_look

=== v5_look_sight ===
鏡の向きを見る輪の先に、脱出用の鐘の上が小さく見える。鐘の肩には黒い板があり、その下には金色の金属のふたがある。
鏡が動けば、光は黒い板へ届きそうだ。
-> v5_look

=== v5_look_drum ===
~ drum_seen = true
ひもを巻く車は、鏡を向けた角度で止めるための物だ。端には、ひもを結ぶ小さな穴がある。
{ cord_installed:
    細いみぞには水をはじく細いひもが巻かれ、車は回した場所で止まる。
- else:
    細いみぞは空だ。車だけを回しても、手を放すと元へもどる。細くてのびにくいひもを巻き、端の穴に結ぶ必要がある。
}
-> v5_look

=== v5_look_drum_groove ===
ひもを巻くみぞは細く、太いなわは入らない。細いひもを何回か巻ける広さだ。
-> v5_look

=== v5_look_drum_eye ===
ひも留めには、水をはじく油の古いあとがある。前にも、ぬれてものびにくい細いひもが使われていたようだ。
-> v5_look

=== v5_look_counterweight ===
~ counterweight_seen = true
つり合い用の石は、鏡の重さをささえるための物だ。石からのびるひもは、ひもを巻く車へ続いている。
{ pin_released:
    くさり付きのピンは穴から抜け、わきに下がっている。石の重さを、石からのびるひもへかけられる。
- else:
    つり合い用の石は床近くにあり、くさり付きのピンで止められている。
}
-> v5_look

=== v5_look_pin ===
~ pin_seen = true
石を止めるくさり付きピンは、手で押して抜ける物だ。ただし石の重さがかかっている。肩で石を少し持ち上げれば、動かせそうだ。
抜いたあとも、ピンはくさりでぶら下がるので、なくならない。
-> v5_look

=== v5_look_weight_line ===
石からのびるひもは切れていない。ピンを外し、ひもを巻く車が回した場所で止まれば、石の重さで鏡をなめらかに動かせそうだ。
-> v5_look

=== v5_look_glazing ===
~ glazing_seen = true
天井のガラスは何枚か白くくもっているが、昼の光は十分に入る。南側には、目に強い光が入らないよう小さな板がある。
電灯ではなく、昼だけ鏡を使う作りだったようだ。
-> v5_look

=== v5_look_shade ===
まぶしさをへらす板は、作業する人の目を守る物だ。鏡から鐘へ向かう光はさえぎっていない。
-> v5_look

=== v5_take ===
何をとる？
+ [やめる] -> return_to_place

=== v5_move_things ===
何をおす・うごかす？
+ {pin_seen} [石を止めるくさり付きピン] -> v5_move_pin
+ [鏡の大きな輪] -> v5_operate_lamp
+ {drum_seen} [ひもを巻く車] -> v5_push_drum
+ {glazing_seen} [まぶしさをへらす板] -> v5_push_shade
+ [やめる] -> return_to_place

=== v5_move_pin ===
{ pin_released:
    くさり付きのピンは外れ、わきに下がっている。つり合い用の石は動ける。
- else:
    肩でつり合い用の石を少し持ち上げ、くさり付きのピンを押し抜く。ピンはくさりに下がり、石の重さがひもへかかった。
    ~ pin_released = true
}
-> result_to_place

=== v5_operate_lamp ===
{ beam_set:
    鏡の大きな輪を確かめる。鏡は東を向いたまま、鐘の黒い板へ細い光を送り続けている。
    -> result_to_place
}
鏡の大きな輪に力をかける。
{ not optical_installed:
    三角の受け台が空なので、天井からの光が広がったままだ。
}
{ not cord_installed:
    ひもを巻く車の細いみぞが空なので、鏡を動かしても元へもどる。
}
{ not sleeve_installed:
    横のぼうは塩で固く、手を守りながら回すための物もついていない。
}
{ not pin_released:
    つり合い用の石は、くさり付きのピンで止まったままだ。鏡の重さをささえられない。
}
{ not (optical_installed && cord_installed && sleeve_installed && pin_released):
    鏡は鐘の発進台へ向けられず、光も届かない。こわれた所はない。足りない所を直せば、同じ大きな輪でまた試せる。
    -> result_to_place
}
横のぼうが回り、ひもを巻く車が鏡の向きを止める。ピンを外した石が、鏡の重さをささえる。
天井の光が三角の厚いガラスを通り、細い白い光になって東へ走る。光は脱出用の鐘の黒い板に当たり、その下の金属が熱でゆっくり曲がる。
遠くで金色のふたが奥へ引かれ、一本線のある差しこみ口が開いた。同時に、鐘を押さえる金具を開くしかけも、動く直前の位置まで進んだ。
~ beam_set = true
~ socket_open = true
~ release_armed = true
-> result_to_place

=== v5_push_drum ===
{ cord_installed:
    ひもを巻く車は細いひもをしっかりつかみ、回した場所で止まる。
- else:
    ひものない車は指で回るが、手を放すと元へもどる。
}
-> result_to_place

=== v5_push_shade ===
まぶしさをへらす板を少し動かすと、目に入る光が弱くなる。鏡から鐘へ向かう光には当たらない。
-> result_to_place

=== v5_travel ===
どこへばしょいどうする？
+ [ポンプ室へ] -> v4_hub
+ [やめる] -> return_to_place

=== v6_hub ===
~ place = "鐘の発進台"
鐘の発進台。海へ向かって下がる短いレールの上に、金色の大きな鐘が横たわっている。丸い鐘の中には、一人が乗れる場所がある。
鐘の前後を二組の金具が押さえている。鐘の丸い扉の内側には発進レバーがあり、近くには水のもどり方を書いた板がある。海側の低い壁の向こうで、波がくずれた桟橋に当たっている。
{ beam_set:
    光の塔から細い光が届き、鐘の肩にある黒い板へ当たっている。その下の金色のふたは開いている。
}
{ notched_installed:
    一本線のある差しこみ口には、切れこみのある金属板が入り、奥のつなぎ棒を押している。
}
+ [しらべる] -> v6_look
+ [とる] -> v6_take
+ [つかう] -> use_menu
+ [おす・うごかす] -> v6_move_things
+ [もちもの] -> inventory
+ [ばしょいどう] -> v6_travel

=== v6_look ===
何をしらべる？
+ [脱出用の鐘] -> v6_look_bell
+ [鐘を押さえる金具] -> v6_look_clamps
+ [発進レバー] -> v6_look_lever
+ [水のもどり方を書いた板] -> v6_look_plate
+ [海側の低い壁] -> v6_look_parapet
+ {bell_seen} [鐘の二重の外がわ] -> v6_look_buoyant_shell
+ {bell_seen} [一本線のある差しこみ口] -> v6_look_socket
+ {clamps_seen} [金具を開く水の管] -> v6_look_hydraulic_return
+ {clamps_seen} [金具わきの小さなくぼみ] -> v6_look_service_recess
+ {lever_seen} [発進レバーの留め金] -> v6_look_lever_pawl
+ {plate_seen} [板の順番メモ] -> v6_look_plate_order
+ {parapet_seen} [低い壁の水あと] -> v6_look_tide_marks
+ [やめる] -> return_to_place

=== v6_look_bell ===
~ bell_seen = true
脱出用の鐘には、人が出入りできる丸い扉がある。中には一人分のいす、空気の入った筒、手で動かすかじが見える。
鐘の肩には黒い板がある。その下には、地図と同じまっすぐな一本線がついた差しこみ口があり、今はうすい金色のふたに守られている。
-> v6_look

=== v6_look_buoyant_shell ===
鐘の外がわは二重で、下の半分には空気の入った場所がある。一人を乗せても水にうく作りだ。
鐘の形なら、水へ落ちて横になっても、下の空気で上を向きやすい。
-> v6_look

=== v6_look_socket ===
一本線のある差しこみ口は四角い。奥には、切れこみに合いそうな小さなつなぎ棒がある。
{ socket_open:
    黒い板が温まり、金色のふたが奥へ引かれている。四角い口と小さなつなぎ棒が見える。
- else:
    金色のふたが、四角い口を完全にふさいでいる。手でこじるすき間はない。黒い板につながる二枚の金属だけが見える。
}
-> v6_look

=== v6_look_clamps ===
~ clamps_seen = true
二組の押さえ金具は、鐘の前と後ろをつかみ、発進台がゆれても転がらないようにしている。
金具の下には、ポンプ室から水を受ける管がある。そのわきに、小さなくぼみがある。金具は、光の塔から来る細い線にもつながっている。
-> v6_look

=== v6_look_hydraulic_return ===
金具を開く水の管は、ポンプ室から来た水の力で金具を開く。ただし別の水の道が閉じないと、開いたままにはならない。
水の力だけでも、光の塔からの動きだけでも、金具は鐘を押さえる場所へもどる。安全のための作りだ。
-> v6_look

=== v6_look_service_recess ===
金具わきの小さなくぼみには、油のしみた布がある。その中に、短くて厚い金属の筒が入っている。片方の端には四角い穴があり、金具の四角いぼうにかぶせて回す物らしい。
手前の留め金を外し、取れる場所まで出しておく。
~ sleeve_exposed = true
-> v6_look

=== v6_look_lever ===
~ lever_seen = true
発進レバーは、鐘の丸い扉の内側、いすのわきにある。最初から手をかけられ、鍵もふたもない。
レバーの根元は、鐘を押さえる金具とつながっている。丸い扉を閉じ、必要なしかけが動いていれば最後まで押せる。足りない時は、途中で重く止まる。
-> v6_look

=== v6_look_lever_pawl ===
発進レバーの留め金は折れていない。鐘を押さえる金具が開いたままなら、レバーの動きを発進台まで伝えられる。
-> v6_look

=== v6_look_plate ===
~ plate_seen = true
水のもどり方を書いた板には、館内の四つの場所と、それぞれへ続く管がえがかれている。横には順番のメモがある。
表面の塩をふけば、文字を読めそうだ。
-> v6_look

=== v6_look_plate_order ===
~ plate_clue_seen = true
板の順番メモを、塩の下から読む。
「鐘の発進台は最後。光の塔は作業室より前。点検の後もこの順を守ること」
四つの場所は、ポンプ室の場所ボタンと同じ名前だ。
-> v6_look

=== v6_look_parapet ===
~ parapet_seen = true
海側の低い壁は、鐘が通る所だけ切れている。発進台がかたむけば、鐘はそこから水へ落ちる。
石のふちには、波が何度もつけた水あとがある。
-> v6_look

=== v6_look_tide_marks ===
水あとから見ると、今の海面は鐘が落ちる所より下にある。鐘は水へ落ちても、下の空気で水面へもどれる。
くずれた桟橋を歩いて渡ることはできない。
-> v6_look

=== v6_take ===
何をとる？
* {sleeve_exposed && not carries(brass_sleeve)} [四角い穴の金属筒] -> take_brass_sleeve
+ [やめる] -> return_to_place

=== take_brass_sleeve ===
~ bag += brass_sleeve
油のしみた布から、四角い穴の金属筒を取った。短いが厚く、四角いぼうにかぶせて回せる形だ。
-> result_to_place

=== v6_move_things ===
何をおす・うごかす？
+ [発進レバー] -> v6_launch_lever
+ [鐘を押さえる金具] -> v6_push_clamps
+ [脱出用の鐘] -> v6_push_bell
+ [やめる] -> return_to_place

=== v6_launch_lever ===
{ pressure_raised && cradle_release:
    -> ending
}
鐘へ乗り、丸い扉をいったん閉じて発進レバーを押す。レバーは途中で重く止まり、発進台は動かない。レバーをもどし、扉を開けて外へ出る。
{ not pressure_raised:
    ポンプ室から水の力が来ていないため、二組の金具は鐘を押さえたままだ。
}
{ pressure_raised && not cradle_release:
    水の力は金具まで来ているが、開いた金具をその場所で止められない。光の塔からのしかけも、最後まで動けない。
}
何もこわれてはいない。足りないしかけを動かせば、同じ発進レバーでまた試せる。
-> result_to_place

=== v6_push_clamps ===
{ cradle_release:
    鐘を押さえる金具は開いたままになり、鐘から離れている。
- else:
    金具へ肩を当てても、安全のためのしかけが支えて動かない。水の力と、金具を開いたままにするしかけの両方が必要だ。
}
-> result_to_place

=== v6_push_bell ===
脱出用の鐘は発進台へ深くのり、二組の金具に押さえられている。人の力で押し出せる重さではない。
発進レバーが最後まで動けば、発進台そのものが海側へかたむく作りだ。
-> result_to_place

=== v6_travel ===
どこへばしょいどうする？
+ [海側の客室へ] -> v1_hub
+ [やめる] -> return_to_place

=== use_menu ===
何をつかう？
+ {carries(waxed_cord)} [水をはじく細いひも] -> use_waxed_cord
+ {carries(copper_tool)} [先が曲がった銅の棒] -> use_copper_tool
+ {carries(curved_glass)} [曲がったガラス管] -> use_curved_glass
+ {carries(ceramic_piece)} [白い焼き物の部品] -> use_ceramic_piece
+ {carries(brass_sleeve)} [四角い穴の金属筒] -> use_brass_sleeve
+ {carries(notched_brass)} [切れこみのある金属板] -> use_notched_brass
+ {carries(optical_glass)} [三角の厚いガラス] -> use_optical_glass
+ [やめる] -> return_to_place

=== use_waxed_cord ===
水をはじく細いひもを、何につかう？
+ {carries(copper_tool)} [先が曲がった銅の棒] -> combine_cord_and_copper
+ {place == "海側の客室" && high_loop_seen} [鉄の戸の高い輪] -> cord_on_high_loop
+ {place == "光の塔" && drum_seen} [ひもを巻く車] -> cord_on_drum
+ {place == "鐘の発進台"} [鐘を押さえる金具] -> cord_on_clamps
+ {place == "作業室"} [四けたロッカー] -> cord_on_locker
+ {place == "温室"} [水そう] -> cord_on_tank
+ {place == "ポンプ室"} [手押しポンプ] -> cord_on_pump
+ [やめる] -> return_to_place

=== combine_cord_and_copper ===
{ rigged_tool:
    水をはじく細いひもは、すでに先が曲がった銅の棒へ結んである。二つとも手元にある。
- else:
    水をはじく細いひもを、銅の棒の穴へ通して結ぶ。棒の曲がった先を輪にかけ、長いひもを下から引ける道具になった。
    ~ rigged_tool = true
}
-> result_to_place

=== cord_on_high_loop ===
水をはじく細いひもだけを、高い所の輪へ投げる。ひもは輪を通るが、先をつかめず床へ落ちる。
ひもはいたんでいない。拾って手元へもどした。
-> result_to_place

=== cord_on_drum ===
{ cord_installed:
    水をはじく細いひもは、すでにひもを巻く車へ巻き、端の穴に結んである。
- else:
    銅の棒との結び目をほどき、水をはじく細いひもを車のみぞへ何回か巻く。端の穴に結ぶと、車はすべらず、回した場所で止まるようになった。
    ~ cord_installed = true
    ~ rigged_tool = false
    ~ bag -= waxed_cord
}
-> result_to_place

=== cord_on_clamps ===
細いひもを鐘の押さえ金具へ巻いて引くが、金具は下の太いしかけに支えられて動かない。
ひもはほどいて手元へもどした。何もこわれていない。
-> result_to_place

=== cord_on_locker ===
細いひもをロッカーのレバーへかけても、中の留め具は開かない。四つの数字を決める必要がある。
ひもは手元へもどした。
-> result_to_place

=== cord_on_tank ===
細いひもを水そうへたらしても、遠いかごの輪にはかからない。ひもが水を吸う前に引き上げた。
-> result_to_place

=== cord_on_pump ===
細いひもで手押しポンプの取っ手をしばっても、空いた二つの場所はふさがらない。ひもは手元へもどした。
-> result_to_place

=== use_copper_tool ===
先が曲がった銅の棒を、何につかう？
+ {carries(waxed_cord)} [水をはじく細いひも] -> combine_copper_and_cord
+ {place == "海側の客室" && high_loop_seen} [鉄の戸の高い輪] -> copper_on_high_loop
+ {place == "温室" && pressure_raised} [水面近くのかご] -> copper_on_raised_cage
+ {place == "作業室"} [四けたロッカー] -> copper_on_locker
+ {place == "ポンプ室"} [場所ボタンの箱] -> copper_on_manifold
+ {place == "光の塔" && lamp_seen} [鏡の横のぼう] -> copper_on_lamp_axle
+ {place == "鐘の発進台"} [発進レバー] -> copper_on_launch_lever
+ [やめる] -> return_to_place

=== combine_copper_and_cord ===
{ rigged_tool:
    銅の棒の穴には、すでに水をはじく細いひもが結んである。二つをいっしょに使える。
- else:
    銅の棒の穴へ、水をはじく細いひもを通して結ぶ。曲がった先を高い輪にかけ、長いひもを下から引ける形になった。
    ~ rigged_tool = true
}
-> result_to_place

=== copper_on_high_loop ===
{ shutter_open:
    銅の棒を高い輪へかけてみる。大きな鉄の戸は、すでに上の金具で止まっている。棒とひもは手元にある。
    -> result_to_place
}
{ rigged_tool:
    先が曲がった銅の棒を投げ上げ、高い所の輪へかける。結んだ細いひもを引くと、棒は輪から外れない。
    両手でひもを引き下ろす。大きな鉄の戸が、両わきの溝の塩をけずりながら上がり、天井の金具で止まった。作業室への道が開く。
    ひもをゆるめて棒を外す。棒もひもも手元に残った。
    ~ shutter_open = true
    -> result_to_place
- else:
    銅の棒の曲がった先は、高い所の輪にかかる。だが棒が短く、下から引き続けられない。力をかけると外れて床へ落ちた。
    棒は拾って手元へもどした。長く引き続けられるようにすれば、また試せる。
    -> result_to_place
}

=== copper_on_raised_cage ===
{ cage_pulled:
    かごはすでに水そうのふちへ寄せてある。銅の棒も手元にある。
- else:
    銅の棒の曲がった先を、水面近くのかごの輪へかける。手前へ引くと、かごが水面をすべってこちらのふちへ寄った。
    ふたを留める帯も見えるようになった。中の二つの物を安全に取れる。
    ~ cage_pulled = true
}
-> result_to_place

=== copper_on_locker ===
銅の棒をロッカーのすき間へ入れても、中の留め具までは届かない。扉をいためる前に抜いた。
銅の棒は手元に残っている。
-> result_to_place

=== copper_on_manifold ===
銅の棒で場所ボタンを引いても、一回押すのと同じ動きしかしない。棒を使う意味はない。
-> result_to_place

=== copper_on_lamp_axle ===
銅の棒の曲がった先を鏡の横のぼうへかけると、一つの角だけに力がかかる。ぼうをいためそうなので、すぐ外した。
銅の棒は手元へもどした。何もこわれていない。
-> result_to_place

=== copper_on_launch_lever ===
銅の棒で発進レバーを長くしても、途中で止める安全の金具は変わらない。どちらもこわれる前にやめた。
-> result_to_place

=== use_curved_glass ===
曲がったガラス管を、何につかう？
+ {place == "ポンプ室" && pump_seen} [ポンプの曲がった管のあき] -> glass_on_pump
+ {place == "作業室"} [ガラス道具の棚] -> glass_on_rack
+ {place == "温室"} [水そう] -> glass_on_tank
+ {place == "光の塔" && lamp_seen} [鏡の三角の受け台] -> glass_on_lamp
+ {place == "海側の客室"} [床の水ぬきふた] -> glass_on_grate
+ {place == "鐘の発進台"} [脱出用の鐘] -> glass_on_bell
+ [やめる] -> return_to_place

=== glass_on_pump ===
{ curved_installed:
    曲がったガラス管は、すでに二つの口の間にはまり、水の道をつないでいる。
- else:
    曲がったガラス管を、皮の輪がついた口へ入れる。曲がりがとなりの口までぴたりと届き、両端が留められた。
    透明なので、中を水が通る様子も見られる。
    ~ curved_installed = true
    ~ bag -= curved_glass
}
-> result_to_place

=== glass_on_rack ===
元の棚へもどすことはできるが、それではポンプは直らない。曲がったガラス管は手元に残した。
-> result_to_place

=== glass_on_tank ===
ガラス管を水そうへ入れても、底の管から水を送ることはできない。割らないよう手元へもどした。
-> result_to_place

=== glass_on_lamp ===
曲がったガラス管は、鏡の三角の受け台に合わない。光を細くする厚さもないので、割らずに外した。
-> result_to_place

=== glass_on_grate ===
ガラス管を床の水ぬきふたの穴へ入れて力をかけると、割れそうだ。使わず手元へもどした。
-> result_to_place

=== glass_on_bell ===
曲がったガラス管は、脱出用の鐘のどのあきにも合わない。手元へもどした。
-> result_to_place

=== use_ceramic_piece ===
白い焼き物の部品を、何につかう？
+ {place == "ポンプ室" && pump_seen} [ポンプの白い丸いあき] -> ceramic_on_pump
+ {place == "作業室"} [四けたロッカー] -> ceramic_on_locker
+ {place == "温室"} [東の花だんの板] -> ceramic_on_bed
+ {place == "光の塔" && lamp_seen} [鏡の横のぼう] -> ceramic_on_axle
+ {place == "海側の客室"} [建物と川の地図] -> ceramic_on_mural
+ {place == "鐘の発進台"} [水のもどり方を書いた板] -> ceramic_on_plate
+ [やめる] -> return_to_place

=== ceramic_on_pump ===
{ ceramic_installed:
    白い焼き物の部品は、すでにポンプの白い丸いあきに入っている。水が水入れへもどるのを止めている。
- else:
    白い焼き物の部品を、ポンプの白い丸いあきへ入れる。ふちがぴたりと合い、ばねの輪が押さえた。
    これで、水を入れる側のすき間がふさがった。
    ~ ceramic_installed = true
    ~ bag -= ceramic_piece
}
-> result_to_place

=== ceramic_on_locker ===
白い焼き物の部品をロッカーへもどしても、ポンプの足りない所は直らない。手元に残した。
-> result_to_place

=== ceramic_on_bed ===
白い焼き物の部品を東の花だんの板へ当てても、番号や花だんの作りとは関係がない。手元へもどした。
-> result_to_place

=== ceramic_on_axle ===
白い焼き物の部品は、鏡の四角いぼうにかぶさらない。回す力もかけられないので、欠ける前に外した。
-> result_to_place

=== ceramic_on_mural ===
白い焼き物の部品を地図の浅い穴へ当てても、形も厚さも合わない。地図をいためず手元へもどした。
-> result_to_place

=== ceramic_on_plate ===
白い焼き物の部品で金属の板をこすると、文字までけずりそうだ。塩は布でふけるので、使わず手元へもどした。
-> result_to_place

=== use_brass_sleeve ===
四角い穴の金属筒を、何につかう？
+ {place == "海側の客室" && grate_target_seen} [水ぬきふたの四角い穴] -> sleeve_on_grate
+ {place == "光の塔" && lamp_seen} [鏡の横のぼう] -> sleeve_on_lamp_axle
+ {place == "鐘の発進台" && clamps_seen} [金具の四角いぼう] -> sleeve_on_clamp_axle
+ {place == "ポンプ室" && priming_seen} [水入れの回し棒] -> sleeve_on_crank
+ {place == "作業室" && locker_seen} [ロッカーのレバー] -> sleeve_on_locker
+ {place == "温室" && trellis_seen} [つる棚の支柱] -> sleeve_on_trellis
+ [やめる] -> return_to_place

=== sleeve_on_grate ===
{ grate_moved:
    四角い穴の金属筒をもう一度入れてみる。床の水ぬきふたはすでに開いている。筒は手元へもどした。
- else:
    四角い穴の金属筒を、水ぬきふたの横長の穴へ入れる。筒の平らな面がすべらず、塩で床にくっついたふちが少し持ち上がった。
    そのまま横へ押すと、ふたがずれた。下の浅い水の通り道に、黒い細いひもが巻かれている。
    筒を穴から抜いて手元へもどす。小さなきずだけで、まだ使える。
    ~ grate_moved = true
    ~ cord_exposed = true
}
-> result_to_place

=== sleeve_on_lamp_axle ===
{ sleeve_installed:
    四角い穴の金属筒は、すでに鏡の横のぼうへかぶせてある。ぼうを守りながら回せる。
- else:
    四角い穴の金属筒を、鏡の四角いぼうへかぶせる。筒の内側が四つの面に合い、手をいためずに力をかけられるようになった。
    ~ sleeve_installed = true
    ~ bag -= brass_sleeve
}
-> result_to_place

=== sleeve_on_clamp_axle ===
四角い穴の金属筒は、この押さえ金具のぼうにも合う。だが手で回すと、安全のしかけが金具を元へもどす。ここだけ無理に動かしても開いたままにはならない。
筒は手元へもどした。何もこわれていない。
-> result_to_place

=== sleeve_on_crank ===
水入れの回し棒には、そのまま持てる所がある。金属筒をかぶせる四角いぼうもなく、ここで使う物ではない。
-> result_to_place

=== sleeve_on_locker ===
金属筒をロッカーのレバーへかぶせても、四つの数字が合わなければ中で止まる。筒は手元へもどした。
-> result_to_place

=== sleeve_on_trellis ===
金属筒をつる棚の柱へ当てても、棚を直す必要はない。筒は手元へもどした。
-> result_to_place

=== use_notched_brass ===
切れこみのある金属板を、何につかう？
+ {place == "鐘の発進台" && bell_seen} [一本線のある差しこみ口] -> notched_on_socket
+ {place == "海側の客室" && mural_parts_seen} [地図のまっすぐな線] -> notched_on_mural
+ {place == "ポンプ室" && manifold_seen} [場所ボタンの箱] -> notched_on_manifold
+ {place == "光の塔" && lamp_seen} [鏡の向きを見る輪] -> notched_on_sight
+ {place == "作業室" && locker_seen} [四けたロッカー] -> notched_on_locker
+ {place == "温室" && tank_seen} [水そう] -> notched_on_tank
+ [やめる] -> return_to_place

=== notched_on_socket ===
{ notched_installed:
    切れこみのある金属板は、すでに一本線のある差しこみ口に入っている。奥のつなぎ棒を押したままだ。
    -> result_to_place
}
{ not socket_open:
    金属板の一本線を、差しこみ口の一本線へ合わせる。向きは合うが、うすい金色のふたが口をふさいでいて入らない。
    ふたを手で開けるすき間はない。金属板は手元に残っているので、ふたが動けばまた試せる。
    -> result_to_place
}
切れこみのある金属板の一本線を、開いた差しこみ口の一本線へ合わせて入れる。切れこみが小さなつなぎ棒に合い、奥で水の道が閉じた。
光の塔から来たしかけの動きが、鐘を押さえる金具へ伝わる。発進レバーの安全の金具も、動ける場所まで進んだ。
~ notched_installed = true
~ cradle_release = true
~ bag -= notched_brass
-> result_to_place

=== notched_on_mural ===
切れこみのある金属板を、地図のまっすぐな線へ重ねると、一本線と向きが合う。だが地図の穴は浅い見本で、奥に動く物はない。
金属板は手元へもどした。同じ印のある、本物の差しこみ口を探す必要がある。
-> result_to_place

=== notched_on_manifold ===
金属板の切れこみは、四つの場所ボタンには合わない。ここはボタンを手で押す作りだ。
-> result_to_place

=== notched_on_sight ===
金属板を鏡の向きを見る輪へ当てても、光を曲げず、鏡の向きも止められない。手元へもどした。
-> result_to_place

=== notched_on_locker ===
金属板は、ロッカーのレバーにも数字の輪にも合わない。番号の代わりにはならない。
-> result_to_place

=== notched_on_tank ===
金属板を水そうへもどしても、鐘の発進台にある水の道は閉じない。手元に残した。
-> result_to_place

=== use_optical_glass ===
三角の厚いガラスを、何につかう？
+ {place == "光の塔" && lamp_seen} [鏡の三角の受け台] -> optical_on_lamp
+ {place == "鐘の発進台" && bell_seen} [鐘の黒い板] -> optical_on_receiver
+ {place == "海側の客室" && mural_parts_seen} [建物と川の地図] -> optical_on_mural
+ {place == "作業室" && rack_seen} [ガラス道具の棚] -> optical_on_rack
+ {place == "温室" && north_bed_seen} [屋根の割れたガラス] -> optical_on_greenhouse
+ {place == "ポンプ室" && gauge_seen} [水圧メーター] -> optical_on_gauge
+ [やめる] -> return_to_place

=== optical_on_lamp ===
{ optical_installed:
    三角の厚いガラスは、すでに鏡の三角の受け台へ留められている。
- else:
    三角の厚いガラスを、鏡の三角の受け台へ入れる。三つの留め具がかかり、天井からの光が細く集まった。
    ~ optical_installed = true
    ~ bag -= optical_glass
}
-> result_to_place

=== optical_on_receiver ===
三角の厚いガラスを鐘の黒い板へ手でかざしても、光の塔から届く強い光の代わりにはならない。
落とさないよう手元へもどした。
-> result_to_place

=== optical_on_mural ===
三角の厚いガラスを地図へ重ねると、線が少しずれて見えるだけだ。東西南北や文字は変わらない。手元へもどした。
-> result_to_place

=== optical_on_rack ===
棚の曲がった受け台は細い管のための物だ。三角の厚いガラスは留められないので、手元へもどした。
-> result_to_place

=== optical_on_greenhouse ===
三角の厚いガラスを屋根の割れた所へ当てても、小さすぎて温室の屋根は直らない。手元へもどした。
-> result_to_place

=== optical_on_gauge ===
水圧メーターのガラスは割れていない。三角の厚いガラスを重ねても針は変わらないので、手元へもどした。
-> result_to_place

=== result_to_place ===
+ [つぎへ] -> return_to_place

=== return_to_place ===
{
- place == "海側の客室": -> v1_hub
- place == "作業室": -> v2_hub
- place == "温室": -> v3_hub
- place == "ポンプ室": -> v4_hub
- place == "光の塔": -> v5_hub
- else: -> v6_hub
}

=== inventory ===
持っている物——
{ carries(waxed_cord):水をはじく細いひも。}
{ carries(copper_tool):先が曲がった銅の棒。}
{ carries(curved_glass):曲がったガラス管。}
{ carries(ceramic_piece):白い焼き物の部品。}
{ carries(brass_sleeve):四角い穴の金属筒。}
{ carries(notched_brass):切れこみのある金属板。}
{ carries(optical_glass):三角の厚いガラス。}
{ LIST_COUNT(bag) == 0:今は何も持っていない。}
{ rigged_tool && carries(waxed_cord) && carries(copper_tool):
    先が曲がった銅の棒には、水をはじく細いひもを結んである。二つとも持っている。
}

取り付けた物——
{ curved_installed:曲がったガラス管は、ポンプ室の手押しポンプにつけてある。}
{ ceramic_installed:白い焼き物の部品は、ポンプ室の白い丸いあきに入れてある。}
{ cord_installed:水をはじく細いひもは、光の塔のひもを巻く車に巻いてある。}
{ sleeve_installed:四角い穴の金属筒は、光の塔の鏡の横のぼうにかぶせてある。}
{ optical_installed:三角の厚いガラスは、光の塔の鏡の三角の受け台に留めてある。}
{ notched_installed:切れこみのある金属板は、鐘の発進台の一本線のある差しこみ口に入れてある。}

見つけたこと——
{ locker_seen:
    四けたロッカーには、0から9の数字を四つ入れる。まちがえても、また試せる。
}
{ mural_fact_seen:
    海側の客室の地図は北が上。川が海へ出る東の「始まり」から、丸い矢印の向きへ時計回りに読む。
}
{ north_bed_seen:
    温室の北の奥の花だんには「４」とある。
}
{ east_bed_seen:
    温室の東の壁ぎわの花だんには「３」とある。
}
{ south_bed_seen:
    温室の南の入口側の花だんには「１」とある。
}
{ west_bed_seen:
    温室の西の壁ぎわの花だんには「７」とある。
}
{ ledger_clue_seen:
    点検ノートには、作業室のすぐ後は必ず温室、とある。
}
{ plate_clue_seen:
    水のもどり方を書いた板には、鐘の発進台は最後、光の塔は作業室より前、とある。
}
{ valve_controls_seen:
    ポンプ室には、作業室、光の塔、温室、鐘の発進台の四つの場所ボタンがある。同じボタンを何度押しても、一回ずつ数えられる。
}
{ pressure_raised:
    水圧メーターは緑の場所で止まり、光の塔へのリフトが開いた。温室のかごも水面近くまで上がっている。
}
{ beam_set:
    光の塔の鏡は、脱出用の鐘の黒い板へ光を送った。一本線のある差しこみ口のふたが開き、鐘を押さえる金具も動く直前まで進んだ。
}
{ notched_installed:
    切れこみのある金属板は、鐘の発進台の差しこみ口に入り、奥の水の道を閉じている。
}
-> result_to_place

=== ending ===
脱出用の鐘へ乗り、調査の記録をいすのわきへ留める。丸い扉を引き寄せ、内側の輪を回して閉じる。すき間なく閉じたことを確かめ、発進レバーを最後まで押した。
ポンプ室から来た水の力で、鐘を押さえる二組の金具が開く。閉じた水の道が金具をその場所で止め、光の塔から来たしかけが発進レバーの留め金を外した。
発進台が海側へかたむく。脱出用の鐘は短いレールをすべり、くずれた桟橋の手前から波の中へ落ちた。
大きな水しぶきのあと、鐘は下に入った空気の力で水面へもどった。あなたは一人分の船室で、手で動かすかじをにぎる。古い研究所がゆっくり遠ざかり、光の塔からの白い光だけが海を横切っている。
調査の記録は、ぬらさず持ち出せた。残されたしかけも、こわさず、書かれた手がかりにそって動かせた。
-> END
