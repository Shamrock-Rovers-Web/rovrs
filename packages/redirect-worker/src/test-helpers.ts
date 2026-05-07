import type { D1Database } from '@cloudflare/workers-types';

// Mock D1 database for testing
export class MockD1Database implements D1Database {
  private data: Map<string, any[]> = new Map();

  constructor(initialData?: Map<string, any[]>) {
    if (initialData) {
      this.data = initialData;
    }
  }

  async prepare(sql: string): Promise<D1PreparedStatement> {
    // Parse the SQL to determine the table name
    const tableNameMatch = sql.match(/FROM\s+(\w+)/i) || sql.match(/INTO\s+(\w+)/i);
    const tableName = tableNameMatch?.[1] || '';

    return new MockD1PreparedStatement(this.data, sql);
  }

  async dump(): Promise<{ success: boolean; results?: any[] }> {
    return { success: true, results: Array.from(this.data.entries()) };
  }

  async batch<T>(statements: D1PreparedStatement[]): Promise<T[]> {
    return statements.map(statement => statement.run());
  }

  // Helper method to set test data
  setData(table: string, data: any[]): void {
    this.data.set(table, data);
  }

  // Helper method to clear data
  clearData(): void {
    this.data.clear();
  }
}

export class MockD1PreparedStatement implements D1PreparedStatement {
  private data: Map<string, any[]>;
  private sql: string;
  private boundValues: any[] = [];

  constructor(data: Map<string, any[]>, sql: string) {
    this.data = data;
    this.sql = sql;
  }

  bind(...values: any[]): MockD1PreparedStatement {
    this.boundValues = values;
    return this;
  }

  async first<T = any>(): Promise<T | undefined> {
    const result = await this.all<T>();
    return result.results?.[0];
  }

  async all<T = any>(): Promise<{ results?: T[]; success?: boolean; error?: string }> {
    const tableNameMatch = this.sql.match(/FROM\s+(\w+)/i) || this.sql.match(/INTO\s+(\w+)/i);
    const tableName = tableNameMatch?.[1] || '';

    const tableData = this.data.get(tableName) || [];

    // For SELECT queries, return the data
    if (this.sql.trim().toUpperCase().startsWith('SELECT')) {
      // Apply WHERE clause logic if present
      if (this.sql.includes('WHERE')) {
        const whereClause = this.sql.match(/WHERE\s+(.+)/i)?.[1] || '';
        if (whereClause.includes('slug = ?')) {
          const slugIndex = this.boundValues[0];
          return { results: tableData.find(row => row.slug === slugIndex) ? [tableData.find(row => row.slug === slugIndex)] : [] };
        }
      }
      return { results: tableData };
    }

    return { success: true };
  }

  async run<T = any>(): Promise<T> {
    const tableNameMatch = this.sql.match(/UPDATE\s+(\w+)/i) || this.sql.match(/INSERT\s+INTO\s+(\w+)/i);
    const tableName = tableNameMatch?.[1] || '';

    if (this.sql.trim().toUpperCase().startsWith('UPDATE') || this.sql.trim().toUpperCase().startsWith('INSERT')) {
      // Simulate update/insert
      return { success: true, results: [] };
    }

    return { success: true };
  }
}

// Factory function to create a mock database with test data
export function createMockDb(initialData?: Map<string, any[]>): MockD1Database {
  return new MockD1Database(initialData);
}

// Sample test data
export const sampleLinks = [
  {
    slug: 'tickets',
    destination: 'https://ticket.shamrockrovers.ie',
    status: 'active' as const,
    expiry_date: null,
    match_date: null,
    campaign: 'tickets',
    channel: 'organic',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    slug: 'expired-link',
    destination: 'https://example.com',
    status: 'active' as const,
    expiry_date: '2024-01-01T00:00:00Z',
    match_date: null,
    campaign: null,
    channel: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    slug: 'deleted-link',
    destination: 'https://example.com',
    status: 'deleted' as const,
    expiry_date: null,
    match_date: null,
    campaign: null,
    channel: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    slug: 'match-date-link',
    destination: 'https://example.com',
    status: 'active' as const,
    expiry_date: null,
    match_date: '2024-01-01T00:00:00Z',
    campaign: null,
    channel: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];