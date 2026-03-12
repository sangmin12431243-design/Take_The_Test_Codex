import Link from "next/link";

export function PageShell({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          ← 첫 페이지로
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </section>
    </main>
  );
}
