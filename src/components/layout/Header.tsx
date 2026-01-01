import { Menu, Plane, Upload } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuthStore } from '@/stores/authStore';

interface HeaderProps {
  variant?: 'mobile' | 'desktop';
  onMenuClick?: () => void;
  onImportClick?: () => void;
}

export function Header({ variant, onMenuClick, onImportClick }: HeaderProps) {
  const isMobile = useIsMobile();
  const effectiveVariant = variant || (isMobile ? 'mobile' : 'desktop');
  const { isAuthenticated } = useAuthStore();

  if (effectiveVariant === 'mobile') {
    return (
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b-2 border-slate-200 z-header flex items-center px-4 safe-area-top">
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-800 active:bg-slate-100 rounded-xl transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 ml-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl border-b-4 border-blue-700 flex items-center justify-center text-white">
            <Plane className="w-5 h-5 transform -rotate-45" />
          </div>
          <h1 className="font-extrabold text-xl tracking-tight text-slate-700">
            TripPilot
          </h1>
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          {onImportClick && (
            <button
              onClick={onImportClick}
              className="p-2 text-slate-500 hover:text-slate-700 active:bg-slate-100 rounded-xl transition-colors"
              aria-label="Import itinerary"
            >
              <Upload className="w-5 h-5" />
            </button>
          )}
          {isAuthenticated ? <UserMenu /> : <LoginButton />}
        </div>
      </header>
    );
  }

  // Desktop Header
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b-2 border-slate-200 z-header flex items-center justify-between px-6">
      {/* Logo & Breadcrumbs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl border-b-4 border-blue-700 flex items-center justify-center text-white">
            <Plane className="w-6 h-6 transform -rotate-45" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight text-slate-700">
            TripPilot
          </h1>
        </div>
        <div className="hidden xl:block border-l-2 border-slate-200 pl-6">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="btn-press flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-2 border-slate-200 border-b-4 font-bold text-sm rounded-xl transition-all uppercase tracking-wide"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
        )}
        {isAuthenticated ? <UserMenu /> : <LoginButton />}
      </div>
    </header>
  );
}
