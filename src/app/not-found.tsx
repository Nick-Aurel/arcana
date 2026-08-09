export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--arc-bg)] px-6 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--arc-ink)]">
        Page not found
      </h1>
      <p className="text-sm text-[var(--arc-ink-muted)]">
        That page may have been deleted.
      </p>
      <a
        href="/"
        className="mt-2 text-sm font-medium text-[var(--arc-accent)] underline-offset-2 hover:underline"
      >
        Back to Arcana
      </a>
    </div>
  );
}
