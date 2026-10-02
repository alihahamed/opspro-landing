import Hero from "@/components/hero/Hero";
import Features from "@/components/features/Features";
import MonthEnd from "@/components/monthend/MonthEnd";
import FaceCheck from "@/components/facecheck/FaceCheck";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <MonthEnd />
      <FaceCheck />
    </main>
  );
}
