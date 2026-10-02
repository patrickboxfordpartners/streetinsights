import { useState, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
import { Navigate, useSearchParams } from "react-router-dom"
import { SignUp as ClerkSignUp } from "@clerk/clerk-react"
import logoIcon from "../assets/logo-icon.png"
import { useBilling } from "../hooks/useBilling"
import { usePageMeta } from "../hooks/usePageMeta"
import { useUnsplashPhoto } from "../hooks/useUnsplashPhoto"

export function SignUp() {
  usePageMeta({ title: "Create Account", description: "Sign up for Street Insights to get AI-powered stock sentiment alerts and market signal tracking." })
  const { session, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const checkoutSuccess = searchParams.get("checkout") === "success"
  const planFromUrl = searchParams.get("plan")
  const photo = useUnsplashPhoto()

  const { startCheckout, loading: checkoutLoading } = useBilling()

  useEffect(() => {
    if (session) {
      const plan = planFromUrl || localStorage.getItem("pending_plan")
      if (plan) {
        localStorage.removeItem("pending_plan")
        startCheckout(plan)
      }
    }
  }, [session, planFromUrl, startCheckout])

  useEffect(() => {
    if (planFromUrl) {
      localStorage.setItem("pending_plan", planFromUrl)
    }
  }, [planFromUrl])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-10 w-10 animate-pulse">
          <img src={logoIcon} alt="Street Insights logo" className="h-full w-full" />
        </div>
      </div>
    )
  }

  if (session && !planFromUrl && !localStorage.getItem("pending_plan")) {
    return <Navigate to="/pricing" replace />
  }

  return (
    <div className="min-h-screen flex">
      {/* Left -- Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex justify-center mb-14">
            <img src={logoIcon} alt="Street Insights logo" className="h-10 w-auto" />
          </div>

          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight mb-2">
            Create your account
          </h1>
          <p className="text-gray-500 text-[15px] mb-8">
            AI-powered stock sentiment intelligence
          </p>

          {checkoutSuccess && (
            <div className="mb-4 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-center">
              Payment successful, create your account to get started
            </div>
          )}

          {checkoutLoading && (
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center">
              Redirecting to checkout...
            </div>
          )}

          <ClerkSignUp
            routing="hash"
            signInUrl="/login"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none p-0 w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100",
                formButtonPrimary:
                  "bg-gray-900 hover:bg-gray-800 text-white h-12 text-[15px] font-medium rounded-lg",
                formFieldInput:
                  "h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg text-[15px] placeholder:text-gray-400 focus:bg-white focus:border-gray-300",
                formFieldLabel: "text-gray-700 text-sm font-medium",
                footerAction: "hidden",
                footer: "hidden",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-400 text-sm",
              },
            }}
          />

          {/* Legal footer */}
          <div className="mt-8 flex justify-center gap-4">
            <a href="/privacy" className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
              Privacy
            </a>
            <a href="/terms" className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>

      {/* Right -- Photo */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src={photo.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-4 right-4 text-white/70 text-xs">
          Photo by{" "}
          <a href={photo.photographerUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            {photo.photographer}
          </a>
          {" "}on{" "}
          <a href="https://unsplash.com?utm_source=boxford&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            Unsplash
          </a>
        </div>
      </div>
    </div>
  )
}
