import { createContext, useContext, useCallback, type ReactNode } from "react"
import {
  useUser,
  useAuth as useClerkAuth,
  useClerk,
} from "@clerk/clerk-react"

interface AuthUser {
  id: string
  email: string
}

interface AuthContextType {
  session: { user: AuthUser } | null
  user: AuthUser | null
  loading: boolean
  signIn: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut: clerkSignOut } = useClerk()

  const user: AuthUser | null =
    isLoaded && isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        }
      : null

  const session = user ? { user } : null

  const signIn = useCallback(() => {
    window.location.href = "/login"
  }, [])

  const signOut = useCallback(async () => {
    await clerkSignOut()
  }, [clerkSignOut])

  return (
    <AuthContext.Provider
      value={{ session, user, loading: !isLoaded, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
