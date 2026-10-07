import Hero from "@/components/hero/Hero";
import Features from "@/components/features/Features";
import MonthEnd from "@/components/monthend/MonthEnd";
import FaceCheck from "@/components/facecheck/FaceCheck";
import Rules from "@/components/rules/Rules";
import Apps from "@/components/apps/Apps";
import Cta from "@/components/cta/Cta";
import Footer from "@/components/footer/Footer";
import DemoSheet from "@/components/demo/DemoSheet";

export default function Home() {
  return (
    <>
    <main>
      <Hero />
      <Features />
      <FaceCheck />
      <Rules />
      <MonthEnd />
      <Apps />
      <Cta />
    </main>
    <Footer />
    <DemoSheet />
    </>
  );
}
