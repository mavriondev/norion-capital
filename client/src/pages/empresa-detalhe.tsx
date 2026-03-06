import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Building2, Loader2, ArrowLeft, Phone, Mail, MapPin, Globe, CreditCard, Leaf, Users, ExternalLink, Check, Edit2, Save, Tractor, RefreshCw, BarChart3, FileText, Database, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ProfileBadge({ profile }: { profile: string | null | undefined }) {
  const p = (profile || "baixo").toLowerCase();
  const colors: Record<string, string> = {
    alto: "bg-green-900/30 text-green-400 border-green-700",
    medio: "bg-amber-900/30 text-amber-400 border-amber-700",
    baixo: "bg-slate-800/40 text-slate-400 border-slate-600",
  };
  return <Badge variant="outline" className={cn("text-xs", colors[p] || colors.baixo)}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  const s = score || 0;
  const color = s > 65 ? "text-green-400 bg-green-900/30 border-green-700" : s >= 35 ? "text-amber-400 bg-amber-900/30 border-amber-700" : "text-red-400 bg-red-900/30 border-red-700";
  return <Badge variant="outline" className={cn("text-xs font-bold", color)}>{s}/100</Badge>;
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatBRL(value: number | null | undefined) {
  if (value === null || value === undefined) return "\u2014";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatAddr(addr: any) {
  if (!addr) return "\u2014";
  return [addr.logradouro || addr.street, addr.numero || addr.number, addr.bairro || addr.district, addr.municipio || addr.city, addr.uf || addr.state].filter(Boolean).join(", ") || JSON.stringify(addr);
}

function SourceTimestamp({ sources, type }: { sources: any[]; type: string }) {
  const src = sources.find(s => s.dataType === type);
  if (!src) return <span className="text-xs text-muted-foreground">Nunca consultado</span>;
  return <span className="text-xs text-muted-foreground">Atualizado em {formatDate(src.updatedAt || src.createdAt)}</span>;
}

function RefreshButton({ companyId, source, label }: { companyId: number; source: string; label: string }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/norion/companies/${companyId}/enrich/${source}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/companies", companyId, "data-sources"] });
      toast({ title: "Dados atualizados", description: `${label} atualizado com sucesso.` });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
  return (
    <Button variant="outline" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid={`button-refresh-${source}`}>
      {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
      Atualizar
    </Button>
  );
}

function ScoreBar({ score, breakdown }: { score: number; breakdown?: any[] }) {
  const color = score > 65 ? "bg-green-500" : score >= 35 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-3" data-testid="score-section">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Score de Perfil</span>
            <ScoreBadge score={score} />
          </div>
          <div className="w-full bg-slate-800/40 rounded-full h-3 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(score, 100)}%` }} data-testid="score-bar" />
          </div>
        </div>
      </div>
      {breakdown && breakdown.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Composição do Score</p>
          <div className="grid grid-cols-1 gap-1">
            {breakdown.map((b: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs px-2 py-1 bg-slate-800/40 rounded">
                <span>{b.factor}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{b.detail}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1", b.points > 0 ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30")}>
                    {b.points > 0 ? "+" : ""}{b.points}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabVisaoGeral({ company, sources }: { company: any; sources: any[] }) {
  const { toast } = useToast();
  const enrichment = company.enrichmentData as any || {};
  const breakdown = enrichment?.breakdown || [];
  const cnpjData = enrichment?.cnpj || {};

  const enrichAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/norion/companies/${company.id}/enrich`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/companies", company.id, "data-sources"] });
      toast({ title: "Enriquecimento concluído", description: `${data.sources?.length || 0} fonte(s) consultada(s).` });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4" data-testid="tab-visao-geral">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Visão Geral</h3>
        <Button variant="default" size="sm" onClick={() => enrichAllMutation.mutate()} disabled={enrichAllMutation.isPending} data-testid="button-enrich-all">
          {enrichAllMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Database className="w-3 h-3 mr-1" />}
          Enriquecer Tudo
        </Button>
      </div>

      <ScoreBar score={company.profileScore || 0} breakdown={breakdown} />

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        {company.tradeName && (
          <div><p className="text-xs text-muted-foreground">Nome Fantasia</p><p className="text-sm font-medium" data-testid="text-detalhe-trade-name">{company.tradeName}</p></div>
        )}
        {company.cnpj && (
          <div><p className="text-xs text-muted-foreground">CNPJ</p><p className="text-sm" data-testid="text-detalhe-cnpj">{formatCnpj(company.cnpj)}</p></div>
        )}
        {company.cnaePrincipal && (
          <div><p className="text-xs text-muted-foreground">CNAE Principal</p><p className="text-sm" data-testid="text-detalhe-cnae">{company.cnaePrincipal}</p></div>
        )}
        {company.porte && (
          <div><p className="text-xs text-muted-foreground">Porte</p><p className="text-sm" data-testid="text-detalhe-porte">{company.porte}</p></div>
        )}
        {cnpjData.situacaoCadastral && (
          <div>
            <p className="text-xs text-muted-foreground">Situação Cadastral</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {cnpjData.situacaoCadastral.toUpperCase().includes("ATIVA") ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
              <p className="text-sm" data-testid="text-situacao">{cnpjData.situacaoCadastral}</p>
            </div>
          </div>
        )}
        {cnpjData.capitalSocial != null && (
          <div><p className="text-xs text-muted-foreground">Capital Social</p><p className="text-sm" data-testid="text-capital">{formatBRL(cnpjData.capitalSocial)}</p></div>
        )}
        {cnpjData.naturezaJuridica && (
          <div><p className="text-xs text-muted-foreground">Natureza Jurídica</p><p className="text-sm">{cnpjData.naturezaJuridica}</p></div>
        )}
        {cnpjData.dataAbertura && (
          <div><p className="text-xs text-muted-foreground">Data de Abertura</p><p className="text-sm">{formatDate(cnpjData.dataAbertura)}</p></div>
        )}
        {cnpjData.simplesNacional != null && (
          <div><p className="text-xs text-muted-foreground">Simples Nacional</p><p className="text-sm">{cnpjData.simplesNacional ? "Sim" : "Não"}</p></div>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        {company.emails && (company.emails as any[]).length > 0 && (
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email(s)</p>
              {(company.emails as string[]).map((e, i) => <p key={i} className="text-sm" data-testid={`text-detalhe-email-${i}`}>{e}</p>)}
            </div>
          </div>
        )}
        {company.phones && (company.phones as any[]).length > 0 && (
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone(s)</p>
              {(company.phones as string[]).map((p, i) => <p key={i} className="text-sm" data-testid={`text-detalhe-phone-${i}`}>{typeof p === "object" ? (p as any).number || JSON.stringify(p) : p}</p>)}
            </div>
          </div>
        )}
        {company.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Website</p><p className="text-sm" data-testid="text-detalhe-website">{company.website}</p></div>
          </div>
        )}
        {company.address && typeof company.address === "object" && Object.keys(company.address).length > 0 && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div><p className="text-xs text-muted-foreground">Endereço</p><p className="text-sm" data-testid="text-detalhe-address">{formatAddr(company.address)}</p></div>
          </div>
        )}
      </div>

      {company.notes && (
        <div><p className="text-xs text-muted-foreground">Notas</p><p className="text-sm" data-testid="text-detalhe-notes">{company.notes}</p></div>
      )}

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Fontes de Dados</p>
        <div className="grid grid-cols-2 gap-2">
          {["brasilapi", "dap_caf", "sicor", "ibge"].map(src => {
            const found = sources.find(s => s.dataType === src);
            const labels: Record<string, string> = { brasilapi: "Receita Federal", dap_caf: "DAP/CAF", sicor: "SICOR/BCB", ibge: "IBGE" };
            return (
              <div key={src} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-slate-800/40 rounded">
                {found ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="flex-1">{labels[src] || src}</span>
                {found && <span className="text-muted-foreground">{formatDate(found.updatedAt || found.createdAt)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabQSA({ company, sources }: { company: any; sources: any[] }) {
  const { toast } = useToast();
  const enrichment = company.enrichmentData as any || {};
  const qsa = enrichment?.qsa || [];
  const socios = enrichment?.socios || [];
  const allSocios = qsa.length > 0 ? qsa : socios;
  const sociosContato = enrichment?.sociosContato || {};

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ cpf: "", telefone: "", email: "" });

  function socioKey(s: any, idx: number) {
    return (s.nome || s.name || "").trim().toLowerCase().replace(/\s+/g, "_") || `socio_${idx}`;
  }

  const saveMutation = useMutation({
    mutationFn: async (data: { sociosContato: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/norion/companies/${company.id}/socios-contato`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      toast({ title: "Contato salvo" });
      setEditingKey(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  function startEdit(key: string) {
    const existing = sociosContato[key] || {};
    setContactForm({ cpf: existing.cpf || "", telefone: existing.telefone || "", email: existing.email || "" });
    setEditingKey(key);
  }

  function saveContact(key: string) {
    const updated = { ...sociosContato, [key]: { ...contactForm, verificado: true, verificadoEm: new Date().toISOString() } };
    saveMutation.mutate({ sociosContato: updated });
  }

  return (
    <div className="space-y-3" data-testid="tab-qsa">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold">Quadro Societário (QSA)</span>
          <Badge variant="outline" className="text-xs">{allSocios.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <SourceTimestamp sources={sources} type="brasilapi" />
          <RefreshButton companyId={company.id} source="brasilapi" label="QSA" />
        </div>
      </div>

      {allSocios.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum sócio encontrado. Clique em "Atualizar" para consultar a Receita Federal.</p>
      ) : (
        <div className="space-y-2">
          {allSocios.map((s: any, idx: number) => {
            const key = socioKey(s, idx);
            const contato = sociosContato[key];
            const isEditing = editingKey === key;
            const nome = s.nome || s.name || "\u2014";
            const qualificacao = s.qualificacao || s.role || "Sócio";
            const dataEntrada = s.dataEntrada || s.since;

            return (
              <div key={key} className="border rounded-md p-3 space-y-2" data-testid={`socio-card-${idx}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{nome}</p>
                    <p className="text-xs text-muted-foreground">{qualificacao}{dataEntrada ? ` \u00b7 desde ${formatDate(dataEntrada)}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.temDAP && (
                      <Badge variant="outline" className="text-xs bg-green-900/30 text-green-400 border-green-700">
                        <Leaf className="w-3 h-3 mr-0.5" /> DAP
                      </Badge>
                    )}
                    {contato?.verificado ? (
                      <Badge variant="outline" className="text-xs bg-green-900/30 text-green-400 border-green-700">
                        <Check className="w-3 h-3 mr-0.5" /> Verificado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-slate-800/40 text-slate-400">Pendente</Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => isEditing ? setEditingKey(null) : startEdit(key)} data-testid={`button-edit-socio-${idx}`}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {s.cpfCnpj && !isEditing && (
                  <p className="text-xs text-muted-foreground">CPF/CNPJ: {s.cpfCnpj}</p>
                )}

                {contato && !isEditing && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {contato.cpf && <div><span className="text-muted-foreground">CPF:</span> {contato.cpf}</div>}
                    {contato.telefone && <div><span className="text-muted-foreground">Tel:</span> {contato.telefone}</div>}
                    {contato.email && <div><span className="text-muted-foreground">Email:</span> {contato.email}</div>}
                  </div>
                )}

                {isEditing && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">CPF</Label>
                      <Input className="text-xs" placeholder="000.000.000-00" value={contactForm.cpf} onChange={(e) => setContactForm(p => ({ ...p, cpf: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input className="text-xs" placeholder="(00) 00000-0000" value={contactForm.telefone} onChange={(e) => setContactForm(p => ({ ...p, telefone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input className="text-xs" type="email" value={contactForm.email} onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <Button size="sm" onClick={() => saveContact(key)} disabled={saveMutation.isPending}>
                        <Save className="w-3 h-3 mr-1" /> Salvar Contato
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabCAF({ company, sources }: { company: any; sources: any[] }) {
  const { toast } = useToast();
  const caf = (company.enrichmentData as any)?.caf || {};
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    numeroCAF: caf.numeroCAF || "",
    grupo: caf.grupo || "",
    validade: caf.validade || "",
    areaHa: caf.areaHa || "",
    atividadesProdutivas: caf.atividadesProdutivas || "",
    rendaBrutaAnual: caf.rendaBrutaAnual || "",
  });

  useEffect(() => {
    const c = (company.enrichmentData as any)?.caf || {};
    setFormData({
      numeroCAF: c.numeroCAF || "", grupo: c.grupo || "", validade: c.validade || "",
      areaHa: c.areaHa || "", atividadesProdutivas: c.atividadesProdutivas || "", rendaBrutaAnual: c.rendaBrutaAnual || "",
    });
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...formData, areaHa: formData.areaHa ? Number(formData.areaHa) : null, rendaBrutaAnual: formData.rendaBrutaAnual ? Number(formData.rendaBrutaAnual) : null };
      const res = await apiRequest("PATCH", `/api/norion/companies/${company.id}/caf`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      toast({ title: "CAF salvo" });
      setEditing(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3" data-testid="tab-caf">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold">CAF - Agricultura Familiar</span>
        </div>
        <div className="flex items-center gap-2">
          <SourceTimestamp sources={sources} type="dap_caf" />
          <RefreshButton companyId={company.id} source="dap_caf" label="CAF/DAP" />
          <Button variant="ghost" size="sm" onClick={() => window.open("https://caf.mda.gov.br/", "_blank")} data-testid="button-consultar-caf">
            <ExternalLink className="w-3 h-3 mr-1" /> Portal
          </Button>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-testid="button-editar-caf"><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-salvar-caf"><Save className="w-3 h-3 mr-1" /> Salvar</Button>
          )}
        </div>
      </div>

      {!editing && !formData.numeroCAF ? (
        <p className="text-xs text-muted-foreground italic">Nenhum dado CAF registrado. Clique em "Editar" para adicionar ou "Atualizar" para consultar.</p>
      ) : editing ? (
        <div className="space-y-3 bg-green-900/20 border border-green-800 rounded-md p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Número CAF/DAP</Label><Input className="text-sm" value={formData.numeroCAF} onChange={(e) => setFormData(p => ({ ...p, numeroCAF: e.target.value }))} data-testid="input-caf-numero" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Grupo</Label>
              <Select value={formData.grupo} onValueChange={(v) => setFormData(p => ({ ...p, grupo: v }))}>
                <SelectTrigger data-testid="select-caf-grupo"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Grupo A</SelectItem><SelectItem value="A/C">Grupo A/C</SelectItem>
                  <SelectItem value="B">Grupo B</SelectItem><SelectItem value="V">Grupo V (Renda Variável)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Validade</Label><Input type="date" className="text-sm" value={formData.validade} onChange={(e) => setFormData(p => ({ ...p, validade: e.target.value }))} data-testid="input-caf-validade" /></div>
            <div className="space-y-1"><Label className="text-xs">Área (ha)</Label><Input type="number" className="text-sm" value={formData.areaHa} onChange={(e) => setFormData(p => ({ ...p, areaHa: e.target.value }))} data-testid="input-caf-area" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Atividades Produtivas</Label><Textarea className="text-sm" rows={2} value={formData.atividadesProdutivas} onChange={(e) => setFormData(p => ({ ...p, atividadesProdutivas: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Renda Bruta Anual (R$)</Label><Input type="number" className="text-sm" value={formData.rendaBrutaAnual} onChange={(e) => setFormData(p => ({ ...p, rendaBrutaAnual: e.target.value }))} /></div>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-800 rounded-md p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Nº CAF/DAP</p><p className="font-medium" data-testid="text-caf-numero">{formData.numeroCAF}</p></div>
            <div><p className="text-xs text-muted-foreground">Grupo</p><p className="font-medium" data-testid="text-caf-grupo">{formData.grupo || "\u2014"}</p></div>
            <div><p className="text-xs text-muted-foreground">Validade</p><p className="font-medium">{formData.validade ? formatDate(formData.validade) : "\u2014"}</p></div>
            <div><p className="text-xs text-muted-foreground">Área</p><p className="font-medium">{formData.areaHa ? `${formData.areaHa} ha` : "\u2014"}</p></div>
          </div>
          {formData.atividadesProdutivas && <div><p className="text-xs text-muted-foreground">Atividades</p><p className="text-sm">{formData.atividadesProdutivas}</p></div>}
          {formData.rendaBrutaAnual && <div><p className="text-xs text-muted-foreground">Renda Bruta Anual</p><p className="text-sm font-medium">{formatBRL(Number(formData.rendaBrutaAnual))}</p></div>}
        </div>
      )}
    </div>
  );
}

function TabSICOR({ company, sources }: { company: any; sources: any[] }) {
  const enrichment = company.enrichmentData as any || {};
  const sicorData = enrichment?.sicor;
  const srcRecord = sources.find(s => s.dataType === "sicor");
  const data = (srcRecord?.sourceData as any) || sicorData;

  return (
    <div className="space-y-3" data-testid="tab-sicor">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tractor className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold">Crédito Rural na Região (SICOR)</span>
        </div>
        <div className="flex items-center gap-2">
          <SourceTimestamp sources={sources} type="sicor" />
          <RefreshButton companyId={company.id} source="sicor" label="SICOR" />
        </div>
      </div>

      {data ? (
        <div className="bg-amber-900/20 border border-amber-800 rounded-md p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-slate-800/60 rounded-md border">
              <p className="text-lg font-bold text-amber-400" data-testid="text-sicor-contratos">{(data.totalContratos || 0).toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">Contratos PRONAF</p>
            </div>
            <div className="text-center p-2 bg-slate-800/60 rounded-md border">
              <p className="text-lg font-bold text-amber-400" data-testid="text-sicor-valor">{formatBRL(data.totalValor)}</p>
              <p className="text-xs text-muted-foreground">Volume Total</p>
            </div>
          </div>
          {data.principaisProdutos && data.principaisProdutos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Principais Produtos Financiados</p>
              <div className="space-y-1">
                {data.principaisProdutos.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate flex-1">{p.nome || p.produto}</span>
                    <span className="text-muted-foreground ml-2">{formatBRL(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.totalContratos > 100 ? (
            <Badge className="bg-green-900/30 text-green-400 border-green-700 text-xs">Alta atividade PRONAF</Badge>
          ) : data.totalContratos > 10 ? (
            <Badge className="bg-amber-900/30 text-amber-400 border-amber-700 text-xs">Atividade PRONAF moderada</Badge>
          ) : (
            <Badge className="bg-slate-800/40 text-slate-400 border-slate-600 text-xs">Baixa atividade PRONAF</Badge>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Dados SICOR não disponíveis. Clique em "Atualizar" para consultar o Banco Central.</p>
      )}
    </div>
  );
}

function TabIBGE({ company, sources }: { company: any; sources: any[] }) {
  const enrichment = company.enrichmentData as any || {};
  const ibgeData = enrichment?.ibge;
  const srcRecord = sources.find(s => s.dataType === "ibge");
  const data = (srcRecord?.sourceData as any) || ibgeData;

  return (
    <div className="space-y-3" data-testid="tab-ibge">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold">Dados do Município (IBGE)</span>
        </div>
        <div className="flex items-center gap-2">
          <SourceTimestamp sources={sources} type="ibge" />
          <RefreshButton companyId={company.id} source="ibge" label="IBGE" />
        </div>
      </div>

      {data ? (
        <div className="bg-blue-900/20 border border-blue-800 rounded-md p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {data.nome && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Município</p>
                <p className="text-sm font-medium" data-testid="text-ibge-municipio">{data.nome}{data.uf ? ` / ${data.uf}` : ""}</p>
              </div>
            )}
            {data.populacao != null && (
              <div className="text-center p-2 bg-slate-800/60 rounded-md border">
                <p className="text-lg font-bold text-blue-400" data-testid="text-ibge-populacao">{data.populacao?.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">População</p>
              </div>
            )}
            {data.area != null && (
              <div className="text-center p-2 bg-slate-800/60 rounded-md border">
                <p className="text-lg font-bold text-blue-400" data-testid="text-ibge-area">{data.area?.toLocaleString("pt-BR")} km²</p>
                <p className="text-xs text-muted-foreground">Área</p>
              </div>
            )}
            {data.pib != null && (
              <div className="text-center p-2 bg-slate-800/60 rounded-md border">
                <p className="text-lg font-bold text-blue-400">{formatBRL(data.pib)}</p>
                <p className="text-xs text-muted-foreground">PIB</p>
              </div>
            )}
            {data.regiao && (
              <div className="text-center p-2 bg-slate-800/60 rounded-md border">
                <p className="text-lg font-bold text-blue-400">{data.regiao}</p>
                <p className="text-xs text-muted-foreground">Região</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Dados IBGE não disponíveis. Clique em "Atualizar" para consultar.</p>
      )}
    </div>
  );
}

function TabOperacoes({ company }: { company: any }) {
  const [, navigate] = useLocation();
  const { data: operations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/norion/companies", company.id, "operations"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/companies/${company.id}/operations`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar operações");
      return res.json();
    },
  });

  const stageLabels: Record<string, string> = {
    identificado: "Identificado", diagnostico: "Diagnóstico", documentacao: "Documentação",
    analise: "Análise", comite: "Comitê", aprovado: "Aprovado",
    contratado: "Contratado", finalizado: "Finalizado", cancelado: "Cancelado",
  };

  const stageColors: Record<string, string> = {
    identificado: "bg-slate-800/40 text-slate-400", diagnostico: "bg-blue-900/30 text-blue-400",
    documentacao: "bg-amber-900/30 text-amber-400", analise: "bg-purple-900/30 text-purple-400",
    comite: "bg-cyan-900/30 text-cyan-400", aprovado: "bg-green-900/30 text-green-400",
    contratado: "bg-emerald-900/30 text-emerald-400", finalizado: "bg-teal-900/30 text-teal-400",
    cancelado: "bg-red-900/30 text-red-400",
  };

  return (
    <div className="space-y-3" data-testid="tab-operacoes">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold">Operações</span>
          <Badge variant="outline" className="text-xs">{operations.length}</Badge>
        </div>
        <Button size="sm" onClick={() => navigate("/operacoes")} data-testid="button-nova-operacao">
          <CreditCard className="w-3 h-3 mr-1" /> Nova Operação
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
      ) : operations.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhuma operação encontrada para esta empresa.</p>
      ) : (
        <div className="space-y-2">
          {operations.map((op: any) => {
            const diag = op.diagnostico || {};
            return (
              <div
                key={op.id}
                className="border rounded-md p-3 cursor-pointer hover:bg-slate-700/40 transition-colors"
                onClick={() => navigate(`/operacoes/${op.id}`)}
                data-testid={`operation-card-${op.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", stageColors[op.stage] || "bg-slate-800/40 text-slate-400")}>
                        {stageLabels[op.stage] || op.stage}
                      </Badge>
                      {diag.finalidade && <span className="text-xs text-muted-foreground">{diag.finalidade}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {diag.valorSolicitado > 0 && <span>{formatBRL(diag.valorSolicitado)}</span>}
                      <span>{formatDate(op.createdAt)}</span>
                      {op.docProgress && <span>{op.docProgress.concluidos}/{op.docProgress.total} docs</span>}
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabHistorico({ companyId }: { companyId: number }) {
  const { data: timeline = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/norion/companies", companyId, "historico"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/companies/${companyId}/historico`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const severityColors: Record<string, string> = {
    info: "text-blue-400 bg-blue-900/30",
    warning: "text-amber-400 bg-amber-900/30",
    success: "text-green-400 bg-green-900/30",
    error: "text-red-400 bg-red-900/30",
  };

  const severityIcons: Record<string, any> = {
    info: Clock,
    warning: AlertCircle,
    success: CheckCircle2,
    error: AlertCircle,
  };

  return (
    <div className="space-y-3" data-testid="tab-historico">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold">Histórico de Eventos</span>
        <Badge variant="outline" className="text-xs">{timeline.length}</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
      ) : timeline.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum evento registrado para esta empresa.</p>
      ) : (
        <div className="space-y-2">
          {timeline.map((event: any) => {
            const Icon = severityIcons[event.severity] || Clock;
            const color = severityColors[event.severity] || severityColors.info;
            return (
              <div key={event.id} className="border rounded-md p-3" data-testid={`timeline-event-${event.id}`}>
                <div className="flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{event.eventTitle}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                    </div>
                    {event.eventDescription && <p className="text-xs text-muted-foreground mt-1">{event.eventDescription}</p>}
                    {event.eventData && Object.keys(event.eventData).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        {Object.entries(event.eventData).map(([key, value]: [string, any]) => (
                          <div key={key}><span className="font-medium">{key}:</span> {JSON.stringify(value)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EmpresaDetalhePage({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const { data: companiesList = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/crm/companies"] });
  const company = companiesList.find((c: any) => String(c.id) === String(id));

  const { data: dataSources = [] } = useQuery<any[]>({
    queryKey: ["/api/norion/companies", Number(id), "data-sources"],
    queryFn: async () => {
      const res = await fetch(`/api/norion/companies/${id}/data-sources`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!company,
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!company) {
    return (
      <div className="p-6 max-w-[800px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/empresas")} data-testid="button-voltar-empresas"><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl font-bold">Empresa não encontrada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/empresas")} data-testid="button-voltar-empresas">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Building2 className="w-7 h-7 text-amber-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" data-testid="text-empresa-detalhe-title">
              {company.legalName || company.tradeName || "Empresa"}
            </h1>
            <ProfileBadge profile={company.norionProfile} />
            <ScoreBadge score={company.profileScore} />
          </div>
          <p className="text-sm text-muted-foreground">
            {company.cnpj ? formatCnpj(company.cnpj) : "Sem CNPJ"}
            {company.enrichedAt ? ` \u00b7 Enriquecido em ${formatDate(company.enrichedAt)}` : ""}
          </p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 flex-wrap">
            <TabsTrigger value="geral" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="qsa" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-qsa">QSA / Sócios</TabsTrigger>
            <TabsTrigger value="caf" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-caf">CAF / DAP</TabsTrigger>
            <TabsTrigger value="sicor" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-sicor">SICOR</TabsTrigger>
            <TabsTrigger value="ibge" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-ibge">IBGE</TabsTrigger>
            <TabsTrigger value="operacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-operacoes">Operações</TabsTrigger>
            <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-4 py-2.5 text-xs" data-testid="tab-trigger-historico">Histórico</TabsTrigger>
          </TabsList>

          <div className="p-5">
            <TabsContent value="geral" className="m-0"><TabVisaoGeral company={company} sources={dataSources} /></TabsContent>
            <TabsContent value="qsa" className="m-0"><TabQSA company={company} sources={dataSources} /></TabsContent>
            <TabsContent value="caf" className="m-0"><TabCAF company={company} sources={dataSources} /></TabsContent>
            <TabsContent value="sicor" className="m-0"><TabSICOR company={company} sources={dataSources} /></TabsContent>
            <TabsContent value="ibge" className="m-0"><TabIBGE company={company} sources={dataSources} /></TabsContent>
            <TabsContent value="operacoes" className="m-0"><TabOperacoes company={company} /></TabsContent>
            <TabsContent value="historico" className="m-0"><TabHistorico companyId={company.id} /></TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
