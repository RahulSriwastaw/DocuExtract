import AirtableTables from './AirtableTables';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database, Cloud, Key, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAvailableProviders, getDefaultProvider, type AIProvider } from '@/utils/aiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(getDefaultProvider());
  const [selectedModel, setSelectedModel] = useState<string>('');
  const availableProviders = getAvailableProviders();

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedProvider = localStorage.getItem('aiProvider') as AIProvider;
    const savedModel = localStorage.getItem('aiModel');

    if (savedProvider && availableProviders.find(p => p.value === savedProvider)) {
      setSelectedProvider(savedProvider);
    }

    if (savedModel) {
      setSelectedModel(savedModel);
    } else {
      // Set default model for the selected provider
      const provider = availableProviders.find(p => p.value === selectedProvider);
      if (provider) {
        setSelectedModel(provider.models[0]);
      }
    }
  }, [selectedProvider, availableProviders]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    localStorage.setItem('aiProvider', provider);

    // Set default model for the new provider
    const providerData = availableProviders.find(p => p.value === provider);
    if (providerData) {
      const defaultModel = providerData.models[0];
      setSelectedModel(defaultModel);
      localStorage.setItem('aiModel', defaultModel);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('aiModel', model);
  };

  const currentProvider = availableProviders.find(p => p.value === selectedProvider);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Settings</h2>
        <p className="text-slate-500">Manage your database connections, integrations, and AI preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-purple-500" />
              AI Provider
            </CardTitle>
            <CardDescription>Choose your preferred AI service for processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">AI Provider</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentProvider && (
              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProvider.models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-xs text-slate-500 mt-2">
              {availableProviders.length === 0 && (
                <p className="text-amber-600">No AI providers configured. Please set API keys in environment variables.</p>
              )}
              {availableProviders.length > 0 && (
                <p>Selected: {currentProvider?.label} - {selectedModel}</p>
              )}
            </div>
          </CardContent>
        </Card>

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
