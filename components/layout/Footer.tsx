/**
 * Footer component
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background-secondary mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-foreground-muted">
            &copy; {currentYear} Bombers Bar. EVE Online and the EVE logo are the registered trademarks of CCP hf.
          </p>
          <div className="flex gap-4 text-sm text-foreground-muted">
            <a
              href="https://www.eveonline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              EVE Online
            </a>
            <a
              href="https://zkillboard.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              zKillboard
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
