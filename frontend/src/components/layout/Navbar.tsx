'use client';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface NavbarProps {
  title: string;
  subtitle?: string;
}

export default function Navbar({ title, subtitle }: NavbarProps) {
  const { business } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-400 relative">
          <Bell size={18} />
        </button>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{business?.name}</p>
          <p className="text-xs text-gray-400">{business?.currency}</p>
        </div>
      </div>
    </header>
  );
}