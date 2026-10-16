import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ProtectedRoute({ children, roles }) {
  const { user, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}