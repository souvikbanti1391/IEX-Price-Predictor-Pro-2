import React, { useState } from 'react';
import { Zap, BarChart3, TrendingUp } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import ResultsDashboard from './components/ResultsDashboard';
import { IEXDataPoint, SimulationResult, ConfigState } from './types';
import { runSimulation } from './services/predictionEngine';

const App: React.FC = () => {
    const [data, setData] = useState<IEXDataPoint[] | null>(null);
    const [results, setResults] = useState<SimulationResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [config, setConfig] = useState<ConfigState>({
        plotInterval: 7,
        forecastDays: 7,
        confidenceLevel: 95
    });

    const handleDataLoaded = (loadedData: IEXDataPoint[]) => {
        setData(loadedData);
        setResults(null); // Reset results on new file
    };

    const handleRunAnalysis = async () => {
        if (!data) return;
        
        setIsProcessing(true);
        try {
            await new Promise(r => setTimeout(r, 800));
            const simResults = await runSimulation(data, config.forecastDays, config.confidenceLevel);
            setResults(simResults);
        } catch (error) {
            console.error("Simulation failed", error);
            alert("An error occurred during analysis.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-black pb-20 text-zinc-200">
            {/* Header */}
            <div className="bg-zinc-950 border-b border-zinc-900 pt-10 pb-20 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950/0 to-transparent"></div>
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-2xl shadow-xl shadow-blue-500/10 mb-6 border border-white/10 ring-1 ring-white/5">
                            <Zap size={32} className="text-white fill-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
                            IEX DAM Price Predictor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Pro</span>
                        </h1>
                        <div className="flex flex-col items-center gap-2 max-w-3xl">
                            <p className="text-lg text-zinc-400 font-medium">
                                Advanced multi-model forecasting engine. Developed as a part of EMBA project@ VGSOM
                            </p>
                            <p className="text-lg text-indigo-400 font-medium">
                                Upload your IEX Market Clearing Price data to automatically identify the best performing algorithm
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 -mt-12 relative z-20">
                <div className="bg-zinc-900 rounded-2xl shadow-2xl shadow-black/50 border border-zinc-800 p-8 mb-8">
                    <FileUpload onDataLoaded={handleDataLoaded} />
                    
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
                        onRun={handleRunAnalysis}
                        isProcessing={isProcessing}
                        disabled={false}
                    />
                )}

                {results && (
                    <ResultsDashboard results={results} config={config} />
                )}
            </main>

             <footer className="text-center text-zinc-600 text-sm pb-8 pt-8 border-t border-zinc-900/50 mt-12">
                <p>© 2024 IEX Analytics. All predictions are simulated estimates.</p>
                <p className="mt-2 font-medium text-zinc-500">All rights reserved @SouvikM</p>
            </footer>
        </div>
    );
};

export default App;