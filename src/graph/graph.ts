export interface Edge<_N, E> {
  readonly source: string;
  readonly target: string;
  readonly data: E;
}

export interface Node<N> {
  readonly id: string;
  readonly data: N;
}

/**
 * Generic directed graph with rich node/edge metadata.
 * Inspired by Skott's digraph-js but with richer edge data and
 * incremental patch operations for live updates.
 */
export class DirectedGraph<N, E> {
  private nodes = new Map<string, N>();
  private edges: Array<Edge<N, E>> = [];
  private outEdges = new Map<string, Set<number>>(); // nodeId → edge indices
  private inEdges = new Map<string, Set<number>>(); // nodeId → edge indices

  // --- Node operations ---

  addNode(id: string, data: N): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, data);
      this.outEdges.set(id, new Set());
      this.inEdges.set(id, new Set());
    }
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): N | undefined {
    return this.nodes.get(id);
  }

  removeNode(id: string): void {
    if (!this.nodes.has(id)) return;

    // Remove all edges involving this node
    this.edges = this.edges.filter((edge) => {
      if (edge.source === id || edge.target === id) {
        // Remove from index sets
        this.outEdges.get(edge.source)?.delete(this.edges.indexOf(edge));
        this.inEdges.get(edge.target)?.delete(this.edges.indexOf(edge));
        return false;
      }
      return true;
    });

    this.nodes.delete(id);
    this.outEdges.delete(id);
    this.inEdges.delete(id);
    this.rebuildEdgeIndices();
  }

  updateNode(id: string, data: N): void {
    if (this.nodes.has(id)) {
      this.nodes.set(id, data);
    }
  }

  getNodes(): ReadonlyMap<string, N> {
    return this.nodes;
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  // --- Edge operations ---

  addEdge(source: string, target: string, data: E): void {
    if (!this.nodes.has(source) || !this.nodes.has(target)) {
      throw new Error(
        `Cannot add edge: node not found (${source} → ${target})`
      );
    }
    const idx = this.edges.length;
    this.edges.push({ source, target, data });
    this.outEdges.get(source)!.add(idx);
    this.inEdges.get(target)!.add(idx);
  }

  hasEdge(source: string, target: string): boolean {
    return this.edges.some(
      (e) => e.source === source && e.target === target
    );
  }

  getEdge(source: string, target: string): Edge<N, E> | undefined {
    return this.edges.find(
      (e) => e.source === source && e.target === target
    );
  }

  removeEdge(source: string, target: string): void {
    const idx = this.edges.findIndex(
      (e) => e.source === source && e.target === target
    );
    if (idx === -1) return;
    this.edges.splice(idx, 1);
    this.rebuildEdgeIndices();
  }

  getEdges(): ReadonlyArray<Edge<N, E>> {
    return this.edges;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  // --- Graph queries ---

  /** Get nodes that this node depends on (outgoing edges). */
  getDependenciesOf(id: string): string[] {
    const indices = this.outEdges.get(id);
    if (!indices) return [];
    return [...indices]
      .map((i) => this.edges[i])
      .filter(Boolean)
      .map((e) => e.target);
  }

  /** Get nodes that depend on this node (incoming edges). */
  getDependentsOf(id: string): string[] {
    const indices = this.inEdges.get(id);
    if (!indices) return [];
    return [...indices]
      .map((i) => this.edges[i])
      .filter(Boolean)
      .map((e) => e.source);
  }

  /** Get outgoing edges from a node. */
  getOutEdges(id: string): Array<Edge<N, E>> {
    const indices = this.outEdges.get(id);
    if (!indices) return [];
    return [...indices].map((i) => this.edges[i]).filter(Boolean);
  }

  /** Get incoming edges to a node. */
  getInEdges(id: string): Array<Edge<N, E>> {
    const indices = this.inEdges.get(id);
    if (!indices) return [];
    return [...indices].map((i) => this.edges[i]).filter(Boolean);
  }

  /** Get nodes with no incoming edges from project files (potential entry points). */
  getEntryNodes(): string[] {
    return [...this.nodes.keys()].filter(
      (id) => (this.inEdges.get(id)?.size ?? 0) === 0
    );
  }

  /** Get nodes with no outgoing edges (leaves). */
  getLeafNodes(): string[] {
    return [...this.nodes.keys()].filter(
      (id) => (this.outEdges.get(id)?.size ?? 0) === 0
    );
  }

  /** Get nodes with no edges at all (orphans). */
  getOrphanNodes(): string[] {
    return [...this.nodes.keys()].filter((id) => {
      const out = this.outEdges.get(id)?.size ?? 0;
      const inn = this.inEdges.get(id)?.size ?? 0;
      return out === 0 && inn === 0;
    });
  }

  // --- Incremental update ---

  /** Patch multiple nodes (update data for existing nodes, add new ones). */
  patchNodes(updates: Array<{ id: string; data: N }>): void {
    for (const { id, data } of updates) {
      if (this.nodes.has(id)) {
        this.nodes.set(id, data);
      } else {
        this.addNode(id, data);
      }
    }
  }

  /** Remove edges and add new ones in one batch. */
  patchEdges(
    remove: Array<{ source: string; target: string }>,
    add: Array<{ source: string; target: string; data: E }>
  ): void {
    for (const { source, target } of remove) {
      this.removeEdge(source, target);
    }
    for (const { source, target, data } of add) {
      if (this.nodes.has(source) && this.nodes.has(target)) {
        this.addEdge(source, target, data);
      }
    }
  }

  // --- Serialization ---

  toJSON(): {
    nodes: Array<{ id: string; data: N }>;
    edges: Array<Edge<N, E>>;
  } {
    return {
      nodes: [...this.nodes.entries()].map(([id, data]) => ({ id, data })),
      edges: [...this.edges],
    };
  }

  static fromJSON<N, E>(json: {
    nodes: Array<{ id: string; data: N }>;
    edges: Array<{ source: string; target: string; data: E }>;
  }): DirectedGraph<N, E> {
    const graph = new DirectedGraph<N, E>();
    for (const { id, data } of json.nodes) {
      graph.addNode(id, data);
    }
    for (const { source, target, data } of json.edges) {
      graph.addEdge(source, target, data);
    }
    return graph;
  }

  // --- Internal ---

  private rebuildEdgeIndices(): void {
    this.outEdges.clear();
    this.inEdges.clear();
    for (const id of this.nodes.keys()) {
      this.outEdges.set(id, new Set());
      this.inEdges.set(id, new Set());
    }
    for (let i = 0; i < this.edges.length; i++) {
      this.outEdges.get(this.edges[i].source)?.add(i);
      this.inEdges.get(this.edges[i].target)?.add(i);
    }
  }
}
