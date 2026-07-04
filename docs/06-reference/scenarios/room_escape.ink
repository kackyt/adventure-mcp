VAR has_key = false

// has_key は解法フラグ（公開するとネタバレ）なので公開ステータスは無し。
VAR public_status = ""

-> locked_room

=== locked_room ===
あなたは鍵のかかった部屋に閉じ込められている。
部屋には頑丈な木の扉と、古びた机がある。

+ [机を調べる]
    机の引き出しを開けると、古びた鍵を見つけた。
    ~ has_key = true
    -> locked_room
+ {has_key} [木の扉の鍵を開ける]
    見つけた鍵を扉の鍵穴に差し込んで回すと、カチャリと音を立てて鍵が開いた。
    -> escape
+ {not has_key} [木の扉を開けようとする]
    扉は硬く閉ざされていて、開く気配がない。
    -> locked_room

=== escape ===
あなたは無事に部屋から脱出した！
-> DONE
