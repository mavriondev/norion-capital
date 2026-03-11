import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  DollarSign, Search, Building2, CheckCircle2, Clock, Send, FileSearch,
  BadgeDollarSign, ArrowRight, ArrowLeft, Loader2,
  AlertTriangle, FileText,
  Upload, ExternalLink, Check, XCircle, ChevronDown, ChevronUp,
  User, Home, Wallet, ClipboardList, Handshake, Star,
  Shield, Landmark, FileDown, Leaf, Tractor,
  Plus, Trash2, Package, Ban, Info, MapPin, Briefcase, Percent,
  BarChart3, TrendingUp, Target,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STAGES = [
  { key: "identificado", label: "Identificado", icon: Search, color: "bg-slate-800/40 border-slate-600" },
  { key: "diagnostico", label: "Diagnóstico", icon: FileSearch, color: "bg-blue-900/30 border-blue-700" },
  { key: "enviado_fundos", label: "Enviado aos Fundos", icon: Send, color: "bg-indigo-900/30 border-indigo-700" },
  { key: "em_analise", label: "Em Análise", icon: Clock, color: "bg-amber-900/30 border-amber-700" },
  { key: "aprovado", label: "Aprovado", icon: CheckCircle2, color: "bg-green-900/30 border-green-700" },
  { key: "comissao_gerada", label: "Comissão Gerada", icon: BadgeDollarSign, color: "bg-emerald-900/30 border-emerald-700" },
];

function formatBRL(value: number | null | undefined) {
  if (value == null) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const STAGE_BADGE_COLORS: Record<string, string> = {
  identificado: "bg-slate-800/40 text-slate-300",
  diagnostico: "bg-blue-900/30 text-blue-400",
  enviado_fundos: "bg-indigo-900/30 text-indigo-400",
  em_analise: "bg-amber-900/30 text-amber-400",
  aprovado: "bg-green-900/30 text-green-400",
  comissao_gerada: "bg-emerald-900/30 text-emerald-400",
};

const CATEGORIA_CONFIG: Record<string, { label: string; icon: any }> = {
  pessoal: { label: "Dados Pessoais", icon: User },
  imovel: { label: "Imóvel (Garantia)", icon: Home },
  imovel_garantia: { label: "Imóvel (Garantia)", icon: Home },
  imovel_compra: { label: "Imóvel (Compra)", icon: Home },
  propriedade: { label: "Propriedade Rural", icon: Tractor },
  producao: { label: "Produção", icon: Leaf },
  empresa: { label: "Empresa", icon: Building2 },
  financeiro: { label: "Financeiro", icon: Wallet },
  renda: { label: "Comprovação de Renda", icon: Wallet },
  briefing: { label: "Briefing", icon: ClipboardList },
  outros: { label: "Outros", icon: FileText },
};

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  enviado: { label: "Enviado", variant: "outline", className: "border-blue-400 text-blue-400" },
  aprovado: { label: "Aprovado", variant: "default", className: "bg-green-600" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

function DocumentChecklist({ operationId, finalidade }: { operationId: number; finalidade?: string }) {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [rejectDocId, setRejectDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/norion/operations", operationId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/operations/${operationId}/documents`);
      if (!res.ok) throw new Error("Erro ao carregar documentos");
      return res.json();
    },
    enabled: !!operationId,
  });

  const { data: modalidadesData } = useQuery<any>({
    queryKey: ["/api/norion/modalidades"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/norion/operations/${operationId}/documents/generate`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "documents"] }),
  });

  const updateDocMutation = useMutation({
    mutationFn: async ({ docId, data: d }: { docId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/norion/documents/${docId}`, d);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "documents"] }),
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ docId, file }: { docId: number; file: File }) => {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const res = await apiRequest("POST", `/api/norion/documents/${docId}/upload`, {
        fileBase64: base64, fileName: file.name, mimeType: file.type || "application/octet-stream",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "documents"] });
      toast({ title: "Arquivo enviado ao Google Drive" });
    },
    onError: (err: any) => toast({ title: "Erro no upload", description: err.message, variant: "destructive" }),
  });

  const addDocMutation = useMutation({
    mutationFn: async (item: { categoria: string; tipoDocumento: string; nome: string; obrigatorio: boolean }) => {
      const res = await apiRequest("POST", `/api/norion/operations/${operationId}/documents/add`, item);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "documents"] });
      toast({ title: "Documento adicionado" });
    },
    onError: (err: any) => toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      const res = await apiRequest("DELETE", `/api/norion/documents/${docId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "documents"] });
      toast({ title: "Documento removido" });
    },
    onError: (err: any) => toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });

  const docs = data?.documents || [];
  const progress = data?.progress;

  const documentPool = useMemo(() => {
    if (!modalidadesData?.documentPools || !finalidade) return [];
    const f = (finalidade || "").toLowerCase().trim();
    let poolKey = "Home Equity";
    if (f === "agro") poolKey = "Agro";
    else if (f === "capital de giro") poolKey = "Capital de Giro";
    else if (f.includes("imóvel") || f.includes("imovel")) poolKey = "Imóvel";
    return modalidadesData.documentPools[poolKey] || [];
  }, [modalidadesData, finalidade]);

  const missingDocs = useMemo(() => {
    const existingTypes = new Set(docs.map((d: any) => d.tipoDocumento));
    return documentPool.filter((item: any) => !existingTypes.has(item.tipoDocumento));
  }, [documentPool, docs]);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (docs.length === 0) {
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-sm text-muted-foreground">Nenhum checklist gerado.</p>
        <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} data-testid="button-n-generate-checklist">
          {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-1.5" />}
          Gerar Checklist
        </Button>
      </div>
    );
  }

  const grouped = docs.reduce((acc: Record<string, any[]>, d: any) => {
    acc[d.categoria] = acc[d.categoria] || [];
    acc[d.categoria].push(d);
    return acc;
  }, {});

  const allCategories = Object.keys(grouped).sort((a, b) => {
    const order = ["pessoal", "propriedade", "producao", "empresa", "imovel", "imovel_garantia", "imovel_compra", "financeiro", "renda", "briefing", "outros"];
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });

  const progressPercent = progress ? Math.round((progress.concluidos / progress.total) * 100) : 0;

  const handleFileUpload = (docId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
          return;
        }
        uploadMutation.mutate({ docId, file });
      }
    };
    input.click();
  };

  const missingGrouped = missingDocs.reduce((acc: Record<string, any[]>, d: any) => {
    acc[d.categoria] = acc[d.categoria] || [];
    acc[d.categoria].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-3" data-testid="n-document-checklist">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{progress?.concluidos || 0} de {progress?.total || 0} concluídos (enviados ou aprovados)</span>
          <span className="text-xs font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {progress && progress.obrigatoriosConcluidos < progress.obrigatorios && (
          <p className="text-xs text-amber-400">{progress.obrigatorios - progress.obrigatoriosConcluidos} obrigatório(s) pendente(s)</p>
        )}
      </div>
      {allCategories.map(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return null;
        const config = CATEGORIA_CONFIG[cat] || { label: cat, icon: FileText };
        const Icon = config.icon;
        const catDone = items.filter((d: any) => d.status === "aprovado" || d.status === "enviado").length;
        const isCollapsed = collapsed[cat];
        return (
          <div key={cat} className="border rounded-lg overflow-hidden" data-testid={`n-checklist-category-${cat}`}>
            <button
              className="w-full flex items-center justify-between p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{config.label}</span>
                <Badge variant="outline" className="text-xs">{catDone}/{items.length}</Badge>
              </div>
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!isCollapsed && (
              <div className="divide-y">
                {items.map((doc: any) => {
                  const st = STATUS_STYLES[doc.status] || STATUS_STYLES.pendente;
                  return (
                    <div key={doc.id} className="p-2.5 space-y-1.5" data-testid={`n-doc-item-${doc.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{doc.nome}</span>
                            {doc.obrigatorio && <span className="text-[10px] text-red-500 font-medium">*</span>}
                          </div>
                          {doc.nomeArquivo && <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.nomeArquivo}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant={st.variant} className={cn("text-[10px]", st.className)}>{st.label}</Badge>
                          {doc.status === "pendente" && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-red-400"
                              onClick={() => deleteDocMutation.mutate(doc.id)}
                              disabled={deleteDocMutation.isPending}
                              data-testid={`button-remove-doc-${doc.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleFileUpload(doc.id)} disabled={uploadMutation.isPending}>
                          {uploadMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                          Upload
                        </Button>
                        {doc.driveFileUrl && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                            <a href={doc.driveFileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" /> Drive</a>
                          </Button>
                        )}
                        {doc.status !== "aprovado" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400" onClick={() => updateDocMutation.mutate({ docId: doc.id, data: { status: "aprovado" } })}>
                            <Check className="w-3 h-3 mr-1" /> Aprovar
                          </Button>
                        )}
                        {doc.status !== "rejeitado" && doc.status !== "pendente" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400" onClick={() => { setRejectDocId(doc.id); setRejectReason(""); }} data-testid={`button-reject-doc-${doc.id}`}>
                            <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {missingDocs.length > 0 && (
        <div className="pt-1">
          <Button
            variant="outline" size="sm" className="text-xs w-full"
            onClick={() => setShowAddPanel(!showAddPanel)}
            data-testid="button-adicionar-item"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Adicionar Item ({missingDocs.length} disponíveis)
          </Button>
          {showAddPanel && (
            <div className="mt-2 border rounded-lg p-3 bg-muted/20 space-y-2" data-testid="panel-add-documents">
              <p className="text-xs text-muted-foreground font-medium">Documentos disponíveis para adicionar:</p>
              {Object.keys(missingGrouped).sort().map(cat => {
                const catConfig = CATEGORIA_CONFIG[cat] || { label: cat, icon: FileText };
                const CatIcon = catConfig.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{catConfig.label}</span>
                    </div>
                    <div className="space-y-1 ml-5">
                      {missingGrouped[cat].map((item: any) => (
                        <div key={item.tipoDocumento} className="flex items-center justify-between gap-2 py-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs truncate">{item.nome}</span>
                            {item.obrigatorio && <span className="text-[10px] text-red-500 font-medium shrink-0">*</span>}
                          </div>
                          <Button
                            variant="ghost" size="sm" className="h-6 text-xs shrink-0 text-blue-400"
                            onClick={() => addDocMutation.mutate(item)}
                            disabled={addDocMutation.isPending}
                            data-testid={`button-add-doc-${item.tipoDocumento}`}
                          >
                            <Plus className="w-3 h-3 mr-0.5" /> Adicionar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={rejectDocId !== null} onOpenChange={(open) => { if (!open) setRejectDocId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" /> Rejeitar Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição para que o cliente saiba o que precisa corrigir.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Documento ilegível, envie novamente com melhor qualidade..."
              rows={3}
              className="text-sm"
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejectDocId(null)} data-testid="button-cancel-reject">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectReason.trim() || updateDocMutation.isPending}
              onClick={() => {
                if (rejectDocId) {
                  updateDocMutation.mutate(
                    { docId: rejectDocId, data: { status: "rejeitado", observacao: rejectReason.trim() } },
                    { onSuccess: () => { setRejectDocId(null); setRejectReason(""); toast({ title: "Documento rejeitado" }); } }
                  );
                }
              }}
              data-testid="button-confirm-reject"
            >
              {updateDocMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-orange-500";
  const textColor = score >= 75 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-orange-400";
  return (
    <div className="flex items-center gap-2" data-testid="score-bar">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-xs font-bold tabular-nums", textColor)}>{score}%</span>
    </div>
  );
}

function FundoCriteriosCollapsible({ fundo }: { fundo: any }) {
  const [open, setOpen] = useState(false);
  const crit = fundo.criteriosAnalise || {};
  const cond = fundo.condicoesComerciais || {};

  const hasAnyCriteria = crit.faturamentoMinimo || crit.tempoEmpresaMinimo || crit.capitalSocialMinimo ||
    crit.areaRuralMinima || crit.exigeCaf || crit.exigeCnpjAtivo || crit.exigeGarantiaReal ||
    crit.ltvMaximo || (crit.ufsAceitas && crit.ufsAceitas.length > 0) ||
    (crit.ufsVetadas && crit.ufsVetadas.length > 0) || (crit.porteAceito && crit.porteAceito.length > 0) ||
    (crit.cnaesAceitos && crit.cnaesAceitos.length > 0) || (crit.documentosExigidos && crit.documentosExigidos.length > 0);

  const hasAnyCond = cond.taxaJurosMin || cond.taxaJurosMax || cond.prazoRespostaDias || cond.comissaoPercentual;

  if (!hasAnyCriteria && !hasAnyCond) return null;

  return (
    <div className="border rounded-md overflow-hidden" data-testid="criterios-fundo-collapsible">
      <button
        className="w-full flex items-center justify-between p-2 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
        onClick={() => setOpen(!open)}
        data-testid="button-toggle-criterios"
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium">Critérios do Fundo</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="p-2.5 space-y-2.5 text-xs">
          {hasAnyCriteria && (
            <div className="space-y-1.5">
              <p className="font-medium text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> Requisitos</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 ml-4">
                {crit.faturamentoMinimo != null && (
                  <div><span className="text-muted-foreground">Faturamento mín:</span> <span className="font-medium">R$ {(crit.faturamentoMinimo / 1000).toFixed(0)}k</span></div>
                )}
                {crit.capitalSocialMinimo != null && (
                  <div><span className="text-muted-foreground">Capital social mín:</span> <span className="font-medium">R$ {(crit.capitalSocialMinimo / 1000).toFixed(0)}k</span></div>
                )}
                {crit.tempoEmpresaMinimo != null && (
                  <div><span className="text-muted-foreground">Tempo empresa mín:</span> <span className="font-medium">{crit.tempoEmpresaMinimo} anos</span></div>
                )}
                {crit.ltvMaximo != null && (
                  <div><span className="text-muted-foreground">LTV máx:</span> <span className="font-medium">{crit.ltvMaximo}%</span></div>
                )}
                {crit.areaRuralMinima != null && (
                  <div><span className="text-muted-foreground">Área rural mín:</span> <span className="font-medium">{crit.areaRuralMinima} ha</span></div>
                )}
                {crit.exigeCaf && <div className="text-muted-foreground">Exige CAF/DAP ativo</div>}
                {crit.exigeCnpjAtivo && <div className="text-muted-foreground">Exige CNPJ ativo</div>}
                {crit.exigeGarantiaReal && <div className="text-muted-foreground">Exige garantia real</div>}
              </div>
              {crit.porteAceito && crit.porteAceito.length > 0 && (
                <div className="ml-4 flex items-center gap-1 flex-wrap">
                  <span className="text-muted-foreground">Portes:</span>
                  {crit.porteAceito.map((p: string) => (
                    <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              )}
              {crit.ufsAceitas && crit.ufsAceitas.length > 0 && (
                <div className="ml-4 flex items-center gap-1 flex-wrap">
                  <span className="text-muted-foreground"><MapPin className="w-3 h-3 inline" /> UFs:</span>
                  {crit.ufsAceitas.map((u: string) => (
                    <Badge key={u} variant="outline" className="text-[10px]">{u}</Badge>
                  ))}
                </div>
              )}
              {crit.documentosExigidos && crit.documentosExigidos.length > 0 && (
                <div className="ml-4">
                  <span className="text-muted-foreground">Documentos exigidos:</span>
                  <span className="ml-1">{crit.documentosExigidos.join(", ")}</span>
                </div>
              )}
            </div>
          )}
          {hasAnyCond && (
            <div className="space-y-1.5">
              <p className="font-medium text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" /> Condições Comerciais</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 ml-4">
                {(cond.taxaJurosMin != null || cond.taxaJurosMax != null) && (
                  <div>
                    <span className="text-muted-foreground">Taxa juros:</span>{" "}
                    <span className="font-medium">
                      {cond.taxaJurosMin != null && cond.taxaJurosMax != null
                        ? `${cond.taxaJurosMin}% - ${cond.taxaJurosMax}% a.a.`
                        : cond.taxaJurosMin != null ? `a partir de ${cond.taxaJurosMin}% a.a.` : `até ${cond.taxaJurosMax}% a.a.`}
                    </span>
                  </div>
                )}
                {cond.prazoRespostaDias != null && (
                  <div><span className="text-muted-foreground">Prazo resposta:</span> <span className="font-medium">{cond.prazoRespostaDias} dias</span></div>
                )}
                {cond.comissaoPercentual != null && (
                  <div><span className="text-muted-foreground">Comissão:</span> <span className="font-medium">{cond.comissaoPercentual}%</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DIMENSION_LABELS: Record<string, string> = {
  operacao: "Operação",
  valor: "Valor",
  garantias: "Garantias",
  perfilFinanceiro: "Perfil Fin.",
  perfilAgro: "Perfil Agro",
  conformidade: "Conformidade",
  historico: "Histórico",
};

const FUND_COLORS = [
  "#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#fb923c",
];

function MatchingGraphDialog({ matching, open, onOpenChange }: { matching: any[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [selectedFundoId, setSelectedFundoId] = useState<number | null>(null);

  const recomendados = matching.filter((m: any) => !m.eliminado && m.score > 0);
  const incompativeis = matching.filter((m: any) => m.eliminado);

  const barData = recomendados.map((m: any, i: number) => ({
    nome: m.fundo.nome.length > 25 ? m.fundo.nome.substring(0, 22) + "..." : m.fundo.nome,
    nomeCompleto: m.fundo.nome,
    score: m.score,
    color: FUND_COLORS[i % FUND_COLORS.length],
    id: m.fundo.id,
    reasons: m.reasons?.length || 0,
    gaps: m.gaps?.length || 0,
  })).sort((a: any, b: any) => b.score - a.score);

  const radarKeys = ["operacao", "valor", "garantias", "perfilFinanceiro", "perfilAgro", "conformidade", "historico"];
  const radarData = radarKeys.map(key => {
    const entry: any = { dimension: DIMENSION_LABELS[key] || key };
    recomendados.forEach((m: any, i: number) => {
      const bd = m.scoreBreakdown?.[key];
      entry[m.fundo.nome] = bd ? Math.round((bd.pontos / bd.max) * 100) : 0;
    });
    return entry;
  });

  const selectedFundo = selectedFundoId ? matching.find((m: any) => m.fundo.id === selectedFundoId) : null;

  const selectedBreakdown = selectedFundo?.scoreBreakdown
    ? radarKeys.map(key => {
        const bd = selectedFundo.scoreBreakdown[key];
        return {
          dimension: DIMENSION_LABELS[key] || key,
          percentual: bd ? Math.round((bd.pontos / bd.max) * 100) : 0,
          pontos: bd?.pontos || 0,
          max: bd?.max || 0,
        };
      })
    : [];

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl" data-testid="tooltip-bar">
        <p className="text-sm font-medium text-white mb-1">{d.nomeCompleto}</p>
        <p className="text-lg font-bold" style={{ color: d.color }}>{d.score}%</p>
        <div className="flex gap-3 mt-1 text-[11px]">
          <span className="text-green-400">{d.reasons} atende</span>
          <span className="text-amber-400">{d.gaps} pendência{d.gaps !== 1 ? "s" : ""}</span>
        </div>
      </div>
    );
  };

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-xl">
        <p className="text-xs font-medium text-white mb-1">{payload[0].payload.dimension}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || FUND_COLORS[i] }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-white">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-matching-graph">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Análise Visual de Matching
          </DialogTitle>
        </DialogHeader>

        {recomendados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum fundo compatível encontrado para esta operação</p>
            {incompativeis.length > 0 && (
              <p className="text-xs mt-1">{incompativeis.length} fundo(s) eliminado(s) por critérios obrigatórios</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center" data-testid="stat-total-funds">
                <p className="text-2xl font-bold text-cyan-400">{recomendados.length}</p>
                <p className="text-[11px] text-muted-foreground">Fundos Compatíveis</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center" data-testid="stat-best-score">
                <p className="text-2xl font-bold text-green-400">{barData[0]?.score || 0}%</p>
                <p className="text-[11px] text-muted-foreground">Melhor Score</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center" data-testid="stat-eliminated">
                <p className="text-2xl font-bold text-red-400">{incompativeis.length}</p>
                <p className="text-[11px] text-muted-foreground">Eliminados</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium">Ranking de Fundos</span>
              </div>
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4" data-testid="chart-ranking">
                <ResponsiveContainer width="100%" height={Math.max(recomendados.length * 55, 120)}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={{ stroke: '#475569' }} axisLine={{ stroke: '#475569' }} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#e2e8f0', fontSize: 12 }} width={160} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24} onClick={(d: any) => setSelectedFundoId(d.id)} style={{ cursor: 'pointer' }}>
                      {barData.map((entry: any, index: number) => (
                        <Cell
                          key={entry.id}
                          fill={entry.score >= 75 ? '#22c55e' : entry.score >= 50 ? '#eab308' : '#f97316'}
                          fillOpacity={selectedFundoId === entry.id ? 1 : 0.75}
                          stroke={selectedFundoId === entry.id ? '#fff' : 'transparent'}
                          strokeWidth={selectedFundoId === entry.id ? 2 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {barData.map((entry: any) => (
                    <button
                      key={entry.id}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full border transition-all",
                        selectedFundoId === entry.id
                          ? "bg-cyan-900/40 border-cyan-500 text-cyan-300"
                          : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"
                      )}
                      onClick={() => setSelectedFundoId(selectedFundoId === entry.id ? null : entry.id)}
                      data-testid={`button-select-fund-${entry.id}`}
                    >
                      {entry.nomeCompleto} — {entry.score}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {recomendados.length >= 2 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium">Comparativo por Dimensão</span>
                </div>
                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4" data-testid="chart-radar">
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke="#475569" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickCount={5} />
                      <Tooltip content={<CustomRadarTooltip />} />
                      {recomendados.map((m: any, i: number) => (
                        <Radar
                          key={m.fundo.id}
                          name={m.fundo.nome}
                          dataKey={m.fundo.nome}
                          stroke={FUND_COLORS[i % FUND_COLORS.length]}
                          fill={FUND_COLORS[i % FUND_COLORS.length]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                        iconType="circle"
                        iconSize={8}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedFundo && (
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3" data-testid="detail-selected-fund">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium">{selectedFundo.fundo.nome}</span>
                    <Badge className={cn("text-[10px]",
                      selectedFundo.score >= 75 ? "bg-green-900/30 text-green-400 border-green-700" :
                      selectedFundo.score >= 50 ? "bg-yellow-900/30 text-yellow-400 border-yellow-700" :
                      "bg-orange-900/30 text-orange-400 border-orange-700"
                    )}>
                      {selectedFundo.score}% match
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFundoId(null)} className="text-xs text-muted-foreground">
                    Fechar
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {selectedBreakdown.map((dim: any) => (
                    <div key={dim.dimension} className="text-center">
                      <div className="relative h-20 bg-slate-900/60 rounded-md overflow-hidden border border-slate-700">
                        <div
                          className={cn("absolute bottom-0 w-full transition-all rounded-b-md",
                            dim.percentual >= 75 ? "bg-green-500/60" :
                            dim.percentual >= 50 ? "bg-yellow-500/60" :
                            dim.percentual > 0 ? "bg-orange-500/60" : "bg-slate-700/40"
                          )}
                          style={{ height: `${dim.percentual}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow">{dim.pontos}/{dim.max}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{dim.dimension}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedFundo.reasons?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Pontos Fortes ({selectedFundo.reasons.length})
                      </p>
                      {selectedFundo.reasons.map((r: string, i: number) => (
                        <p key={i} className="text-[10px] text-muted-foreground pl-4">{r}</p>
                      ))}
                    </div>
                  )}
                  {selectedFundo.gaps?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Pendências ({selectedFundo.gaps.length})
                      </p>
                      {selectedFundo.gaps.map((g: string, i: number) => (
                        <p key={i} className="text-[10px] text-amber-300/70 pl-4">{g}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedFundo && recomendados.length > 0 && (
              <p className="text-[11px] text-muted-foreground text-center">Clique em uma barra do ranking para ver o detalhamento do fundo</p>
            )}

            {incompativeis.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium">Fundos Eliminados ({incompativeis.length})</span>
                </div>
                <div className="space-y-1.5">
                  {incompativeis.map((m: any) => (
                    <div key={m.fundo.id} className="flex items-center gap-2 bg-red-950/10 border border-red-900/30 rounded-md px-3 py-2" data-testid={`graph-eliminado-${m.fundo.id}`}>
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-xs font-medium flex-1">{m.fundo.nome}</span>
                      <span className="text-[10px] text-red-400/70">{m.motivoEliminacao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MatchingFundoCard({ m, onSelect, isPending }: { m: any; onSelect: (fundoId: number, score: number, reasons: string[]) => void; isPending: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cond = m.fundo.condicoesComerciais || {};

  return (
    <div className="border rounded-lg p-3 space-y-2" data-testid={`n-matching-${m.fundo.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{m.fundo.nome}</span>
          {m.score >= 75 && <Badge className="text-[10px] bg-green-900/30 text-green-400 border border-green-700 shrink-0">Ideal</Badge>}
        </div>
        <Button
          variant="outline" size="sm" className="shrink-0"
          onClick={() => onSelect(m.fundo.id, m.score, m.reasons)}
          disabled={isPending}
          data-testid={`button-enviar-fundo-${m.fundo.id}`}
        >
          <Plus className="w-3 h-3 mr-1" /> Selecionar
        </Button>
      </div>

      <ScoreBar score={m.score} />

      {(cond.taxaJurosMin != null || cond.taxaJurosMax != null || cond.prazoRespostaDias != null) && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          {(cond.taxaJurosMin != null || cond.taxaJurosMax != null) && (
            <span className="flex items-center gap-1">
              <Percent className="w-3 h-3" />
              {cond.taxaJurosMin != null && cond.taxaJurosMax != null
                ? `${cond.taxaJurosMin}% - ${cond.taxaJurosMax}% a.a.`
                : cond.taxaJurosMin != null ? `a partir de ${cond.taxaJurosMin}% a.a.` : `até ${cond.taxaJurosMax}% a.a.`}
            </span>
          )}
          {cond.prazoRespostaDias != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Resposta: {cond.prazoRespostaDias} dias
            </span>
          )}
        </div>
      )}

      <button
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-matching-${m.fundo.id}`}
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Ocultar detalhes" : "Ver detalhes do matching"}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {m.reasons && m.reasons.length > 0 && (
            <div className="space-y-1">
              {m.reasons.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]" data-testid={`reason-${m.fundo.id}-${i}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
          {m.gaps && m.gaps.length > 0 && (
            <div className="space-y-1">
              {m.gaps.map((g: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]" data-testid={`gap-${m.fundo.id}-${i}`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-amber-300/80">{g}</span>
                </div>
              ))}
            </div>
          )}
          <FundoCriteriosCollapsible fundo={m.fundo} />
        </div>
      )}
    </div>
  );
}

function EnviosFundosSection({ operationId }: { operationId: number }) {
  const { toast } = useToast();
  const [motivoEscolha, setMotivoEscolha] = useState<Record<number, string>>({});
  const [showIncompativeis, setShowIncompativeis] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const { data: envios = [], isLoading: enviosLoading } = useQuery<any[]>({
    queryKey: ["/api/norion/operations", operationId, "envios"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/operations/${operationId}/envios`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!operationId,
  });

  const { data: matching = [], isLoading: matchingLoading } = useQuery<any[]>({
    queryKey: ["/api/norion/operations", operationId, "matching-fundos"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/operations/${operationId}/matching-fundos`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!operationId,
  });

  const selecionarMutation = useMutation({
    mutationFn: async ({ fundoParceiroId, matchScore, matchReasons }: { fundoParceiroId: number; matchScore?: number; matchReasons?: string[] }) => {
      const res = await apiRequest("POST", `/api/norion/operations/${operationId}/envios`, {
        fundoParceiroId, matchScore, matchReasons, confirmarEnvio: false,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "envios"] });
      toast({ title: "Fundo selecionado", description: "Confirme o envio quando estiver pronto." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const confirmarEnvioMutation = useMutation({
    mutationFn: async ({ envioId, motivo }: { envioId: number; motivo?: string }) => {
      const res = await apiRequest("PATCH", `/api/norion/envios/${envioId}`, {
        status: "enviado", motivoEscolha: motivo || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "envios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/dashboard"] });
      toast({ title: "Enviado!", description: "Operação enviada para o fundo com sucesso." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateEnvioMutation = useMutation({
    mutationFn: async ({ envioId, data }: { envioId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/norion/envios/${envioId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "envios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/dashboard"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const enviadosFundoIds = envios.map((e: any) => e.fundoParceiroId);
  const allSugestoes = matching.filter((m: any) => !enviadosFundoIds.includes(m.fundo.id));
  const sugestoes = allSugestoes.filter((m: any) => !m.eliminado);
  const incompativeis = allSugestoes.filter((m: any) => m.eliminado);

  const enviosProntos = envios.filter((e: any) => e.status === "pronto_para_envio");
  const enviosAtivos = envios.filter((e: any) => e.status !== "pronto_para_envio");

  const statusLabel = (s: string) => ({ pronto_para_envio: "Pronto para Enviar", enviado: "Enviado", em_analise: "Em Análise", aprovado: "Aprovado", recusado: "Recusado" }[s] || s);
  const statusColor = (s: string) => ({ pronto_para_envio: "border-yellow-400 text-yellow-400", enviado: "border-blue-400 text-blue-400", em_analise: "border-amber-400 text-amber-400", aprovado: "border-green-400 text-green-400", recusado: "border-red-400 text-red-400" }[s] || "border-slate-400 text-slate-400");

  const handleSelectFundo = (fundoId: number, score: number, reasons: string[]) => {
    const topReasons = reasons.slice(0, 3).join("; ");
    setMotivoEscolha(prev => ({ ...prev, [`pending_${fundoId}`]: topReasons }));
    selecionarMutation.mutate({ fundoParceiroId: fundoId, matchScore: score, matchReasons: reasons });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Handshake className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Sugestões de Matching</span>
        {enviosProntos.length > 0 && (
          <Badge className="text-[10px] bg-yellow-900/30 text-yellow-400 border border-yellow-700">
            {enviosProntos.length} aguardando envio
          </Badge>
        )}
        {matching.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-xs gap-1.5 border-cyan-700/50 text-cyan-400 hover:bg-cyan-900/20"
            onClick={() => setShowGraph(true)}
            data-testid="button-open-matching-graph"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Ver Gráfico
          </Button>
        )}
      </div>
      <MatchingGraphDialog matching={matching} open={showGraph} onOpenChange={setShowGraph} />

      {enviosProntos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-yellow-400">Aguardando Confirmação de Envio</p>
          {enviosProntos.map((envio: any) => {
            const matchData = matching.find((m: any) => m.fundo.id === envio.fundoParceiroId);
            const topReasons = (envio.matchReasons || matchData?.reasons || []).slice(0, 3).join("; ");
            return (
              <div key={envio.id} className="border border-yellow-700/50 rounded-lg p-3 space-y-2 bg-yellow-900/10" data-testid={`n-envio-pronto-${envio.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{envio.fundoParceiro?.nome || "Fundo"}</span>
                    {envio.matchScore != null && (
                      <Badge variant="outline" className={cn("text-[10px]",
                        envio.matchScore >= 75 ? "border-green-400 text-green-400" :
                        envio.matchScore >= 50 ? "border-yellow-400 text-yellow-400" :
                        "border-orange-400 text-orange-400"
                      )}>
                        <Star className="w-2.5 h-2.5 mr-0.5" />{envio.matchScore}% match
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-xs", statusColor(envio.status))}>
                    {statusLabel(envio.status)}
                  </Badge>
                </div>
                {envio.matchReasons?.length > 0 && (
                  <div className="space-y-0.5">
                    {envio.matchReasons.slice(0, 3).map((r: string, i: number) => (
                      <div key={i} className="flex items-center gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                        <span className="text-muted-foreground">{r}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    className="text-xs flex-1"
                    placeholder="Motivo da escolha (opcional)..."
                    value={motivoEscolha[envio.id] ?? (envio.motivoEscolha || topReasons)}
                    onChange={(e) => setMotivoEscolha(prev => ({ ...prev, [envio.id]: e.target.value }))}
                    data-testid={`input-motivo-${envio.id}`}
                  />
                  <Button
                    size="sm" className="shrink-0"
                    onClick={() => confirmarEnvioMutation.mutate({ envioId: envio.id, motivo: motivoEscolha[envio.id] || topReasons })}
                    disabled={confirmarEnvioMutation.isPending}
                    data-testid={`button-confirmar-envio-${envio.id}`}
                  >
                    <Send className="w-3 h-3 mr-1" /> Confirmar Envio
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {enviosAtivos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Envios em Andamento</p>
          {enviosAtivos.map((envio: any) => (
            <div key={envio.id} className="border rounded-lg p-2.5 space-y-2" data-testid={`n-envio-${envio.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{envio.fundoParceiro?.nome || "Fundo"}</span>
                  {envio.matchScore != null && (
                    <Badge variant="outline" className="text-[10px] border-slate-500 text-slate-400">
                      {envio.matchScore}% match
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className={cn("text-xs", statusColor(envio.status))}>
                  {statusLabel(envio.status)}
                </Badge>
              </div>
              {envio.dataEnvio && (
                <p className="text-[10px] text-muted-foreground">Enviado em: {new Date(envio.dataEnvio).toLocaleDateString('pt-BR')}</p>
              )}
              {envio.motivoEscolha && (
                <p className="text-[10px] text-muted-foreground italic">"{envio.motivoEscolha}"</p>
              )}
              {envio.status !== "aprovado" && envio.status !== "recusado" && (
                <Select value="" onValueChange={(val) => updateEnvioMutation.mutate({ envioId: envio.id, data: { status: val } })}>
                  <SelectTrigger className="text-xs w-auto">
                    <SelectValue placeholder="Atualizar status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="recusado">Recusado</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {envio.status === "aprovado" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Valor Aprovado</Label>
                    <Input type="number" className="text-xs" placeholder="R$ 0"
                      defaultValue={envio.valorAprovado || ""}
                      onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateEnvioMutation.mutate({ envioId: envio.id, data: { valorAprovado: v, status: "aprovado" } }); }}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Taxa Juros %</Label>
                    <Input type="number" className="text-xs" placeholder="0"
                      defaultValue={envio.taxaJuros || ""}
                      onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateEnvioMutation.mutate({ envioId: envio.id, data: { taxaJuros: v } }); }}
                    />
                  </div>
                </div>
              )}
              {envio.status === "recusado" && (
                <Input className="text-xs" placeholder="Motivo da recusa..."
                  defaultValue={envio.motivoRecusa || ""}
                  onBlur={(e) => { if (e.target.value) updateEnvioMutation.mutate({ envioId: envio.id, data: { motivoRecusa: e.target.value } }); }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {sugestoes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Fundos Recomendados ({sugestoes.length})</p>
          {sugestoes.map((m: any) => (
            <MatchingFundoCard
              key={m.fundo.id}
              m={m}
              onSelect={handleSelectFundo}
              isPending={selecionarMutation.isPending}
            />
          ))}
        </div>
      )}

      {incompativeis.length > 0 && (
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={() => setShowIncompativeis(!showIncompativeis)}
            data-testid="button-toggle-incompativeis"
          >
            <Ban className="w-3.5 h-3.5 text-red-400" />
            <span className="font-medium">Incompatíveis ({incompativeis.length})</span>
            {showIncompativeis ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {showIncompativeis && (
            <div className="space-y-1.5">
              {incompativeis.map((m: any) => (
                <div key={m.fundo.id} className="border border-red-900/30 rounded-lg p-2.5 bg-red-950/10" data-testid={`n-incompativel-${m.fundo.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-sm font-medium">{m.fundo.nome}</span>
                  </div>
                  <p className="text-[11px] text-red-400/80 ml-5">{m.motivoEliminacao}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!enviosLoading && !matchingLoading && envios.length === 0 && sugestoes.length === 0 && incompativeis.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Cadastre fundos parceiros para ver sugestões</p>
      )}
    </div>
  );
}

const DEFESA_FIELDS = {
  briefing: [
    { key: "historiaEmpresa", label: "História da Empresa", type: "textarea" },
    { key: "segmentoMercado", label: "Segmento de Mercado", type: "text" },
    { key: "site", label: "Site", type: "text" },
    { key: "redesSociais", label: "Redes Sociais", type: "text" },
    { key: "estadosMatrizFiliais", label: "Estados (Matriz e Filiais)", type: "text" },
    { key: "socios", label: "Sócios (nomes separados por vírgula)", type: "text" },
    { key: "administracao", label: "Administração", type: "text" },
    { key: "principaisClientes", label: "Principais Clientes", type: "textarea" },
    { key: "formaRecebimento", label: "Forma de Recebimento (boleto/cartão/etc)", type: "text" },
    { key: "prazoRecebimentoDias", label: "Prazo de Recebimento (dias)", type: "number" },
  ],
  financeiro: [
    { key: "faturamentoAnual", label: "Faturamento Anual (R$)", type: "number" },
    { key: "margemLucroLiquida", label: "Margem de Lucro Líquida (%)", type: "number" },
    { key: "valorCreditoNecessario", label: "Valor do Crédito Necessário (R$)", type: "number" },
    { key: "finalidadeCredito", label: "Finalidade do Crédito", type: "textarea" },
    { key: "socioDecisor", label: "Sócio Decisor", type: "text" },
    { key: "expectativaTaxaJuros", label: "Expectativa de Taxa de Juros (%)", type: "number" },
    { key: "expectativaPrazo", label: "Expectativa de Prazo", type: "text" },
  ],
  garantias: [
    { key: "garantiasPrincipais", label: "Garantias Principais (descrição detalhada)", type: "textarea" },
    { key: "imoveisUrbanosRurais", label: "Imóveis Urbanos / Rurais", type: "textarea" },
    { key: "imoveisQuitados", label: "Imóveis Quitados?", type: "boolean" },
    { key: "patrimonioTotalEmpresa", label: "Patrimônio Total da Empresa (R$)", type: "number" },
    { key: "patrimonioTotalSocios", label: "Patrimônio Total dos Sócios (R$)", type: "number" },
  ],
  relacionamento: [
    { key: "instituicoesFinanceiras", label: "Instituições Financeiras", type: "textarea" },
    { key: "endividamentoAberto", label: "Possui Endividamento em Aberto?", type: "boolean" },
    { key: "endividamentoValor", label: "Valor do Endividamento (R$)", type: "number" },
    { key: "restricoesCnpjCpf", label: "Restrições no CNPJ/CPF?", type: "boolean" },
    { key: "restricoesDetalhes", label: "Detalhes das Restrições", type: "textarea" },
  ],
};

const ALL_DEFESA_KEYS = Object.values(DEFESA_FIELDS).flat().map(f => f.key);

function DefesaCreditoSection({ operationId, diagnostico, company, onSave }: {
  operationId: number;
  diagnostico: any;
  company: any;
  onSave: (defesaData: Record<string, any>) => void;
}) {
  const { toast } = useToast();
  const defesa = diagnostico?.defesaCredito || {};

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...defesa };
    if (!initial.segmentoMercado && company?.cnaePrincipal) {
      initial.segmentoMercado = company.cnaePrincipal;
    }
    if (!initial.site && company?.website) {
      initial.site = company.website;
    }
    const enrichment = company?.enrichmentData as any;
    if (!initial.socios && enrichment?.socios?.length > 0) {
      const sociosContato = enrichment?.sociosContato || {};
      initial.socios = enrichment.socios.map((s: any, idx: number) => {
        const key = s.name ? s.name.trim().toLowerCase().replace(/\s+/g, "_") : `socio_${idx}`;
        const contato = sociosContato[key];
        const parts = [s.name];
        if (s.role) parts.push(`(${s.role})`);
        if (contato?.cpf) parts.push(`CPF: ${contato.cpf}`);
        if (contato?.telefone) parts.push(`Tel: ${contato.telefone}`);
        return parts.join(" ");
      }).join("; ");
    }
    return initial;
  });

  const [activeTab, setActiveTab] = useState("briefing");

  const handleChange = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filledCount = useMemo(() => {
    return ALL_DEFESA_KEYS.filter(k => {
      const v = formData[k];
      if (v === undefined || v === null || v === "") return false;
      if (typeof v === "string" && v.trim() === "") return false;
      return true;
    }).length;
  }, [formData]);

  const progressPercent = Math.round((filledCount / ALL_DEFESA_KEYS.length) * 100);

  const handleSave = () => {
    onSave({ defesaCredito: formData });
  };

  const renderField = (field: { key: string; label: string; type: string }) => {
    if (field.type === "boolean") {
      return (
        <div key={field.key} className="flex items-center gap-2" data-testid={`defesa-field-${field.key}`}>
          <Checkbox
            checked={formData[field.key] === true}
            onCheckedChange={(checked) => handleChange(field.key, checked === true)}
          />
          <Label className="text-sm cursor-pointer">{field.label}</Label>
        </div>
      );
    }
    if (field.type === "textarea") {
      return (
        <div key={field.key} data-testid={`defesa-field-${field.key}`}>
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Textarea
            className="text-sm mt-1"
            value={formData[field.key] || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
          />
        </div>
      );
    }
    return (
      <div key={field.key} data-testid={`defesa-field-${field.key}`}>
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Input
          type={field.type}
          className="text-sm mt-1"
          value={formData[field.key] ?? ""}
          onChange={(e) => handleChange(field.key, field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        />
      </div>
    );
  };

  const hasCaf = !!(company?.enrichmentData as any)?.caf?.numeroCAF;
  const cafData = (company?.enrichmentData as any)?.caf || {};

  const pronafQueryUrl = cafData.grupo
    ? `/api/norion/pronaf/linhas?grupo=${encodeURIComponent(cafData.grupo)}${cafData.rendaBrutaAnual ? `&renda=${cafData.rendaBrutaAnual}` : ""}`
    : "/api/norion/pronaf/linhas";

  const { data: pronafLinhas = [] } = useQuery<any[]>({
    queryKey: ["/api/norion/pronaf/linhas", cafData.grupo, cafData.rendaBrutaAnual],
    queryFn: async () => {
      const res = await fetch(pronafQueryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar linhas PRONAF");
      return res.json();
    },
    enabled: hasCaf && !!cafData.grupo,
  });

  const pronafSelecionadas = formData.pronafLinhasSelecionadas || [];

  function togglePronafLinha(linhaId: number) {
    const current = [...pronafSelecionadas];
    const idx = current.indexOf(linhaId);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(linhaId);
    handleChange("pronafLinhasSelecionadas", current);
  }

  const baseTabConfig = [
    { key: "briefing", label: "Briefing", icon: ClipboardList },
    { key: "financeiro", label: "Financeiro", icon: DollarSign },
    { key: "garantias", label: "Garantias", icon: Shield },
    { key: "relacionamento", label: "Relacionamento", icon: Landmark },
  ];

  const tabConfig = hasCaf
    ? [...baseTabConfig, { key: "pronaf", label: "PRONAF", icon: Tractor }]
    : baseTabConfig;

  const gridCols = hasCaf ? "grid-cols-5" : "grid-cols-4";

  return (
    <div className="space-y-3" data-testid="defesa-credito-section">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Defesa do Crédito</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filledCount} de {ALL_DEFESA_KEYS.length} campos preenchidos</span>
          <span className="text-xs font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" data-testid="defesa-progress-bar" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`w-full grid ${gridCols}`}>
          {tabConfig.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1" data-testid={`tab-defesa-${t.key}`}>
              <t.icon className="w-3 h-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {baseTabConfig.map(t => (
          <TabsContent key={t.key} value={t.key} className="space-y-3 mt-3">
            {DEFESA_FIELDS[t.key as keyof typeof DEFESA_FIELDS].map(renderField)}
          </TabsContent>
        ))}

        {hasCaf && (
          <TabsContent value="pronaf" className="space-y-3 mt-3" data-testid="tab-pronaf-content">
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Dados do CAF</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Grupo</p><p className="font-medium">{cafData.grupo || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Área</p><p className="font-medium">{cafData.areaHa ? `${cafData.areaHa} ha` : "—"}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Renda Bruta</p>
                  <p className="font-medium">{cafData.rendaBrutaAnual ? `R$ ${Number(cafData.rendaBrutaAnual).toLocaleString("pt-BR")}` : "—"}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Linhas PRONAF Elegíveis (Plano Safra 2024/2025)</p>
              {pronafLinhas.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma linha encontrada para o grupo {cafData.grupo}.</p>
              ) : (
                <div className="space-y-1.5">
                  {pronafLinhas.map((l: any) => (
                    <div
                      key={l.id}
                      className={cn(
                        "border rounded-lg p-2.5 cursor-pointer transition-colors",
                        pronafSelecionadas.includes(l.id) ? "border-green-400 bg-green-900/30" : "hover:bg-muted/30"
                      )}
                      onClick={() => togglePronafLinha(l.id)}
                      data-testid={`pronaf-linha-${l.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={pronafSelecionadas.includes(l.id)} className="pointer-events-none" />
                          <span className="text-sm font-medium">{l.nome}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{l.modalidade}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-1.5 text-xs text-muted-foreground ml-6">
                        <span>Taxa: <strong className="text-foreground">{l.taxa}% a.a.</strong></span>
                        <span>Limite: <strong className="text-foreground">R$ {Number(l.limite).toLocaleString("pt-BR")}</strong></span>
                        <span>Prazo: <strong className="text-foreground">{l.prazoMaximo}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pronafSelecionadas.length > 0 && (
                <p className="text-xs text-green-400 mt-2">{pronafSelecionadas.length} linha(s) selecionada(s) para o dossiê</p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} data-testid="button-defesa-salvar">
          <Check className="w-3.5 h-3.5 mr-1" />
          Salvar Defesa
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast({ title: "Em breve", description: "Geração de PDF do dossiê será implementada em breve." })}
          data-testid="button-defesa-gerar-pdf"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          Gerar PDF do Dossiê
        </Button>
      </div>
    </div>
  );
}

function PortalAccessSection({ operationId, companyTaxId, companyName }: { operationId: number; companyTaxId?: string; companyName?: string }) {
  const { toast } = useToast();
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taxIdInput, setTaxIdInput] = useState(companyTaxId || "");

  const { data: accessData } = useQuery({
    queryKey: ["/api/norion/operations", operationId, "acesso-cliente"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/operations/${operationId}/acesso-cliente`, { credentials: "include" });
      return res.json();
    },
  });

  useEffect(() => {
    if (accessData?.exists) {
      setPortalLink(window.location.origin + accessData.portalUrl);
    }
  }, [accessData]);

  const gerarAcesso = async () => {
    if (!taxIdInput) {
      toast({ title: "Informe o CPF/CNPJ do cliente", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/norion/operations/${operationId}/gerar-acesso-cliente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taxId: taxIdInput, name: companyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const link = window.location.origin + data.portalUrl;
      setPortalLink(link);
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations", operationId, "acesso-cliente"] });
      toast({ title: "Link do portal gerado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (portalLink) {
      navigator.clipboard.writeText(portalLink);
      toast({ title: "Link copiado!" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Portal do Cliente</span>
      </div>
      {portalLink ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input value={portalLink} readOnly className="text-xs font-mono" data-testid="input-portal-link" />
            <Button variant="outline" size="sm" onClick={copyLink} data-testid="button-copy-portal-link">
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPortalLink(null); }} data-testid="button-regenerate-portal">
            Regenerar link
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="CPF/CNPJ do cliente"
            value={taxIdInput}
            onChange={(e) => setTaxIdInput(e.target.value)}
            className="text-sm"
            data-testid="input-portal-taxid-admin"
          />
          <Button size="sm" onClick={gerarAcesso} disabled={loading} data-testid="button-gerar-portal">
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
            Gerar Link do Portal
          </Button>
        </div>
      )}
    </div>
  );
}

const FORM_FIELD_OPTIONS = [
  { key: "nomeCompleto", label: "Nome Completo", step: "pessoal" },
  { key: "cpf", label: "CPF", step: "pessoal" },
  { key: "rg", label: "RG", step: "pessoal" },
  { key: "dataNascimento", label: "Data de Nascimento", step: "pessoal" },
  { key: "estadoCivil", label: "Estado Civil", step: "pessoal" },
  { key: "email", label: "E-mail", step: "pessoal" },
  { key: "celular", label: "Celular", step: "pessoal" },
  { key: "cep", label: "CEP", step: "endereco" },
  { key: "logradouro", label: "Endereço", step: "endereco" },
  { key: "numero", label: "Número", step: "endereco" },
  { key: "complemento", label: "Complemento", step: "endereco" },
  { key: "bairro", label: "Bairro", step: "endereco" },
  { key: "cidade", label: "Cidade/UF", step: "endereco" },
  { key: "profissao", label: "Profissão", step: "profissional" },
  { key: "empresaTrabalho", label: "Empresa/Trabalho", step: "profissional" },
  { key: "cnpjEmpresa", label: "CNPJ da Empresa", step: "profissional" },
  { key: "rendaMensal", label: "Renda Mensal", step: "profissional" },
  { key: "tempoEmprego", label: "Tempo de Emprego", step: "profissional" },
  { key: "outrasRendas", label: "Outras Rendas", step: "profissional" },
  { key: "valorSolicitado", label: "Valor Solicitado", step: "credito" },
  { key: "finalidadeCredito", label: "Finalidade do Crédito", step: "credito" },
  { key: "prazoDesejado", label: "Prazo Desejado", step: "credito" },
  { key: "tipoGarantia", label: "Tipo de Garantia", step: "credito" },
  { key: "descricaoGarantia", label: "Descrição da Garantia", step: "credito" },
  { key: "valorGarantia", label: "Valor da Garantia", step: "credito" },
  { key: "possuiImovel", label: "Possui Imóvel", step: "patrimonio" },
  { key: "valorImovel", label: "Valor do Imóvel", step: "patrimonio" },
  { key: "possuiVeiculo", label: "Possui Veículo", step: "patrimonio" },
  { key: "valorVeiculo", label: "Valor do Veículo", step: "patrimonio" },
  { key: "outrosPatrimonios", label: "Outros Patrimônios", step: "patrimonio" },
];

function FormularioClienteSection({ operationId }: { operationId: number }) {
  const { toast } = useToast();
  const [observacao, setObservacao] = useState("");
  const [showRevisao, setShowRevisao] = useState(false);
  const [selectedCampos, setSelectedCampos] = useState<string[]>([]);

  const { data: formularios = [] } = useQuery({
    queryKey: ["/api/norion/formularios-pendentes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/norion/formularios-pendentes");
      return res.json();
    },
  });

  const formulario = (formularios as any[]).find((f: any) => {
    if (f.operationId === operationId) return true;
    if (f.clientUser?.operationId === operationId) return true;
    return false;
  });

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/norion/formulario/${formulario.id}/aprovar`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Formulário aprovado!" });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/formularios-pendentes"] });
    },
  });

  const revisarMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { observacao };
      if (selectedCampos.length > 0) payload.camposRevisao = selectedCampos;
      const res = await apiRequest("PATCH", `/api/norion/formulario/${formulario.id}/revisar`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Revisão solicitada" });
      setShowRevisao(false);
      setObservacao("");
      setSelectedCampos([]);
      queryClient.invalidateQueries({ queryKey: ["/api/norion/formularios-pendentes"] });
    },
  });

  if (!formulario) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Formulário do Cliente</span>
        </div>
        <p className="text-xs text-muted-foreground">Nenhum formulário enviado pelo cliente ainda.</p>
      </div>
    );
  }

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    rascunho: { label: "Rascunho", color: "bg-slate-800/40 text-slate-300" },
    enviado: { label: "Enviado", color: "bg-blue-900/30 text-blue-400" },
    em_revisao: { label: "Em Revisão", color: "bg-amber-900/30 text-amber-400" },
    aprovado: { label: "Aprovado", color: "bg-green-900/30 text-green-400" },
  };
  const st = STATUS_MAP[formulario.status] || STATUS_MAP.rascunho;

  const fields = [
    { label: "Nome", value: formulario.nomeCompleto },
    { label: "CPF", value: formulario.cpf },
    { label: "E-mail", value: formulario.email },
    { label: "Celular", value: formulario.celular },
    { label: "Cidade/UF", value: formulario.cidade && formulario.uf ? `${formulario.cidade}/${formulario.uf}` : null },
    { label: "Profissão", value: formulario.profissao },
    { label: "Renda Mensal", value: formulario.rendaMensal ? `R$ ${Number(formulario.rendaMensal).toLocaleString("pt-BR")}` : null },
    { label: "Valor Solicitado", value: formulario.valorSolicitado ? `R$ ${Number(formulario.valorSolicitado).toLocaleString("pt-BR")}` : null },
    { label: "Finalidade", value: formulario.finalidadeCredito },
    { label: "Prazo", value: formulario.prazoDesejado },
    { label: "Garantia", value: formulario.tipoGarantia },
  ];

  return (
    <div className="space-y-3" data-testid="formulario-cliente-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Formulário do Cliente</span>
        </div>
        <Badge className={cn("text-xs", st.color)}>{st.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {fields.filter(f => f.value).map((f) => (
          <div key={f.label}>
            <p className="text-muted-foreground">{f.label}</p>
            <p className="font-medium">{f.value}</p>
          </div>
        ))}
      </div>

      {formulario.documentos && formulario.documentos.length > 0 && (
        <div className="text-xs">
          <p className="text-muted-foreground mb-1">Documentos ({formulario.documentos.length})</p>
          <div className="space-y-1">
            {formulario.documentos.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-1.5 rounded border">
                <span className="truncate">{doc.nome || doc.tipoDocumento}</span>
                <div className="flex items-center gap-1">
                  <Badge variant={doc.status === "aprovado" ? "default" : doc.status === "rejeitado" ? "destructive" : "secondary"} className="text-[9px] h-4">{doc.status}</Badge>
                  {doc.driveFileUrl && (
                    <a href={doc.driveFileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formulario.status === "enviado" && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => aprovarMutation.mutate()} disabled={aprovarMutation.isPending} data-testid="button-aprovar-formulario">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar
          </Button>
          <Button size="sm" variant="outline" className="text-xs text-amber-400 border-amber-700" onClick={() => setShowRevisao(!showRevisao)} data-testid="button-pedir-revisao">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Pedir Revisão
          </Button>
        </div>
      )}

      {showRevisao && (
        <div className="space-y-3 p-3 border rounded-lg bg-amber-900/20">
          <Label className="text-xs font-medium">Campos que precisam de correção (opcional)</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {FORM_FIELD_OPTIONS.map((field) => (
              <label key={field.key} className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-amber-300">
                <Checkbox
                  checked={selectedCampos.includes(field.key)}
                  onCheckedChange={(checked) => {
                    setSelectedCampos(prev => checked ? [...prev, field.key] : prev.filter(k => k !== field.key));
                  }}
                  className="h-3.5 w-3.5"
                  data-testid={`checkbox-campo-${field.key}`}
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
          <Label className="text-xs font-medium">Motivo da revisão *</Label>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Descreva o que precisa ser corrigido..." rows={2} className="text-xs" data-testid="input-observacao-revisao" />
          <Button size="sm" className="text-xs" onClick={() => revisarMutation.mutate()} disabled={!observacao.trim() || revisarMutation.isPending} data-testid="button-enviar-revisao">
            Enviar Solicitação de Revisão
          </Button>
        </div>
      )}

      {formulario.observacaoRevisao && formulario.status === "em_revisao" && (
        <div className="p-2 bg-amber-900/20 rounded border border-amber-800 text-xs">
          <p className="font-medium text-amber-400">Revisão solicitada:</p>
          <p className="text-amber-400 mt-0.5">{formulario.observacaoRevisao}</p>
          {formulario.camposRevisao && (formulario.camposRevisao as string[]).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(formulario.camposRevisao as string[]).map((campo: string) => {
                const fieldDef = FORM_FIELD_OPTIONS.find(f => f.key === campo);
                return <Badge key={campo} variant="outline" className="text-[10px] border-amber-700 text-amber-400">{fieldDef?.label || campo}</Badge>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OperacaoDetalhePage({ id }: { id: string }) {
  const { toast } = useToast();
  const operationId = parseInt(id);

  const { data: operations = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/norion/operations"] });

  const op = operations.find((o: any) => o.id === operationId);

  const currentStageIdx = STAGES.findIndex(s => s.key === op?.stage);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/norion/operations/${operationId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erro" }));
        const error: any = new Error(err.message);
        error.pendingDocs = err.pendingDocs;
        throw error;
      }
      return res.json();
    },
    onMutate: async (data: any) => {
      const prev = queryClient.getQueryData<any[]>(["/api/norion/operations"]);
      queryClient.setQueryData(["/api/norion/operations"], (old: any[] | undefined) =>
        old?.map((o: any) => o.id === operationId ? { ...o, ...data } : o)
      );
      await queryClient.cancelQueries({ queryKey: ["/api/norion/operations"] });
      return { prev };
    },
    onError: (err: any, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["/api/norion/operations"], context.prev);
      const description = err.pendingDocs ? `Documentos pendentes: ${err.pendingDocs.join(", ")}` : err.message;
      toast({ title: "Documentos obrigatórios pendentes", description, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/operations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/dashboard"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!op) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Link href="/operacoes">
          <Button variant="ghost" size="sm" data-testid="button-voltar-operacoes">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Operação não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const diag = op.diagnostico || {};

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/operacoes">
          <Button variant="ghost" size="icon" data-testid="button-voltar-operacoes">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" data-testid="text-operacao-detalhe-title">
            {op.company?.legalName || "Operação"}
          </h1>
          <p className="text-sm text-muted-foreground">Detalhe da operação de crédito</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{STAGES.find(s => s.key === op.stage)?.label}</Badge>
            {op.comissaoRecebida && <Badge className="bg-green-600 text-white text-xs">Comissão Recebida</Badge>}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Valor Solicitado</p><p className="font-medium">{formatBRL(diag.valorSolicitado)}</p></div>
            <div>
              <p className="text-muted-foreground text-xs">Finalidade</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium">{diag.finalidade || "—"}</p>
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-modalidade">
                  <Package className="w-3 h-3 mr-0.5" />
                  {diag.modalidade ? diag.modalidade.charAt(0).toUpperCase() + diag.modalidade.slice(1) : "Completo"}
                </Badge>
              </div>
            </div>
            <div><p className="text-muted-foreground text-xs">Prazo</p><p className="font-medium">{diag.prazo || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Faturamento</p><p className="font-medium">{diag.faturamento || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Dívida Bancária</p><p className="font-medium">{diag.possuiDivida === true ? "Sim" : diag.possuiDivida === false ? "Não" : "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Garantias</p><p className="font-medium">{(diag.garantias || []).join(", ") || "—"}</p></div>
          </div>
          {op.observacoesInternas && (
            <div><p className="text-muted-foreground text-xs mb-1">Observações</p><p className="text-sm bg-muted/30 rounded p-2">{op.observacoesInternas}</p></div>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Valor Aprovado</p><p className="font-medium">{formatBRL(op.valorAprovado)}</p></div>
            <div><p className="text-muted-foreground text-xs">% Comissão</p><p className="font-medium">{op.percentualComissao || 0}%</p></div>
            <div><p className="text-muted-foreground text-xs">Valor Comissão</p><p className="font-medium">{formatBRL(op.valorComissao)}</p></div>
            <div><p className="text-muted-foreground text-xs">Criado em</p><p className="font-medium">{formatDate(op.createdAt)}</p></div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Valor Aprovado (R$)</Label>
            <Input type="number" placeholder="0" defaultValue={op.valorAprovado || ""} data-testid="input-n-valor-aprovado"
              onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== op.valorAprovado) updateMutation.mutate({ valorAprovado: v }); }} />
            <Label className="text-xs text-muted-foreground">% Comissão</Label>
            <Input type="number" placeholder="0" defaultValue={op.percentualComissao || ""} data-testid="input-n-percentual-comissao"
              onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== op.percentualComissao) updateMutation.mutate({ percentualComissao: v, valorAprovado: op.valorAprovado }); }} />
          </div>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Checklist Documental</span>
            </div>
            <DocumentChecklist operationId={op.id} finalidade={diag.finalidade} />
          </div>
          <Separator />
          <EnviosFundosSection operationId={op.id} />
          <Separator />
          <DefesaCreditoSection
            operationId={op.id}
            diagnostico={diag}
            company={op.company}
            onSave={(defesaData) => {
              updateMutation.mutate({ diagnostico: { ...diag, ...defesaData } });
            }}
          />
          <Separator />
          <PortalAccessSection operationId={op.id} companyTaxId={op.company?.cnpj} companyName={op.company?.legalName} />
          <Separator />
          <FormularioClienteSection operationId={op.id} />
          <Separator />
          <div className="flex flex-col gap-2 pt-2">
            {currentStageIdx < STAGES.length - 1 && (
              <Button onClick={() => updateMutation.mutate({ stage: STAGES[currentStageIdx + 1].key })} disabled={updateMutation.isPending} data-testid="button-n-next-stage">
                <ArrowRight className="w-4 h-4 mr-1.5" />
                Mover para: {STAGES[currentStageIdx + 1]?.label}
              </Button>
            )}
            {["aprovado", "comissao_gerada"].includes(op.stage) && !op.comissaoRecebida && (
              <Button variant="outline" className="text-green-400 border-green-700" onClick={() => updateMutation.mutate({ comissaoRecebida: true })} disabled={updateMutation.isPending} data-testid="button-n-mark-commission">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Marcar Comissão Recebida
              </Button>
            )}
          </div>
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Mover para etapa específica</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {STAGES.map((s) => (
                <Button key={s.key} variant={op.stage === s.key ? "default" : "outline"} size="sm" className="text-xs h-7"
                  disabled={op.stage === s.key || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ stage: s.key })} data-testid={`button-n-stage-${s.key}`}
                >{s.label}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
