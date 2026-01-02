import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Check, X, Eye, Pencil, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function SetupContracts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: contracts, isLoading } = trpc.setupContracts.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: installments } = trpc.installments.getByContractId.useQuery(
    { contractId: selectedContract! },
    { enabled: !!selectedContract }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.setupContracts.create.useMutation({
    onSuccess: () => {
      utils.setupContracts.list.invalidate();
      setIsDialogOpen(false);
      setSelectedClientId("");
      toast.success("Contrato criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar contrato: " + error.message);
    },
  });

  const updateMutation = trpc.setupContracts.update.useMutation({
    onSuccess: () => {
      utils.setupContracts.list.invalidate();
      setIsDialogOpen(false);
      setEditingContract(null);
      setSelectedClientId("");
      toast.success("Contrato atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar contrato: " + error.message);
    },
  });

  const markAsPaidMutation = trpc.installments.markAsPaid.useMutation({
    onSuccess: () => {
      utils.installments.getByContractId.invalidate();
      toast.success("Parcela marcada como paga!");
    },
  });

  const markAsPendingMutation = trpc.installments.markAsPending.useMutation({
    onSuccess: () => {
      utils.installments.getByContractId.invalidate();
      toast.success("Parcela marcada como pendente!");
    },
  });

  const deleteMutation = trpc.setupContracts.delete.useMutation({
    onSuccess: () => {
      utils.setupContracts.list.invalidate();
      toast.success("Contrato deletado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao deletar contrato: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const totalAmount = parseFloat(formData.get("totalAmount") as string);
    const installmentsCount = parseInt(formData.get("installments") as string);
    const installmentAmount = totalAmount / installmentsCount;

    const data = {
      clientId: parseInt(selectedClientId),
      totalAmount: totalAmount.toFixed(2),
      installments: installmentsCount,
      installmentAmount: installmentAmount.toFixed(2),
      startDate: new Date(formData.get("startDate") as string),
      description: formData.get("description") as string || undefined,
      status: (formData.get("status") as "active" | "completed" | "cancelled" | "overdue") || "active",
    };

    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, clientId: parseInt(selectedClientId), totalAmount: data.totalAmount, installments: data.installments, installmentAmount: data.installmentAmount, startDate: data.startDate, description: data.description, status: data.status });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (contract: any) => {
    setEditingContract(contract);
    setSelectedClientId(contract.clientId.toString());
    setIsDialogOpen(true);
  };

  const contractsWithClients = useMemo(() => {
    if (!contracts || !clients) return [];
    return contracts.map(contract => ({
      ...contract,
      client: clients.find(c => c.id === contract.clientId),
    }));
  }, [contracts, clients]);

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(value));
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Contratos de Setup</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie contratos de implementação parcelados
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingContract(null);
              setSelectedClientId("");
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingContract ? "Editar Contrato de Setup" : "Novo Contrato de Setup"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente *</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} {client.company ? `- ${client.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Valor Total (R$) *</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installments">Nº de Parcelas *</Label>
                    <Input
                      id="installments"
                      name="installments"
                      type="number"
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início *</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingContract?.description}
                    rows={3}
                    placeholder="Descreva o escopo do setup..."
                  />
                </div>

                {editingContract && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingContract?.status || "active"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="overdue">Em Atraso</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !selectedClientId}>
                    {editingContract ? "Atualizar" : "Criar"} Contrato
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Contratos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Valor/Parcela</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsWithClients?.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.client?.name || "Cliente não encontrado"}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatCurrency(contract.totalAmount)}</TableCell>
                      <TableCell>{contract.installments}x</TableCell>
                      <TableCell>{formatCurrency(contract.installmentAmount)}</TableCell>
                      <TableCell>{formatDate(contract.startDate)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          contract.status === 'completed' ? 'bg-green-100 text-green-800' :
                          contract.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status === 'active' ? 'Ativo' : contract.status === 'completed' ? 'Concluído' : contract.status === 'overdue' ? 'Em Atraso' : 'Cancelado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(contract)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContract(contract.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate({ id: contract.id })}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedContract && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Parcelas do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments?.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">#{installment.installmentNumber}</TableCell>
                      <TableCell>{formatCurrency(installment.amount)}</TableCell>
                      <TableCell>{formatDate(installment.dueDate)}</TableCell>
                      <TableCell>{installment.paidDate ? formatDate(installment.paidDate) : "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          installment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          installment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {installment.status === 'paid' ? 'Pago' : installment.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {installment.status === 'paid' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsPendingMutation.mutate({ id: installment.id })}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsPaidMutation.mutate({ id: installment.id, paidDate: new Date() })}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
