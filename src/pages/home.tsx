import { PropertyList } from '../components/features/property-list';
import { PageContainer } from '../components/ui/page-container';

export function Home() {
  return (
    <div
      data-slot="page-home"
      className="flex flex-col
    "
    >
      <PageContainer className="pt-4 pb-3">
        <h1 className="text-2xl font-bold text-foreground">Imóveis</h1>
      </PageContainer>
      <PageContainer className="pb-24">
        <PropertyList />
      </PageContainer>
    </div>
  );
}
