import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { BottomNav } from '@/components/common/BottomNav';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface AppShellProps {
  children: React.ReactNode;
  onImportClick?: () => void;
}

export function AppShell({ children, onImportClick }: AppShellProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <Header
          variant="mobile"
          onMenuClick={() => setIsSidebarOpen(true)}
          onImportClick={onImportClick}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden mt-16 mb-16">
          {children}
        </main>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
    );
  }

  // Desktop/Tablet Layout
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Desktop Header */}
      <Header
        variant="desktop"
        onImportClick={onImportClick}
      />

      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Sidebar (hidden on mobile) */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
