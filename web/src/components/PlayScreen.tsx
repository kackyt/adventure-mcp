import {
  Accordion,
  Alert,
  Badge,
  Button,
  CopyButton,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { type FormEvent, useState } from "react";
import { useStore } from "zustand";
import { gameStore } from "../store/game-store-instance.ts";

/** 本文・選択肢・公開ステータス・自由入力・履歴・セーブ出力を備えたプレイ画面。 */
export function PlayScreen() {
  const scenarioTitle = useStore(gameStore, (s) => s.scenarioTitle);
  const snapshot = useStore(gameStore, (s) => s.snapshot);
  const turns = useStore(gameStore, (s) => s.turns);
  const busy = useStore(gameStore, (s) => s.busy);
  const [inputValue, setInputValue] = useState("");
  const [exportOpened, exportModal] = useDisclosure(false);
  const [exportText, setExportText] = useState("");

  if (!snapshot) {
    return null;
  }

  const statusEntries = snapshot.status ? Object.entries(snapshot.status) : [];
  // 最新ターンは現在の本文と同じものなので、履歴には過去ターン（行動済み）のみを出す
  const pastTurns = turns.filter((turn) => turn.choice !== null);

  function handleSubmitInput(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (inputValue.trim().length === 0) return;
    gameStore.getState().submitInput(inputValue);
    setInputValue("");
  }

  function openExportModal(): void {
    try {
      setExportText(gameStore.getState().exportSave());
      exportModal.open();
    } catch {
      // exportSave はプレイ中である限り成功する。万一の場合もモーダルを開かないだけでよい。
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>{scenarioTitle}</Title>
        <Group gap="xs">
          <Button variant="default" size="xs" onClick={openExportModal}>
            セーブデータを書き出す
          </Button>
          <Button variant="default" size="xs" onClick={() => gameStore.getState().backToList()}>
            タイトルへ戻る
          </Button>
        </Group>
      </Group>

      {statusEntries.length > 0 && (
        <Group gap="xs">
          {statusEntries.map(([name, value]) => (
            <Badge key={name} variant="light" size="lg">
              {name}: {String(value)}
            </Badge>
          ))}
        </Group>
      )}

      {/* 本文はウィンドウ相対の固定高にし、はみ出た分はスクロールさせる。
          こうすると本文量に関わらず選択肢が同じ位置に留まり、ターンごとに動かない。 */}
      <Paper withBorder p="lg">
        <ScrollArea h="42vh" type="auto" offsetScrollbars>
          <Text style={{ whiteSpace: "pre-wrap" }}>{snapshot.scene}</Text>
        </ScrollArea>
      </Paper>

      {snapshot.ended ? (
        <Alert color="teal" title="物語はここで終わりです">
          <Group mt="sm">
            <Button onClick={() => gameStore.getState().backToList()}>タイトルへ戻る</Button>
          </Group>
        </Alert>
      ) : snapshot.awaitingInput ? (
        <form onSubmit={handleSubmitInput}>
          <Stack gap="xs">
            <Text fw={500}>入力が求められている……</Text>
            <Group align="flex-end">
              <TextInput
                value={inputValue}
                onChange={(event) => setInputValue(event.currentTarget.value)}
                placeholder="ここに入力"
                style={{ flexGrow: 1 }}
                disabled={busy}
              />
              <Button type="submit" disabled={busy || inputValue.trim().length === 0}>
                送信
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Stack gap="xs">
          {snapshot.choices.map((choice) => (
            <Button
              key={choice.index}
              variant="outline"
              justify="flex-start"
              onClick={() => gameStore.getState().choose(choice.index)}
              disabled={busy}
            >
              {choice.text}
            </Button>
          ))}
        </Stack>
      )}

      {pastTurns.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="history">
            <Accordion.Control>行動履歴（{pastTurns.length} ターン）</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {pastTurns.map((turn) => (
                  <Paper key={turn.turn} withBorder p="sm">
                    <Text size="xs" c="dimmed">
                      ターン {turn.turn}
                    </Text>
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {turn.scene}
                    </Text>
                    <Text size="sm" fw={500} mt="xs">
                      ▶ {turn.choice}
                    </Text>
                  </Paper>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}

      <Modal
        opened={exportOpened}
        onClose={exportModal.close}
        title="セーブデータのエクスポート"
        size="lg"
      >
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            この文字列を控えておくと、別のブラウザでも「セーブデータから再開」で続きを遊べます。
          </Text>
          <Textarea value={exportText} readOnly autosize minRows={4} maxRows={10} />
          <Group>
            <CopyButton value={exportText}>
              {({ copied, copy }) => (
                <Button onClick={copy} color={copied ? "teal" : undefined}>
                  {copied ? "コピーしました" : "クリップボードへコピー"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
