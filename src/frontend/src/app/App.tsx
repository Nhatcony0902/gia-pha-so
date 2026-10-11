import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { QueryProvider } from "./providers/QueryProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { AppLayout } from "./AppLayout";
import { AuthPage } from "../pages/AuthPage";
import { GoogleOAuthProvider } from "@react-oauth/google";

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
