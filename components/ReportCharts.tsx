"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { fmtINR } from "@/lib/engine";

const COLORS = ["#B8863B", "#3D6B8C", "#2E8B6F", "#B5482F", "#8A6DAA", "#5C7A99"];

export default function ReportCharts({
  costBreakdown,
  revenueBreakdown,
}: {
  costBreakdown: { name: string; value: number }[];
  revenueBreakdown: { name: string; value: number }[];
}) {
  return (
    <div className="chart-cols">
      <div className="card">
        <div className="card-head">Project Cost Breakdown</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={costBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={costBreakdown.length > 1 ? 2 : 0}>
                {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="card-head">Revenue Breakdown</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={revenueBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={revenueBreakdown.length > 1 ? 2 : 0}>
                {revenueBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
