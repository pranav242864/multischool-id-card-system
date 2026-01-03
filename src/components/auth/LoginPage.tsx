import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { GraduationCap, Mail, Lock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

interface LoginPageProps {
  onLogin: (email: string, role: 'superadmin' | 'schooladmin' | 'teacher') => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call the real backend API
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Login failed
        setError(data.message || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      // Login successful
      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Extract role from response and convert to lowercase for onLogin callback
      const role = data.user?.role?.toLowerCase() || 'teacher';
      const roleMap: Record<string, 'superadmin' | 'schooladmin' | 'teacher'> = {
        'superadmin': 'superadmin',
        'schooladmin': 'schooladmin',
        'teacher': 'teacher',
      };

      // Call onLogin with actual user data
      onLogin(data.user.email, roleMap[role] || 'teacher');
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Call Google OAuth endpoint
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: 'demo@school.com',
          idToken: '', // Google OAuth token would go here
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Google sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      // Store token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      const role = data.user?.role?.toLowerCase() || 'schooladmin';
      const roleMap: Record<string, 'superadmin' | 'schooladmin' | 'teacher'> = {
        'superadmin': 'superadmin',
        'schooladmin': 'schooladmin',
        'teacher': 'teacher',
      };

      onLogin(data.user.email, roleMap[role] || 'schooladmin');
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Left Side - Branding */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-gray-900">MultiSchool ID</h1>
              <p className="text-gray-600">Card Management System</p>
            </div>
          </div>
          <h2 className="text-gray-900 mb-4">Welcome Back</h2>
          <p className="text-gray-600">
            Streamline your school's ID card management with our comprehensive platform. 
            Manage students, teachers, and generate professional ID cards effortlessly.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="text-gray-900">Multi-School Support</h3>
                <p className="text-gray-600">Manage multiple schools from a single platform</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="text-gray-900">Bulk Operations</h3>
                <p className="text-gray-600">Import students and photos in bulk via Excel</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="text-gray-900">Custom Templates</h3>
                <p className="text-gray-600">Design and customize ID card templates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 bg-white">
        <div className="max-w-md w-full">
          <div className="mb-8">
            <h2 className="text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-600">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 border-gray-300 rounded text-blue-600"
                />
                <label htmlFor="remember" className="text-gray-700">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Forgot Password?
              </a>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-700 mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-gray-600">
              <p>• <span className="font-medium">super@admin.com</span> - Superadmin</p>
              <p>• <span className="font-medium">admin@school.com</span> - School Admin</p>
              <p>• <span className="font-medium">teacher@school.com</span> - Teacher</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
