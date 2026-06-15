"use client"

import { Star, ArrowUpRight, GitFork, Globe, Github, Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

interface Project {
  id: string
  name: string
  description: string
  html_url: string
  homepage_url: string | null
  pushed_at: string
  created_at: string
  forks_count: number
  language: string | null
  language_color: string
  stargazers_count: number
  license: string | null
  topics: string[]
}

const RULE = "3px solid var(--t-ink)"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays}d`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`
  return `${Math.floor(diffDays / 365)}y`
}

function SkeletonCard() {
  return (
    <div className="vl-card bg-white flex flex-col h-full min-h-[340px]" style={{ borderRadius: "var(--t-border-radius)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: RULE }}>
        <div className="vl-skeleton h-6 w-1/2" />
        <div className="vl-skeleton h-6 w-16" />
      </div>
      <div className="p-5 flex-1">
        <div className="vl-skeleton h-4 w-full mb-2" />
        <div className="vl-skeleton h-4 w-5/6 mb-2" />
        <div className="vl-skeleton h-4 w-2/3 mb-6" />
        <div className="flex gap-2">
          <div className="vl-skeleton h-6 w-16" />
          <div className="vl-skeleton h-6 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-4" style={{ borderTop: RULE }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vl-skeleton h-12 m-2" />
        ))}
      </div>
    </div>
  )
}

function BoxScoreCell({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-2.5 px-1 text-center"
      style={{ borderRight: last ? undefined : RULE }}
    >
      <span className="text-[8px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--t-text-muted)" }}>
        {label}
      </span>
      <span
        className="text-sm font-bold mt-0.5 flex items-center gap-1"
        style={{ fontFamily: "var(--t-font-mono)", color: "var(--t-ink)" }}
      >
        {children}
      </span>
    </div>
  )
}

export function ServicesSection() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useScrollReveal()

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) setProjects(data)
        }
      } catch (error) {
        console.error("Failed to load projects", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative overflow-hidden py-20 md:py-28"
      style={{ borderBottom: RULE, background: "var(--t-paper)" }}
    >
      {/* backdrop word */}
      <div aria-hidden="true" className="vl-backdrop-type vl-outline absolute -top-2 right-[-0.04em] z-0 text-[clamp(60px,11vw,180px)]">
        Projects
      </div>
      {/* right rail */}
      <span
        aria-hidden="true"
        className="vl-rail-vertical hidden lg:block absolute right-6 top-32 z-20 text-3xl"
        style={{ color: "var(--t-red)" }}
      >
        作品集
      </span>

      <div className="relative z-10 px-5 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal mb-12 md:mb-16">
            <h2 className="vl-display text-[clamp(40px,7vw,92px)] leading-[0.85] mb-4" style={{ color: "var(--t-navy)" }}>
              Projects
            </h2>
            <p className="text-base md:text-lg font-medium leading-relaxed max-w-2xl" style={{ color: "var(--t-text-muted)" }}>
              A selection of my pinned projects, straight from GitHub.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
            ) : (
              <>
                {projects.map((project, index) => {
                  const delayClass = `scroll-delay-${Math.min(index + 1, 6)}`
                  return (
                    <article
                      key={project.id}
                      className={`scroll-reveal ${delayClass} vl-card bg-white flex flex-col h-full min-h-[340px] relative overflow-hidden`}
                      style={{ borderRadius: "var(--t-border-radius)" }}
                    >
                      {/* language-color accent stripe */}
                      <div aria-hidden="true" className="h-1.5 w-full" style={{ background: project.language_color || "var(--t-red)" }} />

                      {/* big solid jersey number filling the body */}
                      <span
                        aria-hidden="true"
                        className="vl-display absolute -bottom-12 right-1 text-[190px] leading-none select-none pointer-events-none"
                        style={{ color: "var(--t-navy)", opacity: 0.09 }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {/* header bar — navy */}
                      <div className="flex items-stretch" style={{ borderBottom: RULE, background: "var(--t-navy)" }}>
                        <h3
                          className="vl-display flex-1 flex items-center px-4 py-3 text-lg leading-none line-clamp-1 text-white"
                          title={project.name}
                        >
                          {project.name}
                        </h3>
                        {project.homepage_url && (
                          <a
                            href={project.homepage_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center px-3 text-white hover:bg-white hover:text-[var(--t-navy)] transition-colors"
                            style={{ borderLeft: "3px solid var(--t-paper)" }}
                            title="Live demo"
                          >
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={project.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link flex items-center justify-center px-3 text-white hover:bg-[var(--t-red)] transition-colors"
                          style={{ borderLeft: "3px solid var(--t-paper)" }}
                          title="View source"
                        >
                          <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover/link:rotate-45" />
                        </a>
                      </div>

                      {/* body */}
                      <div className="p-5 flex-1 relative z-10">
                        <p className="text-sm leading-relaxed font-medium mb-4 line-clamp-3" style={{ color: "var(--t-text-muted)" }}>
                          {project.description || "No description available."}
                        </p>
                        {project.topics && project.topics.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {project.topics.slice(0, 4).map((topic) => (
                              <span
                                key={topic}
                                className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em]"
                                style={{ border: "2px solid var(--t-ink)", color: "var(--t-ink)" }}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* box-score footer */}
                      <div className="grid grid-cols-4 relative z-10" style={{ borderTop: RULE }}>
                        <BoxScoreCell label="Stars">
                          <Star className="w-3 h-3 fill-current" /> {project.stargazers_count}
                        </BoxScoreCell>
                        <BoxScoreCell label="Forks">
                          <GitFork className="w-3 h-3" /> {project.forks_count}
                        </BoxScoreCell>
                        <BoxScoreCell label="Lang">
                          {project.language ? (
                            <>
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black inline-block"
                                style={{ backgroundColor: project.language_color }}
                              />
                              <span className="text-[11px]">{project.language}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </BoxScoreCell>
                        <BoxScoreCell label="Updated" last>
                          {formatDate(project.pushed_at)}
                        </BoxScoreCell>
                      </div>
                    </article>
                  )
                })}

                {/* FREE AGENT card */}
                <article
                  className="scroll-reveal scroll-delay-6 vl-card flex flex-col items-center justify-center text-center p-8 min-h-[340px] relative overflow-hidden"
                  style={{ borderRadius: "var(--t-border-radius)", background: "var(--t-navy)" }}
                >
                  <div className="absolute inset-3 border-2 border-white/70 pointer-events-none" />
                  <span className="vl-display text-6xl mb-3 leading-none text-white">OPEN</span>
                  <h3 className="text-xl font-bold mb-2 text-white">Open to Work</h3>
                  <p className="text-sm font-medium mb-6 text-white/80 max-w-[260px]">
                    Looking for a developer? Get in touch with me!
                  </p>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=chrsnikhil@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vl-btn inline-flex items-center gap-2 px-7 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em] text-white"
                    style={{ background: "var(--t-red)", borderColor: "var(--t-paper)" }}
                  >
                    <Mail className="w-4 h-4" /> Get in touch
                  </a>
                </article>
              </>
            )}
          </div>

          {!loading && (
            <div className="scroll-reveal mt-12 flex justify-center">
              <a
                href="https://github.com/chrsnikhil?tab=repositories"
                target="_blank"
                rel="noopener noreferrer"
                className="vl-btn inline-flex items-center gap-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
                style={{ background: "var(--t-bg-card)", color: "var(--t-ink)" }}
              >
                <Github className="w-5 h-5" />
                View all repositories
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
