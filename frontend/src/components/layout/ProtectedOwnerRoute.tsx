import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Loader from "@/components/ui/Loader";
import { useOwner } from "@/context/OwnerContext";

export default function ProtectedOwnerRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useOwner();

  if (loading) return <Loader label="Verifying owner session..." />;
  if (!isAuthenticated) return <Navigate to="/owner/login" replace />;
  return <>{children}</>;
}
