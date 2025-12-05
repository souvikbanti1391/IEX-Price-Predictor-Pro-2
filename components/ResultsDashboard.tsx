import React from 'react';
import { Trophy, TrendingUp, Activity, AlertCircle, Compass, Download, Zap, Battery, BatteryCharging } from 'lucide-react';
import { SimulationResult, ConfigState, PredictionResult } from '../types';
import { ValidationChart, ForecastChart, MetricComparisonChart, ResidualChart } from './Charts';
import { exportForecastsToCSV } from '../services/predictionEngine';

interface ResultsDashboardProps {
    results: SimulationResult;
    config: ConfigState;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results, config }) => {
    const bestModel = results.modelResults[results.bestModel];
    
    return (
        <div className="animate-in fade-in duration-700">
            {/* Recommendation Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl shadow-2xl p-8 mb-8 text-white border border-blue-500/20">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-yellow-400/20 p-1.5 rounded-lg">
                                    <Trophy className="text-yellow-300 fill-yellow-300" size={20} />
                                </div>
                                <span className="font-bold tracking-widest uppercase text-xs text-blue-100">Recommended Model</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{bestModel.modelName}</h2>
                            <p className="text-blue-100/90 max-w-2xl leading-relaxed text-base md:text-lg">
                                Achieved the lowest RMSE of <span className="font-bold font-mono bg-black/20 px-2 py-0.5 rounded border border-white/10">{bestModel.metrics.rmse.toFixed(4)}</span>. 
                                Your dataset exhibits <span className="font-semibold">{results.dataCharacteristics.volatility > 0.15 ? 'High' : 'Low'} Volatility</span> and {results.dataCharacteristics.trend > 0.001 ? 'positive' : 'stable'} trend characteristics.
                            </p>
                        </div>
                        <div className="md:text-right bg-black/20 md:bg-transparent p-4 md:p-0 rounded-xl">
                             <div className="text-xs uppercase tracking-widest opacity-75 mb-1">Confidence Score</div>
                             <div className="text-4xl font-black tracking-tight">{Math.min(99.9, (bestModel.metrics.r2 * 100)).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard 
                    label="RMSE" 
                    value={bestModel.metrics.rmse.toFixed(4)} 
                    sub="Root Mean Sq Error"
                    icon={<Activity className="text-blue-500" />}
                />
                <MetricCard 
                    label="Directional Accuracy" 
                    value={`${bestModel.metrics.directionalAccuracy.toFixed(1)}%`} 
                    sub="Trend Success Rate"
                    icon={<Compass className="text-purple-500" />}
                />
                <MetricCard 
                    label="MAPE" 
                    value={`${bestModel.metrics.mape.toFixed(2)}%`} 
                    sub="Mean Abs % Error"
                    icon={<TrendingUp className="text-emerald-500" />}
                />
                <MetricCard 
                    label="R² Score" 
                    value={bestModel.metrics.r2.toFixed(4)} 
                    sub="Statistical Fit (0-1)"
                    icon={<AlertCircle className="text-orange-500" />}
                />
            </div>

            {/* Comparison Table */}
            <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 overflow-hidden mb-8">
                <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-100">Detailed Model Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-xs border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Model Name</th>
                                <th className="px-6 py-4">RMSE (₹)</th>
                                <th className="px-6 py-4">MAE (₹)</th>
                                <th className="px-6 py-4">MAPE (%)</th>
                                <th className="px-6 py-4">Dir. Accuracy</th>
                                <th className="px-6 py-4">Rank</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {(Object.values(results.modelResults) as PredictionResult[])
                                .sort((a,b) => a.metrics.rmse - b.metrics.rmse)
                                .map((model, idx) => (
                                <tr key={model.modelName} className={`hover:bg-zinc-800/50 transition-colors ${idx === 0 ? 'bg-blue-500/5' : ''}`}>
                                    <td className="px-6 py-4 font-bold text-zinc-200 flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: model.color }}></div>
                                        {model.modelName}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-zinc-400">{model.metrics.rmse.toFixed(4)}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-400">{model.metrics.mae.toFixed(4)}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-400">{model.metrics.mape.toFixed(2)}%</td>
                                    <td className="px-6 py-4 font-mono text-zinc-400 font-semibold">{model.metrics.directionalAccuracy.toFixed(1)}%</td>
                                    <td className="px-6 py-4">
                                        {idx === 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 uppercase tracking-wide">
                                                <Trophy size={10} /> Best
                                            </span>
                                        ) : (
                                            <span className="text-zinc-600 font-medium">#{idx + 1}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <ValidationChart results={results} config={config} />
                <ForecastChart results={results} config={config} />
            </div>

            {/* Strategic Analysis Section */}
            <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 mb-8 overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3">
                            <Zap className="text-amber-500" />
                            Strategic Analysis & Arbitrage
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">Optimal charge/discharge windows based on price volatility</p>
                    </div>
                    <button 
                        onClick={() => exportForecastsToCSV(results.forecasts, results.bestModel)}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-zinc-700"
                    >
                        <Download size={16} />
                        Download Forecast CSV
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-4">
                        {results.arbitrageData.map((day, idx) => (
                            <div key={day.dateStr} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-4">
                                    <div className="w-32 flex-shrink-0">
                                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Date</div>
                                        <div className="text-zinc-200 font-bold">{day.dateStr}</div>
                                    </div>
                                    <div className="flex gap-6 text-sm">
                                        <div>
                                            <span className="text-zinc-600 mr-2">Charge Threshold:</span>
                                            <span className="text-emerald-400 font-mono font-bold">≤ ₹{day.chargeThreshold.toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-600 mr-2">Discharge Threshold:</span>
                                            <span className="text-red-400 font-mono font-bold">≥ ₹{day.dischargeThreshold.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    {day.windows.map((window, wIdx) => (
                                        <div 
                                            key={`${day.dateStr}-${wIdx}`}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                                window.type === 'CHARGE' 
                                                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                                                    : 'bg-red-500/10 border-red-500/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {window.type === 'CHARGE' 
                                                    ? <BatteryCharging className="text-emerald-500" size={20} />
                                                    : <Battery className="text-red-500" size={20} />
                                                }
                                                <span className={`font-bold text-sm ${
                                                    window.type === 'CHARGE' ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {window.type}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-sm font-mono text-zinc-300">
                                                <div className="bg-black/30 px-2 py-1 rounded">
                                                    {window.startTime} - {window.endTime}
                                                </div>
                                                <div className="font-bold">
                                                    Avg: ₹{window.avgPrice.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {day.windows.length === 0 && (
                                        <div className="text-zinc-600 text-sm italic text-center py-2">
                                            No significant arbitrage opportunities found for this day.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mb-8">
                 <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-3">
                    <span className="w-1 h-8 bg-blue-600 rounded-full"></span>
                    Comparative Analysis
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricComparisonChart 
                        results={results} 
                        metric="rmse" 
                        title="RMSE" 
                        subtitle="Lower is better"
                        unit="₹"
                    />
                    <MetricComparisonChart 
                        results={results} 
                        metric="mae" 
                        title="MAE" 
                        subtitle="Lower is better"
                        unit="₹"
                    />
                    <MetricComparisonChart 
                        results={results} 
                        metric="mape" 
                        title="MAPE" 
                        subtitle="Lower is better"
                        unit="%"
                    />
                    <MetricComparisonChart 
                        results={results} 
                        metric="directionalAccuracy" 
                        title="Directional Accuracy" 
                        subtitle="Higher is better"
                        unit="%"
                        higherIsBetter={true}
                    />
                 </div>
            </div>

            <ResidualChart results={results} config={config} />
        </div>
    );
};

const MetricCard = ({ label, value, sub, icon }: any) => (
    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-lg flex items-start justify-between hover:border-zinc-700 transition-all hover:-translate-y-1">
        <div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-black text-zinc-100 mb-1">{value}</h3>
            <p className="text-xs text-zinc-600 font-medium">{sub}</p>
        </div>
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/50 shadow-inner">
            {icon}
        </div>
    </div>
);

export default ResultsDashboard;