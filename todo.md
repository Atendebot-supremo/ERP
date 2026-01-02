# Sistema de Controle Financeiro SaaS - TODO

## Backend & Database
- [x] Criar schema de clientes com campos de MRR
- [x] Criar schema de contratos de setup parcelado
- [x] Criar schema de serviços pontuais
- [x] Criar schema de despesas categorizadas
- [x] Criar schema de parcelas de setup
- [x] Implementar API de clientes (CRUD)
- [x] Implementar API de contratos de setup (CRUD)
- [x] Implementar API de serviços pontuais (CRUD)
- [x] Implementar API de despesas (CRUD)
- [x] Implementar API de parcelas (marcar como paga/pendente)
- [x] Implementar API de métricas financeiras consolidadas
- [x] Implementar API de projeção de receitas futuras
- [x] Implementar API de visão detalhada por cliente

## Frontend - Design System
- [x] Definir paleta de cores elegante e refinada
- [x] Configurar tipografia sofisticada
- [x] Criar sistema de espaçamento e sombras
- [x] Definir tema global no index.css

## Frontend - Interfaces
- [x] Criar layout principal com navegação sidebar elegante
- [x] Criar página de dashboard financeiro
- [x] Criar página de listagem de clientes
- [x] Criar formulário de cadastro/edição de clientes
- [x] Criar página de gestão de contratos de setup
- [x] Criar formulário de cadastro de contrato de setup
- [x] Criar interface de marcação de parcelas pagas
- [x] Criar página de serviços pontuais
- [x] Criar formulário de lançamento de serviços
- [x] Criar página de despesas
- [x] Criar formulário de cadastro de despesas
- [x] Criar página de visão detalhada do cliente

## Frontend - Dashboard & Visualizações
- [x] Criar card de receita total do mês
- [x] Criar card de despesas do mês
- [x] Criar card de lucro líquido e margem
- [x] Criar card de MRR total atual
- [x] Criar card de projeção de receitas futuras
- [x] Criar gráfico de evolução de receitas
- [x] Criar gráfico de evolução de MRR
- [x] Criar gráfico de distribuição de despesas
- [x] Criar tabela de clientes com métricas principais

## Testes
- [x] Escrever testes vitest para APIs de clientes
- [x] Escrever testes vitest para APIs de contratos
- [x] Escrever testes vitest para APIs de serviços
- [x] Escrever testes vitest para APIs de despesas
- [x] Escrever testes vitest para cálculos de métricas
- [x] Validar cálculos de projeção de receitas

## Melhorias de UX
- [x] Adicionar campos de setup no formulário de cadastro de clientes
- [x] Criar contrato de setup automaticamente ao cadastrar cliente com setup
- [x] Adicionar aba "Despesas" no menu lateral de navegação
- [x] Adicionar aba "Contratos de Setup" no menu lateral de navegação
- [x] Adicionar aba "Serviços" no menu lateral de navegação

## Bugs Encontrados
- [x] Corrigir erro NaN no installmentNumber ao criar contrato de setup

## Ajustes de UX
- [x] Remover campos de setup do formulário de clientes

## Melhorias do Dashboard
- [x] Melhorar card Setup Pendente com breakdown (este mês, próximos 3 meses, total)
- [x] Adicionar breakdown de despesas por categoria
- [x] Implementar gráfico de linha com evolução de receita (6 meses) + projeção (6 meses)
- [x] Implementar tabela/gráfico de fluxo de caixa projetado (próximos 3 meses)
- [x] Adicionar legendas com valores em R$ no gráfico de pizza
- [x] Implementar seção de alertas (parcelas vencendo, variações MRR, despesas recorrentes)
- [ ] Adicionar card com métricas (Churn, Crescimento MRR, Novos clientes)

## Ajustes de Despesas
- [x] Adicionar suporte a range de período para despesas recorrentes
- [x] Permitir lançar valores variáveis por mês em despesas recorrentes
- [x] Atualizar interface de despesas com seletor de data inicial e final

## Correções de Despesas
- [x] Tornar campo de data opcional para despesas recorrentes
- [x] Permitir data final em branco para recorrência indefinida
- [x] Criar tabela de histórico de despesas
- [x] Registrar histórico ao deletar despesas
- [x] Atualizar gráficos para usar histórico de despesas

## Separação de Custos e Despesas
- [x] Adicionar campo de tipo (custo/despesa) no schema
- [x] Atualizar interface para seletor de tipo de gasto
- [x] Atualizar dashboard com cards separados para custos e despesas
- [x] Atualizar cálculos de lucro (receita - custos - despesas)
- [x] Atualizar gráficos para mostrar custos e despesas separadamente
- [x] Atualizar tabela de histórico para incluir tipo de gasto

## Status Em Atraso para Clientes
- [x] Adicionar status "Em atraso" no schema de clientes
- [x] Atualizar interface para permitir seleção de status em atraso
- [x] Atualizar cálculos para excluir clientes em atraso do MRR
- [x] Atualizar cálculos para excluir clientes em atraso da receita total
- [x] Adicionar indicador visual de clientes em atraso na tabela

## Rastreamento de Datas de Vencimento
- [x] Adicionar campo "dia de vencimento" (1-28) no schema de clientes
- [x] Atualizar interface para campo de dia de vencimento
- [x] Implementar cálculo de próxima cobrança automaticamente
- [x] Implementar API para cobranças atrasadas
- [x] Implementar API para entradas previstas próximos 7 dias
- [x] Adicionar card "Entradas Previstas - Próximos 7 dias" no dashboard
- [x] Adicionar card "Cobranças Atrasadas" no dashboard
- [ ] Mostrar "próxima cobrança" na coluna da tabela de clientes

## Atraso em Setup e Parcelamento de Serviços
- [x] Adicionar status de atraso em setup (baseado em parcelas não pagas)
- [x] Permitir editar setup para atualizar status e parcelas
- [x] Adicionar parcelamento em serviços (similar ao setup)
- [ ] Criar tabela de parcelas para serviços
- [x] Permitir editar serviços com opção de parcelamento
- [x] Atualizar cálculos para excluir setup em atraso da receita
- [x] Atualizar cálculos para excluir serviços em atraso da receita
- [ ] Mostrar setup e serviços em atraso no dashboard

## Correções Pendentes
- [x] Implementar funcionalidade de edição para contratos de setup
- [x] Adicionar botão de editar na tabela de contratos
- [x] Permitir atualizar status de setup (active, overdue, completed, cancelled)

## DRE (Demonstrativo de Resultados)
- [x] Adicionar campo de taxa de impostos no schema
- [x] Implementar API de cálculos de DRE com regime de competência
- [x] Reconhecer setup total no mês de fechamento (não nas parcelas)
- [x] Criar página de DRE com demonstrativo visual
- [x] Adicionar aba DRE no menu de navegação
- [x] Implementar cálculo de Receita Bruta (MRR + Setup + Serviços)
- [x] Implementar cálculo de Impostos (campo editável, padrão 11%)
- [x] Implementar cálculo de Receita Líquida
- [x] Implementar cálculo de Margem Bruta (Receita Líquida - CPV/Custos)
- [x] Implementar cálculo de Lucro Líquido (Margem Bruta - Despesas Operacionais)

## DRE Contábil Tradicional
- [x] Implementar API para DRE com múltiplos períodos (mensal/trimestral/anual)
- [x] Criar tabela contábil com todas as linhas (Receita, Custos, Despesas, IR, EBITDA, etc)
- [x] Implementar expansão/colapso de seções com ícone +
- [x] Adicionar filtro de ano e seletor de visualização (mensal/trimestral/anual)
- [ ] Implementar cálculo de totais por período e total do ano
- [ ] Implementar exportação para Excel
- [ ] Implementar exportação para PDF
- [ ] Validar cálculos de regime de competência (setup total no mês de fechamento)

## Login Simples
- [x] Criar contexto de autenticação com credenciais fixas
- [x] Criar página de login com formulário
- [x] Proteger rotas autenticadas
- [x] Adicionar redirecionamento para login
- [x] Implementar logout

## Correções de Login
- [x] Remover página Home que usa OAuth do Manus
- [x] Redirecionar raiz (/) para login ou dashboard
- [x] Remover referência ao OAuth na página inicial

## Bugs a Corrigir
- [x] Bug: Edição de cliente no setup não atualiza
- [x] Feature: Adicionar botão de deletar (lixeira) para contratos de setup
- [x] Bug: Erro NaN no contractId ao criar novo contrato de setup

## Bugs no Dashboard (Nova Rodada)
- [x] Bug: Receita total e MRR com o mesmo valor (deveria ser receita total > MRR) - Corrigido: adicionado campo 'type' ao schema de expenses
- [x] Bug: Gráfico de composição de receita pegando apenas MRR (deveria incluir one-time) - Corrigido: adicionado campo 'type' ao schema de expenses
- [x] Bug: Clientes atrasados não marcados como atrasados - Corrigido: adicionada função updateClientStatusBasedOnInstallments()
- [x] Bug: Tipo de gasto "custo" fica padronizado como "despesa" - Corrigido: adicionado campo 'type' ao schema de expenses

## Bugs Encontrados - Despesas Recorrentes
- [x] Bug: Campo expenseDate obrigatório para despesas recorrentes (deveria ser opcional) - Corrigido: expenseDate agora é opcional e usa recurringStartDate automaticamente

## Bugs Encontrados - Despesas Recorrentes (Continuação)
- [x] Bug: recurringEndDate obrigatório quando deveria ser opcional para recorrência indefinida - Corrigido: tornou-se opcional no schema
- [x] Bug: expenseDate obrigatório mesmo quando despesa é recorrente com recurringStartDate preenchido - Corrigido DEFINITIVAMENTE: campo Data removido do formulário quando recorrente, usa recurringStartDate automaticamente

## Feature - Filtro de Período em Despesas
- [x] Adicionar seletores de mês e ano na página de Despesas
- [x] Implementar API de filtro de despesas por período
- [x] Atualizar total de despesas de acordo com período selecionado
- [x] Testar filtro com múltiplos períodos

### Bugs - Cálculos de Métrica do Dashboard
- [x] Bug: MRR calculando todos os clientes ativos (R$ 14.389,43) em vez de considerar apenas clientes ativos + novos no período - Corrigido: excluindo clientes pausados/inativos
- [x] Bug: Setup não está filtrando parcelas do período (deveria ser R$ 2.315,26 antes de fevereiro) - Corrigido: implementada geração automática de parcelas
- [ ] Bug: Serviços não está filtrando por período (deveria ser R$ 7.000 apenas de out/dez 2025)
- [ ] Feature: Implementar filtro de data inicial/final no dashboard (em vez de apenas mês/ano)
- [ ] Feature: Separar MRR, Setup e Serviços em cards diferentes com totais individuais
- [ ] Feature: Implementar card de Caixa Atual (R$ 20.051,00 = caixa anterior - despesas - custos do período)
