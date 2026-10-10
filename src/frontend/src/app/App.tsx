import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { QueryProvider } from './providers/QueryProvider';

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </QueryProvider>
    </BrowserRouter>
  );
}
