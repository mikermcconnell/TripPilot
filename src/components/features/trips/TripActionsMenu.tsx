import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pencil, Copy, Archive, Download, Trash2, ArchiveRestore } from 'lucide-react';
import type { Trip, TripId } from '@/types';

interface TripActionsMenuProps {
  trip: Trip;
  onEdit: (tripId: TripId) => void;
  onDuplicate: (tripId: TripId) => void;
  onArchive: (tripId: TripId) => void;
  onUnarchive: (tripId: TripId) => void;
  onExport: (tripId: TripId) => void;
  onDelete: (tripId: TripId) => void;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant?: 'default' | 'danger';
  hidden?: boolean;
}

export function TripActionsMenu({
  trip,
  onEdit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onExport,
  onDelete,
  className = '',
}: TripActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isArchived = trip.status === 'archived';

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'edit',
      label: 'Edit Details',
      icon: Pencil,
      action: () => handleAction(() => onEdit(trip.id)),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      action: () => handleAction(() => onDuplicate(trip.id)),
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      action: () => handleAction(() => onArchive(trip.id)),
      hidden: isArchived,
    },
    {
      id: 'unarchive',
      label: 'Unarchive',
      icon: ArchiveRestore,
      action: () => handleAction(() => onUnarchive(trip.id)),
      hidden: !isArchived,
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      action: () => handleAction(() => onExport(trip.id)),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      action: () => handleAction(() => onDelete(trip.id)),
      variant: 'danger',
    },
  ];

  const visibleItems = menuItems.filter(item => !item.hidden);
  const regularItems = visibleItems.filter(item => item.variant !== 'danger');
  const dangerItems = visibleItems.filter(item => item.variant === 'danger');

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={handleMenuClick}
        className="p-2 rounded-lg bg-white/80 hover:bg-white shadow-sm border border-slate-200 transition-all"
        aria-label="Trip actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="w-4 h-4 text-slate-600" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="menu"
        >
          {regularItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                role="menuitem"
              >
                <Icon className="w-4 h-4 text-slate-500" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}

          {dangerItems.length > 0 && (
            <>
              <div className="my-1 border-t border-slate-100" />
              {dangerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                    role="menuitem"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
