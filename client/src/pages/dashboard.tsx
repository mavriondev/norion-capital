import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown, Percent, BarChart3,
  BadgeDollarSign, Search, FileSearch, Send, Clock,
  CheckCircle2, Loader2, Building2, ArrowUpRight,
  CloudRain, Sun, CloudSun, Cloud, CloudSnow, CloudFog,
  CloudLightning, Droplets, Wind, Thermometer, Wheat,
  RefreshCw, MapPin, Eye, AlertTriangle, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const STAGES = [
  { key: "identificado", label: "Identificado", icon: Search, color: "bg-slate-800/40 border-slate-600" },
  { key: "diagnostico", label: "Diagnóstico", icon: FileSearch, color: "bg-blue-900/30 border-blue-700" },
  { key: "enviado_fundos", label: "Enviado aos Fundos", icon: Send, color: "bg-indigo-900/30 border-indigo-700" },
  { key: "em_analise", label: "Em Análise", icon: Clock, color: "bg-amber-900/30 border-amber-700" },
  { key: "aprovado", label: "Aprovado", icon: CheckCircle2, color: "bg-green-900/30 border-green-700" },
  { key: "comissao_gerada", label: "Comissão Gerada", icon: BadgeDollarSign, color: "bg-emerald-900/30 border-emerald-700" },
];

const STAGE_LABELS: Record<string, string> = {
  identificado: "Identificado",
  diagnostico: "Diagnóstico",
  enviado_fundos: "Enviado",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  comissao_gerada: "Comissão",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  identificado: "bg-slate-800/40 text-slate-300",
  diagnostico: "bg-blue-900/30 text-blue-300",
  enviado_fundos: "bg-indigo-900/30 text-indigo-300",
  em_analise: "bg-amber-900/30 text-amber-300",
  aprovado: "bg-green-900/30 text-green-300",
  comissao_gerada: "bg-emerald-900/30 text-emerald-300",
};

function formatBRL(value: number | null | undefined) {
  if (value == null || value === 0) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatBRLDecimal(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(value);
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0 || code === 1) return <Sun className={cn("text-amber-500", className)} />;
  if (code === 2) return <CloudSun className={cn("text-amber-400", className)} />;
  if (code === 3) return <Cloud className={cn("text-slate-400", className)} />;
  if (code >= 45 && code <= 48) return <CloudFog className={cn("text-slate-400", className)} />;
  if (code >= 51 && code <= 67) return <CloudRain className={cn("text-blue-400", className)} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={cn("text-blue-300", className)} />;
  if (code >= 80 && code <= 82) return <CloudRain className={cn("text-blue-500", className)} />;
  if (code >= 95) return <CloudLightning className={cn("text-purple-400", className)} />;
  return <Cloud className={cn("text-slate-400", className)} />;
}

function weatherDescription(code: number): string {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Poucas nuvens";
  if (code === 2) return "Parc. nublado";
  if (code === 3) return "Nublado";
  if (code >= 45 && code <= 48) return "Neblina";
  if (code >= 51 && code <= 55) return "Garoa";
  if (code >= 56 && code <= 57) return "Garoa gelada";
  if (code >= 61 && code <= 65) return "Chuva";
  if (code >= 66 && code <= 67) return "Chuva gelada";
  if (code >= 71 && code <= 75) return "Neve";
  if (code >= 80 && code <= 82) return "Pancadas";
  if (code >= 95) return "Tempestade";
  return "—";
}

function KpiCard({ icon: Icon, label, value, subtitle, color, testId }: {
  icon: any; label: string; value: string; subtitle?: string; color: string; testId: string;
}) {
  return (
    <Card data-testid={testId} className="relative overflow-hidden">
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

function CotacaoCard({ name, value, pctChange, unit }: { name: string; value: number; pctChange: number; unit?: string }) {
  const isUp = pctChange >= 0;
  return (
    <div className="flex items-center justify-between py-2.5 px-1">
      <div>
        <p className="text-sm font-medium">{name}</p>
        {unit && <p className="text-[10px] text-muted-foreground">{unit}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">{formatBRLDecimal(value)}</p>
        <div className={cn("flex items-center gap-0.5 text-[11px] font-medium justify-end", isUp ? "text-green-400" : "text-red-400")}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {formatPct(pctChange)}
        </div>
      </div>
    </div>
  );
}

export default function NorionDashboardPage() {
  const { data: dashboard, isLoading } = useQuery<any>({ queryKey: ["/api/norion/dashboard"] });
  const { data: cotacoes, isLoading: cotacoesLoading, refetch: refetchCotacoes } = useQuery<any>({
    queryKey: ["/api/norion/cotacoes"],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  const { data: clima, isLoading: climaLoading } = useQuery<any>({
    queryKey: ["/api/norion/clima"],
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );

  const d = dashboard || {};
  const currencies = cotacoes?.currencies || {};
  const commodities = cotacoes?.commodities || {};
  const indicators = cotacoes?.indicators || {};
  const climateCities = clima?.cities || [];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-norion-dashboard-title">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral — Norion Capital</p>
          </div>
        </div>
      </div>

      {((d.formulariosAguardando || 0) + (d.formulariosEmRevisao || 0)) > 0 && (
        <Link href="/portal-clientes">
          <Card className="border-amber-700 bg-amber-900/30 cursor-pointer hover:bg-amber-900/40 transition-colors" data-testid="card-formularios-pendentes">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {d.formulariosAguardando > 0 && <span>{d.formulariosAguardando} formulário{d.formulariosAguardando > 1 ? "s" : ""} aguardando revisão</span>}
                  {d.formulariosAguardando > 0 && d.formulariosEmRevisao > 0 && <span> · </span>}
                  {d.formulariosEmRevisao > 0 && <span>{d.formulariosEmRevisao} em revisão pelo cliente</span>}
                </p>
                <p className="text-xs text-muted-foreground">Clique para ver no painel do portal</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={BarChart3} label="Operações" value={String(d.totalOperacoes || 0)} subtitle={`${d.totalEmpresas || 0} empresas`} color="bg-blue-600" testId="card-n-total-operacoes" />
        <KpiCard icon={DollarSign} label="Volume Solicitado" value={formatBRL(d.volumeSolicitado)} subtitle={`${formatBRL(d.volumeAprovado)} aprovado`} color="bg-green-600" testId="card-n-volume-aprovado" />
        <KpiCard icon={TrendingUp} label="Comissão Gerada" value={formatBRL(d.comissaoTotal)} subtitle={`${formatBRL(d.comissaoAPagar)} a receber`} color="bg-emerald-600" testId="card-n-comissao-total" />
        <KpiCard icon={Percent} label="Taxa de Aprovação" value={`${d.taxaAprovacao || 0}%`} color="bg-purple-600" testId="card-n-taxa-aprovacao" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Pipeline de Operações</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAGES.map((s) => {
              const count = d.porEtapa?.[s.key] || 0;
              const Icon = s.icon;
              return (
                <div key={s.key} className={cn("rounded-lg border p-3 text-center", s.color)} data-testid={`n-stage-count-${s.key}`}>
                  <Icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Operações Recentes</CardTitle>
              <Link href="/operacoes">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="link-ver-operacoes">
                  Ver todas <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(d.recentOps || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma operação registrada</p>
            ) : (
              <div className="space-y-2">
                {(d.recentOps || []).map((op: any) => (
                  <Link key={op.id} href={`/operacoes/${op.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`recent-op-${op.id}`}>
                      <div className="w-8 h-8 rounded-lg bg-slate-800/40 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{op.companyName}</p>
                        <p className="text-xs text-muted-foreground">{formatBRL(op.valorSolicitado)} solicitado</p>
                      </div>
                      <Badge className={cn("text-[10px] shrink-0", STAGE_BADGE_COLORS[op.stage] || "")}>
                        {STAGE_LABELS[op.stage] || op.stage}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Perfil das Empresas</CardTitle>
              <Link href="/empresas">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="link-ver-empresas">
                  Ver <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: "alto", label: "Alto", color: "bg-green-500", bgColor: "bg-green-900/30" },
                { key: "medio", label: "Médio", color: "bg-amber-500", bgColor: "bg-amber-900/30" },
                { key: "baixo", label: "Baixo", color: "bg-slate-400", bgColor: "bg-slate-800/40" },
              ].map(p => {
                const count = d.profileDist?.[p.key] || 0;
                const total = d.totalEmpresas || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={p.key} data-testid={`profile-${p.key}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className={cn("h-2 rounded-full overflow-hidden", p.bgColor)}>
                      <div className={cn("h-full rounded-full transition-all", p.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-1 text-center">
                <p className="text-xs text-muted-foreground">{d.totalEmpresas || 0} empresas cadastradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Cotações
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => refetchCotacoes()} data-testid="button-refresh-cotacoes">
                <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cotacoesLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <Tabs defaultValue="moedas">
                <TabsList className="w-full mb-3">
                  <TabsTrigger value="moedas" className="flex-1" data-testid="tab-moedas">Moedas</TabsTrigger>
                  <TabsTrigger value="indicadores" className="flex-1" data-testid="tab-indicadores">Indicadores</TabsTrigger>
                  <TabsTrigger value="commodities" className="flex-1" data-testid="tab-commodities">Agro</TabsTrigger>
                </TabsList>
                <TabsContent value="moedas">
                  {Object.keys(currencies).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Cotações indisponíveis</p>
                  ) : (
                    <div className="divide-y">
                      {Object.values(currencies).map((c: any) => (
                        <CotacaoCard key={c.name} name={c.name} value={c.bid} pctChange={c.pctChange} />
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="indicadores">
                  {Object.keys(indicators).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Indicadores indisponíveis</p>
                  ) : (
                    <div className="divide-y">
                      {Object.values(indicators).map((ind: any) => (
                        <div key={ind.name} className="flex items-center justify-between py-2.5 px-1">
                          <div>
                            <p className="text-sm font-medium">{ind.name}</p>
                            {ind.date && <p className="text-[10px] text-muted-foreground">{ind.date}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{typeof ind.value === "number" ? ind.value.toFixed(2) : ind.value}{ind.unit ? ` ${ind.unit}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="commodities">
                  {Object.keys(commodities).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Cotações agro indisponíveis no momento</p>
                  ) : (
                    <div className="divide-y">
                      {Object.values(commodities).map((c: any) => (
                        <CotacaoCard key={c.name} name={c.name} value={c.bid} pctChange={c.pctChange} unit={c.unit} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            {cotacoes?.fetchedAt && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Atualizado: {new Date(cotacoes.fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wheat className="w-4 h-4 text-amber-500" />
              Clima — Regiões Agrícolas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {climaLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : climateCities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Dados climáticos indisponíveis</p>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-2">
                  {climateCities.map((city: any) => (
                    <div key={city.name} className="flex items-center gap-3 p-2.5 rounded-lg border" data-testid={`clima-${city.name.replace(/\s/g, "-").toLowerCase()}`}>
                      {city.current ? (
                        <>
                          <WeatherIcon code={city.current.weatherCode} className="w-7 h-7 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{city.name}</span>
                              <span className="text-[10px] text-muted-foreground">/{city.state}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{weatherDescription(city.current.weatherCode)}</span>
                              <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" />{city.current.humidity}%</span>
                              <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" />{Math.round(city.current.windSpeed)} km/h</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold">{Math.round(city.current.temperature)}°</p>
                            {city.forecast?.[0] && (
                              <p className="text-[10px] text-muted-foreground">
                                {Math.round(city.forecast[0].tempMin)}° / {Math.round(city.forecast[0].tempMax)}°
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">{city.name} — sem dados</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {clima?.fetchedAt && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Atualizado: {new Date(clima.fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
