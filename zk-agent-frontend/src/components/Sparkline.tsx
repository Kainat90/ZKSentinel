import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  data: { value: number }[];
  color: string;
  height?: number;
}

export function Sparkline({ data, color, height = 40 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
