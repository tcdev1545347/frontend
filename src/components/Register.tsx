import React, { useState } from "react";
import { cn } from "@/lib/utils"; // Assuming you have this utility
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components

const REGISTER_ENDPOINT = import.meta.env.VITE_REGISTER_ENDPOINT || "/api/register"; // Fallback
const API_KEY = import.meta.env.VITE_API_KEY || ""; // Fallback

// Define roles and departments (keep these as they are)
const roles = ["Academic Staff", "Faculty", "Student"];
const departments = [
    "Arts",
    "College of Business and Economics",
    "Communications",
    "Education",
    "Engineering and Computer Science",
    "Health and Human Development",
    "Humanities and Social Sciences",
    "Natural Sciences and Mathematics",
    "Extension and International Programs",
];

function RegisterComponent() {
  // State remains the same
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    department: "",
    role: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handler for standard Inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Specific handler for Shadcn Select components
  const handleSelectChange = (name: keyof typeof formData, value: string) => {
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Registration logic remains the same
  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

     if (!REGISTER_ENDPOINT || !API_KEY) {
        setError("Registration configuration is missing. Please contact support.");
        setIsLoading(false);
        return;
    }


    try {
      const response = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Registration failed.");
      }

      setSuccessMessage("Registration successful! You can now login.");
      // Reset form after successful registration
      setFormData({
        username: "", email: "", name: "", password: "", department: "", role: "",
      });

    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Structure adapted from MergedLoginForm ---
  return (
    <div className={cn("flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10")}>
      {/* Using Card component like the login page, adjusted max-width */}
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle> {/* Updated Title */}
          <CardDescription>
            Fill in the details below to register.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            {/* Using grid layout similar to login form */}
            <div className="grid gap-4">
              {/* Username */}
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username" // Name attribute is important for handleChange
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Full Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Department Select */}
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Select
                    // Use id if Label's htmlFor needs it, otherwise optional
                    value={formData.department}
                    onValueChange={(value) => handleSelectChange("department", value)}
                    required
                    disabled={isLoading}
                    name="department" // Can keep name for consistency or potential future use
                >
                    <SelectTrigger className="w-full" id="department">
                        <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map((dep) => (
                            <SelectItem key={dep} value={dep}>
                                {dep}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              {/* Role Select */}
              <div className="grid gap-2">
                 <Label htmlFor="role">Role</Label>
                 <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange("role", value)}
                    required
                    disabled={isLoading}
                    name="role"
                 >
                    <SelectTrigger className="w-full" id="role">
                        <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                                {role}
                            </SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              </div>

              {/* Error and Success Messages */}
              {error && <p className="text-sm text-destructive text-center px-1">{error}</p>}
              {successMessage && <p className="text-sm text-green-600 text-center px-1">{successMessage}</p>}

              {/* Submit Button */}
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register"}
              </Button>

              {/* Link to Login */}
              <div className="mt-2 text-center text-sm">
                Already have an account?{" "}
                <a href="/login" className="underline underline-offset-4 hover:text-primary">
                  Login here
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterComponent;