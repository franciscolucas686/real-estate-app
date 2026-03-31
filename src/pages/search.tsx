import { PropertyList } from '../components/features/property-list';
import { Button } from '../components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

export function Search() {
  return (
    <div data-slot="page-search" className="flex flex-col items-center gap-6 p-4">
      <Button variant="primary" size="md">
        <span className="flex size-8 items-center justify-center rounded-full bg-black/20">
          <SlidersHorizontal />
        </span>
        Filters
      </Button>
      <PropertyList />
    </div>
  );
}
