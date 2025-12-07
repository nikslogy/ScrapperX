'use client';

import { useState, useEffect } from 'react';
import { Key, Check, X, Eye, EyeOff } from 'lucide-react';
import { setApiKey, clearApiKey, hasApiKey } from '@/lib/api';

interface ApiKeyInputProps {
    onKeyChange?: (hasKey: boolean) => void;
}

export default function ApiKeyInput({ onKeyChange }: ApiKeyInputProps) {
    const [apiKey, setApiKeyState] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [showInput, setShowInput] = useState(false);

    useEffect(() => {
        // Check if API key is already configured
        const configured = hasApiKey();
        setIsConfigured(configured);

        // Load the key for display (masked)
        if (typeof window !== 'undefined') {
            const storedKey = localStorage.getItem('scrapperx_api_key');
            if (storedKey) {
                setApiKeyState(storedKey);
            }
        }
    }, []);

    const handleSaveKey = () => {
        if (apiKey.trim()) {
            setApiKey(apiKey.trim());
            setIsConfigured(true);
            setShowInput(false);
            onKeyChange?.(true);
        }
    };

    const handleClearKey = () => {
        clearApiKey();
        setApiKeyState('');
        setIsConfigured(false);
        onKeyChange?.(false);
    };

    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(Math.max(0, apiKey.length - 12))}${apiKey.slice(-4)}` : '';

    if (!showInput && !isConfigured) {
        return (
            <button
                onClick={() => setShowInput(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Key className="w-4 h-4" />
                <span>Add API Key</span>
            </button>
        );
    }

    if (isConfigured && !showInput) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">API Key Active</span>
                    <span className="text-green-600 font-mono text-xs hidden sm:inline">
                        {showKey ? apiKey : maskedKey}
                    </span>
                </div>
                <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 text-gray-500 hover:text-black rounded transition-colors"
                    title={showKey ? 'Hide key' : 'Show key'}
                >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => setShowInput(true)}
                    className="p-1.5 text-gray-500 hover:text-black rounded transition-colors"
                    title="Change key"
                >
                    <Key className="w-4 h-4" />
                </button>
                <button
                    onClick={handleClearKey}
                    className="p-1.5 text-red-500 hover:text-red-700 rounded transition-colors"
                    title="Remove key"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKeyState(e.target.value)}
                    placeholder="scx_your-api-key-here"
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                />
                <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
                >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Save
            </button>
            <button
                onClick={() => {
                    setShowInput(false);
                    if (!isConfigured) setApiKeyState('');
                }}
                className="px-3 py-2 text-gray-600 text-sm hover:text-black transition-colors"
            >
                Cancel
            </button>
        </div>
    );
}
