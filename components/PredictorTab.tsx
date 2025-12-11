
import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import FileUpload from './FileUpload';
import ConfigPanel from './ConfigPanel';
import ResultsDashboard from './ResultsDashboard';
import { IEXDataPoint, SimulationResult, ConfigState } from '../types';

interface PredictorTabProps {
    data: IEXDataPoint[] | null;
    setData: (data: IEXDataPoint[] | null) => void;
    results: SimulationResult | null;
    config: ConfigState;
    setConfig: (config: ConfigState) => void;
    onRunAnalysis: () => void;
    isProcessing: boolean;
}

const PredictorTab: React.FC<PredictorTabProps> = ({
    data, setData, results, config, setConfig, onRunAnalysis, isProcessing
}) => {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-zinc-900 rounded-2xl shadow-2xl shadow-black/50 border border-zinc-800 p-8">
                <FileUpload onDataLoaded={(d) => setData(d)} />
                
                {data && (
                    <div className="mt-6 flex flex-wrap items-center justify-between text-sm text-zinc-400 bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={16} className="text-blue-500" />
                                <span className="font-semibold text-zinc-300">Data Points:</span> {data.length.toLocaleString()}
                            </div>
                            <div className="w-px h-4 bg-zinc-800"></div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <span className="font-semibold text-zinc-300">Date Range:</span> {data[0].date} — {data[data.length-1].date}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {data && (
                <ConfigPanel 
                    config={config} 
                    setConfig={setConfig} 
                    onRun={onRunAnalysis}
                    isProcessing={isProcessing}
                    disabled={false}
                />
            )}

            {results && (
                <ResultsDashboard results={results} config={config} />
            )}
        </div>
    );
};

export default PredictorTab;
