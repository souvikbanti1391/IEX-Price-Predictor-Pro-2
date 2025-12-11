
import React, { useState } from 'react';
import { Zap, LayoutDashboard, BatteryCharging, Home } from 'lucide-react';
import WelcomeTab from './components/WelcomeTab';
import PredictorTab from './components/PredictorTab';
import OptimizerTab from './components/OptimizerTab';
import { IEXDataPoint, SimulationResult, ConfigState } from './types';
import { runSimulation } from './services/predictionEngine';

type TabType = 'WELCOME' | 'PREDICTOR' | 'OPTIMIZER';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('WELCOME');
    const [data, setData] = useState<IEXDataPoint[] | null>(null);
    const [results, setResults] = useState<SimulationResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [config, setConfig] = useState<ConfigState>({
        plotInterval: 7,
        forecastDays: 7,
        confidenceLevel: 95
    });

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
        <div className="min-h-screen bg-black pb-20 text-zinc-200 font-sans">
            {/* Navigation Header */}
            <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
                            <Zap size={20} className="text-white fill-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white hidden md:block">
                            IEX <span className="text-blue-500">Pro</span>
                        </span>
                    </div>

                    <nav className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                        <NavButton 
                            active={activeTab === 'WELCOME'} 
                            onClick={() => setActiveTab('WELCOME')} 
                            icon={<Home size={18} />} 
                            label="Home" 
                        />
                        <NavButton 
                            active={activeTab === 'PREDICTOR'} 
                            onClick={() => setActiveTab('PREDICTOR')} 
                            icon={<LayoutDashboard size={18} />} 
                            label="Predictor" 
                        />
                        <NavButton 
                            active={activeTab === 'OPTIMIZER'} 
                            onClick={() => setActiveTab('OPTIMIZER')} 
                            icon={<BatteryCharging size={18} />} 
                            label="Optimizer" 
                        />
                    </nav>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'WELCOME' && (
                    <WelcomeTab onStart={() => setActiveTab('PREDICTOR')} />
                )}

                {activeTab === 'PREDICTOR' && (
                    <PredictorTab 
                        data={data} 
                        setData={setData}
                        results={results}
                        config={config}
                        setConfig={setConfig}
                        onRunAnalysis={handleRunAnalysis}
                        isProcessing={isProcessing}
                    />
                )}

                {activeTab === 'OPTIMIZER' && (
                    <OptimizerTab results={results} />
                )}
            </main>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${active 
                ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}
        `}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export default App;
