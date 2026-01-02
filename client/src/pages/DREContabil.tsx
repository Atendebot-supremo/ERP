import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";


const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface DREData {
  [key: number]: {
    month: number;
    mrr: number;
    setup: number;
    svc: number;
    gr: number;
    tx: number;
    nr: number;
    cst: number;
    exp: number;
    gp: number;
    ni: number;
  };
}

interface ExpandedSections {
  [key: string]: boolean;
}

export default function DREContabil() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewType, setViewType] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    receita: true,
    deducoes: false,
    custos: false,
    despesas: false,
  });

  const { data: dreData, isLoading } = trpc.metrics.getMonthly.useQuery(
    { year, month: 1 },
    { enabled: !!user }
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getMonthData = async (month: number) => {
    const response = await fetch(`/api/trpc/metrics.getMonthly?input=${JSON.stringify({ year, month })}`);
    return response.json();
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">DRE - Demonstrativo de Resultados</h1>
          <p className="text-slate-600 mt-2">Regime de Competência - Análise de Lucratividade</p>
        </div>

        <div className="flex gap-4">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 w-64">Conta Contábil</th>
                {viewType === "monthly" && monthNames.map((m, i) => (
                  <th key={i} className="px-2 py-3 text-right font-semibold text-slate-700 min-w-24">{m.slice(0, 3)}</th>
                ))}
                {viewType === "quarterly" && (
                  <>
                    <th className="px-2 py-3 text-right font-semibold text-slate-700 min-w-24">1º Trim</th>
                    <th className="px-2 py-3 text-right font-semibold text-slate-700 min-w-24">2º Trim</th>
                    <th className="px-2 py-3 text-right font-semibold text-slate-700 min-w-24">3º Trim</th>
                    <th className="px-2 py-3 text-right font-semibold text-slate-700 min-w-24">4º Trim</th>
                  </>
                )}
                <th className="px-2 py-3 text-right font-semibold text-slate-700 min-w-24">Total Ano</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Receita Operacional Bruta */}
              <tr className="bg-blue-50 font-semibold hover:bg-blue-100">
                <td className="px-4 py-3 flex items-center gap-2 cursor-pointer" onClick={() => toggleSection("receita")}>
                  {expandedSections.receita ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(+) Receita Operacional Bruta</span>
                </td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-blue-700">{formatValue(10500)}</td>
                ))}
              </tr>

              {expandedSections.receita && (
                <>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 pl-12">├─ MRR (Receita Recorrente)</td>
                    {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                      <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(10500)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 pl-12">├─ Setup (Contratos Fechados)</td>
                    {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                      <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 pl-12">└─ Serviços Pontuais</td>
                    {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                      <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                    ))}
                  </tr>
                </>
              )}

              {/* Deduções */}
              <tr className="bg-red-50 font-semibold hover:bg-red-100">
                <td className="px-4 py-3 flex items-center gap-2 cursor-pointer" onClick={() => toggleSection("deducoes")}>
                  {expandedSections.deducoes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(-) Deduções de Receita (Impostos)</span>
                </td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-red-700">{formatValue(1155)}</td>
                ))}
              </tr>

              {/* Receita Líquida */}
              <tr className="bg-green-50 font-semibold">
                <td className="px-4 py-3">=  Receita Operacional Líquida</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-green-700 font-bold">{formatValue(9345)}</td>
                ))}
              </tr>

              {/* Custos */}
              <tr className="bg-orange-50 font-semibold hover:bg-orange-100">
                <td className="px-4 py-3 flex items-center gap-2 cursor-pointer" onClick={() => toggleSection("custos")}>
                  {expandedSections.custos ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(-) Custos Operacionais (CPV)</span>
                </td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-orange-700">{formatValue(0)}</td>
                ))}
              </tr>

              {expandedSections.custos && (
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 pl-12">├─ White Label / Infraestrutura</td>
                  {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                    <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                  ))}
                </tr>
              )}

              {/* Lucro Bruto */}
              <tr className="bg-blue-50 font-semibold">
                <td className="px-4 py-3">=  Lucro Bruto</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-blue-700 font-bold">{formatValue(9345)}</td>
                ))}
              </tr>

              {/* Despesas */}
              <tr className="bg-red-50 font-semibold hover:bg-red-100">
                <td className="px-4 py-3 flex items-center gap-2 cursor-pointer" onClick={() => toggleSection("despesas")}>
                  {expandedSections.despesas ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(-) Despesas Operacionais</span>
                </td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-red-700">{formatValue(0)}</td>
                ))}
              </tr>

              {expandedSections.despesas && (
                <>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 pl-12">├─ Equipe / Folha de Pagamento</td>
                    {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                      <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 pl-12">├─ Marketing</td>
                    {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                      <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 pl-12">└─ Administrativas</td>
                    {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                      <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                    ))}
                  </tr>
                </>
              )}

              {/* EBITDA */}
              <tr className="bg-purple-50 font-semibold">
                <td className="px-4 py-3">=  EBITDA</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-purple-700 font-bold">{formatValue(9345)}</td>
                ))}
              </tr>

              {/* Linhas adicionais */}
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3">(-) Depreciação</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                ))}
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3">(-) Despesas Financeiras</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                ))}
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3">(+) Receitas Financeiras</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                ))}
              </tr>

              {/* Lucro Operacional */}
              <tr className="bg-green-50 font-semibold">
                <td className="px-4 py-3">=  Lucro Operacional</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-green-700 font-bold">{formatValue(9345)}</td>
                ))}
              </tr>

              {/* IR e CSLL */}
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3">(-) IR e CSLL</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-slate-600">{formatValue(0)}</td>
                ))}
              </tr>

              {/* Lucro Líquido */}
              <tr className="bg-green-100 font-bold border-t-2 border-green-300">
                <td className="px-4 py-3">=  LUCRO LÍQUIDO</td>
                {[...Array(viewType === "monthly" ? 12 : viewType === "quarterly" ? 5 : 1)].map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-green-900 text-lg">{formatValue(9345)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-slate-600">Margem Bruta</p>
            <p className="text-2xl font-bold text-slate-900">89.0%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-600">Margem Operacional</p>
            <p className="text-2xl font-bold text-slate-900">89.0%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-slate-600">Margem Líquida</p>
            <p className="text-2xl font-bold text-slate-900">89.0%</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
