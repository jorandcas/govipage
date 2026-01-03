import Header from "./components/Header";
import Plans from "./components/Plans";
import Coverage from "./components/Coverage";
import Footer from "./components/Footer";
import WhyMovistar from "./components/WhyMovistar";
import Banner from "./components/Banner";
export default function App() {
  return (
    <>
      <Header />
      <main className="pt-12">
        <Banner />
        <Plans />
         <Coverage />
         <WhyMovistar />
      </main>
      <Footer />
    </>
  );
}





