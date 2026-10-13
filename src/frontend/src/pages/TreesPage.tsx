import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getTrees } from "../features/family-tree/api";

export function TreesPage() {
  const query = useQuery({ queryKey: ["trees"], queryFn: getTrees });
  return (
    <main className="trees-page">
      <header className="trees-hero">
        <p>KHÔNG GIAN GIA PHẢ</p>
        <h1>Gia phả của bạn</h1>
        <span>Chọn một gia phả để khám phá các thế hệ và mối quan hệ.</span>
      </header>
      <section className="tree-section" aria-labelledby="owned-trees-title">
        <div className="section-heading">
          <h2 id="owned-trees-title">Gia phả của tôi</h2>
          {query.data && <span>{query.data.createdByMe.length} gia phả</span>}
        </div>
        {query.isLoading && (
          <div className="tree-grid" aria-label="Đang tải">
            <div className="tree-card tree-card-skeleton" />
          </div>
        )}
        {query.isError && (
          <div className="tree-empty tree-error">
            <h3>Không thể tải danh sách gia phả</h3>
            <button
              className="button-secondary"
              type="button"
              onClick={() => query.refetch()}
            >
              Thử lại
            </button>
          </div>
        )}
        {query.data?.createdByMe.length === 0 && (
          <div className="tree-empty">
            <h3>Chưa có gia phả</h3>
            <p>Dữ liệu gia phả mẫu sẽ xuất hiện sau khi chạy seed.</p>
          </div>
        )}
        <div className="tree-grid">
          {query.data?.createdByMe.map((tree) => (
            <Link className="tree-card" to={`/trees/${tree.id}`} key={tree.id}>
              <div className="tree-card-cover">
                {tree.coverUrl ? (
                  <img src={tree.coverUrl} alt="" />
                ) : (
                  <span>⌘</span>
                )}
              </div>
              <div className="tree-card-body">
                <p>{tree.originPlace ?? "Chưa cập nhật nguồn gốc"}</p>
                <h3>{tree.name}</h3>
                <span>{tree.description ?? "Chưa có mô tả"}</span>
                <footer>
                  <strong>{tree.personCount}</strong> thành viên{" "}
                  <b>Khám phá →</b>
                </footer>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="tree-section" aria-labelledby="shared-trees-title">
        <div className="section-heading">
          <h2 id="shared-trees-title">Được chia sẻ với tôi</h2>
          <span>Sắp ra mắt</span>
        </div>
        <div className="tree-empty">
          <h3>Chưa có gia phả được chia sẻ</h3>
          <p>Tính năng chia sẻ sẽ được bổ sung trong phiên bản tiếp theo.</p>
        </div>
      </section>
    </main>
  );
}
