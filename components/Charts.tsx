import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { SimulationResult, ConfigState, PredictionResult, ModelMetrics } from '../types';

interface ChartsProps {
    results: SimulationResult;
    config: ConfigState;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/90 backdrop-blur-md text-white p-3 rounded-lg shadow-2xl border border-zinc-800 text-xs">
                <p className="font-bold mb-2 text-zinc-400 border-b border-zinc-800 pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
                        <span className="text-zinc-300">{entry.name}:</span>
                        <span className="font-mono font-bold text-white">
                            {Number(entry.value).toFixed(entry.value > 100 ? 0 : 2)}
                            {entry.unit}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const ValidationChart: React.FC<ChartsProps> = ({ results, config }) => {
    const daysToShow = config.plotInterval;
    const pointsToShow = daysToShow * 96;
    const startIndex = Math.max(0, results.processedData.length - pointsToShow);
    
    const chartData = results.processedData.slice(startIndex).map((point, i) => {
        const absoluteIndex = startIndex + i;
        const bestModelPreds = results.modelResults[results.bestModel].predictions;
        
        if (daysToShow > 7 && i % 4 !== 0) return null;

        return {
            time: daysToShow <= 2 ? point.timeBlock.split('-')[0] : `${point.date.slice(0,5)} ${point.timeBlock.split('-')[0]}`,
            Actual: point.mcpKWh,
            Predicted: bestModelPreds[absoluteIndex]
        };
    }).filter(Boolean);

    return (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl mb-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-zinc-100">Historical Validation</h3>
                    <p className="text-sm text-zinc-500">Actual vs {results.bestModel} Predictions (Last {daysToShow} days)</p>
                </div>
            </div>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                            dataKey="time" 
                            stroke="#52525b" 
                            fontSize={11} 
                            tickMargin={10} 
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="#52525b" 
                            fontSize={11} 
                            tickFormatter={(val) => `₹${val}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
                        <Line 
                            type="monotone" 
                            dataKey="Actual" 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            dot={false} 
                            activeDot={{ r: 6 }} 
                            unit="₹"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="Predicted" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            dot={false} 
                            unit="₹"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const ForecastChart: React.FC<ChartsProps> = ({ results, config }) => {
    const aggregatedData: any[] = [];
    let currentHour = -1;
    let tempSum = 0;
    let tempCount = 0;
    let tempUpper = 0;
    let tempLower = 0;
    let lastLabel = '';

    results.forecasts.forEach((f) => {
        const h = parseInt(f.timeBlock.split(':')[0]);
        if (h !== currentHour) {
            if (currentHour !== -1) {
                aggregatedData.push({
                    time: lastLabel,
                    Price: tempSum / tempCount,
                    Upper: tempUpper / tempCount,
                    Lower: tempLower / tempCount,
                    Range: [tempLower / tempCount, tempUpper / tempCount]
                });
            }
            currentHour = h;
            tempSum = 0;
            tempCount = 0;
            tempUpper = 0;
            tempLower = 0;
            lastLabel = `${f.date.getDate()}/${f.date.getMonth()+1} ${f.timeBlock}`;
        }
        tempSum += f.price;
        tempUpper += f.upperBound;
        tempLower += f.lowerBound;
        tempCount++;
    });

    return (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl mb-6">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-zinc-100">Future Price Forecast</h3>
                    <p className="text-sm text-zinc-500">Next {config.forecastDays} days with {config.confidenceLevel}% Confidence Interval</p>
                </div>
            </div>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={aggregatedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="time" stroke="#52525b" fontSize={11} minTickGap={50} />
                        <YAxis stroke="#52525b" fontSize={11} tickFormatter={(val) => `₹${val.toFixed(1)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
                        <Area 
                            type="monotone" 
                            dataKey="Range" 
                            stroke="none" 
                            fill="url(#colorRange)" 
                            name="Confidence Range" 
                            unit="₹"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="Price" 
                            stroke="#8b5cf6" 
                            strokeWidth={3} 
                            dot={false} 
                            name="Forecasted Price"
                            unit="₹"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

interface MetricChartProps {
    results: SimulationResult;
    metric: keyof ModelMetrics;
    title: string;
    subtitle?: string;
    unit?: string;
    higherIsBetter?: boolean;
}

export const MetricComparisonChart: React.FC<MetricChartProps> = ({ 
    results, metric, title, subtitle, unit = '', higherIsBetter = false 
}) => {
    const data = (Object.values(results.modelResults) as PredictionResult[]).map(m => ({
        name: m.modelName,
        value: m.metrics[metric],
        color: m.color
    })).sort((a, b) => higherIsBetter ? b.value - a.value : a.value - b.value);

    return (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl h-full flex flex-col">
             <div className="mb-4">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">{title}</h3>
                {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
            </div>
            <div className="h-[200px] w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
                        <XAxis type="number" stroke="#52525b" fontSize={10} hide />
                        <YAxis dataKey="name" type="category" width={90} stroke="#71717a" fontSize={11} fontWeight={500} interval={0} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{ fill: '#27272a' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-black border border-zinc-800 p-2 rounded text-xs text-white shadow-xl">
                                            <p className="font-bold mb-1">{label}</p>
                                            <p>{Number(payload[0].value).toFixed(4)}{unit}</p>
                                        </div>
                                    )
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="value" barSize={12} radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const ResidualChart: React.FC<ChartsProps> = ({ results, config }) => {
    const daysToShow = config.plotInterval;
    const pointsToShow = daysToShow * 96;
    const startIndex = Math.max(0, results.processedData.length - pointsToShow);
    
    // Calculate residuals (Predicted - Actual)
    const chartData = results.processedData.slice(startIndex).map((point, i) => {
        const absoluteIndex = startIndex + i;
        const bestModelPreds = results.modelResults[results.bestModel].predictions;
        const residual = bestModelPreds[absoluteIndex] - point.mcpKWh;

        if (daysToShow > 7 && i % 4 !== 0) return null;

        return {
            time: daysToShow <= 2 ? point.timeBlock.split('-')[0] : `${point.date.slice(0,5)} ${point.timeBlock.split('-')[0]}`,
            Residual: residual
        };
    }).filter(Boolean);

    return (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl mb-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-zinc-100">Residual Error Analysis</h3>
                    <p className="text-sm text-zinc-500">Difference between {results.bestModel} Predictions and Actual Values</p>
                </div>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="time" stroke="#52525b" fontSize={11} minTickGap={30} />
                        <YAxis stroke="#52525b" fontSize={11} tickFormatter={(val) => `₹${val.toFixed(2)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="#71717a" />
                        <Area 
                            type="monotone" 
                            dataKey="Residual" 
                            fill="#ef4444" 
                            fillOpacity={0.1}
                            stroke="#ef4444" 
                            strokeWidth={1}
                            dot={false}
                            unit="₹"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};