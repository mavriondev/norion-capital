import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, BarChart3, BadgeDollarSign,
  CheckCircle2, Loader2, Download, Filter, Building2,
  Percent, ArrowUpRight, PieChart, CalendarDays, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";

const STAGE_LABELS: Record<string, string> = {
  identificado: "Identificado",
  diagnostico: "Diagnóstico",
  enviado_fundos: "Enviado aos Fundos",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  comissao_gerada: "Comissão Gerada",
};

const STAGE_COLORS: Record<string, string> = {
  identificado: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  diagnostico: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300",
  enviado_fundos: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300",
  em_analise: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-300",
  aprovado: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300",
  comissao_gerada: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300",
};

const PIPELINE_STAGES = [
  { key: "identificado", color: "bg-slate-400" },
  { key: "diagnostico", color: "bg-blue-500" },
  { key: "enviado_fundos", color: "bg-indigo-500" },
  { key: "em_analise", color: "bg-amber-500" },
  { key: "aprovado", color: "bg-green-500" },
  { key: "comissao_gerada", color: "bg-emerald-500" },
];

function formatBRL(value: number | null | undefined) {
  if (value == null || value === 0) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatCnpj(value: string | null | undefined) {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function KpiCard({ icon: Icon, label, value, subtitle, color }: {
  icon: any; label: string; value: string; subtitle?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold leading-none">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarSimple({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium truncate max-w-[180px]">{label}</span>
        <span className="text-muted-foreground">{formatBRL(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function NorionRelatorioPage() {
  const { toast } = useToast();
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("visao-geral");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    if (empresa) params.set("empresa", empresa);
    if (statusFilter) params.set("status", statusFilter);
    return params.toString();
  }, [de, ate, empresa, statusFilter]);

  const { data: relatorio, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/norion/relatorio-comissoes", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/norion/relatorio-comissoes?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao gerar relatório");
      return res.json();
    },
  });

  const r = relatorio || {};
  const empresasDisponiveis = r.empresasDisponiveis || [];
  const porEmpresa = r.porEmpresa || [];
  const porMes = r.porMes || [];
  const porEtapa = r.porEtapa || {};
  const linhas = r.linhas || [];
  const maxVolEmpresa = porEmpresa.length > 0 ? Math.max(...porEmpresa.map((e: any) => e.volume)) : 0;
  const totalPipeline = Object.values(porEtapa).reduce((s: number, v: any) => s + (v || 0), 0) as number;

  const limparFiltros = () => { setDe(""); setAte(""); setEmpresa(""); setStatusFilter(""); };

  const exportarCSV = () => {
    if (!linhas.length) return;
    const headers = ["Empresa", "Razão Social", "CNPJ", "Finalidade", "Valor Solicitado", "Valor Aprovado", "% Comissão", "Valor Comissão", "Status", "Data Operação", "Data Recebimento"];
    const rows = linhas.map((l: any) => [
      l.empresa, l.legalName, l.cnpj, l.finalidade,
      l.valorSolicitado, l.valorAprovado, l.percentualComissao, l.valorComissao,
      l.comissaoRecebida ? "Recebida" : "Pendente",
      l.dataOperacao ? new Date(l.dataOperacao).toLocaleDateString("pt-BR") : "—",
      l.dataRecebimento ? new Date(l.dataRecebimento).toLocaleDateString("pt-BR") : "—",
    ]);
    const csv = [headers.join(";"), ...rows.map((r: any[]) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-norion-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-norion-relatorio-title">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análise de operações, comissões e pipeline</p>
          </div>
        </div>
        {linhas.length > 0 && (
          <Button variant="outline" onClick={exportarCSV} data-testid="button-n-exportar-csv">
            <Download className="w-4 h-4 mr-1.5" />Exportar CSV
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
            {(de || ate || empresa || statusFilter) && (
              <Button variant="ghost" size="sm" className="text-xs h-6 ml-auto" onClick={limparFiltros} data-testid="button-limpar-filtros">
                Limpar
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-36 h-9" data-testid="input-n-rel-de" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-36 h-9" data-testid="input-n-rel-ate" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Empresa</Label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger className="w-48 h-9" data-testid="select-n-rel-empresa">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {empresasDisponiveis.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Comissão</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9" data-testid="select-n-rel-status">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="recebida">Recebidas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={BarChart3} label="Operações Aprovadas" value={String(r.totalOperacoes || 0)} subtitle={`de ${r.totalTodasOperacoes || 0} totais`} color="bg-blue-600" />
            <KpiCard icon={DollarSign} label="Volume Aprovado" value={formatBRL(r.volumeAprovado)} subtitle={`Ticket médio: ${formatBRL(r.ticketMedio)}`} color="bg-green-600" />
            <KpiCard icon={TrendingUp} label="Comissão Total" value={formatBRL(r.comissaoTotal)} subtitle={`${formatBRL(r.comissaoRecebida)} recebida`} color="bg-emerald-600" />
            <KpiCard icon={Target} label="Taxa de Conversão" value={`${r.taxaConversao || 0}%`} subtitle={`${formatBRL(r.comissaoAPagar)} a receber`} color="bg-purple-600" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-1">
              <TabsTrigger value="visao-geral" data-testid="tab-visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="pipeline" data-testid="tab-pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="detalhes" data-testid="tab-detalhes">
                Detalhes {linhas.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{linhas.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visao-geral" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Volume por Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {porEmpresa.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhuma operação aprovada</p>
                    ) : (
                      <div className="space-y-3">
                        {porEmpresa.slice(0, 10).map((e: any, i: number) => (
                          <BarSimple key={e.name} label={e.name} value={e.volume} max={maxVolEmpresa} color={i === 0 ? "bg-amber-500" : "bg-blue-500"} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      Evolução Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {porMes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período</p>
                    ) : (
                      <div className="space-y-2">
                        {porMes.map((m: any) => {
                          const maxVol = Math.max(...porMes.map((x: any) => x.volume));
                          const pct = maxVol > 0 ? Math.round((m.volume / maxVol) * 100) : 0;
                          const mesLabel = new Date(m.mes + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
                          return (
                            <div key={m.mes} className="flex items-center gap-3">
                              <span className="text-xs font-medium w-16 text-right shrink-0">{mesLabel}</span>
                              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                                  {formatBRL(m.volume)} ({m.count} op.)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BadgeDollarSign className="w-4 h-4 text-muted-foreground" />
                    Resumo de Comissões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatBRL(r.comissaoRecebida)}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Recebidas</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <BadgeDollarSign className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatBRL(r.comissaoAPagar)}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">A Receber</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatBRL(r.comissaoTotal)}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">Total Gerado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Funil de Operações</CardTitle>
                </CardHeader>
                <CardContent>
                  {totalPipeline === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma operação no período</p>
                  ) : (
                    <div className="space-y-3">
                      {PIPELINE_STAGES.map((s, i) => {
                        const count = porEtapa[s.key] || 0;
                        const pct = totalPipeline > 0 ? Math.round((count / totalPipeline) * 100) : 0;
                        const maxWidth = 100 - (i * 8);
                        return (
                          <div key={s.key} className="flex items-center gap-3">
                            <span className="text-xs font-medium w-32 text-right shrink-0">{STAGE_LABELS[s.key]}</span>
                            <div className="flex-1 relative">
                              <div className="h-10 bg-muted/50 rounded-lg overflow-hidden" style={{ width: `${maxWidth}%` }}>
                                <div className={cn("h-full rounded-lg transition-all flex items-center px-3", s.color)} style={{ width: `${pct > 0 ? Math.max(pct, 8) : 0}%` }}>
                                  <span className="text-xs font-bold text-white">{count}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {PIPELINE_STAGES.map(s => {
                  const count = porEtapa[s.key] || 0;
                  return (
                    <Card key={s.key}>
                      <CardContent className="p-4 text-center">
                        <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", s.color)} />
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{STAGE_LABELS[s.key]}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="detalhes">
              {linhas.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma operação aprovada encontrada com os filtros atuais</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea className="max-h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Finalidade</TableHead>
                          <TableHead className="text-right">Solicitado</TableHead>
                          <TableHead className="text-right">Aprovado</TableHead>
                          <TableHead className="text-center">%</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-center">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {linhas.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium max-w-[180px] truncate">{l.empresa}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{formatCnpj(l.cnpj)}</TableCell>
                            <TableCell className="text-sm">{l.finalidade}</TableCell>
                            <TableCell className="text-right text-sm">{formatBRL(l.valorSolicitado)}</TableCell>
                            <TableCell className="text-right font-medium">{formatBRL(l.valorAprovado)}</TableCell>
                            <TableCell className="text-center text-sm">{l.percentualComissao}%</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(l.valorComissao)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-[10px]", l.comissaoRecebida ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300" : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-300")}>
                                {l.comissaoRecebida ? "Recebida" : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{formatDate(l.dataOperacao)}</TableCell>
                            <TableCell className="text-center">
                              <Link href={`/operacoes/${l.id}`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`link-op-${l.id}`}>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
