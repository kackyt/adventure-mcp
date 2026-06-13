// neo-blessed は blessed と API 互換だが型定義を同梱しないため、
// @types/blessed の型を "neo-blessed" 指定子に再エクスポートする。
declare module "neo-blessed" {
  export * from "blessed";
}
