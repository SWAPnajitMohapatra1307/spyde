// client/src/pages/AuthPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, User as UserIcon, Eye, EyeOff, Sparkles, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginAsDemo, isLoading, error, clearError } = useAuthStore();

  const isRegister = location.pathname === '/register';
  const [mode, setMode] = useState<AuthMode>(isRegister ? 'register' : 'login');

  const [name, setName] = useState('Siddharth Roy');
  const [phone, setPhone] = useState('9123456780');
  const [email, setEmail] = useState('sid@spyde.io');
  const [password, setPassword] = useState('Password@123');
  const [upiHandle, setUpiHandle] = useState('sid@okhdfc');
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    navigate(newMode === 'register' ? '/register' : '/login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(phone, password);
      navigate('/home');
    } catch {
      // Error is stored in authStore
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register({ name, phone, email, password, vpa: upiHandle });
      navigate('/home');
    } catch {
      // Error is stored in authStore
    }
  };

  const handleDemoUserLogin = async () => {
    clearError();
    try {
      await loginAsDemo('user');
      navigate('/home');
    } catch {
      // Handled in store
    }
  };

  const handleDemoAdminLogin = async () => {
    clearError();
    try {
      await loginAsDemo('admin');
      navigate('/admin');
    } catch {
      // Handled in store
    }
  };

  const autofillRegisteredUser = () => {
    setPhone('9123456780');
    setPassword('Password@123');
    clearError();
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent-orange flex items-center justify-center text-canvas font-black text-2xl shadow-lg shadow-primary/20 mx-auto mb-3">
            S
          </div>
          <h1 className="text-bone text-xl font-bold tracking-wide">SPYDE</h1>
          <p className="text-bone-muted text-xs mt-1">
            {mode === 'login'
              ? 'Sign in to your UPI fraud shield'
              : 'Create your secure account'}
          </p>
        </div>

        {/* Quick Sandbox Actions */}
        <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-bone-muted tracking-wider">
              ⚡ Quick Sandbox Login
            </span>
            <button
              type="button"
              onClick={autofillRegisteredUser}
              className="text-[10px] text-primary hover:underline font-mono"
            >
              Fill Credentials
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={handleDemoUserLogin}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Demo User
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isLoading}
              onClick={handleDemoAdminLogin}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Console
            </Button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'login'
                ? 'bg-primary text-bone'
                : 'text-bone-muted hover:text-bone'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'register'
                ? 'bg-primary text-bone'
                : 'text-bone-muted hover:text-bone'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
            {error}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="login-phone"
              label="Phone Number"
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9123456780"
              icon={Phone}
            />

            <div className="relative">
              <Input
                id="login-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password@123"
                icon={Lock}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-bone-muted hover:text-bone"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full"
            >
              Sign In
            </Button>

            <p className="text-center text-[11px] text-bone-muted pt-1">
              Valid credentials: <span className="font-mono text-bone">9123456780 / Password@123</span>
            </p>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              id="reg-name"
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              icon={UserIcon}
            />

            <Input
              id="reg-phone"
              label="Phone Number (10 digits)"
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9123456789"
              icon={Phone}
            />

            <Input
              id="reg-upi"
              label="UPI VPA Handle"
              type="text"
              required
              value={upiHandle}
              onChange={(e) => setUpiHandle(e.target.value)}
              placeholder="name@bank"
              icon={UserIcon}
              className="font-mono"
            />

            <Input
              id="reg-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <div className="relative">
              <Input
                id="reg-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password@123"
                icon={Lock}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-bone-muted hover:text-bone"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full"
            >
              Create Account
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};