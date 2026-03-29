import { WaitlistForm } from "@/components/waitlist-form";
import { SiteHeader } from "@/components/site-header";
import { WaitlistHero } from "@/components/waitlist-hero";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12 sm:flex-row sm:items-center sm:gap-16 sm:py-20">
        <div className="flex-1">
          <WaitlistHero />
        </div>
        <div className="mt-14 flex w-full flex-1 justify-center sm:mt-0">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-tx-surface/55 p-8 shadow-card backdrop-blur-xl sm:p-10">
            <WaitlistForm />
          </div>
        </div>
      </main>
    </div>
  );
}
