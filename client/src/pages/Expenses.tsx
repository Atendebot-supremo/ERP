import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  infrastructure: "Infraestrutura",
  team: "Equipe",
  marketing: "Marketing",
  software: "Software",
  office: "Escritório",
  other: "Outros",
};

const typeLabels: Record<string, string> = {
  cost: "Custo (Variável)",
  expense: "Despesa (Fixa)",
};

export default function Expenses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: expenses, isLoading } = trpc.expenses.getByPeriod.useQuery({ month: selectedMonth, year: selectedYear });
  const utils = trpc.useUtils();

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setIsDialogOpen(false);
      setIsRecurring(false);
      toast.success("Despesa cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar despesa: " + error.message);
    },
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setIsDialogOpen(false);
      setEditingExpense(null);
      setIsRecurring(false);
      toast.success("Despesa atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar despesa: " + error.message);
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      toast.success("Despesa excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir despesa: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const recurring = formData.get("recurring") === "true";
    
    const data: any = {
      description: formData.get("description") as string,
      amount: parseFloat(formData.get("amount") as string).toFixed(2),
      category: formData.get("category") as "infrastructure" | "team" | "marketing" | "software" | "office" | "other",
      type: formData.get("type") as "cost" | "expense",
      recurring,
      notes: formData.get("notes") as string || undefined,
    };

    // Se for recorrente, usar recurringStartDate como expenseDate
    if (recurring) {
      const recurringStartDate = formData.get("recurringStartDate") as string;
      data.expenseDate = new Date(recurringStartDate);
      data.recurringStartDate = new Date(recurringStartDate);
      const recurringEndDate = formData.get("recurringEndDate") as string;
      if (recurringEndDate) {
        data.recurringEndDate = new Date(recurringEndDate);
      }
    } else {
      data.expenseDate = new Date(formData.get("expenseDate") as string);
    }

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setIsRecurring(expense.recurring);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const totalExpenses = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
  
  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Despesas</h1>
            <p className="text-muted-foreground mt-2">
              Controle todas as despesas da agência
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingExpense(null);
              setIsRecurring(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingExpense?.description}
                    placeholder="Ex: Servidor AWS, Salário desenvolvedor, Whitelabel..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select name="type" defaultValue={editingExpense?.type || "expense"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$) *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      defaultValue={editingExpense?.amount}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select name="category" defaultValue={editingExpense?.category || "other"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isRecurring && (
                    <div className="space-y-2">
                      <Label htmlFor="expenseDate">Data *</Label>
                      <Input
                        id="expenseDate"
                        name="expenseDate"
                        type="date"
                        defaultValue={editingExpense?.expenseDate ? new Date(editingExpense.expenseDate).toISOString().split('T')[0] : ''}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    name="recurring"
                    value="true"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                  />
                  <Label htmlFor="recurring" className="cursor-pointer">
                    Despesa recorrente (mensal com valores variáveis)
                  </Label>
                </div>

                {isRecurring && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="recurringStartDate">Data Inicial (Mês) *</Label>
                      <Input
                        id="recurringStartDate"
                        name="recurringStartDate"
                        type="date"
                        defaultValue={editingExpense?.recurringStartDate ? new Date(editingExpense.recurringStartDate).toISOString().split('T')[0] : ''}
                        required={isRecurring}
                      />
                      <p className="text-xs text-muted-foreground">Mês a partir do qual a despesa se repete</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurringEndDate">Data Final (Mês)</Label>
                      <Input
                        id="recurringEndDate"
                        name="recurringEndDate"
                        type="date"
                        defaultValue={editingExpense?.recurringEndDate ? new Date(editingExpense.recurringEndDate).toISOString().split('T')[0] : ''}
                      />
                      <p className="text-xs text-muted-foreground">Deixe em branco para recorrência indefinida</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingExpense?.notes}
                    placeholder="Ex: Custo varia conforme número de clientes"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingExpense(null);
                      setIsRecurring(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingExpense ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Total de Despesas</span>
              <span className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses.toFixed(2))}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Despesas Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : expenses && expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo de Gasto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>{categoryLabels[expense.category]}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        expense.type === 'cost' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {typeLabels[expense.type]}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.expenseDate ? formatDate(expense.expenseDate) : '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        expense.recurring 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {expense.recurring ? 'Recorrente' : 'Pontual'}
                      </span>
                    </TableCell>                      <TableCell>
                        {expense.recurring && expense.recurringStartDate && expense.recurringEndDate ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(expense.recurringStartDate)} até {formatDate(expense.recurringEndDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma despesa cadastrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
