import Hero from "@/components/hero/Hero";
import Features from "@/components/features/Features";
import MonthEnd from "@/components/monthend/MonthEnd";
import FaceCheck from "@/components/facecheck/FaceCheck";
import Rules from "@/components/rules/Rules";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <MonthEnd />
      <FaceCheck />
      <Rules />
    </main>
  );
}
