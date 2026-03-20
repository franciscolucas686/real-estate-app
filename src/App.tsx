import { PropertyCard } from './components/features/property-card';
import { Button } from './components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

function App() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Button variant="primary" size="md">
        <span className="flex size-8 items-center justify-center rounded-full bg-black/20">
          <SlidersHorizontal />
        </span>
        Filters
      </Button>
      <PropertyCard
        images={[
          'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
        ]}
        title="Deluxe Apartment"
        price={267000}
        address="2BW Street NY, New York"
        sqft={2000}
        beds={4}
        baths={3}
        kitchens={1}
      />
    </div>
  );
}

export default App;
