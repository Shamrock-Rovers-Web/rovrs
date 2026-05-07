import type { D1Database } from '@cloudflare/workers-types';

export class SimpleD1Mock implements D1Database {
  private data: Map<string, any[]>;
  private errorMode: boolean = false;

  constructor(initialData?: Map<string, any[]>) {
    this.data = initialData || new Map();
  }

  setTable(name: string, data: any[]): void {
    this.data.set(name, data);
  }

  setErrorMode(enabled: boolean): void {
    this.errorMode = enabled;
  }

  prepare(sql: string): D1PreparedStatement {
    if (this.errorMode) {
      throw new Error('Database connection failed');
    }
    return new SimplePreparedStatement(this.data, sql);
  }

  async dump(): Promise<{ success: boolean; results?: any[] }> {
    return { success: true, results: Array.from(this.data.entries()) };
  }

  async batch<T>(statements: D1PreparedStatement[]): Promise<T[]> {
    return statements.map(statement => statement.run());
  }
}

class SimplePreparedStatement implements D1PreparedStatement {
  private data: Map<string, any[]>;
  private sql: string;
  private boundValues: any[] = [];

  constructor(data: Map<string, any[]>, sql: string) {
    this.data = data;
    this.sql = sql;
  }

  bind(...values: any[]): SimplePreparedStatement {
    this.boundValues = values;
    return this;
  }

  async first<T = any>(): Promise<T> {
    const result = await this.all<T>();
    return result.results?.[0] as T;
  }

  async all<T = any>(): Promise<{ results?: T[]; success?: boolean }> {
    const tableNameMatch = this.sql.match(/FROM\s+(\w+)/i) || this.sql.match(/SELECT\s+.*\s+FROM\s+(\w+)/i);
    const tableName = tableNameMatch?.[1] || '';

    const tableData = this.data.get(tableName) || [];

    // For SELECT queries, apply WHERE clause logic
    if (this.sql.trim().toUpperCase().startsWith('SELECT') && this.sql.includes('WHERE slug = ?')) {
      const slugIndex = this.boundValues[0];
      const filtered = tableData.find(row => row.slug === slugIndex);
      return { results: filtered ? [filtered] : [] };
    }

    // For COUNT(*) query
    if (this.sql.includes('COUNT(*)')) {
      return { results: [{ count: tableData.length }] };
    }

    return { results: tableData };
  }

  async run<T = any>(): Promise<T> {
    // For UPDATE queries, simulate success
    if (this.sql.trim().toUpperCase().startsWith('UPDATE')) {
      // Update the data in our mock
      const tableNameMatch = this.sql.match(/UPDATE\s+(\w+)/i);
      const tableName = tableNameMatch?.[1] || '';

      if (tableName === 'links') {
        const tableData = this.data.get(tableName) || [];
        const slug = this.boundValues[2]; // WHERE slug = ?
        const newStatus = this.boundValues[0]; // SET status = ?
        const newUpdatedAt = this.boundValues[1]; // SET updated_at = ?

        const index = tableData.findIndex(row => row.slug === slug);
        if (index !== -1) {
          tableData[index] = {
            ...tableData[index],
            status: newStatus,
            updated_at: newUpdatedAt
          };
          this.data.set(tableName, tableData);
        }
      }

      return { success: true, results: [] } as T;
    }
    return { success: true } as T;
  }
}