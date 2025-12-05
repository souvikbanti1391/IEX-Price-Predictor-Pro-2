import React from 'react';
import { Settings, PlayCircle } from 'lucide-react';
import { ConfigState } from '../types';

interface ConfigPanelProps {
    config: ConfigState;
    setConfig: (config: ConfigState) => void;
    onRun: () => void;
    isProcessing: boolean;
    disabled: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onRun, isProcessing, disabled }) => {
    
    const handleChange = (key: keyof ConfigState, value: string) => {
        setConfig({ ...config, [key]: Number(value) });
    };

    if (disabled) return null;

    return (
        <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                <Settings className="text-zinc-500" size={20} />
                <h2 className="text-lg font-bold text-zinc-100">Prediction Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        Plot Interval
                    </label>
                    <select 
                        value={config.plotInterval}
                        onChange={(e) => handleChange('plotInterval', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors outline-none appearance-none"
                    >
                        <option value={1}>Last 24 Hours</option>
                        <option value={7}>Last 7 Days</option>
                        <option value={14}>Last 14 Days</option>
                        <option value={30}>Last 30 Days</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        Forecast Horizon
                    </label>
                    <select 
                        value={config.forecastDays}
                        onChange={(e) => handleChange('forecastDays', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors outline-none appearance-none"
                    >
                        <option value={1}>Next 24 Hours</option>
                        <option value={3}>Next 3 Days</option>
                        <option value={5}>Next 5 Days</option>
                        <option value={7}>Next 7 Days</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        Confidence
                    </label>
                    <select 
                        value={config.confidenceLevel}
                        onChange={(e) => handleChange('confidenceLevel', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors outline-none appearance-none"
                    >
                        <option value={90}>90% (Strict)</option>
                        <option value={95}>95% (Standard)</option>
                        <option value={99}>99% (Broad)</option>
                    </select>
                </div>
            </div>

            <button
                onClick={onRun}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all duration-200 shadow-lg border border-transparent
                    ${isProcessing 
                        ? 'bg-zinc-800 text-zinc-500 cursor-wait border-zinc-700' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/20 active:scale-[0.99]'
                    }
                `}
            >
                {isProcessing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <PlayCircle size={24} />
                        Run Forecast
                    </>
                )}
            </button>
        </div>
    );
};

export default ConfigPanel;