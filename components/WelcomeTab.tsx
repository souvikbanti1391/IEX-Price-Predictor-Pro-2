
import React from 'react';
import { Battery, Zap, ChevronRight, ShieldCheck } from 'lucide-react';

interface WelcomeTabProps {
    onStart: () => void;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({ onStart }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Hero Section */}
            <div className="relative mb-12 group">
                <div className="absolute inset-0 bg-blue-500 blur-[100px] opacity-20 rounded-full group-hover:opacity-30 transition-opacity duration-1000"></div>
                <div className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl transform transition-transform duration-500 hover:scale-[1.02]">
                    <div className="flex items-center justify-center gap-6 mb-6">
                        <div className="p-4 bg-blue-900/30 rounded-2xl border border-blue-500/20">
                            <Battery className="w-16 h-16 text-blue-400" />
                        </div>
                        <div className="h-12 w-px bg-zinc-800"></div>
                        <div className="p-4 bg-amber-900/30 rounded-2xl border border-amber-500/20">
                            <Zap className="w-16 h-16 text-amber-400" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-center text-white mb-2 tracking-tight">
                        BESS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400">Optimiser</span>
                    </h1>
                    <p className="text-center text-zinc-400 font-medium text-lg">
                        Next-Generation IEX Price Forecasting & Scheduling
                    </p>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-16 px-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl hover:bg-zinc-900 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2">IEX Price Predictor</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Upload market data to run advanced algorithms (LSTM, XGBoost, SARIMAX) and forecast prices for the next 7 days.
                    </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl hover:bg-zinc-900 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2">Smart Scheduling</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Intelligent arbitrage optimization using naive and advanced logic to maximize revenue from battery assets.
                    </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl hover:bg-zinc-900 transition-colors">
                    <h3 className="text-xl font-bold text-white mb-2">Financial Analysis</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Calculate ROI, NPV, and Payback periods based on dynamic market conditions and operational expenses.
                    </p>
                </div>
            </div>

            {/* CTA */}
            <button 
                onClick={onStart}
                className="group relative px-8 py-4 bg-white text-black font-bold text-lg rounded-full overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95"
            >
                <span className="relative z-10 flex items-center gap-2">
                    Launch Application <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
            </button>

            {/* Footer Credits */}
            <div className="mt-24 text-center">
                <div className="flex items-center justify-center gap-2 text-zinc-600 font-bold tracking-widest uppercase text-xs mb-2">
                    <ShieldCheck size={14} /> DVC Official Partner
                </div>
                <p className="text-zinc-700 text-sm">
                    Site designed by <span className="text-zinc-500 font-semibold">@Souvik Mukherjee</span>
                </p>
                <p className="text-zinc-800 text-xs mt-1">All rights reserved © 2024</p>
            </div>
        </div>
    );
};

export default WelcomeTab;
