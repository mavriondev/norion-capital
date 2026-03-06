import { eq, and } from "drizzle-orm";
import { companies, companyDataSources, companyTimelineEvents } from "@shared/schema";

const USER_AGENT = "NorionCapital/1.0";
const FETCH_TIMEOUT = 12000;

interface BreakdownItem {
  factor: string;
  points: number;
  detail: string;
}

interface ProfileResult {
  score: number;
  level: "alto" | "medio" | "baixo";
  breakdown: BreakdownItem[];
}

const SETORES_PRIORITARIOS: Record<string, string> = {
  "01": "Agricultura", "02": "Pecuária", "03": "Pesca/Aquicultura",
  "10": "Alimentos", "11": "Bebidas", "41": "Construção Edifícios",
  "42": "Obras Infraestrutura", "43": "Serv. Construção",
  "12": "Fumo", "13": "Têxteis", "14": "Vestuário",
  "45": "Com. Veículos", "46": "Atacado", "47": "Varejo",
  "49": "Transporte Terrestre", "50": "Transporte Aquaviário", "51": "Transporte Aéreo", "52": "Armazenamento",
};

const SETORES_MEDIOS: Record<string, string> = {
  "55": "Alojamento", "56": "Alimentação", "62": "TI", "63": "Informação",
  "68": "Imobiliário", "85": "Educação", "86": "Saúde",
};

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response | null> {
  try {
    const headers = { "User-Agent": USER_AGENT, ...(opts.headers || {}) };
    const response = await fetch(url, {
      ...opts,
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    return response.ok ? response : null;
  } catch {
    return null;
  }
}

async function fetchBrasilAPI(cnpj: string) {
  const cnpjClean = cnpj.replace(/\D/g, "");
  const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
  if (!res) return null;
  const data = await res.json();
  return {
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia,
    situacaoCadastral: data.descricao_situacao_cadastral,
    dataAbertura: data.data_inicio_atividade,
    capitalSocial: data.capital_social,
    naturezaJuridica: data.natureza_juridica,
    porte: data.porte,
    cnaePrincipal: data.cnae_fiscal?.toString(),
    cnaePrincipalDescricao: data.cnae_fiscal_descricao,
    cnaesSecundarios: (data.cnaes_secundarios || []).map((c: any) => ({
      codigo: c.codigo?.toString(),
      descricao: c.descricao,
    })),
    endereco: {
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
      codigoMunicipio: data.codigo_municipio,
      codigoMunicipioIbge: data.codigo_municipio_ibge,
    },
    qsa: (data.qsa || []).map((s: any) => ({
      nome: s.nome_socio,
      cpfCnpj: s.cnpj_cpf_do_socio,
      qualificacao: s.qualificacao_socio,
      dataEntrada: s.data_entrada_sociedade,
    })),
    simplesNacional: data.opcao_pelo_simples,
    mei: data.opcao_pelo_mei,
    email: data.email,
    telefone1: data.ddd_telefone_1,
    telefone2: data.ddd_telefone_2,
  };
}

async function fetchDAPForCpf(cpf: string): Promise<{ encontrado: boolean; cpf: string }> {
  const cpfClean = cpf.replace(/\D/g, "");
  if (cpfClean.length !== 11) return { encontrado: false, cpf: cpfClean };
  try {
    const res = await fetchWithTimeout(`https://dap.mda.gov.br/publico/dap/consulta/${cpfClean}`, {
      headers: { "Accept": "text/html,application/json" },
    });
    if (!res) return { encontrado: false, cpf: cpfClean };
    const text = await res.text();
    const hasData = text.includes("DAP") || text.includes("dap") || text.includes("Cadastro");
    return { encontrado: hasData, cpf: cpfClean };
  } catch {
    return { encontrado: false, cpf: cpfClean };
  }
}

async function fetchSICOR(uf: string, municipio: string) {
  if (!uf || uf.length !== 2) return null;
  const baseUrl = "https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata";
  const filters = ["cdPrograma eq '0001'"];
  if (municipio) {
    const sanitized = municipio.toUpperCase().trim().replace(/'/g, "''");
    filters.push(`contains(Municipio,'${sanitized}')`);
  } else {
    filters.push(`nomeUF eq '${uf.toUpperCase()}'`);
  }
  const filterStr = filters.join(" and ");
  const endpoint = municipio ? "CusteioMunicipioProduto" : "CusteioRegiaoUFProduto";
  const url = `${baseUrl}/${endpoint}?$format=json&$filter=${encodeURIComponent(filterStr)}&$top=50&$orderby=VlCusteio desc`;
  const res = await fetchWithTimeout(url);
  if (!res) return null;
  const json = await res.json();
  const rows = json.value || [];
  const totalContratos = municipio
    ? rows.length
    : rows.reduce((s: number, r: any) => s + (r.QtdCusteio || 0), 0);
  const totalValor = rows.reduce((s: number, r: any) => s + (r.VlCusteio || 0), 0);
  const produtoMap: Record<string, number> = {};
  rows.forEach((r: any) => {
    const p = (r.nomeProduto || r.Produto || "Desconhecido").replace(/"/g, "");
    produtoMap[p] = (produtoMap[p] || 0) + (r.VlCusteio || 0);
  });
  const principaisProdutos = Object.entries(produtoMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, valor]) => ({ nome, valor }));

  return { totalContratos, totalValor, principaisProdutos, consultadoEm: new Date().toISOString() };
}

let cachedMunicipios: any[] | null = null;
let cachedMunicipiosAt = 0;
const MUNICIPIOS_CACHE_TTL = 24 * 60 * 60 * 1000;

async function lookupMunicipioCode(municipioName: string, uf?: string): Promise<string | null> {
  if (!municipioName) return null;
  try {
    if (!cachedMunicipios || Date.now() - cachedMunicipiosAt > MUNICIPIOS_CACHE_TTL) {
      const res = await fetchWithTimeout(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`);
      if (!res) return null;
      cachedMunicipios = await res.json();
      cachedMunicipiosAt = Date.now();
    }
    const normalized = municipioName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const matches = cachedMunicipios!.filter((m: any) => {
      const name = (m.nome || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      return name === normalized;
    });
    if (matches.length === 0) return null;
    if (uf) {
      const ufMatch = matches.find((m: any) => m.microrregiao?.mesorregiao?.UF?.sigla === uf.toUpperCase());
      if (ufMatch) return ufMatch.id?.toString() || null;
    }
    if (matches.length === 1) return matches[0].id?.toString() || null;
    return null;
  } catch {
    return null;
  }
}

async function fetchIBGE(codigoMunicipio: string) {
  if (!codigoMunicipio) return null;
  const code = codigoMunicipio.toString().substring(0, 7);
  const res = await fetchWithTimeout(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${code}`);
  if (!res) return null;
  const mun = await res.json();

  let pib: number | null = null;
  let populacao: number | null = null;
  let area: number | null = null;

  try {
    const popRes = await fetchWithTimeout(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[${code}]`);
    if (popRes) {
      const popData = await popRes.json();
      const series = popData?.[0]?.resultados?.[0]?.series?.[0]?.serie;
      if (series) {
        const lastYear = Object.keys(series).sort().pop();
        if (lastYear) populacao = Number(series[lastYear]) || null;
      }
    }
  } catch {}

  try {
    const areaRes = await fetchWithTimeout(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${code}/metadados`);
    if (areaRes) {
      const areaData = await areaRes.json();
      if (Array.isArray(areaData) && areaData[0]?.area?.dimensao) {
        area = Number(areaData[0].area.dimensao) || null;
      }
    }
  } catch {}

  return {
    nome: mun.nome,
    uf: mun.microrregiao?.mesorregiao?.UF?.sigla || null,
    ufNome: mun.microrregiao?.mesorregiao?.UF?.nome || null,
    regiao: mun.microrregiao?.mesorregiao?.UF?.regiao?.nome || null,
    populacao,
    area,
    pib,
    consultadoEm: new Date().toISOString(),
  };
}

export function calcularPerfilEnriquecido(company: any, enrichmentData: any): ProfileResult {
  const breakdown: BreakdownItem[] = [];
  let score = 0;

  const cnae = (company.cnaePrincipal || "").substring(0, 2);
  if (SETORES_PRIORITARIOS[cnae]) {
    score += 15;
    breakdown.push({ factor: "CNAE prioritário", points: 15, detail: `Setor: ${SETORES_PRIORITARIOS[cnae]}` });
  } else if (SETORES_MEDIOS[cnae]) {
    score += 8;
    breakdown.push({ factor: "CNAE relevante", points: 8, detail: `Setor: ${SETORES_MEDIOS[cnae]}` });
  }

  const porte = (company.porte || enrichmentData?.cnpj?.porte || "").toUpperCase();
  if (["GRANDE", "DEMAIS"].includes(porte)) {
    score += 10;
    breakdown.push({ factor: "Porte empresarial", points: 10, detail: `Porte: ${porte}` });
  } else if (porte === "MEDIO") {
    score += 5;
    breakdown.push({ factor: "Porte empresarial", points: 5, detail: "Porte: MÉDIO" });
  }

  const situacao = (enrichmentData?.cnpj?.situacaoCadastral || "").toUpperCase();
  if (situacao.includes("ATIVA") || situacao === "ATIVA") {
    score += 5;
    breakdown.push({ factor: "Situação cadastral", points: 5, detail: "Empresa ATIVA na Receita Federal" });
  } else if (situacao && (situacao.includes("BAIXA") || situacao.includes("INATIVA") || situacao.includes("SUSPENS"))) {
    score -= 20;
    breakdown.push({ factor: "Situação cadastral", points: -20, detail: `Situação: ${situacao}` });
  }

  const capital = enrichmentData?.cnpj?.capitalSocial || 0;
  if (capital > 2000000) {
    score += 10;
    breakdown.push({ factor: "Capital social", points: 10, detail: `R$ ${(capital / 1000000).toFixed(1)}M` });
  } else if (capital > 500000) {
    score += 5;
    breakdown.push({ factor: "Capital social", points: 5, detail: `R$ ${(capital / 1000).toFixed(0)}k` });
  }

  const dataAbertura = enrichmentData?.cnpj?.dataAbertura;
  if (dataAbertura) {
    const anos = (Date.now() - new Date(dataAbertura).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (anos > 5) {
      score += 5;
      breakdown.push({ factor: "Tempo de mercado", points: 5, detail: `${Math.floor(anos)} anos de operação` });
    }
  }

  const cafData = enrichmentData?.caf;
  if (cafData?.numeroCAF || cafData?.numeroDAPAntigo) {
    score += 15;
    breakdown.push({ factor: "CAF/DAP registrado", points: 15, detail: `CAF: ${cafData.numeroCAF || cafData.numeroDAPAntigo}` });
  }

  const areaHa = cafData?.areaHa || 0;
  if (areaHa > 500) {
    score += 10;
    breakdown.push({ factor: "Área produtiva", points: 10, detail: `${areaHa.toFixed(0)} hectares` });
  } else if (areaHa > 100) {
    score += 5;
    breakdown.push({ factor: "Área produtiva", points: 5, detail: `${areaHa.toFixed(0)} hectares` });
  }

  const renda = cafData?.rendaBrutaAnual || 0;
  if (renda > 2000000) {
    score += 10;
    breakdown.push({ factor: "Renda bruta anual", points: 10, detail: `R$ ${(renda / 1000000).toFixed(1)}M` });
  } else if (renda > 500000) {
    score += 5;
    breakdown.push({ factor: "Renda bruta anual", points: 5, detail: `R$ ${(renda / 1000).toFixed(0)}k` });
  }

  const qsa = enrichmentData?.qsa || [];
  const sociosComDAP = qsa.filter((s: any) => s.temDAP);
  if (sociosComDAP.length > 0) {
    score += 10;
    breakdown.push({ factor: "Sócios com DAP", points: 10, detail: `${sociosComDAP.length} sócio(s) com DAP ativo` });
  }

  const sicor = enrichmentData?.sicor;
  if (sicor && sicor.totalContratos > 0) {
    score += 5;
    breakdown.push({ factor: "SICOR na região", points: 5, detail: `${sicor.totalContratos} contratos PRONAF na região` });
  }

  const addr = company.address || enrichmentData?.cnpj?.endereco || {};
  if (addr.uf && addr.municipio && (addr.logradouro || addr.cep)) {
    score += 5;
    breakdown.push({ factor: "Endereço completo", points: 5, detail: `${addr.municipio}/${addr.uf}` });
  }

  score = Math.max(0, Math.min(100, score));
  const level: "alto" | "medio" | "baixo" = score > 65 ? "alto" : score >= 35 ? "medio" : "baixo";

  return { score, level, breakdown };
}

async function upsertDataSource(db: any, companyId: number, orgId: number, dataType: string, sourceData: any, opts: {
  sourceUrl?: string;
  validDays?: number;
  importanceLevel?: string;
  tags?: string[];
} = {}) {
  const existing = await db.select().from(companyDataSources)
    .where(and(
      eq(companyDataSources.companyId, companyId),
      eq(companyDataSources.orgId, orgId),
      eq(companyDataSources.dataType, dataType),
    ));

  const validUntil = opts.validDays
    ? new Date(Date.now() + opts.validDays * 24 * 60 * 60 * 1000)
    : null;

  if (existing.length > 0) {
    await db.update(companyDataSources)
      .set({
        sourceData,
        sourceUrl: opts.sourceUrl || null,
        validUntil,
        importanceLevel: opts.importanceLevel || "informativo",
        tags: opts.tags || [],
        updatedAt: new Date(),
      })
      .where(eq(companyDataSources.id, existing[0].id));
    return existing[0].id;
  } else {
    const [row] = await db.insert(companyDataSources).values({
      companyId,
      orgId,
      dataType,
      sourceData,
      sourceUrl: opts.sourceUrl || null,
      validUntil,
      importanceLevel: opts.importanceLevel || "informativo",
      tags: opts.tags || [],
    }).returning();
    return row.id;
  }
}

export async function enrichSource(companyId: number, sourceType: string, db: any): Promise<any> {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) throw new Error("Empresa não encontrada");
  const orgId = company.orgId || 1;
  const cnpj = company.cnpj;
  const enrichment = (company.enrichmentData as any) || {};
  let sourceData: any = null;

  if (sourceType === "brasilapi") {
    if (!cnpj) return { error: "Empresa sem CNPJ" };
    const data = await fetchBrasilAPI(cnpj);
    if (!data) return { error: "Falha ao consultar BrasilAPI" };
    await upsertDataSource(db, companyId, orgId, "brasilapi", data, {
      sourceUrl: `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, "")}`,
      validDays: 30, importanceLevel: "crítico", tags: ["receita_federal", "cnpj", "qsa"],
    });
    enrichment.cnpj = {
      situacaoCadastral: data.situacaoCadastral, capitalSocial: data.capitalSocial,
      naturezaJuridica: data.naturezaJuridica, dataAbertura: data.dataAbertura,
      cnaesSecundarios: data.cnaesSecundarios, simplesNacional: data.simplesNacional,
      porte: data.porte, endereco: data.endereco, email: data.email,
      telefone1: data.telefone1, telefone2: data.telefone2,
    };
    const qsaWithDap = (data.qsa || []).map((s: any) => {
      const existing = (enrichment.qsa || []).find((q: any) => q.cpfCnpj === s.cpfCnpj);
      return { ...s, temDAP: existing?.temDAP || false };
    });
    enrichment.qsa = qsaWithDap;
    sourceData = data;
  } else if (sourceType === "dap_caf") {
    const qsa = enrichment?.qsa || [];
    if (qsa.length === 0) {
      if (cnpj) {
        const brasilData = await fetchBrasilAPI(cnpj);
        if (!brasilData) return { error: "Falha ao buscar dados da Receita Federal" };
        if (brasilData?.qsa?.length > 0) {
          enrichment.qsa = brasilData.qsa.map((s: any) => ({ ...s, temDAP: false }));
          enrichment.cnpj = {
            situacaoCadastral: brasilData.situacaoCadastral, capitalSocial: brasilData.capitalSocial,
            naturezaJuridica: brasilData.naturezaJuridica, dataAbertura: brasilData.dataAbertura,
            cnaesSecundarios: brasilData.cnaesSecundarios, simplesNacional: brasilData.simplesNacional,
            porte: brasilData.porte, endereco: brasilData.endereco,
          };
          await upsertDataSource(db, companyId, orgId, "brasilapi", brasilData, {
            sourceUrl: `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, "")}`,
            validDays: 30, importanceLevel: "crítico", tags: ["receita_federal", "cnpj", "qsa"],
          });
        } else {
          return { error: "Nenhum sócio encontrado na Receita Federal" };
        }
      } else {
        return { error: "Nenhum sócio no QSA e empresa sem CNPJ" };
      }
    }
    const updatedQsa = enrichment.qsa || [];
    const cpfs = updatedQsa.filter((s: any) => s.cpfCnpj && s.cpfCnpj.replace(/\D/g, "").length === 11).map((s: any) => s.cpfCnpj);
    if (cpfs.length === 0) return { error: "Nenhum CPF válido no QSA" };
    const results = await Promise.allSettled(cpfs.map((cpf: string) => fetchDAPForCpf(cpf)));
    const dapResults = results.map((r, i) => ({
      cpf: cpfs[i], nome: updatedQsa.find((s: any) => s.cpfCnpj === cpfs[i])?.nome || "",
      temDAP: r.status === "fulfilled" ? r.value.encontrado : false,
    }));
    await upsertDataSource(db, companyId, orgId, "dap_caf", { socios: dapResults }, {
      sourceUrl: "https://dap.mda.gov.br/publico/dap/consulta",
      validDays: 90, importanceLevel: "importante", tags: ["agro", "dap", "caf"],
    });
    enrichment.qsa = updatedQsa.map((s: any) => {
      const dap = dapResults.find((d: any) => d.cpf === s.cpfCnpj);
      return { ...s, temDAP: dap?.temDAP || false };
    });
    sourceData = { socios: dapResults };
  } else if (sourceType === "sicor") {
    const addr = company.address as any || {};
    const uf = addr.uf || enrichment?.cnpj?.endereco?.uf;
    const municipio = addr.municipio || enrichment?.cnpj?.endereco?.municipio;
    if (!uf) return { error: "Empresa sem UF para consultar SICOR" };
    const data = await fetchSICOR(uf, municipio);
    if (!data) return { error: "Falha ao consultar SICOR/BCB" };
    await upsertDataSource(db, companyId, orgId, "sicor", data, {
      sourceUrl: "https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata",
      validDays: 90, importanceLevel: "informativo", tags: ["agro", "credito_rural", "pronaf"],
    });
    enrichment.sicor = data;
    sourceData = data;
  } else if (sourceType === "ibge") {
    const addr = company.address as any || {};
    let codMun = addr.codigoMunicipio || addr.codigoMunicipioIbge
      || enrichment?.cnpj?.endereco?.codigoMunicipio
      || enrichment?.cnpj?.endereco?.codigoMunicipioIbge;
    if (!codMun) {
      const munName = addr.municipio || enrichment?.cnpj?.endereco?.municipio;
      const uf = addr.uf || enrichment?.cnpj?.endereco?.uf;
      if (munName) {
        codMun = await lookupMunicipioCode(munName, uf);
      }
    }
    if (!codMun) return { error: "Código do município não disponível para consultar IBGE" };
    const data = await fetchIBGE(codMun);
    if (!data) return { error: "Falha ao consultar IBGE" };
    await upsertDataSource(db, companyId, orgId, "ibge", data, {
      sourceUrl: `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${codMun}`,
      validDays: 365, importanceLevel: "informativo", tags: ["demografia", "municipio", "ibge"],
    });
    enrichment.ibge = data;
    sourceData = data;
  } else {
    return { error: `Fonte desconhecida: ${sourceType}` };
  }

  enrichment.enrichedAt = new Date().toISOString();
  if (!enrichment.enrichmentSources) enrichment.enrichmentSources = [];
  if (!enrichment.enrichmentSources.includes(sourceType)) enrichment.enrichmentSources.push(sourceType);

  const profile = calcularPerfilEnriquecido(company, enrichment);
  enrichment.breakdown = profile.breakdown;

  await db.update(companies).set({
    enrichmentData: enrichment,
    enrichedAt: new Date(),
    norionProfile: profile.level,
    profileScore: profile.score,
  }).where(eq(companies.id, companyId));

  return sourceData;
}

export async function enrichCompany(companyId: number, db: any): Promise<{
  success: boolean;
  sources: string[];
  errors: string[];
  enrichmentData: any;
  profile: ProfileResult;
}> {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) throw new Error("Empresa não encontrada");
  const orgId = company.orgId || 1;
  const cnpj = company.cnpj;

  const sources: string[] = [];
  const errors: string[] = [];
  let brasilData: any = null;
  let dapResults: any[] = [];
  let sicorData: any = null;
  let ibgeData: any = null;
  let cafData: any = (company.enrichmentData as any)?.caf || null;

  if (cnpj) {
    try {
      brasilData = await fetchBrasilAPI(cnpj);
      if (brasilData) {
        sources.push("brasilapi");
        await upsertDataSource(db, companyId, orgId, "brasilapi", brasilData, {
          sourceUrl: `https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g, "")}`,
          validDays: 30,
          importanceLevel: "crítico",
          tags: ["receita_federal", "cnpj", "qsa"],
        });

        if (brasilData.qsa && brasilData.qsa.length > 0) {
          const cpfs = brasilData.qsa
            .filter((s: any) => s.cpfCnpj && s.cpfCnpj.replace(/\D/g, "").length === 11)
            .map((s: any) => s.cpfCnpj);

          if (cpfs.length > 0) {
            const dapSettled = await Promise.allSettled(cpfs.map((cpf: string) => fetchDAPForCpf(cpf)));
            dapResults = dapSettled.map((r, i) => ({
              cpf: cpfs[i],
              nome: brasilData.qsa.find((s: any) => s.cpfCnpj === cpfs[i])?.nome || "",
              temDAP: r.status === "fulfilled" ? r.value.encontrado : false,
            }));
            sources.push("dap_caf");
            await upsertDataSource(db, companyId, orgId, "dap_caf", { socios: dapResults }, {
              sourceUrl: "https://dap.mda.gov.br/publico/dap/consulta",
              validDays: 90,
              importanceLevel: "importante",
              tags: ["agro", "dap", "caf"],
            });
          }
        }

        const uf = brasilData.endereco?.uf;
        const municipio = brasilData.endereco?.municipio;
        let codMunicipio = brasilData.endereco?.codigoMunicipio || brasilData.endereco?.codigoMunicipioIbge;
        if (!codMunicipio && municipio) {
          codMunicipio = await lookupMunicipioCode(municipio, uf);
        }

        const [sicorResult, ibgeResult] = await Promise.allSettled([
          uf ? fetchSICOR(uf, municipio) : Promise.resolve(null),
          codMunicipio ? fetchIBGE(codMunicipio) : Promise.resolve(null),
        ]);

        if (sicorResult.status === "fulfilled" && sicorResult.value) {
          sicorData = sicorResult.value;
          sources.push("sicor");
          await upsertDataSource(db, companyId, orgId, "sicor", sicorData, {
            sourceUrl: "https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata",
            validDays: 90,
            importanceLevel: "informativo",
            tags: ["agro", "credito_rural", "pronaf"],
          });
        } else {
          errors.push("SICOR: falha na consulta ou dados indisponíveis");
        }

        if (ibgeResult.status === "fulfilled" && ibgeResult.value) {
          ibgeData = ibgeResult.value;
          sources.push("ibge");
          await upsertDataSource(db, companyId, orgId, "ibge", ibgeData, {
            sourceUrl: `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${codMunicipio}`,
            validDays: 365,
            importanceLevel: "informativo",
            tags: ["demografia", "municipio", "ibge"],
          });
        } else {
          errors.push("IBGE: falha na consulta ou código do município indisponível");
        }
      } else {
        errors.push("BrasilAPI: falha na consulta do CNPJ");
      }
    } catch (err: any) {
      errors.push(`BrasilAPI: ${err.message}`);
    }
  } else {
    errors.push("Empresa sem CNPJ cadastrado");
  }

  const qsaWithDap = (brasilData?.qsa || []).map((s: any) => {
    const dapInfo = dapResults.find((d: any) => d.cpf === s.cpfCnpj);
    return { ...s, temDAP: dapInfo?.temDAP || false };
  });

  const enrichmentData: any = {
    cnpj: brasilData ? {
      situacaoCadastral: brasilData.situacaoCadastral,
      capitalSocial: brasilData.capitalSocial,
      naturezaJuridica: brasilData.naturezaJuridica,
      dataAbertura: brasilData.dataAbertura,
      cnaesSecundarios: brasilData.cnaesSecundarios,
      simplesNacional: brasilData.simplesNacional,
      porte: brasilData.porte,
      endereco: brasilData.endereco,
      email: brasilData.email,
      telefone1: brasilData.telefone1,
      telefone2: brasilData.telefone2,
    } : null,
    qsa: qsaWithDap,
    caf: cafData,
    sicor: sicorData,
    ibge: ibgeData,
    enrichedAt: new Date().toISOString(),
    enrichmentSources: sources,
    enrichmentErrors: errors,
  };

  const profile = calcularPerfilEnriquecido(company, enrichmentData);
  enrichmentData.breakdown = profile.breakdown;

  const updateFields: any = {
    enrichmentData,
    enrichedAt: new Date(),
    norionProfile: profile.level,
    profileScore: profile.score,
  };

  if (brasilData) {
    if (brasilData.porte && !company.porte) updateFields.porte = brasilData.porte;
    if (brasilData.cnaePrincipal && !company.cnaePrincipal) updateFields.cnaePrincipal = brasilData.cnaePrincipal;
    if (brasilData.cnaesSecundarios?.length > 0) updateFields.cnaeSecundarios = brasilData.cnaesSecundarios;
    if (brasilData.nomeFantasia && !company.tradeName) updateFields.tradeName = brasilData.nomeFantasia;
    if (brasilData.endereco?.uf) {
      updateFields.address = {
        ...(company.address as any || {}),
        logradouro: brasilData.endereco.logradouro,
        numero: brasilData.endereco.numero,
        complemento: brasilData.endereco.complemento,
        bairro: brasilData.endereco.bairro,
        municipio: brasilData.endereco.municipio,
        uf: brasilData.endereco.uf,
        cep: brasilData.endereco.cep,
        codigoMunicipio: brasilData.endereco.codigoMunicipio,
        codigoMunicipioIbge: brasilData.endereco.codigoMunicipioIbge,
      };
    }
  }

  await db.update(companies)
    .set(updateFields)
    .where(eq(companies.id, companyId));

  await db.insert(companyTimelineEvents).values({
    companyId,
    orgId,
    eventType: "enriquecimento_automatico",
    eventTitle: `Enriquecimento automático — ${sources.length} fonte(s) consultada(s)`,
    eventDescription: sources.length > 0
      ? `Fontes: ${sources.join(", ")}. ${errors.length > 0 ? `Erros: ${errors.join("; ")}` : "Sem erros."}`
      : `Nenhuma fonte retornou dados. Erros: ${errors.join("; ")}`,
    eventData: { sources, errors, profileScore: profile.score, profileLevel: profile.level },
    severity: errors.length > 0 ? "warning" : "success",
  });

  return { success: sources.length > 0, sources, errors, enrichmentData, profile };
}
