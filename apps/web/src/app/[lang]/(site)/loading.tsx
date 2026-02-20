import { LoadingSpinner } from '@/components/ui';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light">
      <LoadingSpinner size="lg" centered />
    </div>
  );
}
