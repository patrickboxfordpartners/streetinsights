/**
 * Onboarding Tour
 * 3-step interactive walkthrough for new users
 */

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    id: "search",
    title: "Search Tickers Instantly",
    description:
      "Press Cmd+K (or Ctrl+K) to open quick search. Find any ticker in seconds, or type '>' to access commands like creating alerts.",
    target: "[data-tour-search]",
    position: "bottom",
  },
  {
    id: "ai-agents",
    title: "AI Investment Analysis",
    description:
      "Get analysis from 6 legendary investor personas (Buffett, Lynch, Graham, etc.). Each brings their unique framework to evaluate stocks.",
    target: "[data-tour-ai]",
    position: "top",
  },
  {
    id: "alerts",
    title: "Set Up Smart Alerts",
    description:
      "Get notified when mention volume spikes or AI sentiment changes. Configure email, webhook, or Telegram notifications.",
    target: "[data-tour-alerts]",
    position: "right",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  // Find and highlight target element
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);

        // Calculate tooltip position based on target element
        const rect = element.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case "bottom":
            top = rect.bottom + scrollY + 20;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case "top":
            top = rect.top + scrollY - 20;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case "left":
            top = rect.top + scrollY + rect.height / 2;
            left = rect.left + scrollX - 20;
            break;
          case "right":
            top = rect.top + scrollY + rect.height / 2;
            left = rect.right + scrollX + 20;
            break;
          default:
            top = rect.bottom + scrollY + 20;
            left = rect.left + scrollX + rect.width / 2;
        }

        setTooltipPosition({ top, left });

        // Scroll to element
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetElement(null);
      }
    } else {
      setTargetElement(null);
    }
  }, [currentStep, step.target, step.position]);

  function handleNext() {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  return (
    <>
      {/* Overlay with spotlight effect */}
      <div className="fixed inset-0 z-[200] pointer-events-none">
        <div className="absolute inset-0 bg-black/60" />
        {targetElement && (
          <div
            className="absolute border-2 border-primary rounded-lg shadow-lg pointer-events-auto"
            style={{
              top: targetElement.offsetTop - 4,
              left: targetElement.offsetLeft - 4,
              width: targetElement.offsetWidth + 8,
              height: targetElement.offsetHeight + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[201] bg-card border rounded-lg shadow-2xl max-w-md p-5"
        style={{
          top: targetElement ? tooltipPosition.top : "50%",
          left: targetElement ? tooltipPosition.left : "50%",
          transform: targetElement
            ? step.position === "left"
              ? "translate(-100%, -50%)"
              : step.position === "right"
                ? "translate(0, -50%)"
                : step.position === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)"
            : "translate(-50%, -50%)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-accent"
                )}
              />
            ))}
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-lg font-bold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {isLastStep ? (
                  <>
                    <Check className="h-4 w-4" />
                    Got it!
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
