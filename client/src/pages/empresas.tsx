import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Building2, Loader2, RefreshCw, Plus, Leaf, Database, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

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
  if (s === 0) return <Badge variant="outline" className="text-[10px] bg-slate-800/40 text-slate-400">\u2014</Badge>;
  const color = s > 65 ? "text-green-400 bg-green-900/30 border-green-700" : s >= 35 ? "text-amber-400 bg-amber-900/30 border-amber-700" : "text-red-400 bg-red-900/30 border-red-700";
  return <Badge variant="outline" className={cn("text-[10px] font-bold", color)}>{s}</Badge>;
}

function CafBadge({ enrichmentData }: { enrichmentData: any }) {
  const caf = enrichmentData?.caf;
  if (!caf || !caf.numeroCAF) return <Badge variant="outline" className="text-xs bg-slate-800/40 text-slate-400 border-slate-600">Sem CAF</Badge>;
  const isValid = caf.validade && new Date(caf.validade) > new Date();
  return (
    <Badge variant="outline" className={cn("text-xs", isValid ? "bg-green-900/30 text-green-400 border-green-700" : "bg-red-900/30 text-red-400 border-red-700")}>
      <Leaf className="w-3 h-3 mr-1" />
      {isValid ? "CAF Ativo" : "CAF Vencido"}
    </Badge>
  );
}

function EnrichmentIndicator({ enrichedAt, onEnrich, isPending }: { enrichedAt: any; onEnrich: () => void; isPending: boolean }) {
  if (enrichedAt) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        <span className="text-[10px] text-muted-foreground">{new Date(enrichedAt).toLocaleDateString("pt-BR")}</span>
      </div>
    );
  }
  return (
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onEnrich(); }} disabled={isPending} data-testid="button-enrich-inline">
      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
      Enriquecer
    </Button>
  );
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function NorionEmpresasPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const { data: companies = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/crm/companies"] });

  const recalcMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/norion/recalculate-profiles"); return res.json(); },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      toast({ title: "Perfis recalculados", description: `${data.alto} alto, ${data.medio} médio, ${data.baixo} baixo` });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const enrichMutation = useMutation({
    mutationFn: async (id: number) => {
      setEnrichingId(id);
      const res = await apiRequest("POST", `/api/norion/companies/${id}/enrich`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      toast({ title: "Empresa enriquecida", description: `${data.sources?.length || 0} fonte(s) consultada(s).` });
      setEnrichingId(null);
    },
    onError: (err: any) => { toast({ title: "Erro", description: err.message, variant: "destructive" }); setEnrichingId(null); },
  });

  const filtered = search.trim()
    ? companies.filter((c: any) => {
        const q = search.toLowerCase();
        return (c.legalName || "").toLowerCase().includes(q) || (c.tradeName || "").toLowerCase().includes(q) || (c.cnpj || "").includes(q);
      })
    : companies;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Building2 className="w-7 h-7 text-amber-500" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" data-testid="text-norion-empresas-title">Empresas</h1>
          <p className="text-sm text-muted-foreground">Perfil financeiro das empresas para operações de crédito</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
            data-testid="input-search-empresas"
          />
          <p className="text-sm text-muted-foreground">{filtered.length} empresa(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending} data-testid="button-n-recalculate-profiles">
            <RefreshCw className={cn("w-4 h-4 mr-1.5", recalcMutation.isPending && "animate-spin")} />
            Recalcular Perfis
          </Button>
          <Link href="/empresas/nova">
            <Button data-testid="button-cadastrar-empresa">
              <Plus className="w-4 h-4 mr-1.5" />
              Cadastrar Empresa
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Setor (CNAE)</TableHead>
                <TableHead>Porte</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Perfil</TableHead>
                <TableHead className="text-center">CAF</TableHead>
                <TableHead className="text-center">Dados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow
                  key={c.id}
                  data-testid={`row-n-company-${c.id}`}
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/empresas/${c.id}`)}
                >
                  <TableCell className="font-medium">{c.legalName || c.tradeName || "\u2014"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.cnpj ? formatCnpj(c.cnpj) : "\u2014"}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{c.cnaePrincipal || "\u2014"}</TableCell>
                  <TableCell className="text-sm">{c.porte || "\u2014"}</TableCell>
                  <TableCell className="text-center"><ScoreBadge score={c.profileScore} /></TableCell>
                  <TableCell className="text-center"><ProfileBadge profile={c.norionProfile} /></TableCell>
                  <TableCell className="text-center"><CafBadge enrichmentData={c.enrichmentData} /></TableCell>
                  <TableCell className="text-center">
                    <EnrichmentIndicator
                      enrichedAt={c.enrichedAt}
                      onEnrich={() => enrichMutation.mutate(c.id)}
                      isPending={enrichingId === c.id && enrichMutation.isPending}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
