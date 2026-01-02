import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function DRE() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [editingTaxRate, setEditingTaxRate] = useState(false);
  const [newTaxRate, setNewTaxRate] = useState("");

  const { data: dreData, isLoading } = trpc.dre.getMonthly.useQuery(
    { year, month },
    { enabled: true }
  );

  const updateTaxMutation = trpc.dre.updateTaxRate.useMutation({
    onSuccess: () => {
      toast.success("Taxa de impostos atualizada!");
      setEditingTaxRate(false);
      setNewTaxRate("");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar taxa: " + error.message);
    },
  });

  const handleUpdateTaxRate = () => {
    const rate = parseFloat(newTaxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Taxa deve ser um número entre 0 e 100");
      return;
    }
    updateTaxMutation.mutate({ taxRate: rate });
  };

  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">DRE</h1>
            <p className="text-muted-foreground mt-2">
              Demonstrativo de Resultados (Regime de Competência)
            </p>
          </div>
        </div>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handlePrevMonth}>
                ← Mês Anterior
              </Button>
              <span className="text-lg font-semibold capitalize">{monthName}</span>
              <Button variant="outline" onClick={handleNextMonth}>
                Próximo Mês →
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        ) : dreData ? (
          <div className="space-y-4">
            {/* Receita Operacional Bruta */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Operacional Bruta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>MRR (Receita Recorrente)</span>
                  <span className="font-semibold">{formatCurrency(dreData.mrr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Setup (Regime de Competência)</span>
                  <span className="font-semibold">{formatCurrency(dreData.setup)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Serviços Pontuais</span>
                  <span className="font-semibold">{formatCurrency(dreData.services)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total Receita Bruta</span>
                  <span className="text-blue-600">{formatCurrency(dreData.grossRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Impostos */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impostos</CardTitle>
                {!editingTaxRate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTaxRate(true);
                      setNewTaxRate(dreData.taxRate.toString());
                    }}
                  >
                    Editar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {editingTaxRate ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={newTaxRate}
                        onChange={(e) => setNewTaxRate(e.target.value)}
                        placeholder="Taxa de impostos (%)"
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdateTaxRate}
                        disabled={updateTaxMutation.isPending}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTaxRate(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Taxa de Impostos</span>
                      <span className="font-semibold">{dreData.taxRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Impostos</span>
                      <span className="text-orange-600">{formatCurrency(dreData.taxes)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Receita Líquida */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Líquida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dreData.netRevenue)}
                </div>
              </CardContent>
            </Card>

            {/* CPV / Custos */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  CPV / Custos Variáveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Custos Variáveis</span>
                  <span className="font-semibold">{formatCurrency(dreData.costs)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Margem Bruta */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Margem Bruta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Margem Bruta</span>
                  <span className="text-purple-600">{formatCurrency(dreData.grossMargin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>% da Receita</span>
                  <span className="font-semibold">{dreData.grossMarginPercent.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Despesas Operacionais */}
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas Operacionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Despesas Fixas</span>
                  <span className="font-semibold">{formatCurrency(dreData.expenses)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Lucro Líquido */}
            <Card className="border-l-4 border-l-emerald-600 bg-emerald-50 dark:bg-emerald-950">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Lucro Líquido</span>
                  <span className={dreData.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatCurrency(dreData.netIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>% da Receita</span>
                  <span className="font-semibold">{dreData.netIncomePercent.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Bruta</p>
                    <p className="text-lg font-semibold">{formatCurrency(dreData.grossRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Custos</p>
                    <p className="text-lg font-semibold">{formatCurrency(dreData.costs + dreData.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Impostos</p>
                    <p className="text-lg font-semibold">{formatCurrency(dreData.taxes)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                    <p className={`text-lg font-semibold ${dreData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(dreData.netIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
