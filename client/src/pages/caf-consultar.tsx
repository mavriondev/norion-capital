import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search, Leaf, ArrowLeft, CheckCircle2, XCircle,
  ExternalLink, Loader2, AlertTriangle, Database,
} from "lucide-react";

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatCpf(v: string | null | undefined) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export default function CafConsultarPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [inputCAF, setInputCAF] = useState("");
  const [inputCPF, setInputCPF] = useState("");
  const [inputDAP, setInputDAP] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [consultando, setConsultando] = useState(false);

  async function handleConsultar() {
    if (!inputCAF.trim() && !inputCPF.trim() && !inputDAP.trim()) {
      toast({ title: "Informe pelo menos um campo para consulta", variant: "destructive" });
      return;
    }
    setConsultando(true);
    setResultado(null);
    try {
      const params = new URLSearchParams();
      if (inputCAF.trim()) params.set("numeroCAF", inputCAF.trim());
      if (inputCPF.trim()) params.set("cpf", inputCPF.replace(/\D/g, ""));
      if (inputDAP.trim()) params.set("numeroDAPAntigo", inputDAP.trim());
      const res = await fetch(`/api/norion/caf/consultar?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      setResultado(data);
      if (data.encontrado) {
        toast({ title: "Agricultor encontrado!", description: `Fonte: ${data.fonte === "local" ? "Base local" : "Portal DAP"}` });
      } else {
        toast({ title: "Nenhum registro encontrado", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro na consulta", description: err.message, variant: "destructive" });
    } finally {
      setConsultando(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[800px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/caf")} data-testid="button-voltar-caf">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="p-2 bg-green-900/30 rounded-lg">
          <Search className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="title-caf-consultar">Consultar Agricultor</h1>
          <p className="text-sm text-muted-foreground">Busque pelo número do CAF, DAP ou CPF do titular</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-600" />
            Dados para Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Número CAF</Label>
              <Input placeholder="Ex: 123456789" value={inputCAF} onChange={(e) => setInputCAF(e.target.value)} data-testid="input-consultar-caf" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Número DAP (antigo)</Label>
              <Input placeholder="Ex: SP-0123456" value={inputDAP} onChange={(e) => setInputDAP(e.target.value)} data-testid="input-consultar-dap" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">CPF do Titular</Label>
              <Input placeholder="000.000.000-00" value={inputCPF} onChange={(e) => setInputCPF(e.target.value)} data-testid="input-consultar-cpf" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleConsultar} disabled={consultando} data-testid="button-consultar-caf">
              {consultando ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              {consultando ? "Consultando..." : "Consultar"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("https://caf.mda.gov.br/", "_blank" )}>
              <ExternalLink className="w-4 h-4 mr-1.5" /> Portal CAF Oficial
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("https://dap.mda.gov.br/", "_blank" )}>
              <ExternalLink className="w-4 h-4 mr-1.5" /> Portal DAP
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {resultado.encontrado ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                {resultado.encontrado ? "Agricultor Encontrado" : "Não Encontrado"}
              </CardTitle>
              {resultado.encontrado && resultado.fonte && (
                <Badge variant="outline" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  {resultado.fonte === "local" ? "Base Local" : "Portal DAP"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!resultado.encontrado && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-900/20 rounded-lg border border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-400">
                    <p className="font-medium">Nenhum registro encontrado</p>
                    <p className="text-xs mt-1">{resultado.mensagem}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(resultado.portalUrl, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Consultar no Portal CAF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/caf/novo")}>
                    <Leaf className="w-3.5 h-3.5 mr-1.5" /> Cadastrar Manualmente
                  </Button>
                </div>
              </div>
            )}

            {resultado.encontrado && resultado.fonte === "portal_dap" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-blue-900/20 rounded-lg border border-blue-800">
                  <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-400">
                    <p className="font-medium">Registro encontrado no Portal DAP</p>
                    <p className="text-xs mt-1">{resultado.mensagem}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(resultado.dapPortalUrl, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Ver no Portal DAP
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/caf/novo")}>
                    <Leaf className="w-3.5 h-3.5 mr-1.5" /> Cadastrar Manualmente
                  </Button>
                </div>
              </div>
            )}

            {resultado.encontrado && resultado.fonte === "local" && resultado.dados && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><p className="text-xs text-muted-foreground">Nome do Titular</p><p className="text-sm font-medium">{resultado.dados.nomeTitular || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">CPF</p><p className="text-sm font-mono">{formatCpf(resultado.dados.cpfTitular)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Número CAF</p><p className="text-sm font-mono">{resultado.dados.numeroCAF || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">DAP Antigo</p><p className="text-sm font-mono">{resultado.dados.numeroDAPAntigo || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Grupo PRONAF</p><p className="text-sm">{resultado.dados.grupo || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Validade</p><p className="text-sm">{resultado.dados.validade || "—"}</p></div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><p className="text-xs text-muted-foreground">Município / UF</p><p className="text-sm">{[resultado.dados.municipio, resultado.dados.uf].filter(Boolean).join(" / ") || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Área (ha)</p><p className="text-sm">{resultado.dados.areaHa ? `${resultado.dados.areaHa.toLocaleString("pt-BR")} ha` : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Renda Bruta Anual</p><p className="text-sm">{formatCurrency(resultado.dados.rendaBrutaAnual)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Condição de Posse</p><p className="text-sm">{resultado.dados.condicaoPosse || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Atividade Principal</p><p className="text-sm">{resultado.dados.atividadePrincipal || "—"}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={resultado.dados.status === "ativo" ? "bg-green-900/30 text-green-400 border-green-700" : "bg-red-900/30 text-red-400 border-red-700"}>
                      {resultado.dados.status === "ativo" ? "Ativo" : "Vencido"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <Button onClick={() => setLocation(`/caf/${resultado.dados.id}`)} data-testid="button-ver-detalhe-caf">
                  <Leaf className="w-4 h-4 mr-1.5" /> Ver Registro Completo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
