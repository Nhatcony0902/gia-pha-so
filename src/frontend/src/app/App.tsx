import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { QueryProvider } from "./providers/QueryProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { AppLayout } from "./AppLayout";
import { AuthPage } from "../pages/AuthPage";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ProtectedRoute } from "./ProtectedRoute";
import { TreesPage } from "../pages/TreesPage";
import { FamilyTreePage } from "../pages/FamilyTreePage";

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <NotificationProvider>
          <GoogleOAuthProvider
            clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "not-configured"}
          >
            <AuthProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/trees"
                    element={
                      <ProtectedRoute>
                        <TreesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trees/:treeId"
                    element={
                      <ProtectedRoute>
                        <FamilyTreePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </AuthProvider>
          </GoogleOAuthProvider>
        </NotificationProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
