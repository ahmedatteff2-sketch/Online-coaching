import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

export function PublicNav({ brandName }: { brandName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/70 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between">
        <Link to="/">
          <Logo brand={brandName} />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-200 md:flex">
          <a href="/#pricing" className="hover:text-ink-100">
            Pricing
          </a>
          <a href="/#contact" className="hover:text-ink-100">
            Contact
          </a>
          <Link to="/login">
            <Button size="sm" variant="primary">
              Member login
            </Button>
          </Link>
        </nav>
        <Link to="/login" className="md:hidden">
          <Button size="sm">Login</Button>
        </Link>
      </div>
    </header>
  );
}
