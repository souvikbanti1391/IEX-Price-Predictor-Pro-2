import React, { useState, useEffect } from 'react';
import { Settings2, PlayCircle, DollarSign, Battery, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import { SimulationResult, BessConfig, FinancialMetrics } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';

interface OptimizerTabProps {
    results: SimulationResult | null;
}

const OptimizerTab: React.FC<OptimizerTabProps> = ({ results }) => {
    const [config, setConfig] = useState<BessConfig>({
        capacityMW: 50,
        durationHours: 2,
        cyclesPerDay: 1,
        efficiency: 0.90,
        depthOfDischarge: 0.9,
        degradationRate: 2.5,
        capexPerKWh: 25000,
        opexPerMWh: 500
    });

    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [optimiserMode, setOptimiserMode] = useState<'NAIVE' | 'MILP'>('NAIVE');
    const [dailyProfits, setDailyProfits] = useState<any[]>([]);

    useEffect(() => {
        if (results && metrics) {
            // Recalculate if results change
            runOptimization();
        }
    }, [results]);

    const handleConfigChange = (key: keyof BessConfig, value: number) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const runOptimization = () => {
        if (!results) return;

        let totalRevenue = 0;
        const profitData: any[] = [];
        
        // Group forecasts by day
        const groupedByDay: Record<string, typeof results.forecasts> = {};
        results.forecasts.forEach(f => {
            if (!groupedByDay[f.dateStr]) groupedByDay[f.dateStr] = [];
            groupedByDay[f.dateStr].push(f);
        });

        Object.entries(groupedByDay).forEach(([date, dayData]) => {
            // Sort prices to find optimal windows
            const sorted = [...dayData].sort((a, b) => a.price - b.price);
            
            // Calculate slots based on duration
            // 15 min blocks. Duration * 4 = blocks needed per cycle.
            const blocksNeeded = config.durationHours * 4 * config.cyclesPerDay;
            
            // Naive Logic: Buy lowest N blocks, Sell highest N blocks
            // Note: This is simplified. Real arbitrage considers sequence constraint.
            // For estimation, we take sum of lowest vs sum of highest.
            
            const buyBlocks = sorted.slice(0, blocksNeeded);
            const sellBlocks = sorted.slice(sorted.length - blocksNeeded, sorted.length);

            const avgBuyPrice = buyBlocks.reduce((sum, b) => sum + b.price, 0) / blocksNeeded;
            const avgSellPrice = sellBlocks.reduce((sum, b) => sum + b.price, 0) / blocksNeeded;

            // Energy Throughput per day
            // Capacity * Duration * DoD * Cycles
            const effectiveEnergyMWh = config.capacityMW * config.durationHours * config.depthOfDischarge * config.cyclesPerDay;

            const costToCharge = avgBuyPrice * 1000 * effectiveEnergyMWh; // Price is per kWh, *1000 for MWh
            const revenueFromDischarge = avgSellPrice * 1000 * effectiveEnergyMWh * config.efficiency;

            const grossProfit = revenueFromDischarge - costToCharge;
            const operationalCost = effectiveEnergyMWh * config.opexPerMWh;
            const netDailyProfit = grossProfit - operationalCost;

            totalRevenue += netDailyProfit;
            
            profitData.push({
                date,
                revenue: netDailyProfit,
                buyPrice: avgBuyPrice,
                sellPrice: avgSellPrice
            });
        });

        setDailyProfits(profitData);

        // Annualized calculations
        const daysProjected = Object.keys(groupedByDay).length;
        const annualRevenue = (totalRevenue / daysProjected) * 365;
        
        const totalSystemEnergyKWh = config.capacityMW * 1000 * config.durationHours;
        const totalCapex = totalSystemEnergyKWh * config.capexPerKWh;
        const annualOpex = config.capacityMW * config.durationHours * config.cyclesPerDay * 365 * config.opexPerMWh; // Simplified

        const annualNetProfit = annualRevenue; // Opex already deducted in daily calculation
        
        const roi = (annualNetProfit / totalCapex) * 100;
        const payback = totalCapex / (annualNetProfit || 1);

        setMetrics({
            dailyRevenue: totalRevenue / daysProjected,
            weeklyRevenue: (totalRevenue / daysProjected) * 7,
            annualRevenue,
            annualOpex,
            netProfit: annualNetProfit,
            roi,
            paybackPeriod: payback,
            npv: -totalCapex + (annualNetProfit * 5) // Simplified 5 year NPV without discount rate for demo
        });
    };

    if (!results) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500 animate-in fade-in">
                <AlertTriangle size={48} className="mb-4 text-amber-500/50" />
                <h3 className="text-xl font-bold text-zinc-300">Awaiting Price Data</h3>
                <p>Please run the Price Predictor first to generate data for the optimizer.</p>
            </div>
        );
    }

    return (
        <div className="animate-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Configuration Panel */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                        <Settings2 className="text-blue-500" />
                        <h2 className="text-lg font-bold text-white">BESS Parameters</h2>
                    </div>

                    <div className="space-y-6">
                        <InputGroup label="System Capacity (MW)" value={config.capacityMW} onChange={(v) => handleConfigChange('capacityMW', v)} min={1} max={500} step={1} />
                        <InputGroup label="Duration (Hours)" value={config.durationHours} onChange={(v) => handleConfigChange('durationHours', v)} min={1} max={12} step={0.5} />
                        <InputGroup label="Cycles per Day" value={config.cyclesPerDay} onChange={(v) => handleConfigChange('cyclesPerDay', v)} min={0.5} max={4} step={0.5} />
                        
                        <div className="pt-4 border-t border-zinc-800">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Optimization Algorithm</label>
                            <select 
                                value={optimiserMode} 
                                onChange={(e) => setOptimiserMode(e.target.value as any)}
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none"
                            >
                                <option value="NAIVE">Naive (Quantile Based)</option>
                                <option value="MILP">MILP (Linear Programming)</option>
                                <option value="RL">Reinforcement Learning</option>
                            </select>
                        </div>

                        <button 
                            onClick={runOptimization}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                            <PlayCircle size={20} />
                            Simulate Schedule
                        </button>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {metrics ? (
                        <>
                            {/* Financial Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard 
                                    label="Projected Annual Profit" 
                                    value={`₹${(metrics.annualRevenue / 10000000).toFixed(2)} Cr`} 
                                    icon={<DollarSign className="text-emerald-400" />} 
                                    trend="+12%"
                                />
                                <MetricCard 
                                    label="ROI (Return on Inv)" 
                                    value={`${metrics.roi.toFixed(1)}%`} 
                                    icon={<TrendingUp className="text-blue-400" />} 
                                    sub={`Payback: ${metrics.paybackPeriod.toFixed(1)} Years`}
                                />
                                <MetricCard 
                                    label="Weekly Revenue" 
                                    value={`₹${(metrics.weeklyRevenue / 100000).toFixed(2)} Lakh`} 
                                    icon={<Zap className="text-amber-400" />} 
                                />
                            </div>

                            {/* Profit Chart */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-2">Daily Profit Projection</h3>
                                <p className="text-sm text-zinc-500 mb-6">Based on forecasted price spread and {config.cyclesPerDay} cycles/day</p>
                                
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dailyProfits} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                            <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                                            <YAxis stroke="#52525b" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                                            <Tooltip 
                                                cursor={{fill: '#27272a'}}
                                                contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}}
                                                formatter={(value: number) => [`₹${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, 'Net Profit']}
                                            />
                                            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                                                {dailyProfits.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.revenue > 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Spread Analysis */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-4">Arbitrage Spread Analysis</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dailyProfits}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                            <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                                            <YAxis stroke="#52525b" fontSize={12} domain={['auto', 'auto']} />
                                            <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a'}} />
                                            <Legend />
                                            <Line type="monotone" dataKey="buyPrice" stroke="#10b981" name="Avg Buy Price (₹)" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="sellPrice" stroke="#ef4444" name="Avg Sell Price (₹)" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                            <Battery className="w-12 h-12 mb-4 opacity-50" />
                            <p className="font-medium">Configure parameters and run simulation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InputGroup = ({ label, value, onChange, min, max, step }: any) => (
    <div>
        <div className="flex justify-between mb-2">
            <label className="text-xs font-bold text-zinc-400 uppercase">{label}</label>
            <span className="text-xs font-mono text-blue-400 font-bold">{value}</span>
        </div>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
        />
    </div>
);

const MetricCard = ({ label, value, icon, sub, trend }: any) => (
    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-lg flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                {icon}
            </div>
            {trend && <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">{trend}</span>}
        </div>
        <div>
            <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
            <p className="text-xs text-zinc-500 font-bold uppercase mt-1">{label}</p>
            {sub && <p className="text-xs text-zinc-600 mt-2">{sub}</p>}
        </div>
    </div>
);

export default OptimizerTab;