export type Categoria = 'RESIDUAL' | 'DOMINANTE' | 'EMERGENTE'

export interface Manifestacao {
  nome: string
  categoria: Categoria
  diagnostico: string
  camadaSimbolica: string
}

export interface AnaliseEtapa1 {
  manifestacoes: Manifestacao[]
}

export interface ConexaoTensao {
  respondeA: string
  alimentaDesejo: string
  neutralizaMedo: string
  reflexoDe: string
  encontraEm: string
}

export interface TraducaoEstrategica {
  filtroRelevancia: 'aplicar' | 'descartar'
  motivoFiltro: string
  soWhat: string
  adaptacao: string
}

export interface ContextoUsuario {
  manifestacoesObservadas: string
  localObservacao: string
  hipoteseInicial: string
  areaAtuacao?: string
  /** Onde aplicar os insights (campanha, marca, produto…). */
  ondeAplicarInsights?: string
  objetivoProjeto?: string
}

export type Etapa = 'inicio' | 'etapa1' | 'etapa2' | 'etapa3' | 'etapa4' | 'finalizado'
