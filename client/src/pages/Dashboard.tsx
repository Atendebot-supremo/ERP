import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar, Target, AlertCircle } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";

export default function Dashboard() {
  const now = new Date();
  const [selectedYear] = useState(now.getFullYear());
  const [selectedMonth] = useState(now.getMonth() + 1);
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const { data: metrics, isLoading, refetch } = trpc.metrics.getByDateRange.useQuery({
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  });

  useEffect(() => {
    refetch();
  }, [startDate, endDate, refetch]);

  const { data: projection } = trpc.metrics.getFutureProjection.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: expensesByCategory } = trpc.metrics.getExpensesByCategory.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });
  const { data: setupBreakdown } = trpc.metrics.getSetupPendingBreakdown.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });
  const { data: alerts } = trpc.metrics.getAlerts.useQuery();
  const { data: cashFlow } = trpc.metrics.getCashFlowProjection.useQuery();
  const { data: revenueHistory } = trpc.metrics.getRevenueHistory.useQuery();
  const { data: upcomingCharges } = trpc.billing.getUpcomingCharges.useQuery({ daysAhead: 7 });
  const { data: overdueCharges } = trpc.billing.getOverdueCharges.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const projectionData = useMemo(() => {
    if (!projection?.byMonth) return [];
    return Object.entries(projection.byMonth).map(([month, value]) => ({
      month,
      value: value as number,
    }));
  }, [projection]);

  const revenueBreakdown = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'MRR', value: metrics.totalMRR, color: 'oklch(0.55 0.18 260)' },
      { name: 'Setup', value: metrics.setupRevenue, color: 'oklch(0.60 0.18 60)' },
      { name: 'Serviços', value: metrics.servicesRevenue, color: 'oklch(0.50 0.15 150)' },
    ].filter(item => item.value > 0);
  }, [metrics]);

  const expensesData = useMemo(() => {
    if (!expensesByCategory) return [];
    return Object.entries(expensesByCategory).map(([category, amount]) => ({
      name: category,
      value: amount as number,
      color: 'oklch(0.65 0.15 30)',
    }));
  }, [expensesByCategory]);

  const chartDataWithProjection = useMemo(() => {
    if (!revenueHistory) return [];
    
    const lastMonth = revenueHistory[revenueHistory.length - 1];
    const projectedMonthlyRevenue = lastMonth ? lastMonth.mrr : 0;
    
    // Add 6 months of projection
    const projection = [];
    for (let i = 1; i <= 6; i++) {
      const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      projection.push({
        month: projDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        revenue: projectedMonthlyRevenue,
        isProjection: true,
      });
    }
    
    return [
      ...revenueHistory,
      ...projection,
    ];
  }, [revenueHistory, now]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard Financeiro</h1>
            <p className="text-muted-foreground mt-2">
              Visão geral das métricas de {startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} a {endDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Inicial</label>
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  setStartDate(new Date(year, month - 1, day));
                }}
                className="mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data Final</label>
              <input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  setEndDate(new Date(year, month - 1, day));
                }}
                className="mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <Alert key={idx} variant={alert.type === 'warning' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatCurrency(metrics?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                MRR + Setup + Serviços
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custos</CardTitle>
              <TrendingDown className="h-5 w-5" style={{ color: 'oklch(0.65 0.18 280)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'oklch(0.65 0.18 280)' }}>{formatCurrency(metrics?.totalCosts || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">Gastos variáveis</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{formatCurrency(metrics?.totalExpenses || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">Gastos fixos</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{formatCurrency(metrics?.profit || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Margem: {metrics?.profitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
              <Target className="h-5 w-5 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'oklch(0.55 0.18 260)' }}>{formatCurrency(metrics?.totalMRR || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Receita recorrente mensal
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Setup</CardTitle>
              <Calendar className="h-5 w-5" style={{ color: 'oklch(0.60 0.18 60)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'oklch(0.60 0.18 60)' }}>{formatCurrency(metrics?.setupRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Receita de setup
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços</CardTitle>
              <Target className="h-5 w-5" style={{ color: 'oklch(0.50 0.15 150)' }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'oklch(0.50 0.15 150)' }}>{formatCurrency(metrics?.servicesRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Receita de serviços
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-5 w-5 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'oklch(0.50 0.15 150)' }}>{metrics?.activeClientsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total de {clients?.length || 0} clientes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Setup Pendente</CardTitle>
              <Calendar className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Este mês</p>
                <p className="text-lg font-semibold" style={{ color: 'oklch(0.60 0.18 60)' }}>
                  {formatCurrency(setupBreakdown?.thisMonth || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Próximos 3 meses</p>
                <p className="text-lg font-semibold" style={{ color: 'oklch(0.60 0.18 60)' }}>
                  {formatCurrency(setupBreakdown?.next3Months || 0)}
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Total futuro</p>
                <p className="text-xl font-bold" style={{ color: 'oklch(0.60 0.18 60)' }}>
                  {formatCurrency(setupBreakdown?.totalFuture || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos e Visualizações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Composição da Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {expensesData.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Breakdown de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gráfico de Evolução de Receita */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Evolução de Receita (Últimos 6 meses + Projeção)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartDataWithProjection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="oklch(0.55 0.18 260)" 
                  name="Receita"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fluxo de Caixa Projetado */}
        {cashFlow && cashFlow.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Fluxo de Caixa Projetado (Próximos 3 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Mês</th>
                      <th className="text-right py-3 px-4 font-semibold">Entradas</th>
                      <th className="text-right py-3 px-4 font-semibold">Saídas</th>
                      <th className="text-right py-3 px-4 font-semibold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlow.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{row.month}</td>
                        <td className="text-right py-3 px-4 text-green-600 font-semibold">
                          {formatCurrency(row.entries)}
                        </td>
                        <td className="text-right py-3 px-4 text-red-600 font-semibold">
                          {formatCurrency(row.exits)}
                        </td>
                        <td className={`text-right py-3 px-4 font-semibold ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entradas Previstas e Cobranças Atrasadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entradas Previstas - Próximos 7 dias */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Entradas Previstas - Próximos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingCharges && upcomingCharges.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(upcomingCharges.reduce((sum, c) => sum + c.amount, 0))}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {upcomingCharges.map((charge, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                        <div>
                          <p className="font-medium">{charge.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {charge.dueDate.toLocaleDateString('pt-BR')} ({charge.daysUntilDue} dias)
                          </p>
                        </div>
                        <p className="font-semibold text-blue-600">{formatCurrency(charge.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma cobrança prevista para os próximos 7 dias</p>
              )}
            </CardContent>
          </Card>

          {/* Cobranças Atrasadas */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Cobranças Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueCharges && overdueCharges.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(overdueCharges.reduce((sum, c) => sum + c.amount, 0))}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {overdueCharges.map((charge, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded text-sm">
                        <div>
                          <p className="font-medium">{charge.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            Venceu há {charge.daysOverdue} dias ({charge.dueDate.toLocaleDateString('pt-BR')})
                          </p>
                        </div>
                        <p className="font-semibold text-red-600">{formatCurrency(charge.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma cobrança atrasada</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
