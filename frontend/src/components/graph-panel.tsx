import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceState } from "../types";
import { BucketChart } from "./bucket-chart";

interface Props {
  data: FinanceState[];
}

const BUCKET_COLORS = [
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#fb923c",
  "#38bdf8",
  "#4ade80",
];

const formatCompact = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

export const GraphPanel = ({ data }: Props) => {
  if (data.length === 0) return null;

  const buckets = Object.keys(data[0].values);

  const netWorthData = data.map((d) => ({
    date: d.date,
    netWorth: Object.values(d.values)
      .filter((v) => v > 0)
      .reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Net Worth (positive buckets)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={netWorthData}>
            <defs>
              <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1f2937"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompact}
              width={65}
            />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#60a5fa" }}
              formatter={(v) => [formatCompact(Number(v)), "Net Worth"]}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="url(#nwGradient)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buckets.map((bucket, i) => (
          <BucketChart
            key={bucket}
            bucketName={bucket}
            data={data}
            color={BUCKET_COLORS[i % BUCKET_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
};
