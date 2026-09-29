import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { sessionChanged } from '../crm/store';
import { homeFor } from '../crm/constants';
import { Button, Field } from '../crm/components/UI';
import '../crm/crm.css';
export function AuthLayout() {
  return (
    <div className="crm crm-auth" lang="en" dir="ltr">
      <div className="crm-auth-story">
        <Link to="/" className="crm-brand">
          <Building2 />
          <span>
            DUBAI HOUSE<small>PROPERTY PORTAL + CRM</small>
          </span>
        </Link>
        <div>
          <p className="crm-eyebrow">EXCEPTIONAL HOMES. STRONGER CONNECTIONS.</p>
          <h2>
            Every inquiry.
            <br />A new possibility.
          </h2>
          <p>Your people, properties and next steps, together in one considered workspace.</p>
        </div>
        <small>Dubai House · Internal workspace</small>
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
export function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const login = async (data) => {
    setPending(true);
    setError('');
    try {
      const user = await authService.signIn(data);
      dispatch(sessionChanged(user));
      const from = location.state?.from;
      navigate(from?.startsWith(`/${user.role.toLowerCase()}/`) ? from : homeFor(user), {
        replace: true,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="crm-login">
      <Link to="/" className="crm-back">
        <ArrowLeft size={16} /> Back to properties
      </Link>
      <span className="crm-demo">Demo Mode</span>
      <h1>Welcome back.</h1>
      <p>Sign in to your real estate workspace.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          login({ ...data, remember: Boolean(data.remember) });
        }}
      >
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="you@dubaihouse.demo"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <div className="crm-between">
          <label className="crm-check">
            <input name="remember" type="checkbox" /> Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {error && (
          <p role="alert" className="crm-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          Sign in
        </Button>
      </form>
      <div className="crm-demo-accounts">
        <h3>Explore the demo</h3>
        <Button
          secondary
          disabled={pending}
          onClick={() => login({ email: 'admin@dubaihouse.demo', password: 'Demo123!' })}
        >
          Demo Admin Login
        </Button>
        <Button
          secondary
          disabled={pending}
          onClick={() => login({ email: 'agent@dubaihouse.demo', password: 'Demo123!' })}
        >
          Demo Agent Login
        </Button>
        <p>
          admin@dubaihouse.demo
          <br />
          agent@dubaihouse.demo
          <br />
          Password: <code>Demo123!</code>
        </p>
      </div>
      <p className="crm-muted">
        Frontend demo authentication only. Data stays in this browser; these accounts do not provide
        production security.
      </p>
    </div>
  );
}
export function ForgotPassword() {
  const [message, setMessage] = useState('');
  return (
    <div className="crm-login">
      <h1>Password help</h1>
      <p>Use either demo account with the password Demo123!.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMessage(await authService.requestPasswordReset());
        }}
      >
        <Field label="Email" name="email" type="email" required />
        <Button type="submit">Show reset instructions</Button>
      </form>
      {message && <p role="status">{message}</p>}
      <Link to="/login">Back to login</Link>
    </div>
  );
}
