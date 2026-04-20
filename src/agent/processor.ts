import type {
  Categoria,
  Manifestacao,
  ConexaoTensao,
  TraducaoEstrategica,
  ContextoUsuario,
} from './types'

// Simula análise semiótica - em produção, integrar com API de IA
function classificarManifestacao(texto: string): Categoria {
  const lower = texto.toLowerCase()
  if (
    lower.includes('tradição') ||
    lower.includes('nostalgia') ||
    lower.includes('retro') ||
    lower.includes('vintage')
  ) {
    return 'RESIDUAL'
  }
  if (
    lower.includes('mainstream') ||
    lower.includes('moda') ||
    lower.includes('tendência') ||
    lower.includes('mercado')
  ) {
    return 'DOMINANTE'
  }
  return 'EMERGENTE'
}

function gerarDiagnostico(categoria: Categoria, texto: string): string {
  const diagnosticos: Record<Categoria, string[]> = {
    RESIDUAL: [
      'Persiste por nostalgia ou reciclagem estética (pastiche).',
      'O rastro de práticas que resistem à hegemonia atual.',
      'Valores que sobrevivem no presente mas nasceram no passado.',
    ],
    DOMINANTE: [
      'O mainstream validado pelo mercado e mídia.',
      'Valores hegemônicos em consolidação.',
      'A norma aceita e reproduzida pela maioria.',
    ],
    EMERGENTE: [
      'Nasce do incômodo; responde a tensões não resolvidas.',
      'Potencial estrutural em formação.',
      'O pulso que ainda não se tornou norma.',
    ],
  }
  const opts = diagnosticos[categoria]
  return opts[Math.floor(Math.random() * opts.length)]
}

function gerarCamadaSimbolica(texto: string): string {
  const camadas = [
    'Representa uma busca por autenticidade em contextos de superficialidade.',
    'Simboliza a tensão entre individualidade e pertencimento.',
    'Expressa o desejo de diferenciação dentro de uma cultura de massa.',
  ]
  return camadas[Math.floor(Math.random() * camadas.length)]
}

export function processarEtapa1(contexto: ContextoUsuario): Manifestacao[] {
  const manifestacoes: Manifestacao[] = []
  const itens = contexto.manifestacoesObservadas
    .split(/[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const item of itens.slice(0, 5)) {
    if (!item) continue
    const categoria = classificarManifestacao(item)
    manifestacoes.push({
      nome: item,
      categoria,
      diagnostico: gerarDiagnostico(categoria, item),
      camadaSimbolica: gerarCamadaSimbolica(item),
    })
  }

  if (manifestacoes.length === 0) {
    manifestacoes.push({
      nome: contexto.manifestacoesObservadas,
      categoria: classificarManifestacao(contexto.manifestacoesObservadas),
      diagnostico: gerarDiagnostico(
        classificarManifestacao(contexto.manifestacoesObservadas),
        contexto.manifestacoesObservadas
      ),
      camadaSimbolica: gerarCamadaSimbolica(contexto.manifestacoesObservadas),
    })
  }

  return manifestacoes
}

export function processarEtapa2(manifestacao: Manifestacao): ConexaoTensao {
  const base = manifestacao.nome.toLowerCase()
  return {
    respondeA: `a necessidade de ${base.includes('auto') ? 'autenticidade' : 'pertencimento'} em contextos de fluxo constante.`,
    alimentaDesejo: `por ${base.includes('difer') ? 'diferenciação' : 'reconhecimento'} sem perder a conexão com o coletivo.`,
    neutralizaMedo: `de ser invisível ou irrelevante em um mundo saturado de informação.`,
    reflexoDe: `tensões entre tradição e inovação na cultura contemporânea.`,
    encontraEm: `expectativas de experiências significativas e não apenas utilitárias.`,
  }
}

/**
 * Leitura opcional mais densa na Etapa 2. `repeticao` > 0 = já houve um aprofundamento antes (resposta curta).
 */
export function gerarAprofundamentoEtapa2(
  manifestacao: Manifestacao,
  ctx: Partial<ContextoUsuario>,
  repeticao: number
): string {
  if (repeticao > 0) {
    return (
      'Já trouxemos uma camada extra em cima da Etapa 2. A leitura direta que você viu antes continua válida e completa para seguir.\n\n' +
      'Quando quiser ir para o pivô (Etapa 3), responda **sim** — ou descreva outro ângulo que ainda queira explorar.\n\n' +
      'Essa leitura ressoa com o que você observou, ou tem outro ângulo que quer explorar?'
    )
  }

  const nome = manifestacao.nome
  const cat = manifestacao.categoria
  const local = ctx.localObservacao || 'o contexto que você descreveu'
  const hip = ctx.hipoteseInicial || 'sua intuição inicial'
  const hipShort = hip.length > 140 ? `${hip.slice(0, 137)}…` : hip

  const promessa =
    cat === 'EMERGENTE'
      ? 'ruptura e frescor, teste de formas ainda instáveis'
      : cat === 'RESIDUAL'
        ? 'continuidade aconchegante e códigos reconhecíveis'
        : 'legibilidade imediata e circulação ampla'

  return (
    'Aprofundamento (opcional) — tensões e camadas\n\n' +
    `Sobre **${nome}** (${cat}), dá para puxar mais algumas tensões que costumam conviver ao mesmo tempo:\n\n` +
    `- **Pressão entre camadas:** o que aparece em ${local} raramente é um fenômeno isolado; costura desejo de novidade com medo de errar o tom no coletivo — quem testa primeiro paga o preço da estranheza até isso virar norma, moda passageira ou piada interna.\n` +
    `- **Contraste útil:** por um lado, o sinal promete ${promessa}; por outro, expõe quem fica de fora do código estético ou do meme — incluir e excluir faz parte da dinâmica simbólica.\n` +
    `- **Eco da sua hipótese (${hipShort}):** vale abrir espaço para uma segunda leitura: o incômodo pode não ser só o óbvio, mas o que esse sinal *substitui*, *reprime* ou *adianta* no dia a dia das pessoas.\n\n` +
    'Nada disso invalida a versão mais enxuta da Etapa 2; é material extra para quem curte semiótica em mais camadas.\n\n' +
    'Essa leitura (incluindo o aprofundamento) ressoa com o que você observou, ou tem outro ângulo que quer explorar? Quando quiser o pivô prático, responda **sim** ou diga que podemos seguir.'
  )
}

export function processarEtapa4(
  manifestacao: Manifestacao,
  areaAtuacao: string,
  objetivoProjeto: string
): TraducaoEstrategica {
  const aplicar = Math.random() > 0.3
  return {
    filtroRelevancia: aplicar ? 'aplicar' : 'descartar',
    motivoFiltro: aplicar
      ? `A manifestação "${manifestacao.nome}" dialoga diretamente com ${objetivoProjeto} na área de ${areaAtuacao}.`
      : `A manifestação pode distrair do foco principal do projeto em ${areaAtuacao}.`,
    soWhat: `Para o mercado de ${areaAtuacao}: isso indica uma oportunidade de ${aplicar ? 'explorar' : 'consolidar'} narrativas que ressoem com ${manifestacao.categoria.toLowerCase()}.`,
    adaptacao: `Diretriz: Use tom de voz que ${aplicar ? 'incorpora' : 'evita'} os códigos dessa manifestação. ${areaAtuacao === 'Design' ? 'Priorize materiais e formas que conversem com a camada simbólica.' : ''}`,
  }
}

export function gerarPerguntasProvocativas(area: string): string[] {
  const perguntas: Record<string, string[]> = {
    Design: [
      'Como traduzir essa tensão numa experiência física ou digital memorável?',
      'Que materiais e formas materializam melhor esse desejo latente?',
    ],
    Moda: [
      'E se o corpo virasse manifesto dessa tensão — o que mudaria nas coleções?',
      'Como vestir tendência e statement sem diluir a mensagem?',
    ],
    Branding: [
      'E se a marca ocupasse o espaço entre nostalgia e futuro de forma inédita?',
      'Que narrativa ressoa com quem sente essa tensão no dia a dia?',
    ],
    default: [
      'Como transformar essa tensão numa proposta de valor clara?',
      'Que ponte você criaria entre essa manifestação e o desejo central do público?',
    ],
  }
  return perguntas[area] || perguntas.default
}
