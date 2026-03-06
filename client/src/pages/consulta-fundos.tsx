import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, AlertTriangle, Plus,
  Landmark, FileText, Handshake, Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { CreateFundoDialog } from "@/components/norion-create-fundo-dialog";

const ECONOMIA_REAL_TYPES = ["venture_capital", "private_capital", "imobiliarios", "agricolas"];

function isEconomiaReal(tipo: string) {
  return ECONOMIA_REAL_TYPES.includes(tipo);
}

function formatBRL(value: number | null | undefined) {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);
}

export default function NorionConsultaFundosPage() {
  const { toast } = useToast();
  const [cvmCnpj, setCvmCnpj] = useState("");
  const [cvmResult, setCvmResult] = useState<any>(null);
  const [cvmLoading, setCvmLoading] = useState(false);
  const [cvmError, setCvmError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [fundosResult, setFundosResult] = useState<any>(null);
  const [fundosLoading, setFundosLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createInitialData, setCreateInitialData] = useState<{ nome?: string; cnpj?: string; categoria?: string } | undefined>(undefined);

  const { data: settingsData } = useQuery<any>({ queryKey: ["/api/norion/settings"] });

  const buscarCVM = async () => {
    const clean = cvmCnpj.replace(/\D/g, "");
    if (clean.length < 14) { setCvmError("CNPJ inválido"); return; }
    setCvmLoading(true); setCvmError(null); setCvmResult(null);
    try {
      const res = await fetch(`/api/norion/fundo/${clean}`, { credentials: "include" });
      if (!res.ok) { setCvmError((await res.json()).message || "Não encontrado"); } else { setCvmResult(await res.json()); }
    } catch { setCvmError("Erro de conexão"); } finally { setCvmLoading(false); }
  };

  const buscarFundos = async () => {
    setFundosLoading(true); setFundosResult(null);
    try {
      let url: string;
      if (isEconomiaReal(selectedType)) {
        const params = new URLSearchParams({ tipo: selectedType });
        if (searchFilter.trim()) params.set("search", searchFilter.trim());
        url = `/api/norion/fundos-economia-real?${params.toString()}`;
      } else {
        url = `/api/norion/fundos-estruturados`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) { toast({ title: "Erro ao buscar fundos", variant: "destructive" }); return; }
      const data = await res.json();
      setFundosResult({ ...data, source: isEconomiaReal(selectedType) ? "cvm" : "anbima" });
    } catch { toast({ title: "Erro de conexão", variant: "destructive" }); } finally { setFundosLoading(false); }
  };

  const fundosFiltered = (fundosResult?.fundos || []).filter((f: any) => {
    if (fundosResult?.source !== "cvm" && selectedType && selectedType !== "all") {
      const cat = (f.categoria || "").toLowerCase();
      if (selectedType === "renda_fixa" && !cat.includes("renda fixa")) return false;
      if (selectedType === "acoes" && !cat.includes("ações")) return false;
      if (selectedType === "multimercados" && !cat.includes("multimercado")) return false;
      if (selectedType === "previdencia" && !cat.includes("previdência")) return false;
      if (selectedType === "cambial" && !cat.includes("cambial")) return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      if (!f.nome?.toLowerCase().includes(q) && !f.cnpj?.includes(q)) return false;
    }
    return true;
  });

  const openCreateFromCVM = () => {
    setCreateInitialData({
      nome: cvmResult?.nome || "",
      cnpj: cvmResult?.cnpj || "",
      categoria: cvmResult?.tipo || "",
    });
    setShowCreateDialog(true);
  };

  const openCreateFromFundo = (fundo: any) => {
    setCreateInitialData({
      nome: fundo.nome || "",
      cnpj: fundo.cnpj || "",
      categoria: fundo.categoria || fundo.tipo || "",
    });
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setCreateInitialData(undefined);
  };

  const canBuscar = isEconomiaReal(selectedType) || settingsData?.configured;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="w-7 h-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-norion-consulta-title">Consulta de Fundos</h1>
          <p className="text-sm text-muted-foreground">Pesquisar fundos na CVM, ANBIMA e economia real</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" />Consulta CVM (Pública)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input placeholder="CNPJ do fundo" value={cvmCnpj} onChange={(e) => { setCvmCnpj(e.target.value); setCvmError(null); }}
              onKeyDown={(e) => e.key === "Enter" && buscarCVM()} className="max-w-xs font-mono" data-testid="input-n-cvm-cnpj" />
            <Button onClick={buscarCVM} disabled={cvmLoading} data-testid="button-n-buscar-cvm">
              {cvmLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}Consultar
            </Button>
          </div>
          {cvmError && <div className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4" />{cvmError}</div>}
          {cvmResult && (
            <div className="border rounded-md p-4 bg-muted/20 space-y-3" data-testid="n-cvm-result">
              <p className="font-semibold">{cvmResult.nome}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Tipo</p><p>{cvmResult.tipo || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">CNPJ</p><p className="font-mono text-xs">{cvmResult.cnpj}</p></div>
                <div><p className="text-xs text-muted-foreground">Situação</p><p>{cvmResult.situacao || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Administrador</p><p>{cvmResult.administrador || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Gestor</p><p>{cvmResult.gestor || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Data Constituição</p><p>{cvmResult.dataConstituicao || "—"}</p></div>
              </div>
              <Button onClick={openCreateFromCVM} data-testid="button-cvm-cadastrar-parceiro">
                <Handshake className="w-4 h-4 mr-1.5" />Cadastrar como Parceiro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {isEconomiaReal(selectedType) ? <Building2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {isEconomiaReal(selectedType) ? "Fundos de Economia Real (CVM)" : "Fundos Estruturados ANBIMA"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedType} onValueChange={(val) => { setSelectedType(val); setFundosResult(null); setSearchFilter(""); }}>
              <SelectTrigger className="w-48" data-testid="select-n-tipo-fundo"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas (ANBIMA)</SelectItem>
                <SelectGroup>
                  <SelectLabel>Fundos Abertos (ANBIMA)</SelectLabel>
                  <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                  <SelectItem value="acoes">Ações</SelectItem>
                  <SelectItem value="multimercados">Multimercados</SelectItem>
                  <SelectItem value="previdencia">Previdência</SelectItem>
                  <SelectItem value="cambial">Cambial</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Economia Real (CVM)</SelectLabel>
                  <SelectItem value="venture_capital">Venture Capital (FIP)</SelectItem>
                  <SelectItem value="private_capital">Private Capital (FIP)</SelectItem>
                  <SelectItem value="imobiliarios">Imobiliários (FII)</SelectItem>
                  <SelectItem value="agricolas">Agrícolas (Fiagro)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={buscarFundos} disabled={fundosLoading || !canBuscar} data-testid="button-n-buscar-fundos">
              {fundosLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}Buscar
            </Button>
            {fundosResult?.fundos?.length > 0 && (
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Filtrar por nome..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-8" data-testid="input-n-filtro-nome" />
              </div>
            )}
          </div>
          {!isEconomiaReal(selectedType) && !settingsData?.configured && (
            <div className="border border-amber-800 rounded-md p-4 bg-amber-900/20">
              <div className="flex items-center gap-2 text-amber-400"><AlertTriangle className="w-4 h-4" /><p className="text-sm font-medium">ANBIMA não configurada</p></div>
              <p className="text-xs text-muted-foreground mt-1">Configure as credenciais na página de Configurações. Fundos de economia real (CVM) não precisam de credenciais.</p>
            </div>
          )}
          {fundosLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
          {fundosResult && !fundosLoading && (
            fundosFiltered.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{fundosFiltered.length} fundo(s) encontrado(s)</p>
                  <Badge variant="outline" className="text-[10px]">
                    {fundosResult.source === "cvm" ? "Fonte: CVM" : "Fonte: ANBIMA"}
                  </Badge>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>CNPJ</TableHead>
                        {fundosResult.source === "cvm" && <TableHead>Patrimônio</TableHead>}
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundosFiltered.slice(0, 200).map((f: any, i: number) => (
                        <TableRow key={i} data-testid={`row-fundo-${i}`}>
                          <TableCell className="font-medium max-w-[280px] truncate">{f.nome || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{f.tipo || "—"}</Badge></TableCell>
                          <TableCell className="text-sm">{f.categoria || f.classeAnbima || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{f.cnpj || "—"}</TableCell>
                          {fundosResult.source === "cvm" && <TableCell className="text-sm">{formatBRL(f.patrimonio)}</TableCell>}
                          <TableCell>
                            <Badge variant={
                              f.situacao === "Ativo" || (f.situacao || "").includes("FUNCIONAMENTO") ? "default" : "secondary"
                            } className="text-xs">
                              {(f.situacao || "").includes("FUNCIONAMENTO") ? "Ativo" : f.situacao || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" onClick={() => openCreateFromFundo(f)} data-testid={`button-fundo-add-${i}`}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum fundo encontrado</p>
            )
          )}
        </CardContent>
      </Card>

      <CreateFundoDialog open={showCreateDialog} onClose={handleCloseDialog} initialData={createInitialData} />
    </div>
  );
}
