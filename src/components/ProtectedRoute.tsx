import { JSX, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const VERIFY_ENDPOINT = import.meta.env.VITE_VERIFY_ENDPOINT; // Load the verification endpoint from environment variables
const API_KEY = import.meta.env.VITE_API_KEY; // Load the API key from environment variables

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch(VERIFY_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Include the Bearer token in the header
            "x-api-key": API_KEY, // Include the API key in the header
          },
          body: JSON.stringify({ token }), // Include the token in the body as JSON
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Show a loading state while verifying
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}