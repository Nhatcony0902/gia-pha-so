import { ApiStatus } from "../features/system-health/ApiStatus";

export function HomePage() {
  return (
    <main className="bg-page-gradient text-content-primary min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-20">
        <section className="max-w-5xl">
          <p className="text-accent tracking-eyebrow font-sans text-xs font-bold">
            DIGITAL FAMILY TREE / FOUNDATION
          </p>
          <h1 className="mt-4 max-w-5xl font-display text-5xl leading-[0.98] font-semibold sm:text-6xl lg:text-7xl">
            Giữ mạch nguồn, kể tiếp câu chuyện.
          </h1>
          <p className="text-content-secondary mt-6 max-w-2xl font-sans text-lg leading-relaxed sm:text-xl">
            Không gian số để lưu giữ thành viên, quan hệ và ký ức của dòng họ
            theo cách rõ ràng, có kiểm chứng.
          </p>
          <ApiStatus />
        </section>
        <section
          className="border-outline mt-20 grid max-w-6xl grid-cols-1 border-t md:grid-cols-3"
          aria-label="Nền tảng hệ thống"
        >
          <article className="border-outline border-b py-6 md:border-r md:border-b-0 md:pr-6 lg:py-8">
            <span className="text-accent tracking-eyebrow font-sans text-xs font-bold">
              01
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold">
              Dữ liệu có cấu trúc
            </h2>
            <p className="text-content-muted mt-2 max-w-xs font-sans leading-relaxed">
              Thành viên, quan hệ, sự kiện và lịch sử thay đổi dùng chung một mô
              hình TypeScript.
            </p>
          </article>
          <article className="border-outline border-b py-6 md:border-r md:border-b-0 md:px-6 lg:py-8">
            <span className="text-accent tracking-eyebrow font-sans text-xs font-bold">
              02
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold">
              Đồ thị có ngữ nghĩa
            </h2>
            <p className="text-content-muted mt-2 max-w-xs font-sans leading-relaxed">
              Graph traversal và bộ quy tắc xưng hô được tách riêng để dễ kiểm
              thử, mở rộng.
            </p>
          </article>
          <article className="py-6 md:pl-6 lg:py-8">
            <span className="text-accent tracking-eyebrow font-sans text-xs font-bold">
              03
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold">
              Cộng tác có kiểm soát
            </h2>
            <p className="text-content-muted mt-2 max-w-xs font-sans leading-relaxed">
              Vai trò Viewer, Editor, Admin và approval workflow bảo vệ dữ liệu
              gia phả lâu dài.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
