import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
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
import { PersonDetailPage } from "../pages/PersonDetailPage";
import { TimelinePage } from "../pages/TimelinePage";
import { HomePage } from "../pages/HomePage";

function LegacyTreeRedirect() {
  const { treeId } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const legacyTab = params.get("tab");
  const view =
    legacyTab === "members"
      ? "members"
      : legacyTab === "relationships"
        ? "relationships"
        : "tree";
  params.delete("tab");
  const remainingSearch = params.toString();
  return (
    <Navigate
      to={`/trees/${treeId}/${view}${remainingSearch ? `?${remainingSearch}` : ""}`}
      replace
    />
  );
}

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
                        <LegacyTreeRedirect />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trees/:treeId/tree"
                    element={
                      <ProtectedRoute>
                        <FamilyTreePage view="tree" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trees/:treeId/members"
                    element={
                      <ProtectedRoute>
                        <FamilyTreePage view="members" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trees/:treeId/relationships"
                    element={
                      <ProtectedRoute>
                        <FamilyTreePage view="relationships" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trees/:treeId/timeline"
                    element={
                      <ProtectedRoute>
                        <TimelinePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/trees/:treeId/persons/:personId"
                    element={
                      <ProtectedRoute>
                        <PersonDetailPage />
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
