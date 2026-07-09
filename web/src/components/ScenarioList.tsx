import { Button, Card, Group, Loader, Stack, Text, Textarea, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { gameStore } from "../store/game-store-instance.ts";

/** シナリオ一覧と「はじめから／続きから」「セーブデータのインポート」を提供する画面。 */
export function ScenarioList() {
  const scenarios = useStore(gameStore, (s) => s.scenarios);
  const scenariosLoading = useStore(gameStore, (s) => s.scenariosLoading);
  const busy = useStore(gameStore, (s) => s.busy);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    if (gameStore.getState().scenarios === null) {
      void gameStore.getState().loadScenarios();
    }
  }, []);

  if (scenariosLoading || scenarios === null) {
    return (
      <Group justify="center" py="xl">
        <Loader />
        <Text>シナリオ一覧を読み込んでいます…</Text>
      </Group>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>シナリオを選ぶ</Title>
      {scenarios.length === 0 && (
        <Text c="dimmed">公開中のシナリオがありません。時間をおいて再読み込みしてください。</Text>
      )}
      {scenarios.map((scenario) => (
        <Card key={scenario.id} withBorder shadow="sm" padding="lg">
          <Stack gap="xs">
            <Title order={3}>{scenario.title}</Title>
            {scenario.description && <Text c="dimmed">{scenario.description}</Text>}
            <Group>
              <Button
                onClick={() => void gameStore.getState().startGame(scenario.id)}
                disabled={busy}
              >
                はじめから
              </Button>
              {gameStore.getState().hasAutoSave(scenario.id) && (
                <Button
                  variant="light"
                  onClick={() => void gameStore.getState().resumeGame(scenario.id)}
                  disabled={busy}
                >
                  続きから
                </Button>
              )}
            </Group>
          </Stack>
        </Card>
      ))}

      <Card withBorder padding="lg">
        <Stack gap="xs">
          <Title order={3}>セーブデータから再開</Title>
          <Text size="sm" c="dimmed">
            プレイ画面でエクスポートしたセーブ文字列を貼り付けると、その続きから再開できます。
          </Text>
          <Textarea
            value={importText}
            onChange={(event) => setImportText(event.currentTarget.value)}
            placeholder="ADVSAVE.web.v1. で始まる文字列を貼り付け"
            autosize
            minRows={3}
          />
          <Group>
            <Button
              onClick={() => void gameStore.getState().importSave(importText)}
              disabled={busy || importText.trim().length === 0}
            >
              セーブデータを読み込む
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
