import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown, Check, Sparkles } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'vision';
}

interface AIModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string, provider: string) => void;
  variant?: 'compact' | 'full';
}

export default function AIModelSelector({ selectedModel, onModelChange, variant = 'full' }: AIModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<{ nvidia: AIModel[], openrouter: AIModel[] }>({ nvidia: [], openrouter: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai-models')
      .then(res => res.json())
      .then(data => {
        setModels(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load AI models:', err);
        setLoading(false);
      });
  }, []);

  const allModels = [...models.nvidia, ...models.openrouter];
  const currentModel = allModels.find(m => m.id === selectedModel) || allModels[0];

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg animate-pulse">
        <Brain className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">Loading models...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
        >
          <Brain className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">{currentModel?.name || 'Select AI'}</span>
          <ChevronDown className="w-3 h-3 text-blue-500" />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Select AI Model
                </h3>
              </div>
              
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-500 uppercase px-2 py-1">NVIDIA</p>
                {models.nvidia.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id, 'nvidia');
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedModel === model.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{model.type}</span>
                    </div>
                    {selectedModel === model.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                
                <p className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 mt-2">OpenRouter</p>
                {models.openrouter.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id, 'openrouter');
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedModel === model.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{model.type}</span>
                    </div>
                    {selectedModel === model.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">AI Model Selection</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-600 uppercase">NVIDIA Models</h4>
          {models.nvidia.map(model => (
            <button
              key={model.id}
              onClick={() => onModelChange(model.id, 'nvidia')}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedModel === model.id 
                  ? 'border-blue-500 bg-blue-50 shadow-sm' 
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">{model.name}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{model.type}</span>
                </div>
                {selectedModel === model.id && <Check className="w-5 h-5 text-blue-600" />}
              </div>
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-600 uppercase">OpenRouter Models</h4>
          {models.openrouter.map(model => (
            <button
              key={model.id}
              onClick={() => onModelChange(model.id, 'openrouter')}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedModel === model.id 
                  ? 'border-blue-500 bg-blue-50 shadow-sm' 
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">{model.name}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{model.type}</span>
                </div>
                {selectedModel === model.id && <Check className="w-5 h-5 text-blue-600" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
