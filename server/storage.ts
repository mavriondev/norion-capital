import { db } from "./db";
import { pool } from "./db";
import {
  users, organizations, companies, orgSettings,
  norionOperations, norionDocuments, norionFundosParceiros, norionEnviosFundos,
  norionCafRegistros, norionClientUsers, norionFormularioCliente,
  companyApiQueries, companyDataSources, companyTimelineEvents, norionNotificacoes,
  type User, type InsertCompany, type Company,
  type NorionDocument, type InsertNorionDocument,
  type NorionFundoParceiro, type InsertNorionFundoParceiro,
  type NorionEnvioFundo, type InsertNorionEnvioFundo,
  type CompanyApiQuery, type InsertCompanyApiQuery,
  type CompanyDataSource, type InsertCompanyDataSource,
  type CompanyTimelineEvent, type InsertCompanyTimelineEvent,
  type NorionNotificacao, type InsertNorionNotificacao,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const PgStore = connectPgSimple(session);

const DEFAULT_ORG_ID = 1;
export function getOrgId(): number {
  return DEFAULT_ORG_ID;
}

export async function audit(params: {
  orgId: number;
  userId?: number | null;
  userName?: string | null;
  entity: string;
  entityId?: number | null;
  entityTitle?: string | null;
  action: string;
  changes?: any;
}) {
  console.log(`[AUDIT] org=${params.orgId} user=${params.userId} action=${params.action} entity=${params.entity} entityId=${params.entityId}`);
}

class DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PgStore({ pool, createTableIfMissing: true });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: { username: string; password: string; orgId: number; role: string }): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async createOrganization(name: string) {
    const [org] = await db.insert(organizations).values({ name }).returning();
    return org;
  }

  async getCompanies(orgId?: number): Promise<Company[]> {
    if (orgId) {
      return db.select().from(companies).where(eq(companies.orgId, orgId));
    }
    return db.select().from(companies);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<Company> {
    const [updated] = await db.update(companies).set(data as any).where(eq(companies.id, id)).returning();
    return updated;
  }

  async getOrgSetting(orgId: number, key: string) {
    const [setting] = await db.select().from(orgSettings)
      .where(and(eq(orgSettings.orgId, orgId), eq(orgSettings.key, key)));
    return setting?.value;
  }

  async setOrgSetting(orgId: number, key: string, value: any) {
    const existing = await this.getOrgSetting(orgId, key);
    if (existing !== undefined) {
      await db.update(orgSettings).set({ value }).where(and(eq(orgSettings.orgId, orgId), eq(orgSettings.key, key)));
    } else {
      await db.insert(orgSettings).values({ orgId, key, value });
    }
  }

  async getNorionDocuments(operationId: number, orgId: number) {
    return db.select().from(norionDocuments)
      .where(and(eq(norionDocuments.operationId, operationId), eq(norionDocuments.orgId, orgId)))
      .orderBy(norionDocuments.id);
  }

  async createNorionDocument(doc: InsertNorionDocument) {
    const [created] = await db.insert(norionDocuments).values(doc).returning();
    return created;
  }

  async updateNorionDocument(id: number, orgId: number, data: Partial<NorionDocument>) {
    const [updated] = await db.update(norionDocuments)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(norionDocuments.id, id), eq(norionDocuments.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteNorionDocument(id: number, orgId: number) {
    await db.delete(norionDocuments).where(and(eq(norionDocuments.id, id), eq(norionDocuments.orgId, orgId)));
  }

  async getNorionFundosParceiros(orgId: number) {
    return db.select().from(norionFundosParceiros)
      .where(eq(norionFundosParceiros.orgId, orgId))
      .orderBy(desc(norionFundosParceiros.createdAt));
  }

  async getNorionFundoParceiro(id: number, orgId: number) {
    const [fp] = await db.select().from(norionFundosParceiros)
      .where(and(eq(norionFundosParceiros.id, id), eq(norionFundosParceiros.orgId, orgId)));
    return fp;
  }

  async createNorionFundoParceiro(data: InsertNorionFundoParceiro) {
    const [created] = await db.insert(norionFundosParceiros).values(data).returning();
    return created;
  }

  async updateNorionFundoParceiro(id: number, orgId: number, data: Partial<NorionFundoParceiro>) {
    const [updated] = await db.update(norionFundosParceiros)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(norionFundosParceiros.id, id), eq(norionFundosParceiros.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteNorionFundoParceiro(id: number, orgId: number) {
    await db.delete(norionEnviosFundos).where(and(eq(norionEnviosFundos.fundoParceiroId, id), eq(norionEnviosFundos.orgId, orgId)));
    await db.delete(norionFundosParceiros).where(and(eq(norionFundosParceiros.id, id), eq(norionFundosParceiros.orgId, orgId)));
  }

  async getNorionEnviosFundos(operationId: number, orgId: number) {
    return db.select().from(norionEnviosFundos)
      .where(and(eq(norionEnviosFundos.operationId, operationId), eq(norionEnviosFundos.orgId, orgId)))
      .orderBy(desc(norionEnviosFundos.dataEnvio));
  }

  async getNorionEnviosByFundo(fundoId: number, orgId: number) {
    return db.select().from(norionEnviosFundos)
      .where(and(eq(norionEnviosFundos.fundoParceiroId, fundoId), eq(norionEnviosFundos.orgId, orgId)))
      .orderBy(desc(norionEnviosFundos.dataEnvio));
  }

  async createNorionEnvioFundo(data: InsertNorionEnvioFundo) {
    const [created] = await db.insert(norionEnviosFundos).values(data).returning();
    return created;
  }

  async updateNorionEnvioFundo(id: number, orgId: number, data: Partial<NorionEnvioFundo>) {
    const [updated] = await db.update(norionEnviosFundos)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(norionEnviosFundos.id, id), eq(norionEnviosFundos.orgId, orgId)))
      .returning();
    return updated;
  }

  async deleteNorionEnviosByOperation(operationId: number, orgId: number) {
    await db.delete(norionEnviosFundos).where(and(eq(norionEnviosFundos.operationId, operationId), eq(norionEnviosFundos.orgId, orgId)));
  }

  // Métodos para histórico de consultas de APIs
  async logApiQuery(data: InsertCompanyApiQuery): Promise<CompanyApiQuery> {
    const [created] = await db.insert(companyApiQueries).values(data).returning();
    return created;
  }

  async getApiQueriesForCompany(companyId: number, orgId: number) {
    return db.select().from(companyApiQueries)
      .where(and(eq(companyApiQueries.companyId, companyId), eq(companyApiQueries.orgId, orgId)))
      .orderBy(desc(companyApiQueries.createdAt));
  }

  async getApiQueriesByType(companyId: number, orgId: number, apiName: string) {
    return db.select().from(companyApiQueries)
      .where(and(
        eq(companyApiQueries.companyId, companyId),
        eq(companyApiQueries.orgId, orgId),
        eq(companyApiQueries.apiName, apiName)
      ))
      .orderBy(desc(companyApiQueries.createdAt));
  }

  // Métodos para dados agregados por fonte
  async aggregateDataSource(data: InsertCompanyDataSource): Promise<CompanyDataSource> {
    const [created] = await db.insert(companyDataSources).values(data).returning();
    return created;
  }

  async getDataSourcesForCompany(companyId: number, orgId: number) {
    return db.select().from(companyDataSources)
      .where(and(eq(companyDataSources.companyId, companyId), eq(companyDataSources.orgId, orgId)))
      .orderBy(desc(companyDataSources.updatedAt));
  }

  async getDataSourceByType(companyId: number, orgId: number, dataType: string) {
    const [source] = await db.select().from(companyDataSources)
      .where(and(
        eq(companyDataSources.companyId, companyId),
        eq(companyDataSources.orgId, orgId),
        eq(companyDataSources.dataType, dataType)
      ))
      .orderBy(desc(companyDataSources.updatedAt));
    return source;
  }

  async updateDataSource(id: number, orgId: number, data: Partial<CompanyDataSource>) {
    const [updated] = await db.update(companyDataSources)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(companyDataSources.id, id), eq(companyDataSources.orgId, orgId)))
      .returning();
    return updated;
  }

  // Métodos para timeline de eventos
  async createTimelineEvent(data: InsertCompanyTimelineEvent): Promise<CompanyTimelineEvent> {
    const [created] = await db.insert(companyTimelineEvents).values(data).returning();
    return created;
  }

  async getTimelineForCompany(companyId: number, orgId: number, limit: number = 50) {
    return db.select().from(companyTimelineEvents)
      .where(and(eq(companyTimelineEvents.companyId, companyId), eq(companyTimelineEvents.orgId, orgId)))
      .orderBy(desc(companyTimelineEvents.createdAt))
      .limit(limit);
  }

  // Métodos para notificações internas
  async criarNotificacao(data: InsertNorionNotificacao): Promise<NorionNotificacao> {
    const [created] = await db.insert(norionNotificacoes).values(data).returning();
    return created;
  }

  async getNotificacoesUsuario(orgId: number, userId: number, limit: number = 30): Promise<NorionNotificacao[]> {
    return db.select().from(norionNotificacoes)
      .where(and(
        eq(norionNotificacoes.orgId, orgId),
        eq(norionNotificacoes.userId, userId)
      ))
      .orderBy(desc(norionNotificacoes.createdAt))
      .limit(limit);
  }

  async getNotificacoesOrg(orgId: number, limit: number = 30): Promise<NorionNotificacao[]> {
    // Retorna notificações sem userId específico (para todos da org)
    const { isNull } = await import("drizzle-orm");
    return db.select().from(norionNotificacoes)
      .where(and(
        eq(norionNotificacoes.orgId, orgId),
        isNull(norionNotificacoes.userId)
      ))
      .orderBy(desc(norionNotificacoes.createdAt))
      .limit(limit);
  }

  async getNotificacoesCliente(orgId: number, clientUserId: number, limit: number = 20): Promise<NorionNotificacao[]> {
    return db.select().from(norionNotificacoes)
      .where(and(
        eq(norionNotificacoes.orgId, orgId),
        eq(norionNotificacoes.clientUserId, clientUserId)
      ))
      .orderBy(desc(norionNotificacoes.createdAt))
      .limit(limit);
  }

  async marcarNotificacaoLida(id: number, orgId: number): Promise<void> {
    await db.update(norionNotificacoes)
      .set({ read: true })
      .where(and(eq(norionNotificacoes.id, id), eq(norionNotificacoes.orgId, orgId)));
  }

  async marcarTodasLidas(orgId: number, userId: number): Promise<void> {
    await db.update(norionNotificacoes)
      .set({ read: true })
      .where(and(eq(norionNotificacoes.orgId, orgId), eq(norionNotificacoes.userId, userId)));
  }

  async deletarNotificacao(id: number, orgId: number): Promise<void> {
    await db.delete(norionNotificacoes)
      .where(and(eq(norionNotificacoes.id, id), eq(norionNotificacoes.orgId, orgId)));
  }

  async contarNaoLidas(orgId: number, userId: number): Promise<number> {
    const { count } = await import("drizzle-orm");
    const result = await db.select({ count: count() }).from(norionNotificacoes)
      .where(and(
        eq(norionNotificacoes.orgId, orgId),
        eq(norionNotificacoes.userId, userId),
        eq(norionNotificacoes.read, false)
      ));
    return result[0]?.count ?? 0;
  }
}

export const storage = new DatabaseStorage();
