import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";

export function NotFoundPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Không tìm thấy trang | Gia phả số";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="bg-page-gradient text-content-primary relative isolate min-h-screen overflow-hidden">
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-12">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Không tìm thấy trang" },
          ]}
          light
        />
        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:py-20">
          <div className="max-w-2xl">
            <p className="text-accent tracking-eyebrow font-sans text-xs font-bold">
              LỖI 404
            </p>
            <h1 className="mt-5 font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl lg:text-6xl">
              Không tìm thấy trang
            </h1>
            <p className="text-content-secondary mt-5 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
              Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
            </p>

            <div className="mt-9">
              <Link
                to="/"
                className="bg-accent text-page-start hover:bg-content-primary focus-visible:outline-accent inline-flex min-h-12 items-center justify-center rounded-control px-6 font-sans text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Về trang chủ
              </Link>
            </div>
          </div>

          <div
            className="relative mx-auto aspect-square w-full max-w-sm"
            aria-hidden="true"
          >
            <span className="absolute inset-0 grid place-items-center font-display text-[6rem] leading-none font-semibold opacity-10 sm:text-[8rem]">
              404
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
