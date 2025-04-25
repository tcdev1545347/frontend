import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MergedLoginForm from "./components/Login";
import RegisterComponent from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { DashboardLayout } from "./Layout/DashboardLayout";
import HomePage from "./components/HomePage";
import MyFilesPage from "./components/MyFilesPage";
import MessagesPage from "./components/MessagesPage";
import { NotificationProvider } from "./contexts/NotificationContext"; // <-- Import Provider

function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      {/* Wrap routes that need notification context */}
      <NotificationProvider>
        <Routes>
          {/* Redirect root path based on authentication */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/homepage" : "/login"} replace />} />

          {/* Login page */}
          <Route path="/login" element={<MergedLoginForm />} />

          {/* Register page */}
          <Route path="/register" element={<RegisterComponent />} />

          {/* Protected Routes within DashboardLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/homepage" replace />} />
            <Route path="homepage" element={<HomePage />} />
            <Route path="my-files" element={<MyFilesPage />} />
            <Route path="messages" element={<MessagesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotificationProvider>
    </Router>
  );
}

export default App;