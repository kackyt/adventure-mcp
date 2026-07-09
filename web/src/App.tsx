import { Alert, Container, Stack, Text, Title } from "@mantine/core";
import { useStore } from "zustand";
import { PlayScreen } from "./components/PlayScreen.tsx";
import { ScenarioList } from "./components/ScenarioList.tsx";
import { gameStore } from "./store/game-store-instance.ts";

export function App() {
  const phase = useStore(gameStore, (s) => s.phase);
  const error = useStore(gameStore, (s) => s.error);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {phase === "list" && (
          <Stack gap={4}>
            <Title order={1}>Ink Adventure Player</Title>
            <Text c="dimmed">ブラウザだけで遊べるテキストアドベンチャー</Text>
          </Stack>
        )}
        {error && (
          <Alert
            color="red"
            title="エラー"
            withCloseButton
            onClose={() => gameStore.getState().clearError()}
          >
            {error}
          </Alert>
        )}
        {phase === "list" ? <ScenarioList /> : <PlayScreen />}
      </Stack>
    </Container>
  );
}
