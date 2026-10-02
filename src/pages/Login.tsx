import { useState, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
import { Navigate } from "react-router-dom"
import { SignIn } from "@clerk/clerk-react"
import logoIcon from "../assets/logo-icon.png"
import { usePageMeta } from "../hooks/usePageMeta"
import { useBilling } from "../hooks/useBilling"

const PHOTOS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2074&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop",
]

export function Login() {
  usePageMeta({ title: "Sign In", description: "Sign in to your Street Insights account to access AI-powered stock sentiment signals." })
  const { session, loading } = useAuth()
  const { startCheckout } = useBilling()
  const [photoIndex] = useState(() => Math.floor(Math.random() * PHOTOS.length))

  useEffect(() => {
    if (session) {
      const pendingPlan = localStorage.getItem("pending_plan")
      if (pendingPlan) {
        localStorage.removeItem("pending_plan")
        startCheckout(pendingPlan)
      }
    }
  }, [session, startCheckout])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-10 w-10 animate-pulse">
          <img src={logoIcon} alt="Street Insights logo" className="h-full w-full" />
        </div>
      </div>
    )
  }

  if (session) {
    const pendingPlan = localStorage.getItem("pending_plan")
    if (!pendingPlan) {
      return <Navigate to="/dashboard" replace />
    }
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
            Welcome back
          </h1>
          <p className="text-gray-500 text-[15px] mb-8">
            AI-powered stock sentiment intelligence
          </p>

          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
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
          src={PHOTOS[photoIndex]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  )
}
