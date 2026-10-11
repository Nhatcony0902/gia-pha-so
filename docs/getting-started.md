# Chạy dự án lần đầu

## Yêu cầu

- Node.js 20 trở lên và npm 10 trở lên
- Docker Desktop đang chạy

## Cài đặt và chạy

Mở PowerShell tại thư mục gốc của repo.

1. Tạo file cấu hình môi trường:

   ```powershell
   Copy-Item src/.env.example src/.env
   Copy-Item src/backend/.env.example src/backend/.env
   ```

2. Nếu PostgreSQL local đang dùng cổng 5432, dừng service đó (nếu có), rồi chạy:

   ```powershell
   docker compose up -d
   ```

3. Cài dependencies, tạo bảng và chạy API + frontend:

   ```powershell
   cd src
   npm ci
   npm run db:migrate
   npm run dev
   ```

4. Mở frontend tại http://localhost:5173. Mailpit local: http://localhost:8025. API health check: http://localhost:3000/api/health.

## Dừng dự án

Nhấn `Ctrl+C` để dừng API và frontend. Tại thư mục gốc của repo, chạy:

```powershell
docker compose down
```
