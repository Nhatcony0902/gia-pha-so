import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MarriageStatus,
  PrimitiveRelationship,
  RelationshipInput,
} from "@family-tree/shared-types";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useNotifications } from "../app/providers/NotificationProvider";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  createRelationship,
  deleteRelationship,
  getPersonDetail,
  getTreeGraph,
  updateRelationship,
} from "../features/family-tree/api";
import {
  FamilyPersonNode,
  type FamilyFlowNode,
} from "../features/family-tree/FamilyPersonNode";
import { FamilyJunctionNode } from "../features/family-tree/FamilyJunctionNode";
import {
  layoutGraph,
  type FamilyTreeFlowNode,
} from "../features/family-tree/layout";
import {
  PersonSidebar,
  RelationshipSidebar,
} from "../features/family-tree/PersonSidebar";
import { secondaryButtonClass } from "../lib/ui-classes";
import { MemberList } from "../features/family-tree/MemberList";
import {
  PersonAddChoiceDialog,
  RelationshipFormDialog,
} from "../features/family-tree/ManagementDialogs";
import { RelationshipList } from "../features/family-tree/RelationshipList";
import { compactPrimaryButtonClass } from "../lib/ui-classes";

const nodeTypes = { person: FamilyPersonNode, junction: FamilyJunctionNode };
const routeStateClass =
  "grid min-h-[calc(100vh-4.5rem)] place-content-center justify-items-center gap-[0.8rem] bg-[#17302b] p-4 text-center text-content-primary [&>h1]:m-0 [&>p]:m-0 [&>a]:text-accent";
const legendLineClass = "h-0 w-8 border-t-2 border-focus";

export function FamilyTreePage({
  view,
}: {
  view: "tree" | "members" | "relationships";
}) {
  const { treeId = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const notice = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("person");
  const relationshipKey = searchParams.get("relationship");
  const activeTab = view;
  const [nodes, setNodes, onNodesChange] = useNodesState<FamilyTreeFlowNode>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const [personChoiceOpen, setPersonChoiceOpen] = useState(false);
  const [relationshipEditor, setRelationshipEditor] = useState<
    PrimitiveRelationship | "new" | null
  >(null);
  const graph = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId),
    enabled: Boolean(treeId),
  });
  const detail = useQuery({
    queryKey: ["person", treeId, selectedId],
    queryFn: () => getPersonDetail(treeId, selectedId!),
    enabled: Boolean(treeId && selectedId),
  });
  const saveRelationship = useMutation({
    mutationFn: (input: RelationshipInput) =>
      relationshipEditor === "new" || !relationshipEditor
        ? createRelationship(treeId, input)
        : updateRelationship(treeId, relationshipEditor.id, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tree-graph", treeId] });
      client.invalidateQueries({ queryKey: ["person", treeId] });
      setRelationshipEditor(null);
      notice.toast("Đã lưu quan hệ", "success");
    },
    onError: (error) =>
      notice.alert(
        "Không thể lưu quan hệ",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });
  const removeRelationship = useMutation({
    mutationFn: (relationshipId: string) =>
      deleteRelationship(treeId, relationshipId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tree-graph", treeId] });
      client.invalidateQueries({ queryKey: ["person", treeId] });
      closeSidebar();
      notice.toast("Đã xóa quan hệ", "success");
    },
    onError: (error) =>
      notice.alert(
        "Không thể xóa quan hệ",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });

  useEffect(() => {
    if (!graph.data) return;
    let active = true;
    setLayoutReady(false);
    layoutGraph(graph.data).then((layout) => {
      if (!active) return;
      setNodes(layout.nodes);
      setEdges(layout.edges);
      setLayoutReady(true);
    });
    return () => {
      active = false;
    };
  }, [graph.data, setEdges, setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node): FamilyTreeFlowNode => {
        if (node.type !== "person") return node;
        return {
          ...(node as FamilyFlowNode),
          data: { ...node.data, selectedPerson: node.id === selectedId },
        };
      }),
    );
    setEdges((current) =>
      current.map((edge) => {
        const personIds = (edge.data?.personIds as string[] | undefined) ?? [];
        const connected = selectedId && personIds.includes(selectedId);
        const baseWidth = edge.data?.kind === "pair" ? 2.5 : 2;
        return {
          ...edge,
          animated: Boolean(connected),
          style: {
            ...edge.style,
            strokeWidth: connected ? baseWidth + 1 : baseWidth,
          },
        };
      }),
    );
  }, [selectedId, setEdges, setNodes]);

  const closeSidebar = () => setSearchParams({}, { replace: true });
  const selectPerson = (personId: string) =>
    setSearchParams({ person: personId }, { replace: true });
  const selectedRelationship = useMemo(() => {
    if (!graph.data || !relationshipKey) return null;
    const [firstId, secondId] = relationshipKey.split("::");
    const first = graph.data.nodes.find((person) => person.id === firstId);
    const second = graph.data.nodes.find((person) => person.id === secondId);
    if (!first || !second) return null;
    const spouse = graph.data.edges.find(
      (edge) =>
        edge.type === "SPOUSE" &&
        [edge.fromPersonId, edge.toPersonId].includes(firstId!) &&
        [edge.fromPersonId, edge.toPersonId].includes(secondId!),
    );
    const parentsByChild = new Map<string, Set<string>>();
    for (const edge of graph.data.edges) {
      if (
        edge.type !== "PARENT_CHILD" ||
        (edge.fromPersonId !== firstId && edge.fromPersonId !== secondId)
      )
        continue;
      const parents = parentsByChild.get(edge.toPersonId) ?? new Set<string>();
      parents.add(edge.fromPersonId);
      parentsByChild.set(edge.toPersonId, parents);
    }
    const children = [...parentsByChild]
      .filter(([, parents]) => parents.has(firstId!) && parents.has(secondId!))
      .map(([childId]) =>
        graph.data!.nodes.find((person) => person.id === childId),
      )
      .filter((person) => person !== undefined);
    return {
      first,
      second,
      children,
      status: (spouse?.marriageStatus ?? "CO_PARENT") as
        MarriageStatus | "CO_PARENT",
    };
  }, [graph.data, relationshipKey]);
  const selectedOpen = Boolean(selectedId || selectedRelationship);
  const minimapColor = useMemo(
    () => (node: FamilyTreeFlowNode) =>
      node.type !== "person"
        ? "transparent"
        : node.data.gender === "MALE"
          ? "#77a7bd"
          : node.data.gender === "FEMALE"
            ? "#c98da4"
            : "#9ca9a3",
    [],
  );

  if (graph.isLoading)
    return (
      <main className={routeStateClass}>
        <div className="size-10 animate-[spin_0.8s_linear_infinite] rounded-full border-[3px] border-focus border-t-accent" />
        <p>Đang dựng sơ đồ gia phả…</p>
      </main>
    );
  if (graph.isError || !graph.data)
    return (
      <main className={routeStateClass}>
        <h1>Không thể mở gia phả</h1>
        <p>Gia phả không tồn tại hoặc bạn không có quyền xem.</p>
        <button
          className={secondaryButtonClass}
          onClick={() => graph.refetch()}
        >
          Thử lại
        </button>
        <Link to="/trees">Về danh sách</Link>
      </main>
    );

  return (
    <main className="relative grid h-[calc(100vh-4.5rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-surface-page text-ink">
      <header className="z-3 flex flex-col items-start justify-between gap-4 border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5 py-[0.85rem] min-[801px]:flex-row min-[801px]:items-center">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Danh sách gia phả", to: "/trees" },
            {
              label: graph.data.tree.name,
              ...(activeTab === "tree"
                ? {}
                : { to: `/trees/${treeId}/tree` }),
            },
            ...(activeTab === "tree"
              ? []
              : [
                  {
                    label:
                      activeTab === "members" ? "Thành viên" : "Quan hệ",
                  },
                ]),
          ]}
        />
        <div className="flex w-full flex-wrap items-center justify-between gap-[1.2rem] text-[0.84rem] text-[#5d7167] min-[801px]:w-auto">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {activeTab !== "relationships" && (
              <span>{graph.data.tree.personCount} thành viên</span>
            )}
            {activeTab !== "members" && (
              <span>{graph.data.edges.length} quan hệ</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeTab !== "relationships" && (
              <button
                type="button"
                className={compactPrimaryButtonClass}
                onClick={() => setPersonChoiceOpen(true)}
              >
                <Plus size={16} /> Thêm thành viên
              </button>
            )}
            {activeTab !== "members" && (
              <button
                type="button"
                className={compactPrimaryButtonClass}
                onClick={() => setRelationshipEditor("new")}
                disabled={graph.data.nodes.length < 2}
                title={
                  graph.data.nodes.length < 2
                    ? "Cần ít nhất hai thành viên để tạo quan hệ"
                    : undefined
                }
              >
                <Plus size={16} /> Thêm quan hệ
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="relative grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden">
        {activeTab === "tree" ? (
          <section
            className={`relative min-h-0 min-w-0 transition-[margin-right] duration-250 ${selectedOpen ? "min-[801px]:mr-92" : ""}`}
            aria-label="Sơ đồ gia phả tương tác"
          >
            {!layoutReady && (
              <div className="absolute inset-0 z-4 grid place-items-center bg-surface-page text-outline">
                Đang sắp xếp các thế hệ…
              </div>
            )}
            <ReactFlow<FamilyTreeFlowNode, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => selectPerson(node.id)}
              onEdgeClick={(_, edge) => {
                if (!edge.data?.relationshipKey) return;
                setSearchParams(
                  { relationship: String(edge.data.relationshipKey) },
                  { replace: true },
                );
              }}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.15}
              maxZoom={2}
              nodesConnectable={false}
              nodesDraggable={false}
              proOptions={{ hideAttribution: true }}
            >
              <details className="absolute bottom-[0.8rem] left-[4.5rem] z-8 w-[min(14rem,calc(100%-1.6rem))] rounded-[0.6rem] border border-[#bdccc4] bg-[rgba(249,251,250,0.96)] text-ink-strong shadow-[0_8px_24px_rgba(30,58,51,0.14)]">
                <summary className="cursor-pointer p-[0.65rem_0.8rem] text-[0.78rem] font-bold [list-style-position:inside]">
                  Chú thích quan hệ
                </summary>
                <div className="grid gap-[0.55rem] px-[0.8rem] pb-[0.8rem]">
                  <span className="flex items-center gap-[0.55rem] text-[0.74rem]">
                    <i className={legendLineClass} /> Cha/mẹ – con
                  </span>
                  <span className="flex items-center gap-[0.55rem] text-[0.74rem]">
                    <i className={`${legendLineClass} border-[#a96f25]`} /> Kết
                    hôn
                  </span>
                  <span className="flex items-center gap-[0.55rem] text-[0.74rem]">
                    <i
                      className={`${legendLineClass} border-dashed border-[#b85b4b]`}
                    />{" "}
                    Ly hôn
                  </span>
                  <span className="flex items-center gap-[0.55rem] text-[0.74rem]">
                    <i
                      className={`${legendLineClass} border-dotted border-[#c1842f]`}
                    />{" "}
                    Ly thân
                  </span>
                  <span className="flex items-center gap-[0.55rem] text-[0.74rem]">
                    <i
                      className={`${legendLineClass} border-dotted border-[#788982]`}
                    />{" "}
                    Có con chung
                  </span>
                </div>
              </details>
              <Background color="#365b51" gap={24} size={1} />
              <Controls showInteractive={false} />
              <MiniMap nodeColor={minimapColor} pannable zoomable />
            </ReactFlow>
          </section>
        ) : activeTab === "members" ? (
          <MemberList
            treeId={treeId}
            onSelectPerson={selectPerson}
            sidebarOpen={selectedOpen}
          />
        ) : (
          <RelationshipList
            persons={graph.data.nodes}
            relationships={graph.data.edges}
            sidebarOpen={selectedOpen}
            onSelectPerson={selectPerson}
            deletingId={
              removeRelationship.isPending
                ? removeRelationship.variables
                : undefined
            }
            onEdit={setRelationshipEditor}
            onDelete={async (relationship) => {
              const accepted = await notice.confirm(
                "Xóa quan hệ",
                "Quan hệ sẽ bị xóa khỏi gia phả và sơ đồ sẽ được cập nhật.",
              );
              if (accepted) removeRelationship.mutate(relationship.id);
            }}
          />
        )}
        {selectedId && (
          <PersonSidebar
            treeId={treeId}
            person={detail.data}
            loading={detail.isLoading}
            onClose={closeSidebar}
            onSelectPerson={selectPerson}
          />
        )}
        {selectedRelationship && (
          <RelationshipSidebar
            {...selectedRelationship}
            onClose={closeSidebar}
            onSelectPerson={selectPerson}
          />
        )}
      </div>
      {personChoiceOpen && (
        <PersonAddChoiceDialog
          onClose={() => setPersonChoiceOpen(false)}
          onSelect={(mode) => {
            setPersonChoiceOpen(false);
            navigate(`/trees/${treeId}/persons/new?mode=${mode}`);
          }}
        />
      )}
      {relationshipEditor && (
        <RelationshipFormDialog
          key={relationshipEditor === "new" ? "new" : relationshipEditor.id}
          persons={graph.data.nodes}
          relationship={
            relationshipEditor === "new" ? undefined : relationshipEditor
          }
          pending={saveRelationship.isPending}
          onClose={() => {
            if (saveRelationship.isPending) return;
            setRelationshipEditor(null);
          }}
          onSubmit={(value) => saveRelationship.mutate(value)}
        />
      )}
    </main>
  );
}
