import { DEMO_MODE } from '@/lib/config';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return <LoginForm demo={DEMO_MODE} />;
}
