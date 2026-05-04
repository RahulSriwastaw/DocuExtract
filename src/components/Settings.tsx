import AirtableTables from './AirtableTables';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database, Cloud, Key } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-text-heading mb-2">Settings</h2>
        <p className="text-text-muted">Manage your database connections and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Database className="w-5 h-5 text-emerald-500" />
              Supabase Connection
            </CardTitle>
            <CardDescription>Fast primary database for questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Status</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Project ID</span>
                <span className="font-mono text-xs">aekhuewsedfnvtuczmbs</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-text-muted">Sync</span>
                <span className="font-medium">Auto-sync with Airtable</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Cloud className="w-5 h-5 text-blue-500" />
              Cloudinary Integration
            </CardTitle>
            <CardDescription>Media storage for images and videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Status</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">API Key</span>
                <span className="font-mono text-xs">927254442924519</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6 border-t border-border">
        <AirtableTables />
      </div>
    </div>
  );
}
