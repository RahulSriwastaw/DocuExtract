import AirtableTables from './AirtableTables';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database, Cloud, Key } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Settings</h2>
        <p className="text-slate-500">Manage your database connections and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-emerald-500" />
              Supabase Connection
            </CardTitle>
            <CardDescription>Fast primary database for questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Project ID</span>
                <span className="font-mono text-xs">aekhuewsedfnvtuczmbs</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Sync</span>
                <span className="font-medium">Auto-sync with Airtable</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cloud className="w-5 h-5 text-blue-500" />
              Cloudinary Integration
            </CardTitle>
            <CardDescription>Media storage for images and videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">API Key</span>
                <span className="font-mono text-xs">927254442924519</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <AirtableTables />
      </div>
    </div>
  );
}
