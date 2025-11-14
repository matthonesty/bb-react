/**
 * Footer component
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background-secondary mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm text-foreground-muted">
            &copy; {currentYear} Bombers Bar. EVE Online and the EVE logo are the registered trademarks of CCP hf.
          </p>
        </div>
      </div>
    </footer>
  );
}
