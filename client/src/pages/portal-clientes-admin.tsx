import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Users, Search, CheckCircle2,
  User, Copy, Link as LinkIcon,
  UserPlus, Loader2, Send, Clock, Phone, Mail,
  ArrowRight, FileText, ExternalLink, Shield,
} from "lucide-react";
import { Link } from "wouter";

const FORM_STATUS_MAP: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  enviado: { label: "Enviado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  em_revisao: { label: "Em Revisão", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  aprovado: { label: "Aprovado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

const STAGE_MAP: Record<string, string> = {
  identificado: "Identificado",
  diagnostico: "Diagnóstico",
  enviado_fundos: "Enviado a Fundos",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  comissao_gerada: "Comissão Gerada",
};

export default function PortalClientesAdminPage() {
  const { toast } = useToast();
  const [taxId, setTaxId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedTaxId, setGeneratedTaxId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lookingUpCnpj, setLookingUpCnpj] = useState(false);
  const [cnpjSource, setCnpjSource] = useState<string | null>(null);

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ["/api/norion/clientes-portal"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/norion/clientes-portal");
      return res.json();
    },
  });

  const gerarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/norion/gerar-acesso-avulso", {
        taxId, name, email, phone,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      const cleanCpf = (data.loginTaxId || "").replace(/\D/g, "");
      const link = `${window.location.origin}${data.portalUrl}${cleanCpf ? `?cpf=${cleanCpf}` : ""}`;
      setGeneratedLink(link);
      setGeneratedTaxId(data.loginTaxId);
      toast({ title: "Acesso gerado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/norion/clientes-portal"] });
      setTaxId("");
      setName("");
      setEmail("");
      setPhone("");
      setCnpjSource(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const lookupCnpj = async (digits: string) => {
    if (digits.length !== 14) return;
    setLookingUpCnpj(true);
    setCnpjSource(null);
    try {
      const res = await apiRequest("GET", `/api/cnpj/${digits}`);
      const data = await res.json();
      if (data.legalName || data.tradeName) {
        setName(data.tradeName || data.legalName || "");
        if (data.emails?.[0] && !email) setEmail(data.emails[0]);
        if (data.phones?.[0] && !phone) {
          const p = data.phones[0].replace(/\D/g, "");
          setPhone(p.length >= 10 ? `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}` : data.phones[0]);
        }
        setCnpjSource("BrasilAPI");
        toast({ title: "CNPJ encontrado", description: data.tradeName || data.legalName });
      }
    } catch {
      setCnpjSource(null);
    } finally {
      setLookingUpCnpj(false);
    }
  };

  const formatTaxId = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
        d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
      );
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) =>
      e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    );
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({ title: "Link copiado!" });
    }
  };

  const copyInstructions = () => {
    const text = `Olá${name ? ` ${name}` : ""}! Seu acesso ao Portal Norion Capital foi gerado.\n\nAcesse: ${generatedLink}\nSeu CPF/CNPJ para login: ${generatedTaxId}\n\nPreencha o formulário com seus dados para dar andamento à sua operação de crédito.`;
    navigator.clipboard.writeText(text);
    toast({ title: "Mensagem copiada!" });
  };

  const filtered = (clientes as any[]).filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.taxId?.includes(q.replace(/\D/g, "")) ||
      c.email?.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q)
    );
  });

  const tokenAtivo = (c: any) => c.tokenExpiresAt && new Date(c.tokenExpiresAt) > new Date();

  const stats = {
    total: (clientes as any[]).length,
    ativos: (clientes as any[]).filter((c: any) => tokenAtivo(c)).length,
    comFormulario: (clientes as any[]).filter((c: any) => c.formularioStatus).length,
    comOperacao: (clientes as any[]).filter((c: any) => c.operationId).length,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-portal-clientes-admin">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-portal-admin-title">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">Gerencie acessos ao portal do cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold" data-testid="stat-total-clientes">{stats.total}</p>
            <p className="text-[11px] text-muted-foreground">Total de clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600" data-testid="stat-ativos">{stats.ativos}</p>
            <p className="text-[11px] text-muted-foreground">Acessos ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600" data-testid="stat-com-formulario">{stats.comFormulario}</p>
            <p className="text-[11px] text-muted-foreground">Com formulário</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600" data-testid="stat-com-operacao">{stats.comOperacao}</p>
            <p className="text-[11px] text-muted-foreground">Com operação</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold">Gerar Acesso para Cliente</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cadastre o CPF ou CNPJ do cliente para gerar o acesso ao portal. O cliente poderá fazer login usando apenas o CPF/CNPJ informado.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">CPF ou CNPJ *</Label>
              <div className="relative">
                <Input
                  placeholder="000.000.000-00"
                  value={taxId}
                  onChange={(e) => {
                    const formatted = formatTaxId(e.target.value);
                    setTaxId(formatted);
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length === 14) lookupCnpj(digits);
                    if (digits.length < 14) setCnpjSource(null);
                  }}
                  maxLength={18}
                  data-testid="input-gerar-taxid"
                />
                {lookingUpCnpj && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-amber-500" />
                )}
              </div>
              {cnpjSource && (
                <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1" data-testid="text-cnpj-found">
                  <CheckCircle2 className="w-3 h-3" /> Dados preenchidos via {cnpjSource}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Nome do cliente</Label>
              <Input
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-gerar-nome"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">E-mail</Label>
              <Input
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-gerar-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-gerar-phone"
              />
            </div>
          </div>

          <Button
            onClick={() => gerarMutation.mutate()}
            disabled={!taxId.replace(/\D/g, "").length || gerarMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-gerar-acesso"
          >
            {gerarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Gerar Acesso
          </Button>

          {generatedLink && (
            <div className="space-y-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Acesso gerado com sucesso!</span>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Link do portal:</p>
                  <div className="flex items-center gap-2">
                    <Input value={generatedLink} readOnly className="text-xs font-mono flex-1" data-testid="input-generated-link" />
                    <Button variant="outline" size="sm" onClick={copyLink} data-testid="button-copy-generated-link">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CPF/CNPJ para login:</p>
                  <p className="text-sm font-mono font-medium" data-testid="text-generated-taxid">{generatedTaxId}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={copyInstructions} className="text-xs" data-testid="button-copy-instructions">
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar mensagem para enviar ao cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Clientes com Acesso ({(clientes as any[]).length})</h3>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
              data-testid="input-search-clientes"
            />
          </div>
        </div>

        {loadingClientes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {search.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((c: any) => (
              <Card key={c.id} className="overflow-hidden" data-testid={`card-cliente-${c.id}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate" data-testid={`text-nome-cliente-${c.id}`}>
                          {c.name || "Sem nome"}
                        </p>
                        {c.companyName && (
                          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                            · {c.companyName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono">{c.taxId}</span>
                        {c.email && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Mail className="w-3 h-3" /> {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {tokenAtivo(c) ? (
                      <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 dark:border-green-800 dark:text-green-400" data-testid={`badge-token-${c.id}`}>
                        <Shield className="w-2.5 h-2.5 mr-0.5" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 dark:border-red-800 dark:text-red-400" data-testid={`badge-token-${c.id}`}>
                        <Clock className="w-2.5 h-2.5 mr-0.5" /> Expirado
                      </Badge>
                    )}

                    {c.formularioStatus && (
                      <Badge className={cn("text-[10px]", FORM_STATUS_MAP[c.formularioStatus]?.color || "")} data-testid={`badge-form-${c.id}`}>
                        <FileText className="w-2.5 h-2.5 mr-0.5" />
                        {FORM_STATUS_MAP[c.formularioStatus]?.label || c.formularioStatus}
                      </Badge>
                    )}

                    {c.operationId ? (
                      <Link href={`/operacoes/${c.operationId}`}>
                        <Badge variant="outline" className="text-[10px] cursor-pointer border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400" data-testid={`badge-operacao-${c.id}`}>
                          Op #{c.operationId} · {STAGE_MAP[c.operationStage] || c.operationStage || ""}
                          <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        </Badge>
                      </Link>
                    ) : !c.formularioStatus && (
                      <span className="text-[10px] text-muted-foreground">Aguardando preenchimento</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
