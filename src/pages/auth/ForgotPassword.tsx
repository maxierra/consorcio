import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function ForgotPassword() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'An error occurred while sending reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        Reset your password
      </h2>
      
      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success ? (
        <div className="text-center">
          <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-md mb-4">
            We've sent you an email with a link to reset your password.
          </div>
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Return to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          <Input
            id="email"
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              Send reset link
            </Button>
          </div>
          
          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 text-sm"
            >
              Return to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}