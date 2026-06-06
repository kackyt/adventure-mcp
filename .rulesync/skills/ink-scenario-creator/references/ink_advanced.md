# Inkの高度な機能リファレンス

ゲームロジックや複雑な状態管理を必要とするアドベンチャーゲームにおいて、Inkの高度な機能を活用する方法です。

## ウィーブ (Weaves)

ノットやステッチを細かく分割せず、一つの大きな流れの中で階層的な選択肢を作成するための記法です。

```ink
=== meeting_npc ===
村の長老に会った。
- (opts)
* [挨拶する]
    「こんにちは」と声をかけた。
    -> opts
* [無視する]
    長老を無視して通り過ぎようとしたが、呼び止められた。
    -> opts
* {opts >= 2} [立ち去る]
    これ以上話すことはないと思い、立ち去った。
    -> DONE
```

`-` は「ギャザー（Gather）」と呼ばれ、選択肢の分岐が合流するポイントを示します。

## スレッド (Threads)

別のノットの内容を現在のフローに「挿入（合流）」させる機能です。会話の割り込みや、共通の選択肢群を複数箇所で使い回す際に便利です。

```ink
=== main_room ===
大きな広間だ。
<- look_around_options
* [北の扉へ進む] -> north_room
* [南の扉へ進む] -> south_room

=== north_room ===
北の部屋だ。
<- look_around_options
* [広間へ戻る] -> main_room

=== look_around_options ===
+ [周囲を注意深く観察する]
    特に怪しいところは見当たらない。
    -> DONE
```
`<-` を使うことで、`look_around_options` の選択肢が `main_room` や `north_room` の選択肢に追加されます。

## リスト (Lists)

フラグの集合や状態遷移（ステートマシン）、インベントリ（所持品）の管理に強力な機能を提供します。

```ink
// リストの定義
LIST Inventory = sword, shield, potion, key

// リスト変数の初期化
VAR items = (sword, potion)

// リストの操作
~ items += shield // 追加
~ items -= potion // 削除

// リストの判定
{items ? key:
    鍵を持っているので扉を開けられる。
}
{items has (sword, shield):
    完全な装備だ。
}
```

リストは状態遷移（ステート）としても使えます。

```ink
LIST DoorState = locked, unlocked, open
VAR door = locked

~ door = unlocked
{ door == open:
    扉は開いている。
}
```

## 関数 (Functions)

計算処理や条件判定をカプセル化し、テキスト出力を含まない純粋なロジック処理として利用します。

```ink
=== function heal(amount) ===
~ player_hp = player_hp + amount
{player_hp > 100:
    ~ player_hp = 100
}
~ return player_hp

// 使用例
~ heal(20)
```

関数は純粋な値の計算に使用し、ダイバート（`->`）を含むことはできません。

## トンネル (Tunnels)

別のノットへサブルーチン的に遷移し、処理が終わった後に元の場所へ戻ってくる機能です。

```ink
=== corridor ===
暗い廊下を歩いている。
-> random_encounter ->
廊下の突き当りに到着した。
-> DONE

=== random_encounter ===
突然、スライムが現れた！
* [戦う]
    スライムを倒した！
    ->->
* [逃げる]
    無事に逃げ切った。
    ->->
```
`->->` でトンネル呼び出し元（この場合は `-> random_encounter ->` の直後）に戻ります。
