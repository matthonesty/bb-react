'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS } from '@/lib/constants';
import { Menu, X, LogOut, ChevronDown } from 'lucide-react';

const FORM_ITEMS = [
  { label: 'FC Feedback', href: '/fc-feedback' },
  { label: 'FC Application', href: '/fc-application' },
  { label: 'Bombing Intel', href: '/bombing-intel' },
];

/**
 * Header component with navigation and user menu
 * Includes mobile responsive hamburger menu
 */
export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [formsMenuOpen, setFormsMenuOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user?.roles.some((role) => item.roles?.includes(role));
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-header-border bg-header-bg backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="Bombers Bar"
                className="h-10 w-10"
              />
              <span className="text-xl font-bold text-foreground">
                Bombers Bar
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-1">
            {/* Forms Dropdown - Always visible */}
            <div className="relative">
              <button
                onClick={() => setFormsMenuOpen(!formsMenuOpen)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors flex items-center space-x-1"
              >
                <span>Forms</span>
                <ChevronDown size={16} />
              </button>

              {formsMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFormsMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-48 rounded-md bg-card-bg border border-card-border shadow-lg z-20">
                    {FORM_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setFormsMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors first:rounded-t-md last:rounded-b-md"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Authenticated user nav items */}
            {isAuthenticated && visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop User Menu */}
          {isAuthenticated && user ? (
            <div className="hidden md:flex md:items-center md:space-x-2">
              {/* System Link (Admin Only) */}
              {user.roles.includes('admin') && (
                <Link
                  href="/system"
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
                >
                  System
                </Link>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background-secondary transition-colors"
                >
                  <img
                    src={`https://images.evetech.net/characters/${user.character_id}/portrait?size=32`}
                    alt={user.character_name}
                    className="h-6 w-6 rounded-full"
                  />
                  <span>{user.character_name}</span>
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-md bg-card-bg border border-card-border shadow-lg z-20">
                      <button
                        onClick={logout}
                        className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:block">
              <img
                src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
                alt="Login with EVE Online"
                onClick={() => {
                  const returnUrl = encodeURIComponent(window.location.pathname);
                  window.location.href = `/api/auth/login?return_url=${returnUrl}`;
                }}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-md p-2 text-foreground hover:bg-background-secondary transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background-secondary">
          <nav className="px-4 py-3 space-y-1">
            {/* Forms section - Always visible */}
            <div className="mb-2">
              <p className="px-3 py-2 text-xs font-semibold text-foreground-muted uppercase">Forms</p>
              {FORM_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-background-tertiary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Authenticated user nav items */}
            {isAuthenticated && visibleNavItems.length > 0 && (
              <div className="border-t border-border pt-2">
                {visibleNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-background-tertiary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* User profile section (authenticated only) */}
          {isAuthenticated && user && (
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center space-x-2">
                <img
                  src={`https://images.evetech.net/characters/${user.character_id}/portrait?size=32`}
                  alt={user.character_name}
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user.character_name}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {user.corporation_name}
                  </p>
                </div>
              </div>

              {/* System Link (Admin Only) */}
              {user.roles.includes('admin') && (
                <Link
                  href="/system"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background-tertiary transition-colors mb-2"
                >
                  System
                </Link>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background-tertiary transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Login section (unauthenticated only) */}
          {!isAuthenticated && (
            <div className="border-t border-border px-4 py-3">
              <img
                src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
                alt="Login with EVE Online"
                onClick={() => {
                  const returnUrl = encodeURIComponent(window.location.pathname);
                  window.location.href = `/api/auth/login?return_url=${returnUrl}`;
                }}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
