import { Button } from '@/components/ui/button';
import { NEED_CATEGORIES, NeedCategory } from '@/lib/constants';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: NeedCategory | 'all';
  onCategoryChange: (category: NeedCategory | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onCategoryChange('all')}
        className="gap-2"
      >
        <Icons.LayoutGrid className="h-4 w-4" />
        Alla
      </Button>
      {(Object.entries(NEED_CATEGORIES) as [NeedCategory, typeof NEED_CATEGORIES[NeedCategory]][]).map(
        ([key, value]) => {
          const IconComponent = (Icons as any)[value.icon] || Icons.HelpCircle;
          return (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(key)}
              className={cn(
                'gap-2',
                selectedCategory === key && 'shadow-md'
              )}
            >
              <IconComponent className="h-4 w-4" />
              {value.label}
            </Button>
          );
        }
      )}
    </div>
  );
}
