// Modèle métier des connexions et abstraction DataSource.
// Chaque kind a son implémentation : DemoDataSource, SupabaseOAuthDataSource, etc.

export type ConnectionKind = "demo" | "supabase" | "postgres" | "csv" | "stripe";

export type Connection = {
  id: string;
  workspaceId: string;
  name: string;
  kind: ConnectionKind;
  configJsonb: Record<string, unknown>;
};

export type TableInfo = {
  name: string;
  rowCount: number;
};

export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
};

export type TableDetail = {
  name: string;
  columns: ColumnInfo[];
  samples: Record<string, unknown>[];
};

export type QueryRow = Record<string, unknown>;

export type DataSource = {
  listTables(): Promise<TableInfo[]>;
  inspectTable(name: string): Promise<TableDetail | null>;
  runQuery(sql: string): Promise<QueryRow[]>;
};
