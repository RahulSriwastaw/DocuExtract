import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Database, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeJson } from '../utils';

export default function AirtableTables() {
  const [tables, setTables] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, {count: number, lastUpdated: string}>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/get-airtable-tables');
      const data = await safeJson(res);
      if (data.tables) {
        setTables(data.tables);
        data.tables.forEach((t: any) => fetchStats(t.name));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchStats = async (tableName: string) => {
    try {
      const res = await fetch('/api/get-table-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName })
      });
      const data = await safeJson(res);
      setStats(prev => ({ ...prev, [tableName]: data }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cloud Databases</h2>
        <Button onClick={fetchTables} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>
      
      {loading && tables.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <Card key={table.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="w-5 h-5 text-blue-500" />
                  {table.name}
                </CardTitle>
                <CardDescription className="text-xs">ID: {table.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-sm mt-2">
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="text-muted-foreground">Total Questions</span>
                    <span className="font-semibold text-base">
                      {stats[table.name] ? stats[table.name].count : <Loader2 className="w-3 h-3 animate-spin" />}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      {stats[table.name]?.lastUpdated 
                        ? new Date(stats[table.name].lastUpdated).toLocaleString() 
                        : <Loader2 className="w-3 h-3 animate-spin" />}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tables.length === 0 && !loading && (
            <div className="col-span-full text-center p-8 text-muted-foreground border rounded-lg border-dashed">
              No remote tables found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
