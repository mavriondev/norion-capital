import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, BarChart3,
  DollarSign, Clock, Percent, MapPin, Building2, Wheat, FileText, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";

function formatBRL(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function CriterioItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function BooleanItem({ label, value }: { label: string; value: boolean | undefined }) {
  if (value === undefined) return null;
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ChipList({ items }: { items: string[] | null | undefined }) {
  if (!items || items.length === 0) return <span className="text-sm text-muted-foreground">Não especificado</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
      ))}
    </div>
  );
}

export default function FundoDetalhePage({ id }: { id: string }) {
  const { toast } = useToast();
  const fundoId = parseInt(id, 10);

  const { data: historico, isLoading } = useQuery<any>({
    queryKey: ["/api/norion/fundos-parceiros", fundoId, "historico"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/fundos-parceiros/${fundoId}/historico`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !isNaN(fundoId),
  });

  const toggleMutation = useMutation({
    mutationFn: async (ativo: boolean) => {
      const res = await apiRequest("PATCH", `/api/norion/fundos-parceiros/${fundoId}`, { ativo });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/fundos-parceiros"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/fundos-parceiros", fundoId, "historico"] });
      toast({ title: "Status atualizado" });
    },
  });

  const fundo = historico?.fundo;
  const metricas = historico?.metricas;
  const envios = historico?.envios || [];
  const criterios = fundo?.criteriosAnalise || {};
  const condicoes = fundo?.condicoesComerciais || {};

  const hasCriterios = fundo && Object.keys(criterios).length > 0;
  const hasCondicoes = fundo && Object.keys(condicoes).length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/fundos-parceiros">
          <Button variant="ghost" size="icon" data-testid="button-fundo-detalhe-voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-fundo-detalhe-title">
            {fundo?.nome || "Fundo Parceiro"}
          </h1>
          <p className="text-sm text-muted-foreground">Detalhes e histórico do fundo</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : fundo && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {fundo.categoria && <Badge variant="outline" className="text-xs">{fundo.categoria}</Badge>}
              <Badge variant={fundo.ativo !== false ? "default" : "secondary"} className="text-xs">
                {fundo.ativo !== false ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ativo</span>
              <Switch checked={fundo.ativo !== false} onCheckedChange={(v) => toggleMutation.mutate(v)} data-testid="switch-fp-ativo" />
            </div>
          </div>

          {fundo.cnpj && <p className="text-sm font-mono text-muted-foreground">{fundo.cnpj}</p>}

          {metricas && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <Card><CardContent className="p-3 text-center">
                <BarChart3 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold">{metricas.totalEnvios}</p>
                <p className="text-[10px] text-muted-foreground">Total Envios</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <Percent className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold">{metricas.taxaAprovacao}%</p>
                <p className="text-[10px] text-muted-foreground">Taxa Aprovação</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <p className="text-lg font-bold">{formatBRL(metricas.volumeAprovado)}</p>
                <p className="text-[10px] text-muted-foreground">Volume Aprovado</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold">{metricas.aprovados}</p>
                <p className="text-[10px] text-muted-foreground">Aprovados</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <XCircle className="w-4 h-4 mx-auto mb-1 text-red-600" />
                <p className="text-lg font-bold">{metricas.recusados}</p>
                <p className="text-[10px] text-muted-foreground">Recusados</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <p className="text-lg font-bold">{metricas.tempoMedioResposta != null ? `${metricas.tempoMedioResposta}d` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
              </CardContent></Card>
            </div>
          )}

          <Separator />

          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Critérios Básicos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Tipos</p><p>{(fundo.tipoOperacao || []).join(", ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Garantias</p><p>{(fundo.garantiasAceitas || []).join(", ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Mín</p><p>{formatBRL(fundo.valorMinimo)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Máx</p><p>{formatBRL(fundo.valorMaximo)}</p></div>
                <div><p className="text-xs text-muted-foreground">Prazo Mín</p><p>{fundo.prazoMinimo || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Prazo Máx</p><p>{fundo.prazoMaximo || "—"}</p></div>
              </div>
            </CardContent>
          </Card>

          {hasCriterios && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Requisitos Financeiros
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <CriterioItem label="Faturamento Mínimo" value={criterios.faturamentoMinimo ? formatBRL(criterios.faturamentoMinimo) : undefined} />
                    <CriterioItem label="Capital Social Mínimo" value={criterios.capitalSocialMinimo ? formatBRL(criterios.capitalSocialMinimo) : undefined} />
                    <CriterioItem label="Tempo de Empresa Mínimo" value={criterios.tempoEmpresaMinimo ? `${criterios.tempoEmpresaMinimo} anos` : undefined} />
                    <CriterioItem label="LTV Máximo" value={criterios.ltvMaximo ? `${criterios.ltvMaximo}%` : undefined} />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <BooleanItem label="Exige CNPJ Ativo" value={criterios.exigeCnpjAtivo} />
                    <BooleanItem label="Exige Garantia Real" value={criterios.exigeGarantiaReal} />
                  </div>
                </CardContent>
              </Card>

              {(criterios.ufsAceitas?.length || criterios.ufsVetadas?.length || criterios.porteAceito?.length || criterios.cnaesAceitos?.length || criterios.cnaesVetados?.length) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Restrições Geográficas / Setoriais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    {criterios.ufsAceitas?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">UFs Aceitas</p>
                        <ChipList items={criterios.ufsAceitas} />
                      </div>
                    )}
                    {criterios.ufsVetadas?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">UFs Vetadas</p>
                        <ChipList items={criterios.ufsVetadas} />
                      </div>
                    )}
                    {criterios.porteAceito?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Portes Aceitos</p>
                        <ChipList items={criterios.porteAceito} />
                      </div>
                    )}
                    {criterios.cnaesAceitos?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">CNAEs Aceitos</p>
                        <ChipList items={criterios.cnaesAceitos} />
                      </div>
                    )}
                    {criterios.cnaesVetados?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">CNAEs Vetados</p>
                        <ChipList items={criterios.cnaesVetados} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(criterios.exigeCaf || criterios.areaRuralMinima || criterios.enquadramentoPronaf?.length) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wheat className="w-4 h-4" />
                      Requisitos Agro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <BooleanItem label="Exige CAF/DAP Ativo" value={criterios.exigeCaf} />
                    <CriterioItem label="Área Rural Mínima" value={criterios.areaRuralMinima ? `${criterios.areaRuralMinima} ha` : undefined} />
                    {criterios.enquadramentoPronaf?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Enquadramento PRONAF</p>
                        <ChipList items={criterios.enquadramentoPronaf} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {criterios.documentosExigidos?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documentos Exigidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex flex-wrap gap-1">
                      {criterios.documentosExigidos.map((doc: string) => (
                        <Badge key={doc} variant="outline" className="text-xs">{doc}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {hasCondicoes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Condições Comerciais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <CriterioItem label="Taxa de Juros Mín" value={condicoes.taxaJurosMin != null ? `${condicoes.taxaJurosMin}% a.a.` : undefined} />
                  <CriterioItem label="Taxa de Juros Máx" value={condicoes.taxaJurosMax != null ? `${condicoes.taxaJurosMax}% a.a.` : undefined} />
                  <CriterioItem label="Prazo de Resposta" value={condicoes.prazoRespostaDias != null ? `${condicoes.prazoRespostaDias} dias` : undefined} />
                  <CriterioItem label="Comissão Norion" value={condicoes.comissaoPercentual != null ? `${condicoes.comissaoPercentual}%` : undefined} />
                </div>
                {condicoes.notasInternas && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notas Internas</p>
                    <p className="text-sm">{condicoes.notasInternas}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(fundo.contatoNome || fundo.contatoEmail || fundo.contatoTelefone) && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Contato</p>
                <div className="text-sm space-y-1">
                  {fundo.contatoNome && <p>{fundo.contatoNome}</p>}
                  {fundo.contatoEmail && <p className="text-muted-foreground">{fundo.contatoEmail}</p>}
                  {fundo.contatoTelefone && <p className="text-muted-foreground">{fundo.contatoTelefone}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {envios.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">Histórico de Envios</p>
                <div className="space-y-2">
                  {envios.map((e: any) => (
                    <div key={e.id} className="border rounded-md p-3 text-sm flex items-center justify-between gap-3" data-testid={`fp-envio-${e.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.company?.legalName || e.company?.tradeName || "Operação"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.dataEnvio)}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs shrink-0",
                        e.status === "aprovado" ? "border-green-400 text-green-600" :
                        e.status === "recusado" ? "border-red-400 text-red-600" :
                        "border-blue-400 text-blue-600"
                      )}>
                        {e.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
