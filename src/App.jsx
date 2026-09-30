import { Header, Hero, Explore, WhyUs, HowToBuy, Footer } from './components/Sections.jsx';
import Finder from './components/Finder.jsx';
import BrandStudio from './components/BrandStudio.jsx';
import Contact, { WhatsAppFab } from './components/Contact.jsx';

export default function App() {
  return (
    <>
      <Header />
      <main id="contenido">
        <Hero />
        <WhyUs />
        <Explore />
        <Finder />
        <HowToBuy />
        <BrandStudio />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
