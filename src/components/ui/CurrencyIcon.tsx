import { CURRENCIES } from '@/config/constants';

interface CurrencyIconProps {
  currency: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
};

export default function CurrencyIcon({ currency, size = 'md' }: CurrencyIconProps) {
  const found = CURRENCIES.find((c) => c.code === currency);
  const icon = found?.icon || '🪙';

  return <span className={sizeClasses[size]}>{icon}</span>;
}
