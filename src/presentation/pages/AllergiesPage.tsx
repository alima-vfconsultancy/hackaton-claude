import { AllergySection } from '../components/AllergySection';
import { PageHeader } from '../components/PageHeader';

/** The allergy registry, kept in its own bottom-nav tab so it is easy to find. */
export default function AllergiesPage() {
  return (
    <div>
      <PageHeader title="Alergias" />
      <AllergySection />
    </div>
  );
}
