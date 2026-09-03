# Graph Report - .  (2026-09-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2157 nodes · 6407 edges · 107 communities (94 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85e8f3a5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]

## God Nodes (most connected - your core abstractions)
1. `requireAdmin()` - 321 edges
2. `createClient()` - 160 edges
3. `getCurrentUserInTenant` - 143 edges
4. `createAdminClient()` - 36 edges
5. `NotFound()` - 29 edges
6. `sanitizarHtml()` - 27 edges
7. `Ocorrencia` - 21 edges
8. `Documento` - 21 edges
9. `getCurrentTenant` - 20 edges
10. `seed()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `obterMapaContasAnual()` --calls--> `soma`  [INFERRED]
  portaria/src/lib/actions/mapa-contas.ts → portaria/tests/valores-fornecedor.test.ts
- `baseUrl()` --calls--> `headers`  [INFERRED]
  portaria/src/lib/actions/membros.ts → portaria/tests/ia-local.test.ts
- `CorpoFornecedor()` --calls--> `NotFound()`  [INFERRED]
  portaria/src/app/(app)/fornecedores/[id]/page.tsx → portaria/src/app/not-found.tsx
- `CorpoRelatorio()` --calls--> `NotFound()`  [INFERRED]
  portaria/src/app/(app)/fornecedores/[id]/relatorio/page.tsx → portaria/src/app/not-found.tsx
- `BlueprintPage()` --calls--> `NotFound()`  [INFERRED]
  portaria/src/app/(app)/blueprints/[id]/page.tsx → portaria/src/app/not-found.tsx

## Communities (107 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (97): anularPagamento(), anularRecibo(), associarDocumentoDespesa(), atualizarEstadoDespesa(), atualizarEstadoObrigacao(), atualizarQuota(), CalendarioAdministrativo, CATEGORIAS_DESPESA (+89 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (71): apagarNotificacao(), atualizarPreferenciaNotificacoes(), contarNaoLidas(), listarNotificacoes(), marcarComoLida(), marcarTodasComoLidas(), PreferenciaState, apagarEspaco() (+63 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (57): apagarContacto(), atualizarContacto(), ContactoFormState, criarContacto(), ler(), texto(), ContactoActions(), ContactoForm() (+49 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (52): adicionarFotografias(), adicionarNotaInterna(), alterarEstadoOcorrencia(), criarOcorrencia(), EXTENSAO_POR_TIPO, guardarFotografias(), OcorrenciaFormState, revalidarOcorrencia() (+44 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (49): Fixtures, seed(), uid(), uuid(), vec1536(), anonClient(), createConfirmedUser(), deleteUsers() (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (40): criarContribuicaoExtraordinaria(), CriarContribuicaoExtraordinariaState, distribuirValor(), PrestacaoInput, apagarFracao(), atualizarFracao(), criarFracao(), FracaoFormState (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (37): abrirVotacao(), apagarVotacao(), atualizarVotacao(), cancelarVotacao(), criarVotacao(), detalheVotacao(), encerrarVotacao(), listarVotacoesAdmin() (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (41): AcontecimentoFormState, corrigirAcontecimento(), criarAcontecimento(), revalidarDossie(), mudarEstadoPosicao(), PosicaoFormState, registarPosicao(), revalidarDossie() (+33 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (39): atualizarEstadoTarefaManutencao(), CATEGORIAS_ATIVO, concluirTarefaManutencao(), criarAtivoManutencao(), criarPlanoManutencao(), listarAtivosManutencao(), listarOpcoesManutencao(), listarPlanosManutencao() (+31 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (24): adicionarPonto(), alterarEstadoAssembleia(), apagarAssembleia(), AssembleiaFormState, atualizarAssembleia(), criarAssembleia(), removerPonto(), revalidar() (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (28): apagarConversa(), buscarDocumentos(), chunkTexto(), criarConversa(), detalheConversa(), enviarMensagem(), EnviarMensagemResult, estadoConhecimento() (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (32): Aviso(), CANAL_LABEL, ComunicacaoDetalhePage(), CONFIRMACAO_LABEL, ContratoPage(), ContribuicaoExtraordinariaDetalhePage(), DestinatarioComFracao, ENTREGA_LABEL (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (22): apagarDocumento(), atualizarDocumento(), CATEGORIAS_VALIDAS, checksumDe(), criarDocumento(), DocumentoFormState, gerarLinkDownload(), CATEGORIAS (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (25): aprovarRascunhoDocumental(), carregarSessaoDocumental(), configPadrao(), criarSessaoDocumental(), dividirMarkdown(), enviarMensagemDocumental(), exportarRascunhoDocumental(), FonteCitada (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (24): deepseekChat(), deepseekConfigurado(), DeepSeekMessage, DeepSeekResponse, gerarTituloConversa(), getKey(), getModel(), chatLocal() (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (15): LandingHero(), LandingPage(), Reveal(), RevealProps, PONTOS, SectionConfianca(), SectionCta(), PERGUNTAS (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (19): anularConvite(), baseUrl(), convidarMembro(), ConviteFormState, definirFracaoMembro(), encontrarUserIdPorEmail(), removerMembro(), ROLES_VALIDOS (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (26): anularPagamentoProvisorio(), listarMovimentosRecebimento(), MovimentoRecebimento, RecebimentoResultado, RecebimentosListagem, registarPagamentoDeMovimento(), revalidar(), CONFIANCA_LABEL (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (28): agruparTimelinePorAno(), construirTimelineFornecedor(), resumirFinanceiroFornecedor(), unirMovimentos(), CorpoFornecedor(), cenarioPinturasVerticais(), comImputacao, confirmados (+20 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (21): categoriaPorFicheiro(), CATEGORIAS_VALIDAS, DocumentoAdministracaoLoteAssinado, DocumentoAdministracaoLoteItem, DocumentoAdministracaoLotePreparacaoItem, DocumentoAdministracaoLotePreparacaoResultado, DocumentoAdministracaoLoteResultado, DocumentoAdministracaoPreview (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (22): associarDocumentoComunicacao(), atualizarEstadoComunicacao(), atualizarEstadoDestinatario(), CANAIS, ComunicacaoFormState, criarComunicacao(), dataValida(), ESTADOS (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (26): 1. Pré-requisitos, 2. Instalar dependências, 3. Configurar variáveis de ambiente, 4. Aplicar a migration inicial no Supabase, 5. Criar o teu utilizador admin, 6. Correr em desenvolvimento, Arquitetura multi-tenant, Arranque rápido (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (22): apurarTotais(), agruparImputacoes(), haDivergencia(), ImputacaoDeMovimento, ORDEM_PARTE, PARTE_LABEL, PosicaoApresentada, TIPO_LABEL (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (17): carregarRegulamento(), descarregarRegulamento(), dividirEmBlocos(), perguntarConselheira(), RegulamentoState, RespostaConselheira, semearLegislacao(), SemearState (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (23): confirmacaoDeMemoria(), ContratoTimeline, DespesaTimeline, eventoDeMemoria(), GRUPO_POR_KIND, GRUPOS_TIMELINE, KIND_POR_MEMORIA_TIPO, kindDeMemoria() (+15 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority, clsx, lucide-react, mammoth, next, react, react-dom (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (18): COLUNAS_DESPESAS, COLUNAS_MOVIMENTOS, COLUNAS_RECONCILIACAO, DadosRelatorio, Celula(), Coluna, dataCurta(), dataLonga() (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (7): GET(), RecuperarConfirmarPage(), FornecedoresPage(), AcaoImportante, reunirAcoes(), saudacao(), createClient()

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (11): LoginForm(), RecuperarForm(), RecuperarPage(), config, lookupTenantSlug(), middleware(), resolveTenantFromHostname(), tenantCache (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (13): atualizarAviso(), AvisoFormState, criarAviso(), desativarAviso(), reativarAviso(), AvisoActions(), AvisoForm(), AvisoFormProps (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (16): criarBlueprint(), exportarBlueprintPdf(), ExportarState, guardarTemplate(), slugFicheiro(), TIPOS_VALIDOS, ExportarBlueprint(), NovoAvisoPage() (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (17): anoAutomatico(), categoriaAutomatica(), CATEGORIAS_VALIDAS, corrigirMojibake(), DriveImportItem, DriveImportResultado, extensaoPorMime(), extrairGoogleDriveId() (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.23
Nodes (15): BlueprintsPage(), BlueprintPage(), BlueprintBase, BLUEPRINTS_BASE, DadosAssembleia, DadosCircular, DadosCondominio, DadosPerfil (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (20): anexos, apiToken, caixa, CaixaConfigurada, caixas, comparaSegredo(), HostingerAddress, HostingerAttachment (+12 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (17): comEvidencia, CONDOMINIO, CONTRAPARTE, copia, DESPESAS, entrada, foraDoPeriodo, [imputacao] (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (13): RelatorioFornecedorImprimir(), anoDe(), CorpoRelatorio(), data(), euro(), Fonte, fontesUnicas(), LinhaFinanceira() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (14): EstadoReconciliacao, LinhaMapaContas, MapaContasAnual, n(), obterMapaContasAnual(), badgeEstado(), classeDesvio(), euro() (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (10): arquivarFornecedor(), atualizarFornecedor(), criarFornecedor(), FornecedorFormState, ler(), texto(), FornecedorArquivar(), FornecedorForm() (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (11): apagarContrato(), atualizarContrato(), ContratoFormState, criarContrato(), ler(), ContratoActions(), Campos, ContratoForm() (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (8): ConvitePage(), HistoriaPage(), metadata, PublicFooter(), PublicHeader(), LoginPage(), PublicLayout(), getCurrentTenant

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (18): code:bash ($graphify                                             # full), code:bash (npm install -g @sentropic/graphify), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash (graphify watch "INPUT_PATH" --debounce 3), Configured Project Profiles (+10 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (14): apagarRegra(), aplicarRegrasPendentes(), criarRegra(), listarRegras(), RegraFormResultado, RegraListada, revalidar(), ROTAS_A_REVALIDAR (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (10): gerarLinkDownloadDocumentoAdministracao(), migrarFicheiroHistoricoParaAdministracao(), BibliotecaDocumentosAdministracao(), DocumentoAdministracaoDownload(), MigrarQuotasHistorico(), DocumentosAdministracaoPage(), TEMA_DOCUMENTO_LABEL, TemaDocumento (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.26
Nodes (10): DocumentoActions(), Chip(), DocumentosFiltro(), ConfigDocumentosPage(), DocumentoLinha(), DocumentosPage(), CATEGORIA_LABEL, CATEGORIAS (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.26
Nodes (12): atualizarPerfilCondominio(), guardarLogo(), LOGO_EXT, LOGO_TIPOS, PerfilFormState, texto(), Campo(), PerfilForm() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (14): ConfiancaSugestao, contraparteTemAlias(), MovimentoAtribuivel, normalizar(), PALAVRAS_VAZIAS, ResumoTriagem, sugerirFornecedores(), tokensSignificativos() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (14): FracaoCandidata, A, B, C, dono, oito, primeiro, qualquer (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (11): TemplateFormState, criarExtensoes(), EditorToolbar(), Separator(), ToolbarButton(), RichEditor(), RichEditorProps, Accao (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (16): ChaveHashReferencia, COLUNAS, dataIso(), ErroLinha, extrairMetadados(), LinhaExtrato, linhaVazia(), MetadadosExtrato (+8 more)

### Community 50 - "Community 50"
Cohesion: 0.26
Nodes (13): CONFIANCA_LABEL, MovimentoAtribuicao(), AliasFornecedor, estadoAtribuicao, FornecedorCandidato, resumirTriagem(), SugestaoFornecedor, AtribuicaoMovimentosPage() (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (14): agruparPorAno(), codigoDe(), FonteReferenciada, indexarEvidencias(), IndiceEvidencias, Citacao, conflito, eventos (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (12): DadosContratoExtraidos, ExtraccaoState, extrairDadosContrato(), extrairJson(), JSON_SCHEMA, normalizarData(), texto(), ePdf() (+4 more)

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (10): Card(), Chip(), IntegracoesView(), Logo(), PainelConfigurar(), IntegracoesPage(), Categoria, CATEGORIAS (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.23
Nodes (12): RelatorioFornecedor(), conflitosDocumentais(), EventoRelatorio, PropostaComValor, propostasComValor(), citacoes, evento(), EVENTOS (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): ConselheiraConfig(), estadoConhecimento, regulamentoDoTenant(), DownloadRegulamento(), ConselheiraConfigPage(), RegulamentoPage(), createAdminClient()

### Community 56 - "Community 56"
Cohesion: 0.13
Nodes (15): code:bash (graphify cite .                 # no-key heuristic grounding), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash (rm -f .graphify/.graphify_detect.json .graphify/.graphify_de), code:text (Graph complete. Outputs in PATH_TO_DIR/.graphify/), code:bash (GRAPHIFY_BRANCH_FLAG=""), code:bash (GRAPHIFY_BIN=$(command -v graphify 2>/dev/null || true)), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r) (+7 more)

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (10): EvidenciaFormState, garantirFonte(), juntarEvidencia(), PAPEIS, Papel, removerEvidencia(), DocumentoEscolha, EvidenciaJuntar() (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (10): emChunks(), emEuros(), formatarData(), importarExtratoBcp(), ImportarExtratoEstado, ImportarExtratoForm(), validarCadeiaSaldos(), aplicarRegrasAMovimentos() (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.21
Nodes (7): LegalPage(), LegalSection, metadata, seccaoIA, SECOES, metadata, SECOES

### Community 60 - "Community 60"
Cohesion: 0.23
Nodes (10): NotFound(), EditarAvisoPage(), EditarContactoPage(), EditarContratoPage(), EditarDocumentoPage(), EditarFornecedorPage(), EditarFracaoPage(), EditarTemplatePage() (+2 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @tailwindcss/typography, @types/node (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (8): MovimentoRelatorio, TotaisRelatorio, despesas, eventos, movimentos, semContratos, semDespesa, totais

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (7): aceitarConvitePendente(), ConviteAcaoState, ConvitePendente, exigirAutenticacao(), recusarConvitePendente(), ConvitesPendentes(), ROLE_LABEL

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (6): adicionarMensagem(), apagarConversa(), ConversaFormState, criarConversa(), ConversaMensagemForm(), ConversaNovaForm()

### Community 65 - "Community 65"
Cohesion: 0.17
Nodes (12): code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:text (You are a graphify extraction subagent. Read the files liste), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash (GRAPHIFY_DIRECTED_FLAG=""), Part A - Structural extraction for code files, Part B - Semantic extraction with Codex, Step 3 - Extract entities and relationships (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (9): extrairContraparte(), hashReferencia(), buffer, cadeia, chave, folha, livro, movimentos (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.30
Nodes (10): ContratoMemoria(), dataCurta(), Evidencia(), NATUREZA, NATUREZA_CLASSE, PAPEL, TIPO, ContratoMemoriaEvento (+2 more)

### Community 68 - "Community 68"
Cohesion: 0.32
Nodes (8): Fonte, contextoDaPagina(), ContextoPagina, CONTEXTOS, GERAL, ArcoPortaria(), Conselheira(), Troca

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (5): LandingFooter(), ArchMark(), LandingHeader(), LandingLayout(), metadata

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (10): Arranque manual (desenvolvimento / teste), Arranque permanente (launchd), code:sh (uv run --with mlx-lm python -m mlx_lm.server \), code:sh (curl -s http://127.0.0.1:8098/v1/chat/completions \), code:sh (cd scripts/mlx-local), code:block4 (MLX_CHAT_URL=http://127.0.0.1:8098        # liga o chat loca), Exposição para produção (a decisão da Inês), IA local (MLX) — servidor de chat Qwen3-8B-4bit (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (10): code:bash (# Default state dir is .graphify; pass --profile <path> to e), code:bash (graphify wiki describe --graph .graphify/graph.json --mode a), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash (graphify serve .graphify/graph.json), code:bash (codex mcp add graphify -- graphify serve /absolute/path/to/.) (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.24
Nodes (6): ClassificacaoPorRegra, MovimentoClassificavel, RegraClassificacao, classificacoes, duplicadas, regras

### Community 73 - "Community 73"
Cohesion: 0.47
Nodes (5): CalendarioPage(), EventoFuturo, reunirCalendario(), TIPO_LABEL, tipoLabel()

### Community 74 - "Community 74"
Cohesion: 0.47
Nodes (5): EventoTimeline, reunirTimeline(), TIPO_LABEL, tipoLabel(), TimelinePage()

### Community 75 - "Community 75"
Cohesion: 0.39
Nodes (5): criarDocumentoAdministracao(), DocumentoAdministracaoFormState, CATEGORIAS, DocumentoAdministracaoForm(), NovoDocumentoAdministracaoPage()

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (4): likeSafe(), pesquisar(), ResultadoGrupo, PesquisaPage()

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (6): AtribuicaoResultado, atribuirFornecedorMovimento(), imputarMovimentoADespesa(), marcarMovimentoSemFornecedor(), revalidar(), ROTAS_A_REVALIDAR

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (8): code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash (node -e "), code:bash (cat > .graphify/.graphify_semantic.json <<'EOF'), code:bash (GRAPHIFY_WHISPER_FLAG=""), code:bash (cp .graphify/graph.json .graphify/.graphify_old.json), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), code:bash (rm -f .graphify/.graphify_old.json .graphify/.graphify_incre), For --update

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:security, type-check

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (7): Achados — estado (descobertos ao construir esta rede), code:bash (# 1. Supabase local — aplica todas as migrações), Como correr, Lacunas de cobertura conhecidas, Mapa de cobertura (tabela → ficheiro → perspetivas), Notas, Testes de segurança (RLS) — matriz multi-tenant

### Community 81 - "Community 81"
Cohesion: 0.36
Nodes (6): prefs, RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, tipoLabel, WebhookPayload

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (4): grafo, historico, orfas, vivos

### Community 84 - "Community 84"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 85 - "Community 85"
Cohesion: 0.60
Nodes (3): sugerirResolucao(), SugestaoIA(), SugestaoIAProps

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 87 - "Community 87"
Cohesion: 0.50
Nodes (3): graphify, Migrations, Regras específicas do PORTARIA (medidas e ratificadas)

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (3): graphify, Migrations, Regras específicas do PORTARIA (medidas e ratificadas)

### Community 89 - "Community 89"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 93 - "Community 93"
Cohesion: 0.67
Nodes (3): code:bash (GRAPHIFY_SCOPE_FLAG="--scope auto"), code:text (Corpus: X files · ~Y words), Step 2 - Detect files

### Community 94 - "Community 94"
Cohesion: 0.67
Nodes (3): code:bash (graphify summary --graph .graphify/graph.json), code:bash ($(cat .graphify/.graphify_node) "$(cat .graphify/.graphify_r), For $graphify query

## Knowledge Gaps
- **383 isolated node(s):** `PreToolUse`, `PreToolUse`, `grafo`, `historico`, `vivos` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdmin()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 23`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 48`, `Community 50`, `Community 52`, `Community 53`, `Community 55`, `Community 57`, `Community 58`, `Community 60`, `Community 64`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 85`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 27` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 23`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 48`, `Community 50`, `Community 55`, `Community 57`, `Community 58`, `Community 60`, `Community 63`, `Community 64`, `Community 73`, `Community 74`, `Community 76`, `Community 77`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `getCurrentUserInTenant` connect `Community 1` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 16`, `Community 19`, `Community 23`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 40`, `Community 43`, `Community 44`, `Community 45`, `Community 55`, `Community 60`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `NotFound()` (e.g. with `ConversaPage()` and `CorpoFornecedor()`) actually correct?**
  _`NotFound()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `PreToolUse`, `grafo` to the rest of the system?**
  _383 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.058381984987489574 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05053651782623745 - nodes in this community are weakly interconnected._