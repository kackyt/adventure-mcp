## Project Conventions

### Code Style
- ソースコードにはロジックの内容がわかるように日本語のコメントをいれること

### ディレクトリ構造

```
src/
├── domain/           # ドメイン層
│   ├── entities/    # エンティティ
│   ├── values/      # 値オブジェクト
│   └── services/    # ドメインサービス
├── application/      # アプリケーション層
│   ├── usecases/    # ユースケース
│   └── dtos/        # データ転送オブジェクト
├── infrastructure/   # インフラ層
│   ├── repositories/# リポジトリ実装
│   ├── external/    # 外部サービス
│   └── persistence/ # 永続化
├── presentation/     # プレゼンテーション層
│   ├── controllers/ # コントローラ
│   ├── middleware/  # ミドルウェア
│   └── validators/  # バリデータ
└── shared/          # 共通
    ├── constants/   # 定数
    ├── errors/      # エラー定義
    └── utils/       # ユーティリティ
```

### ファイル命名規則

| 種類             | パターン                | 例                           |
| ---------------- | ----------------------- | ---------------------------- |
| TypeScript       | kebab-case.ts           | user-service.ts              |
| テスト           | kebab-case.spec.ts      | user-service.spec.ts         |
| インターフェース | kebab-case.interface.ts | user-repository.interface.ts |
| 型定義           | kebab-case.type.ts      | user.type.ts                 |
| 定数             | kebab-case.constants.ts | api.constants.ts             |

## 3. TypeScript/JavaScript規約

### 変数・関数命名

```typescript
// 変数: camelCase
const userName: string = "John";
const isActive: boolean = true;

// 定数: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = "https://api.example.com";

// 関数: camelCase（動詞から始める）
function getUserById(id: string): User {
  // ...
}

// クラス: PascalCase
class UserService {
  // ...
}

// インターフェース: PascalCase（I prefix推奨）
interface IUserRepository {
  // ...
}

// 型: PascalCase
type UserRole = "admin" | "user" | "guest";

// Enum: PascalCase（値はUPPER_SNAKE_CASE）
enum Status {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING = "PENDING",
}
```

### 型定義

```typescript
// 明示的な型定義を推奨
const count: number = 0;
const name: string = "John";
const items: string[] = [];

// 関数の戻り値型は必須
function calculate(a: number, b: number): number {
  return a + b;
}

// インターフェースの活用
interface User {
  id: string;
  email: string;
  profile?: UserProfile; // オプショナルプロパティ
}

// ユニオン型の活用
type Result<T> = { success: true; data: T } | { success: false; error: Error };

// ジェネリクスの活用
function identity<T>(value: T): T {
  return value;
}
```

### 非同期処理

```typescript
// async/awaitを優先
async function fetchUser(id: string): Promise<User> {
  try {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return user;
  } catch (error) {
    logger.error("Failed to fetch user", { id, error });
    throw error;
  }
}

// Promise.allで並列処理
async function fetchDashboard(userId: string): Promise<Dashboard> {
  const [user, stats, notifications] = await Promise.all([
    fetchUser(userId),
    fetchStats(userId),
    fetchNotifications(userId),
  ]);

  return { user, stats, notifications };
}
```

### エラーハンドリング

```typescript
// カスタムエラークラス
class ValidationError extends Error {
  constructor(
    message: string,
    public details: any[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// エラーハンドリング
try {
  await processData(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // バリデーションエラーの処理
    return { success: false, errors: error.details };
  }

  // 予期しないエラー
  logger.error("Unexpected error", error);
  throw new InternalServerError("Processing failed");
}
```

## 4. React/Vue規約

### コンポーネント命名

```tsx
// React: PascalCase
const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return <div>{user.name}</div>;
};

// ファイル名もPascalCase
// UserProfile.tsx
```

### Props定義

```tsx
// Props型定義
interface UserProfileProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

// デフォルトProps
const defaultProps: Partial<UserProfileProps> = {
  className: "",
};
```

### Hooks使用規則

```tsx
// カスタムHooksは'use'プレフィックス
function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(id)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [id]);

  return { user, loading };
}

// Hooks呼び出しは最上位のみ
function UserComponent({ id }: Props) {
  const { user, loading } = useUser(id); // ✅ OK

  if (condition) {
    // const data = useData(); // ❌ NG: 条件内でのHooks呼び出し
  }

  return <div>{user?.name}</div>;
}
```

## 5. CSS/スタイリング規約

### CSS Modules

```scss
// styles.module.scss
.container {
  padding: 16px;

  &__header {
    font-size: 24px;
    font-weight: bold;
  }

  &__content {
    margin-top: 16px;
  }

  &--active {
    background-color: #f0f0f0;
  }
}
```

### CSS-in-JS

```typescript
// styled-components
const Container = styled.div<{ isActive: boolean }>`
  padding: ${({ theme }) => theme.spacing.medium};
  background-color: ${({ isActive, theme }) =>
    isActive ? theme.colors.active : theme.colors.default};
`;

// emotion
const containerStyle = css`
  padding: 16px;
  display: flex;
  align-items: center;
`;
```

## レビュー方針

あなたの目的は、非常に経験豊富なソフトウェアエンジニアとして機能し、コードの一部を徹底的にレビューし、
以下のようなキーエリアを改善するためのコードスニペットを提案することです

| 重要度 | チェック観点 | 根拠（docs\03-implementation\CONVENTIONS.md） |
|--------|-------------|--------------------------|
| 🔴 CRITICAL | ドメイン層・インフラ層ではドメインエラー を使うべき | エラーハンドリング規約 |
| 🔴 CRITICAL | アプリ層がインフラ層の具体型に直接依存している | DI原則 |
| 🔴 CRITICAL | ロジック変更にテストが伴っていない | テスト戦略 |
| 🔴 CRITICAL | **[アーキテクチャ境界違反]** ドメイン層（`engine/src/domain/`）がインフラ層（`infrastructure/`）のモジュールを `import` している | オニオンアーキテクチャ：依存は内側に向かう |
| 🔴 CRITICAL | **[アーキテクチャ境界違反]** ドメイン層がアプリケーション層（`engine/src/application/`）のモジュールを `import` している | オニオンアーキテクチャ：ドメインはすべての層から独立 |
| 🔴 CRITICAL | **[アーキテクチャ境界違反]** Repository の具象実装が `infrastructure/src/persistence/` 以外（例: `engine/src/domain/`）に配置されている | ヘキサゴナルアーキテクチャ：ポートはドメイン、アダプタ（実装）はインフラ |
| 🔴 CRITICAL | **[アーキテクチャ境界違反]** Usecase/Application Service が `engine/src/application/usecase/` 以外に実装されている | オニオンアーキテクチャ：Usecaseの配置規約 |
| 🔴 CRITICAL | **[DDDドメインモデル違反]** ビジネスロジック（不変条件の保護、状態遷移）がドメインモデル外（Usecase や infrastructure）に漏れている | DDD：ドメインモデルが不変条件を内包すること |
| 🔴 CRITICAL | **[DDDドメインモデル違反]** 複数のエンティティ/集約にまたがるロジックが Usecase に直接記述されており、Domain Service として分離されていない | DDD：Domain Service（`engine/src/domain/service/`）を使うこと |
| 🔴 CRITICAL | **[DDDドメインモデル違反]** Repository の Interface（Trait） が `engine/src/domain/repository/` 以外に定義されている | DDD：RepositoryインターフェースはDomain層が所有する |
| 🔴 CRITICAL | **[ヘキサゴナルアーキテクチャ違反]** プレゼンテーション層（`mcp-server/src/presentation/`）が Usecase を経由せずドメインモデルや Repository を直接呼び出している | ヘキサゴナル：外部からの入力はUsecase（ポート経由）でのみ受け付ける |
| 🔴 CRITICAL | **[Composition Root違反]** DI（依存の組み立て）が `mcp-server/src/index.ts` 以外で行われている | Composition Root原則 |
| 🟡 HIGH | 日本語コメントがない、または意図がわからないコメントのみ | コードスタイル規約 |
| 🟡 HIGH | リソースのライフサイクルが不明瞭 | メモリライフサイクル規約 |
| 🟡 HIGH | SOLID原則違反（単一責任・開放閉鎖など） | SOLID/DRY原則 |
| 🟡 HIGH | DRY違反（重複ロジック） | SOLID/DRY原則 |
| 🟡 HIGH | **[DDDドメインモデル]** DTO（`engine/src/application/dto/`）とドメインモデルの境界が曖昧（Entityが直接プレゼンテーション層に返される等） | DDD：DTO変換はApplication層で行う |
| 🟡 HIGH | **[DDDドメインモデル]** 集約ルート（Aggregate Root）を経由せずに集約内部のエンティティを外部から直接変更している | DDD：集約の整合性境界の維持 |

重要な問題を特定し、解決して全体的なコード品質を向上させることを目指してください。細かい問題は意図的に無視してください。
