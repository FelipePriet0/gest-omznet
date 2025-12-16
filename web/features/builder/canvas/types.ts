export type CanvasMode = "hand" | "cursor";

export type CanvasNodeType = "technician" | "priority" | "route" | "text";

export type CanvasNodeBase = {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
};

export type TechnicianNodeData = {
  technicianIds: string[];
};

export type PriorityNodeData = {
  priorities: string[];
};

export type RouteNodeData = {
  routes: string[];
};

export type TextNodeData = {
  text: string;
};

export type CanvasNode =
  | (CanvasNodeBase & { type: "technician"; data: TechnicianNodeData })
  | (CanvasNodeBase & { type: "priority"; data: PriorityNodeData })
  | (CanvasNodeBase & { type: "route"; data: RouteNodeData })
  | (CanvasNodeBase & { type: "text"; data: TextNodeData });

export type PortId = "left" | "right";

export type CanvasEdge = {
  id: string;
  from: { nodeId: string; port: PortId };
  to: { nodeId: string; port: PortId };
};

export type CanvasViewport = {
  x: number;
  y: number;
};

export type CanvasWorkflowState = {
  mode: CanvasMode;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
};
