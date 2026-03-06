import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, Plus, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const TIPOS_OPERACAO = ["Capital de Giro", "Expansão", "Equipamentos", "Imóvel", "Agro", "Outro"];
const GARANTIAS_OPTIONS = ["Imóvel", "Recebíveis", "Veículos", "Equipamentos", "Terra", "Sem garantia"];
const CATEGORIAS = ["FIDC", "FII", "FIP", "Securitizadora", "Banco", "Fintech", "Outro"];
const UFS_BRASIL = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const PORTES_OPTIONS = ["ME", "EPP", "Médio", "Grande"];
const PRONAF_GRUPOS = ["A", "A/C", "B", "V"];

function ChipInput({ values, onChange, placeholder, options }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; options?: string[] }) {
  const [inputVal, setInputVal] = useState("");

  const addValue = (val: string) => {
    const trimmed = val.trim().toUpperCase();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputVal("");
  };

  if (options) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {options.map(opt => (
            <Badge
              key={opt}
              variant={values.includes(opt) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => {
                if (values.includes(opt)) {
                  onChange(values.filter(v => v !== opt));
                } else {
                  onChange([...values, opt]);
                }
              }}
              data-testid={`chip-toggle-${opt}`}
            >
              {opt}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(inputVal); } }}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => addValue(inputVal)} data-testid="button-chip-add">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map(v => (
            <Badge key={v} variant="secondary" className="text-xs gap-1">
              {v}
              <X className="w-3 h-3 cursor-pointer" onClick={() => onChange(values.filter(x => x !== v))} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FundoNovoPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoOperacao, setTipoOperacao] = useState<string[]>([]);
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");
  const [prazoMinimo, setPrazoMinimo] = useState("");
  const [prazoMaximo, setPrazoMaximo] = useState("");
  const [garantiasAceitas, setGarantiasAceitas] = useState<string[]>([]);
  const [contatoNome, setContatoNome] = useState("");
  const [contatoEmail, setContatoEmail] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [faturamentoMinimo, setFaturamentoMinimo] = useState("");
  const [tempoEmpresaMinimo, setTempoEmpresaMinimo] = useState("");
  const [capitalSocialMinimo, setCapitalSocialMinimo] = useState("");
  const [areaRuralMinima, setAreaRuralMinima] = useState("");
  const [ltvMaximo, setLtvMaximo] = useState("");
  const [exigeCaf, setExigeCaf] = useState(false);
  const [exigeCnpjAtivo, setExigeCnpjAtivo] = useState(false);
  const [exigeGarantiaReal, setExigeGarantiaReal] = useState(false);
  const [ufsAceitas, setUfsAceitas] = useState<string[]>([]);
  const [ufsVetadas, setUfsVetadas] = useState<string[]>([]);
  const [porteAceito, setPorteAceito] = useState<string[]>([]);
  const [enquadramentoPronaf, setEnquadramentoPronaf] = useState<string[]>([]);
  const [cnaesAceitos, setCnaesAceitos] = useState<string[]>([]);
  const [cnaesVetados, setCnaesVetados] = useState<string[]>([]);
  const [documentosExigidos, setDocumentosExigidos] = useState("");

  const [taxaJurosMin, setTaxaJurosMin] = useState("");
  const [taxaJurosMax, setTaxaJurosMax] = useState("");
  const [prazoRespostaDias, setPrazoRespostaDias] = useState("");
  const [comissaoPercentual, setComissaoPercentual] = useState("");
  const [notasInternas, setNotasInternas] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/norion/fundos-parceiros", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/norion/fundos-parceiros"] });
      toast({ title: "Fundo parceiro cadastrado com sucesso" });
      setLocation("/fundos-parceiros");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!nome) return toast({ title: "Nome é obrigatório", variant: "destructive" });

    const criteriosAnalise: any = {};
    if (faturamentoMinimo) criteriosAnalise.faturamentoMinimo = parseFloat(faturamentoMinimo);
    if (tempoEmpresaMinimo) criteriosAnalise.tempoEmpresaMinimo = parseFloat(tempoEmpresaMinimo);
    if (capitalSocialMinimo) criteriosAnalise.capitalSocialMinimo = parseFloat(capitalSocialMinimo);
    if (areaRuralMinima) criteriosAnalise.areaRuralMinima = parseFloat(areaRuralMinima);
    if (ltvMaximo) criteriosAnalise.ltvMaximo = parseFloat(ltvMaximo);
    criteriosAnalise.exigeCaf = exigeCaf;
    criteriosAnalise.exigeCnpjAtivo = exigeCnpjAtivo;
    criteriosAnalise.exigeGarantiaReal = exigeGarantiaReal;
    if (ufsAceitas.length > 0) criteriosAnalise.ufsAceitas = ufsAceitas;
    if (ufsVetadas.length > 0) criteriosAnalise.ufsVetadas = ufsVetadas;
    if (porteAceito.length > 0) criteriosAnalise.porteAceito = porteAceito;
    if (enquadramentoPronaf.length > 0) criteriosAnalise.enquadramentoPronaf = enquadramentoPronaf;
    if (cnaesAceitos.length > 0) criteriosAnalise.cnaesAceitos = cnaesAceitos;
    if (cnaesVetados.length > 0) criteriosAnalise.cnaesVetados = cnaesVetados;
    if (documentosExigidos.trim()) criteriosAnalise.documentosExigidos = documentosExigidos.split(",").map(d => d.trim()).filter(Boolean);

    const condicoesComerciais: any = {};
    if (taxaJurosMin) condicoesComerciais.taxaJurosMin = parseFloat(taxaJurosMin);
    if (taxaJurosMax) condicoesComerciais.taxaJurosMax = parseFloat(taxaJurosMax);
    if (prazoRespostaDias) condicoesComerciais.prazoRespostaDias = parseInt(prazoRespostaDias);
    if (comissaoPercentual) condicoesComerciais.comissaoPercentual = parseFloat(comissaoPercentual);
    if (notasInternas.trim()) condicoesComerciais.notasInternas = notasInternas;

    createMutation.mutate({
      nome,
      cnpj: cnpj || null,
      categoria: categoria || null,
      tipoOperacao,
      garantiasAceitas,
      valorMinimo: parseFloat(valorMinimo) || null,
      valorMaximo: parseFloat(valorMaximo) || null,
      prazoMinimo: prazoMinimo || null,
      prazoMaximo: prazoMaximo || null,
      contatoNome: contatoNome || null,
      contatoEmail: contatoEmail || null,
      contatoTelefone: contatoTelefone || null,
      observacoes: observacoes || null,
      criteriosAnalise: Object.keys(criteriosAnalise).length > 0 ? criteriosAnalise : null,
      condicoesComerciais: Object.keys(condicoesComerciais).length > 0 ? condicoesComerciais : null,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/fundos-parceiros">
          <Button variant="ghost" size="icon" data-testid="button-fundo-novo-voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-fundo-novo-title">Cadastrar Fundo Parceiro</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do novo fundo parceiro</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Fundo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-sm">Nome do Fundo *</Label>
              <Input placeholder="Nome do fundo" value={nome} onChange={(e) => setNome(e.target.value)} data-testid="input-fp-nome" />
            </div>
            <div>
              <Label className="text-sm">CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="font-mono" data-testid="input-fp-cnpj" />
            </div>
            <div>
              <Label className="text-sm">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger data-testid="select-fp-categoria"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm">Tipos de Operação Aceitos</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {TIPOS_OPERACAO.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={tipoOperacao.includes(t)} onCheckedChange={() => setTipoOperacao(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm">Valor Mínimo (R$)</Label><Input type="number" placeholder="0" value={valorMinimo} onChange={(e) => setValorMinimo(e.target.value)} data-testid="input-fp-val-min" /></div>
            <div><Label className="text-sm">Valor Máximo (R$)</Label><Input type="number" placeholder="0" value={valorMaximo} onChange={(e) => setValorMaximo(e.target.value)} data-testid="input-fp-val-max" /></div>
            <div><Label className="text-sm">Prazo Mínimo</Label><Input placeholder="12 meses" value={prazoMinimo} onChange={(e) => setPrazoMinimo(e.target.value)} /></div>
            <div><Label className="text-sm">Prazo Máximo</Label><Input placeholder="60 meses" value={prazoMaximo} onChange={(e) => setPrazoMaximo(e.target.value)} /></div>
          </div>

          <div>
            <Label className="text-sm">Garantias Aceitas</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {GARANTIAS_OPTIONS.map(g => (
                <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={garantiasAceitas.includes(g)} onCheckedChange={() => setGarantiasAceitas(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])} />
                  {g}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label className="text-sm">Contato — Nome</Label><Input placeholder="Nome" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} /></div>
            <div><Label className="text-sm">Email</Label><Input placeholder="email@fundo.com" value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)} /></div>
            <div><Label className="text-sm">Telefone</Label><Input placeholder="(11) 99999-9999" value={contatoTelefone} onChange={(e) => setContatoTelefone(e.target.value)} /></div>
          </div>

          <div><Label className="text-sm">Observações</Label><Textarea placeholder="Notas internas..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critérios de Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">Requisitos Financeiros</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Faturamento Mínimo (R$)</Label>
                <Input type="number" placeholder="Ex: 200000" value={faturamentoMinimo} onChange={(e) => setFaturamentoMinimo(e.target.value)} data-testid="input-fp-faturamento-min" />
              </div>
              <div>
                <Label className="text-sm">Capital Social Mínimo (R$)</Label>
                <Input type="number" placeholder="Ex: 500000" value={capitalSocialMinimo} onChange={(e) => setCapitalSocialMinimo(e.target.value)} data-testid="input-fp-capital-min" />
              </div>
              <div>
                <Label className="text-sm">Tempo de Empresa Mínimo (anos)</Label>
                <Input type="number" placeholder="Ex: 2" value={tempoEmpresaMinimo} onChange={(e) => setTempoEmpresaMinimo(e.target.value)} data-testid="input-fp-tempo-min" />
              </div>
              <div>
                <Label className="text-sm">LTV Máximo (%)</Label>
                <Input type="number" placeholder="Ex: 60" value={ltvMaximo} onChange={(e) => setLtvMaximo(e.target.value)} data-testid="input-fp-ltv-max" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">Exigências</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={exigeCnpjAtivo} onCheckedChange={setExigeCnpjAtivo} data-testid="switch-fp-cnpj-ativo" />
                Exige CNPJ Ativo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={exigeCaf} onCheckedChange={setExigeCaf} data-testid="switch-fp-caf" />
                Exige CAF/DAP
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={exigeGarantiaReal} onCheckedChange={setExigeGarantiaReal} data-testid="switch-fp-garantia-real" />
                Exige Garantia Real
              </label>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">Requisitos Agro</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Área Rural Mínima (ha)</Label>
                <Input type="number" placeholder="Ex: 50" value={areaRuralMinima} onChange={(e) => setAreaRuralMinima(e.target.value)} data-testid="input-fp-area-min" />
              </div>
              <div>
                <Label className="text-sm">Enquadramento PRONAF</Label>
                <ChipInput values={enquadramentoPronaf} onChange={setEnquadramentoPronaf} placeholder="" options={PRONAF_GRUPOS} />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">Restrições Geográficas / Setoriais</p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">UFs Aceitas (se vazio, aceita todas)</Label>
                <ChipInput values={ufsAceitas} onChange={setUfsAceitas} placeholder="" options={UFS_BRASIL} />
              </div>
              <div>
                <Label className="text-sm">UFs Vetadas</Label>
                <ChipInput values={ufsVetadas} onChange={setUfsVetadas} placeholder="" options={UFS_BRASIL} />
              </div>
              <div>
                <Label className="text-sm">Portes Aceitos</Label>
                <ChipInput values={porteAceito} onChange={setPorteAceito} placeholder="" options={PORTES_OPTIONS} />
              </div>
              <div>
                <Label className="text-sm">CNAEs Aceitos (se vazio, aceita todos)</Label>
                <ChipInput values={cnaesAceitos} onChange={setCnaesAceitos} placeholder="Digite o CNAE e pressione Enter" />
              </div>
              <div>
                <Label className="text-sm">CNAEs Vetados</Label>
                <ChipInput values={cnaesVetados} onChange={setCnaesVetados} placeholder="Digite o CNAE e pressione Enter" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm">Documentos Exigidos (separados por vírgula)</Label>
            <Textarea placeholder="Ex: Balanço patrimonial, DRE, Certidão negativa..." value={documentosExigidos} onChange={(e) => setDocumentosExigidos(e.target.value)} data-testid="input-fp-docs-exigidos" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Condições Comerciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Taxa de Juros Mínima (% a.a.)</Label>
              <Input type="number" step="0.1" placeholder="Ex: 12" value={taxaJurosMin} onChange={(e) => setTaxaJurosMin(e.target.value)} data-testid="input-fp-taxa-min" />
            </div>
            <div>
              <Label className="text-sm">Taxa de Juros Máxima (% a.a.)</Label>
              <Input type="number" step="0.1" placeholder="Ex: 18" value={taxaJurosMax} onChange={(e) => setTaxaJurosMax(e.target.value)} data-testid="input-fp-taxa-max" />
            </div>
            <div>
              <Label className="text-sm">Prazo de Resposta (dias)</Label>
              <Input type="number" placeholder="Ex: 10" value={prazoRespostaDias} onChange={(e) => setPrazoRespostaDias(e.target.value)} data-testid="input-fp-prazo-resposta" />
            </div>
            <div>
              <Label className="text-sm">Comissão Norion (%)</Label>
              <Input type="number" step="0.1" placeholder="Ex: 2.5" value={comissaoPercentual} onChange={(e) => setComissaoPercentual(e.target.value)} data-testid="input-fp-comissao" />
            </div>
          </div>
          <div>
            <Label className="text-sm">Notas Internas</Label>
            <Textarea placeholder="Observações internas sobre condições comerciais..." value={notasInternas} onChange={(e) => setNotasInternas(e.target.value)} data-testid="input-fp-notas-internas" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Link href="/fundos-parceiros">
          <Button variant="outline" data-testid="button-fundo-novo-cancelar">Cancelar</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={createMutation.isPending || !nome} data-testid="button-fp-create">
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Cadastrar
        </Button>
      </div>
    </div>
  );
}
