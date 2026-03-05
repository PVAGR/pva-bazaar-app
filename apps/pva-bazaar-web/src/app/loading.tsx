export default function Loading() {
  return (
    <section className="flex flex-col gap-6 py-12">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
        Loading
      </p>
      <div className="h-8 w-8 rounded-full border-2 border-sky-400/60 border-t-sky-300 animate-spin" aria-hidden />
    </section>
  );
}
