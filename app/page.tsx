import { WaitlistForm } from "@/components/waitlist-form";
import { WaitlistHero } from "@/components/waitlist-hero";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 sm:flex-row sm:items-center sm:gap-16">
      <div className="flex-1">
        <WaitlistHero />
      </div>
      <div className="mt-12 flex flex-1 justify-center sm:mt-0">
        <WaitlistForm />
      </div>
    </main>
  );
}
