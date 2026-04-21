import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./amplify.config";
import { getHistory } from "./api/history";
import { useAuth } from "./hooks/useAuth";
import { CallbackPage } from "./pages/CallbackPage";
import { LoginPage } from "./pages/LoginPage";
import { SimulationListPage } from "./pages/SimulationListPage";
import { SimulationPage } from "./pages/SimulationPage";
import type { SimulationHistory } from "./types";

const AppContent = () => {
  const location = useLocation();
  const { user, loading, signIn, signOut } = useAuth();
  const [history, setHistory] = useState<SimulationHistory>({
    simulations: [],
  });

  useEffect(() => {
    if (user) {
      getHistory()
        .then(setHistory)
        .catch(() => {});
    }
  }, [user]);

  // Always render /callback so Amplify can process the OAuth code exchange
  if (location.pathname === "/callback") {
    return (
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} />;
  }

  return (
    <Routes>
      <Route
        path="/simulations"
        element={
          <SimulationListPage
            user={user}
            onSignOut={signOut}
            history={history}
            setHistory={setHistory}
          />
        }
      />
      <Route
        path="/simulations/:simulationId"
        element={
          <SimulationPage
            user={user}
            onSignOut={signOut}
            history={history}
            setHistory={setHistory}
          />
        }
      />
      <Route path="*" element={<Navigate to="/simulations" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
