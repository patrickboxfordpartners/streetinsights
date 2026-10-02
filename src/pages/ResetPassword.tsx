import { Navigate } from "react-router-dom"

export function ResetPassword() {
  return <Navigate to="/login" replace />
}
