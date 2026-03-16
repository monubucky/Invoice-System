import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   iconBg: 'bg-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  iconBg: 'bg-green-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    iconBg: 'bg-red-100' },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  iconBg: 'bg-amber-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', iconBg: 'bg-purple-100' },
};

export default function StatsCard({
  title, value, subtitle, icon: Icon, trend, color = 'blue'
}: StatsCardProps) {
  const colors = colorMap[color];
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-2',
              trend.positive ? 'text-green-600' : 'text-red-500')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
            </p>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', colors.iconBg)}>
          <Icon size={20} className={colors.icon} />
        </div>
      </div>
    </div>
  );
}