import React, { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { postMessageToHost } from "./lib/vscode-api";
import type { HostToWebviewMessage } from "../../shared/protocol";

export function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<string>("waiting");

  useEffect(() => {
    postMessageToHost({ type: "ready" });

    const handler = (event: MessageEvent) => {
      const message = event.data as HostToWebviewMessage;
      if (!message || typeof message !== "object" || !("type" in message)) return;

      switch (message.type) {
        case "analysisStatus":
          setStatus(message.status);
          break;
        case "graphData":
        case "graphUpdate":
          setNodes(
            message.nodes.map((n) => ({
              id: n.id,
              position: { x: 0, y: 0 },
              data: n,
            }))
          );
          setEdges(
            message.edges.map((e) => ({
              id: `${e.source}-${e.target}`,
              source: e.source,
              target: e.target,
            }))
          );
          setStatus("ready");
          break;
        case "cycles":
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "var(--vscode-descriptionForeground)",
            fontSize: "14px",
          }}
        >
          {status === "waiting" ? "Connecting..." : `${status}...`}
        </div>
      )}
    </div>
  );
}
