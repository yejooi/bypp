import type { Metadata } from "next";
import { Jua, Gaegu, Gowun_Dodum, Noto_Sans_KR, Epilogue, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// 두 Stitch 테마(Cozy Meadow Cart / Strawberry Cocoa Confection)가 쓰는 폰트를 전부 로드해두고,
// globals.css의 [data-theme] 블록에서 --font-heading/--font-body/--font-hand로 골라 쓴다.
const jua = Jua({ variable: "--font-jua", weight: "400", subsets: ["latin"] });
const gaegu = Gaegu({ variable: "--font-gaegu", weight: ["400", "700"], subsets: ["latin"] });
const gowunDodum = Gowun_Dodum({ variable: "--font-gowun-dodum", weight: "400", subsets: ["latin"] });
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const epilogue = Epilogue({ variable: "--font-epilogue", weight: ["600", "700", "800"], subsets: ["latin"] });
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bypp",
  description: "장바구니 정리 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${jua.variable} ${gaegu.variable} ${gowunDodum.variable} ${notoSansKr.variable} ${epilogue.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
