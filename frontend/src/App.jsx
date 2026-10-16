import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/useAuthStore";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductsPage from "./pages/ProductsPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalePage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import { api } from "./lib/axios";
import toast from "react-hot-toast";


function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user.role === "admin" ? "/dashboard" : "/products"} replace />;
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // if the server says our session is no longer valid, go back to login
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (error) => {
        const url = error.config?.url || "";
        const expired =
          error.response?.status === 401 &&
          !url.startsWith("/auth/") &&
          useAuthStore.getState().user;

        if (expired) {
          useAuthStore.setState({ user: null });
          toast.error("Your session ended. Please sign in again.", {
            id: "session-ended",
          });
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(id);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage/>
            </ProtectedRoute>
          } />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={ 
            <ProtectedRoute roles={["admin"]}> 
              <CategoriesPage />
            </ProtectedRoute>}/>
          <Route path="inventory" element={
            <ProtectedRoute roles={["admin"]}>
              <InventoryPage/>
            </ProtectedRoute>
          } />
          <Route path="sales" element={<SalesPage/>} />
          <Route path="users" element={
            <ProtectedRoute>
              <UsersPage/>
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

export default App;