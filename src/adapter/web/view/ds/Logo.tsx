// vendor/logos.svg 是一份 SVG sprite：每個 logo 是一個 <symbol id="logo-xxx">。
// 用法是 <use href="#logo-xxx" />，而 sprite 必須先被塞進 document 裡——外部檔案的
// href="file.svg#id" 在 Chrome 會被擋（同源與 sprite 的老問題），所以 main.tsx 會把
// 它 fetch 進來 prepend 到 body。
export interface LogoProps {
  id: string;
  size?: number;
}

export function Logo({ id, size = 28 }: LogoProps) {
  return (
    <svg class="logo" width={size} height={size} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}
