# title: 鍛冶場と石の守護者
// =====================================================================
//  鍛冶場と石の守護者 (Forge & Guardian) — 帰納×演繹の融合 × 固定コマンドパレット (Issue #11)
//
//  legendary_forge.ink（独自トグルUI）を、PUZZLE_DESIGN.md §0/§6 に準拠して作り直した範例。
//   - 解は「選ぶ」でなく「実演」: 刃を柄に "つかう" で鍛え、刃を鱗片に "つかう" で試す。
//   - 固定コマンド（しらべる→対象／つかう→道具→対象／もちもの）。解決専用コマンドを湧かせない。
//   - outcome-gating: 「守護者に挑む」は常設。準備が整っていなければフェアに敗北（終端ED）。
//
//  ＜融合＞ 演繹(手記)で得物を2候補(鋼/銀を柄に)へ絞り、帰納(鱗片に試す＝銀だけ噛む)で確定。
//  ＜接地＞ 法則は世界の理（銀の弱点・柄がなければ振るえぬ・龍油は刃を鈍らせる）。
//  ＊正解・鱗片の理は本文に明記しない（コールド検証用）。一意性は別途機械検証済み。
//  ＜衛生＞ ソフトロックなし（再鍛で龍油はやり直せる）・挑戦は終端ED・解は public 非公開。
// =====================================================================

VAR has_steel = false
VAR has_silver = false
VAR has_haft = false
VAR has_oil = false
VAR mounted = 0
VAR oiled = false
VAR solved = false
VAR public_status = ""

-> hub

=== hub ===
道を塞ぐ石の守護者。傍らに朽ちた鍛冶場——散らばる部品、守護者が落とした鱗片、そして斃れた騎士の手記がある。
{ mounted == 0:
    まだ得物は組んでいない。
- else:
    手には、組み上げた一振りの得物。{ oiled:刃は龍油で鈍く曇っている。|刃は鋭く光っている。}
}
+ [あたりを調べる] -> look_menu
+ {has_steel || has_silver || has_oil} [道具を使う] -> use_menu
+ [持ち物を確認する] -> inventory
+ [この得物で守護者に挑む] -> challenge

// ---------------- しらべる（対象を選ぶ） ----------------
=== look_menu ===
何を調べる？
+ [騎士の手記] -> look_journal
+ [散らばる部品] -> look_parts
+ [守護者の鱗片] -> look_shard
+ [石の守護者] -> look_guardian
+ [やめる] -> hub

=== look_journal ===
騎士の手記には、こう記されている。
- 「得物は、一枚の刃を柄に挿したもの。刃なくして得物は成らず。されど、二枚の刃を一つの柄には挿せぬ」
- 「柄なき刃は、ただの鉄片。振るうには、必ず柄が要る」
- 「龍油を刃に塗れば、刃はたちまち鈍り、ひと振りで折れる。断じて塗ってはならぬ」
-> look_menu

=== look_parts ===
部品を検める。鋼の刃、銀の刃、頑丈な柄、そして小瓶の龍油が転がっている。
+ {not has_steel} [鋼の刃を取る] -> take_steel
+ {not has_silver} [銀の刃を取る] -> take_silver
+ {not has_haft} [柄を取る] -> take_haft
+ {not has_oil} [龍油を取る] -> take_oil
+ [やめる] -> look_menu
=== take_steel ===
鋼の刃を手に取った。
~ has_steel = true
-> look_parts
=== take_silver ===
銀の刃を手に取った。
~ has_silver = true
-> look_parts
=== take_haft ===
頑丈な柄を手に取った。
~ has_haft = true
-> look_parts
=== take_oil ===
龍油の小瓶を手に取った。
~ has_oil = true
-> look_parts

=== look_shard ===
守護者が落とした鱗片。ひどく硬い。刃物で当たれば、何が通じて何が弾かれるか、試せそうだ。
-> look_menu

=== look_guardian ===
苔むした石の守護者。生半可な得物では、まるで歯が立つまい。確かな一振りを携えて挑むしかない。
-> look_menu

// ---------------- つかう（道具→対象） ----------------
=== use_menu ===
どの道具を使う？
+ {has_steel} [鋼の刃] -> use_steel
+ {has_silver} [銀の刃] -> use_silver
+ {has_oil} [龍油] -> use_oil
+ [やめる] -> hub

=== use_steel ===
鋼の刃を、どこに使う？
+ {has_haft} [柄に挿して鍛える] -> mount_steel
+ [鱗片に試す] -> test_steel
+ [やめる] -> hub
=== mount_steel ===
鋼の刃を柄にしっかり挿し、一振りの得物を組み上げた。
~ mounted = 1
~ oiled = false
-> hub
=== test_steel ===
鋼の刃を鱗片に当てる。刃は甲高い音とともに弾かれ、鱗にはかすり傷ひとつ付かない。
-> hub

=== use_silver ===
銀の刃を、どこに使う？
+ {has_haft} [柄に挿して鍛える] -> mount_silver
+ [鱗片に試す] -> test_silver
+ [やめる] -> hub
=== mount_silver ===
銀の刃を柄にしっかり挿し、一振りの得物を組み上げた。
~ mounted = 2
~ oiled = false
-> hub
=== test_silver ===
銀の刃を鱗片に当てると、硬い鱗へ吸い込まれるように食い込んだ——確かに「噛んだ」。
-> hub

=== use_oil ===
龍油を、どこに使う？
+ {mounted != 0} [組んだ得物] -> oil_weapon
+ [やめる] -> hub
=== oil_weapon ===
龍油を組んだ得物の刃に塗りつけた。鋭かった刃が、みるみる鈍く曇っていく。
~ oiled = true
-> hub

// ---------------- もちもの ----------------
=== inventory ===
持ち物: {has_steel:鋼の刃 }{has_silver:銀の刃 }{has_haft:柄 }{has_oil:龍油 }{not (has_steel || has_silver || has_haft || has_oil):なし}
{ mounted != 0:
    （{ mounted == 2:銀|鋼}の刃を柄に挿した得物を構えている{ oiled:・龍油で鈍っている})
}
-> hub

// ---------------- 挑む（実演＝outcome-gating／一度きりの終端） ----------------
=== challenge ===
{ mounted == 2 && not oiled:
    -> triumph
- else:
    -> fall
}

=== triumph ===
あなたは鍛えた得物を構え、守護者へ躍りかかった。手記は教えていた——一枚の刃を柄に、龍油は塗るな、と。残る問いは鋼か銀か。だが鱗片は鋼を弾き、銀だけを噛んだ。ゆえに——銀の刃を柄に挿した、その一振り。刃は守護者の鱗を深々と断ち、石の巨体はくずおれた。
~ solved = true
-> clear

=== fall ===
あなたの得物は、守護者にまるで通じなかった。あるいは刃が弾かれ、あるいは振るう柄すらなく、あるいは鈍った刃が空しく折れる。守護者の一撃が、あなたを薙ぎ払った。
-> END

=== clear ===
守護者は沈黙し、道がひらけた。手記の理を読み、鱗片の理を試し、その二つが噛み合ったとき、伝説の一振りは鍛え上がっていた。
-> DONE
