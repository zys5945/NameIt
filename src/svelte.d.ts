declare module "*.svelte";

declare module "*.svg" {
  const content: string;
  export default content;
}
