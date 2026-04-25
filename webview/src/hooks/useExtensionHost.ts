import { useEffect, useReducer } from "react";
import { postMessageToHost } from "../lib/vscode-api";
import type {
  HostToWebviewMessage,
  GraphNodeData,
  GraphEdgeData,
  LayoutPosition,
} from "../../../shared/protocol";

export interface GraphState {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  positions: Map<string, LayoutPosition>;
  status: "waiting" | "scanning" | "analyzing" | "layout" | "ready" | "error";
  statusMessage?: string;
  cycles: string[][];
}

type Action =
  | { type: "analysisStatus"; status: GraphState["status"]; message?: string }
  | { type: "graphData"; nodes: GraphNodeData[]; edges: GraphEdgeData[]; positions: LayoutPosition[] }
  | { type: "graphUpdate"; nodes: GraphNodeData[]; edges: GraphEdgeData[]; positions: LayoutPosition[] }
  | { type: "cycles"; cycles: string[][] };

const initialState: GraphState = {
  nodes: [],
  edges: [],
  positions: new Map(),
  status: "waiting",
  cycles: [],
};

function reducer(state: GraphState, action: Action): GraphState {
  switch (action.type) {
    case "analysisStatus":
      return { ...state, status: action.status, statusMessage: action.message };
    case "graphData": {
      const posMap = new Map(action.positions.map((p) => [p.id, p]));
      return { ...state, nodes: action.nodes, edges: action.edges, positions: posMap, status: "ready" };
    }
    case "graphUpdate": {
      const posMap = new Map(action.positions.map((p) => [p.id, p]));
      return { ...state, nodes: action.nodes, edges: action.edges, positions: posMap, status: "ready" };
    }
    case "cycles":
      return { ...state, cycles: action.cycles };
  }
}

export function useExtensionHost(): GraphState {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    postMessageToHost({ type: "ready" });

    const handler = (event: MessageEvent) => {
      const message = event.data as HostToWebviewMessage;
      if (!message || typeof message !== "object" || !("type" in message)) return;

      switch (message.type) {
        case "analysisStatus":
          dispatch({ type: "analysisStatus", status: message.status, message: message.message });
          break;
        case "graphData":
          dispatch({ type: "graphData", nodes: message.nodes, edges: message.edges, positions: message.positions });
          break;
        case "graphUpdate":
          dispatch({ type: "graphUpdate", nodes: message.nodes, edges: message.edges, positions: message.positions });
          break;
        case "cycles":
          dispatch({ type: "cycles", cycles: message.cycles });
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return state;
}
