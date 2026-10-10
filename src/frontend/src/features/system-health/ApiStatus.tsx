import { useQuery } from '@tanstack/react-query';
import { getHealth } from './api';

export function ApiStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });
  const status = health.isError ? 'error' : health.data?.status ?? 'loading';
  const dotClass = status === 'ok' ? 'bg-[#83d3a2]' : status === 'error' ? 'bg-[#ed806d]' : 'bg-[#d7a95d]';

  return (
    <div role="status" aria-live="polite" className="mt-8 inline-flex max-w-full items-center gap-2 border border-[#52796e] px-4 py-3 font-sans text-sm text-[#dbe8dc]" data-status={status}>
      <span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
      {health.isLoading && 'Đang kết nối API...'}
      {health.isError && 'API chưa sẵn sàng'}
      {health.isSuccess && health.data.status === 'degraded' && 'API hoạt động, DB chưa kết nối'}
      {health.isSuccess && health.data.status === 'ok' && `API và DB đang hoạt động · ${health.data.timestamp}`}
    </div>
  );
}