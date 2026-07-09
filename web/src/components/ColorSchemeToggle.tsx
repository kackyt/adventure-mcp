import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";

/**
 * ライト／ダークのテーマを切り替えるトグルボタン。
 * 現在の実効カラースキーム（auto の場合は OS 設定を解決した結果）を見て反対側へ切り替える。
 * 選択はMantineProvider が localStorage に永続化するため、リロード後も維持される。
 */
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const isDark = computed === "dark";

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="md"
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      title={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
    >
      {isDark ? "☀️" : "🌙"}
    </ActionIcon>
  );
}
