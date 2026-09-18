import type { Metadata } from "next";
import { Jua, Gaegu, Gowun_Dodum, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// 두 테마(Cozy Meadow Cart / Strawberry Cocoa Confection) 다 이 폰트들을 공유한다
// (사용자 요청: 테마별로 폰트가 다르면 글씨 크기/모양이 묘하게 어긋나서, 색만 바뀌게 폰트는 통일).
const jua = Jua({ variable: "--font-jua", weight: "400", subsets: ["latin"] });
const gaegu = Gaegu({ variable: "--font-gaegu", weight: ["400", "700"], subsets: ["latin"] });
const gowunDodum = Gowun_Dodum({ variable: "--font-gowun-dodum", weight: "400", subsets: ["latin"] });
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600", "700"],
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
      className={`${jua.variable} ${gaegu.variable} ${gowunDodum.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
