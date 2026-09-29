import { Header, Hero, Explore, WhyUs, HowToBuy, Footer } from './components/Sections.jsx';
import Finder from './components/Finder.jsx';
import BrandStudio from './components/BrandStudio.jsx';

export default function App() {
  return (
    <>
      <Header />
      <main id="contenido">
        <Hero />
        <Explore />
        <Finder />
        <BrandStudio />
        <WhyUs />
        <HowToBuy />
      </main>
      <Footer />
    </>
  );
}
