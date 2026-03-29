import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-tx-bg/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-2" href="/">
          <Image
            alt="Tradexy"
            className="h-8 w-auto"
            height={46}
            priority
            src="/tradexy-email-logo.png"
            width={180}
          />
        </Link>
      </div>
    </header>
  );
}
