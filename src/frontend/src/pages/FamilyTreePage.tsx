import { useQuery } from "@tanstack/react-query";
import type { MarriageStatus } from "@family-tree/shared-types";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPersonDetail, getTreeGraph } from "../features/family-tree/api";
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

const nodeTypes = { person: FamilyPersonNode, junction: FamilyJunctionNode };

export function FamilyTreePage() {
  const { treeId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("person");
  const relationshipKey = searchParams.get("relationship");
  const [nodes, setNodes, onNodesChange] = useNodesState<FamilyTreeFlowNode>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutReady, setLayoutReady] = useState(false);
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
      <main className="tree-route-state">
        <div className="tree-spinner" />
        <p>Đang dựng sơ đồ gia phả…</p>
      </main>
    );
  if (graph.isError || !graph.data)
    return (
      <main className="tree-route-state">
        <h1>Không thể mở gia phả</h1>
        <p>Gia phả không tồn tại hoặc bạn không có quyền xem.</p>
        <button className="button-secondary" onClick={() => graph.refetch()}>
          Thử lại
        </button>
        <Link to="/trees">Về danh sách</Link>
      </main>
    );

  return (
    <main className={`family-tree-page ${selectedOpen ? "sidebar-open" : ""}`}>
      <header className="tree-toolbar">
        <nav aria-label="Breadcrumb">
          <Link to="/trees">Danh sách gia phả</Link>
          <span>/</span>
          <strong>{graph.data.tree.name}</strong>
        </nav>
        <div>
          <span>{graph.data.tree.personCount} thành viên</span>
        </div>
      </header>
      <section className="tree-canvas" aria-label="Sơ đồ gia phả tương tác">
        {!layoutReady && (
          <div className="canvas-loading">Đang sắp xếp các thế hệ…</div>
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
          <details className="tree-legend-panel">
            <summary>Chú thích quan hệ</summary>
            <div>
              <span>
                <i className="legend-parent" /> Cha/mẹ – con
              </span>
              <span>
                <i className="legend-married" /> Kết hôn
              </span>
              <span>
                <i className="legend-divorced" /> Ly hôn
              </span>
              <span>
                <i className="legend-separated" /> Ly thân
              </span>
              <span>
                <i className="legend-co-parents" /> Có con chung
              </span>
            </div>
          </details>
          <Background color="#365b51" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap nodeColor={minimapColor} pannable zoomable />
        </ReactFlow>
      </section>
      {selectedOpen && (
        <PersonSidebar
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
    </main>
  );
}
