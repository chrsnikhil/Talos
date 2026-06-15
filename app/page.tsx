"use client"

import { HeroSection } from "@/components/hero-section"
import { LogoMarquee } from "@/components/logo-marquee"
import { ServicesSection } from "@/components/services-section"
import { AboutSection } from "@/components/about-section"
import { CareerSection } from "@/components/career-section"
import { InterestsSection } from "@/components/interests-section"
import { ExperienceSection } from "@/components/experience-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen relative" style={{ color: "var(--t-ink)", background: "var(--t-paper)" }}>
      <HeroSection />
      <LogoMarquee />
      <ServicesSection />
      <AboutSection />
      <CareerSection />
      <InterestsSection />
      <ExperienceSection />
      <Footer />
    </main>
  )
}
