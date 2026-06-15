"use client"

import { useEffect, useRef, useCallback } from "react"

interface ScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

/**
 * Custom hook that uses IntersectionObserver to add a `data-visible="true"`
 * attribute when the element scrolls into view, triggering CSS transitions.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -60px 0px", triggerOnce = true } = options
  const ref = useRef<T>(null)

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-visible", "true")
          if (triggerOnce) {
            observer.unobserve(entry.target)
          }
        } else if (!triggerOnce) {
          entry.target.removeAttribute("data-visible")
        }
      })
    },
    [triggerOnce]
  )

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    })

    // Observe the element itself and any children with .scroll-reveal
    observer.observe(element)
    const selectors = ".scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale"
    const children = element.querySelectorAll(selectors)
    children.forEach((child) => observer.observe(child))

    // Watch for dynamically added elements (like async loaded projects)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if the added node itself needs observing
            if (node.matches(selectors)) {
              observer.observe(node)
            }
            // Check if it has children that need observing
            const childElements = node.querySelectorAll(selectors)
            childElements.forEach((child) => observer.observe(child))
          }
        })
      })
    })

    mutationObserver.observe(element, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [handleIntersection, threshold, rootMargin])

  return ref
}
