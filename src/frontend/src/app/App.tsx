import { HomePage } from '../pages/HomePage';
import { QueryProvider } from './providers/QueryProvider';

export function App() {
  return (
    <QueryProvider>
      <HomePage />
    </QueryProvider>
  );
}