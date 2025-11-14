'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS } from '@/lib/constants';
import { Menu, X, LogOut, ChevronDown } from 'lucide-react';

/**
 * Header component with navigation and user menu
 * Includes mobile responsive hamburger menu
 */
export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
          {isAuthenticated && (
            <nav className="hidden md:flex md:items-center md:space-x-1">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Desktop User Menu */}
          {isAuthenticated && user ? (
            <div className="hidden md:block relative">
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
          ) : (
            <div className="hidden md:block">
              <img
                src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
                alt="Login with EVE Online"
                onClick={() => (window.location.href = '/api/auth/login')}
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
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-border bg-background-secondary">
          <nav className="px-4 py-3 space-y-1">
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
          </nav>

          {user && (
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
        </div>
      )}

      {/* Mobile Login Menu */}
      {mobileMenuOpen && !isAuthenticated && (
        <div className="md:hidden border-t border-border bg-background-secondary px-4 py-3">
          <img
            src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
            alt="Login with EVE Online"
            onClick={() => (window.location.href = '/api/auth/login')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />
        </div>
      )}
    </header>
  );
}
