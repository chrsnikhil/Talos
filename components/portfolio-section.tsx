"use client"

import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export function PortfolioSection() {
  const sectionRef = useScrollReveal()

  const projects = [
    {
      title: "Video Editing",
      description:
        "Capturing the energy and innovation of hackathons. I edit dynamic recaps and promo videos that highlight the spirit of building and shipping.",
      tag: "Content Creation",
      logo: null,
      bgColor: "bg-[#6366F1]",
      illustration: "/images/video_editing.png",
      link: null,
    },
    {
      title: "Fitness",
      description:
        "Through consistent discipline and dedication, I lost weight and transformed my lifestyle. I believe physical resilience fuels mental clarity and coding performance.",
      tag: "Lifestyle",
      logo: null,
      bgColor: "bg-[#FF6B7A]",
      illustration: "/images/fitness.png",
      link: null,
    },
  ]

  return (
    <section id="portfolio" className="container mx-auto px-4 py-16 md:py-24" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <div className="scroll-reveal text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Beyond coding: My <br />
            <span className="bg-[#FFC224] text-black px-3 py-1 inline-block">other passions</span>
          </h2>
        </div>

        <div className="space-y-8 mb-12">
          {projects.map((project, index) => (
            <div
              key={index}
              className={`scroll-reveal scroll-delay-${index + 1} group grid md:grid-cols-2 bg-white border-[3px] border-black rounded-[32px] overflow-hidden hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}
            >
              <div className="p-6 md:p-12 flex flex-col justify-center bg-white">
                <div className="flex items-center gap-3 mb-6">
                  {project.logo && (
                    <Image
                      src={project.logo}
                      alt={`${project.title} logo`}
                      width={120}
                      height={32}
                      className="h-6 md:h-8 w-auto"
                    />
                  )}
                </div>

                <span className="inline-block bg-black text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 w-fit">
                  {project.tag}
                </span>

                <h3 className="text-xl md:text-[28px] font-bold mb-4 leading-tight md:leading-[40px] text-[#0B0B0B]">
                  {project.title}
                </h3>

                <p className="text-base md:text-[18px] text-[#393939] mb-8 leading-relaxed md:leading-[30px] font-medium">
                  {project.description}
                </p>

                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(project as any).link && (
                  <a
                    href={(project as any).link}
                    className="flex items-center gap-2 font-semibold text-[#0B0B0B] hover:gap-3 transition-all text-sm md:text-base"
                  >
                    View case study
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className={`${project.bgColor} relative overflow-hidden min-h-[250px] md:min-h-[500px]`}>
                <Image
                  src={project.illustration || "/placeholder.svg"}
                  alt={project.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>
            </div>
          ))}
        </div>


      </div>
    </section>
  )
}
