# Graph Report - .  (2026-08-25)

## Corpus Check
- cluster-only mode - file stats not available

## Summary
- 1178 nodes · 2407 edges · 60 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 957 · imports: 798 · imports_from: 494 · calls: 158


## Graph Freshness
- Built from Git commit: `2213aae`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `createClient()` - 61 edges
2. `requireAdmin()` - 56 edges
3. `getCurrentUserInTenant` - 34 edges
4. `obterConfigEFonte()` - 11 edges
5. `importarDriveParaAdministracao()` - 11 edges
6. `createAdminClient()` - 11 edges
7. `sanitizarHtml()` - 9 edges
8. `Ocorrencia` - 9 edges
9. `Documento` - 9 edges
10. `Assembleia` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Evento` --calls--> `formatCurrency()`  [EXTRACTED]
  portaria/src/app/(app)/fracoes/[id]/page.tsx → portaria/src/app/(app)/fornecedores/[id]/page.tsx
- `Evento` --calls--> `formatDate()`  [EXTRACTED]
  portaria/src/app/(app)/fracoes/[id]/page.tsx → portaria/src/app/(app)/fornecedores/[id]/page.tsx
- `Evento` --calls--> `iconFor()`  [EXTRACTED]
  portaria/src/app/(app)/fracoes/[id]/page.tsx → portaria/src/app/(app)/fornecedores/[id]/page.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (2): guardarTemplate(), DocumentoForm()

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (21): associarDocumentoComunicacao(), atualizarEstadoComunicacao(), atualizarEstadoDestinatario(), CANAIS, ComunicacaoFormState, criarComunicacao(), dataValida(), ESTADOS (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (25): CANAL_LABEL, CONFIRMACAO_LABEL, ContratoPage(), DestinatarioComFracao, ENTREGA_LABEL, EntregaHistorico, ESTADO_FRACAO, ESTADO_LABEL (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (33): apagarConversa(), chunkTexto(), criarConversa(), detalheConversa(), enviarMensagem(), EnviarMensagemResult, estadoConhecimento(), ingerirDocumento() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (25): atualizarEstadoTarefaManutencao(), CATEGORIAS_ATIVO, concluirTarefaManutencao(), criarAtivoManutencao(), criarPlanoManutencao(), listarAtivosManutencao(), listarOpcoesManutencao(), listarPlanosManutencao() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (28): adicionarFotografias(), adicionarNotaInterna(), alterarEstadoOcorrencia(), criarOcorrencia(), EXTENSAO_POR_TIPO, guardarFotografias(), OcorrenciaFormState, revalidarOcorrencia() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (12): atualizarAviso(), AvisoFormState, criarAviso(), desativarAviso(), reativarAviso(), AvisoActions(), AvisoForm(), AvisoFormProps (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (4): metadata, PublicFooter(), PublicHeader(), getCurrentTenant

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (13): RelatorioFornecedorImprimir(), CorpoRelatorio(), data(), euro(), Fonte, fontesUnicas(), LinhaFinanceira(), Movimento (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (25): CATEGORIAS_DESPESA, DashboardFinanceiro, ESTADOS_DESPESA, FinanceiroFormState, listarCalendarioAdministrativo(), listarContratosFinanceiro(), listarDespesas(), listarDocumentosAdministracaoFinanceiro() (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (23): AtribuicaoResultado, atribuirFornecedorMovimento(), marcarMovimentoSemFornecedor(), revalidar(), ROTAS_A_REVALIDAR, CONFIANCA_LABEL, MovimentoAtribuicao(), ConfiancaSugestao (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (3): criarBlueprint(), EspacoForm(), TemplateEditor()

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (29): agruparTimelinePorAno(), confirmacaoDeMemoria(), construirTimelineFornecedor(), ContratoTimeline, DespesaTimeline, eventoDeMemoria(), GRUPO_POR_KIND, GRUPOS_TIMELINE (+21 more)

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (5): criarExtensoes(), EditorToolbar(), RichEditor(), RichEditorProps, Accao

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (16): categoriaPorFicheiro(), CATEGORIAS_VALIDAS, DocumentoAdministracaoLoteAssinado, DocumentoAdministracaoLoteItem, DocumentoAdministracaoLotePreparacaoItem, DocumentoAdministracaoLotePreparacaoResultado, DocumentoAdministracaoLoteResultado, finalizarDocumentosAdministracaoEmLote() (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (13): atualizarEstadoDespesa(), atualizarEstadoObrigacao(), confirmarPagamentoDespesa(), decidirAprovacaoDespesa(), OpcaoFinanceira, submeterDespesaParaAprovacao(), CATEGORIAS, DespesaComRelacoes (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (26): aprovarRascunhoDocumental(), carregarSessaoDocumental(), configPadrao(), criarSessaoDocumental(), dividirMarkdown(), enviarMensagemDocumental(), exportarRascunhoDocumental(), FonteCitada (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (44): anularConvite(), baseUrl(), convidarMembro(), ConviteFormState, definirFracaoMembro(), encontrarUserIdPorEmail(), removerMembro(), ROLES_VALIDOS (+36 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (14): LandingHero(), Reveal(), RevealProps, PONTOS, SectionConfianca(), SectionCta(), PERGUNTAS, SectionIa() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (15): anularRecibo(), CalendarioAdministrativo, DespesaResumo, emitirRecibo(), gerarQuotasMensais(), centsToEuro(), formatMesAno(), TabDashboard() (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (27): apagarNotificacao(), atualizarPreferenciaNotificacoes(), contarNaoLidas(), listarNotificacoes(), marcarComoLida(), marcarTodasComoLidas(), PreferenciaState, definirVista() (+19 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (26): carregarRegulamento(), descarregarRegulamento(), dividirEmBlocos(), Fonte, perguntarConselheira(), RegulamentoState, RespostaConselheira, semearLegislacao() (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (14): atualizarDocumento(), CATEGORIAS_VALIDAS, criarDocumento(), DocumentoFormState, CATEGORIAS, DocumentoFormProps, CATEGORIAS, DocumentoUploadInline() (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (7): criarContribuicaoExtraordinaria(), CriarContribuicaoExtraordinariaState, distribuirValor(), PrestacaoInput, ContribuicaoExtraordinariaForm(), initialState, LinhaPrestacao

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (14): cancelarReserva(), criarEspaco(), criarReserva(), listarEspacos(), listarMinhasReservas(), listarReservas(), listarReservasAdmin(), OcupacaoReserva (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.31
Nodes (7): exportarBlueprintPdf(), ExportarState, slugFicheiro(), TemplateFormState, TIPOS_VALIDOS, ExportarBlueprint(), montarDocumentoHtml()

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (14): BlueprintBase, BLUEPRINTS_BASE, DadosAssembleia, DadosCircular, DadosCondominio, DadosPerfil, escaparHtml(), localidadeDeMorada() (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (6): dataHora(), ESTADO_LABEL, Mural(), EMERGENCIA_NACIONAIS, ContactoEmergencia, FuncionarioAusencia

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (16): anoAutomatico(), categoriaAutomatica(), CATEGORIAS_VALIDAS, corrigirMojibake(), DriveImportItem, DriveImportResultado, extensaoPorMime(), extrairGoogleDriveId() (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (29): abrirVotacao(), apagarVotacao(), cancelarVotacao(), criarVotacao(), detalheVotacao(), encerrarVotacao(), listarVotacoesPublicas(), QUORUM_LABEL (+21 more)

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (3): LoginForm(), RecuperarForm(), createClient()

### Community 31 - "Community 31"
Cohesion: 0.05
Nodes (43): adicionarPonto(), alterarEstadoAssembleia(), apagarAssembleia(), AssembleiaFormState, atualizarAssembleia(), criarAssembleia(), removerPonto(), revalidar() (+35 more)

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (11): apagarContacto(), atualizarContacto(), ContactoFormState, criarContacto(), ler(), texto(), ContactoActions(), ContactoForm() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (9): EstadoReconciliacao, LinhaMapaContas, MapaContasAnual, n(), obterMapaContasAnual(), euro(), MapaContasAnualView(), ResumoCard() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (7): config, lookupTenantSlug(), middleware(), resolveTenantFromHostname(), tenantCache, getSupabaseAnonKey(), getSupabaseUrl()

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (13): Fixtures, seed(), uuid(), vec1536(), anonClient(), createConfirmedUser(), deleteUsers(), hasEnv (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (15): apagarContrato(), atualizarContrato(), ContratoFormState, criarContrato(), ler(), DadosContratoExtraidos, ExtraccaoState, extrairDadosContrato() (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (6): apagarDocumento(), gerarLinkDownload(), DocumentoActions(), DocumentosFiltro(), DownloadButton(), CATEGORIAS

### Community 38 - "Community 38"
Cohesion: 0.26
Nodes (9): arquivarFornecedor(), atualizarFornecedor(), criarFornecedor(), FornecedorFormState, ler(), texto(), FornecedorArquivar(), FornecedorForm() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.23
Nodes (8): apagarFracao(), atualizarFracao(), criarFracao(), FracaoFormState, lerCampos(), texto(), FracaoActions(), FracaoForm()

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (9): DocumentoAdministracaoPreview, gerarLinkDownloadDocumentoAdministracao(), gerarPreviewDocumentoAdministracao(), DocumentoAdministracaoDownload(), DocumentoAdministracaoPreview(), CATEGORIA_LABEL, TEMA_DOCUMENTO_LABEL, TemaDocumento (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (5): IntegracoesView(), Categoria, CATEGORIAS, Conector, CONECTORES

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (10): EvidenciaFormState, garantirFonte(), juntarEvidencia(), PAPEIS, Papel, removerEvidencia(), DocumentoEscolha, EvidenciaJuntar() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (14): ContratoMemoria(), NATUREZA, NATUREZA_CLASSE, PAPEL, TIPO, conflitosDocumentais(), EventoRelatorio, PropostaComValor (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (7): Atencao, dataHoje(), euro(), Evento, HojePage(), isoHoje(), primeiroDiaMes()

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (2): AcaoImportante, createClient()

### Community 46 - "Community 46"
Cohesion: 0.32
Nodes (3): LandingFooter(), LandingHeader(), metadata

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (7): CaixaConfigurada, HostingerAddress, HostingerAttachment, HostingerMessage, json(), jsonHeaders, listarMensagensRecentes()

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (5): adicionarMensagem(), ConversaFormState, criarConversa(), ConversaMensagemForm(), ConversaNovaForm()

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (4): reconhecerAlertaOperacional(), CalendarioAdministrativo(), AlertaOperacional, EventoCalendarioAdministrativo

### Community 50 - "Community 50"
Cohesion: 0.47
Nodes (3): likeSafe(), pesquisar(), ResultadoGrupo

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (4): migrarFicheiroHistoricoParaAdministracao(), BibliotecaDocumentosAdministracao(), MigrarQuotasHistorico(), DocumentoAdministracao

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): criarDocumentoAdministracao(), DocumentoAdministracaoFormState, CATEGORIAS, DocumentoAdministracaoForm()

### Community 53 - "Community 53"
Cohesion: 0.38
Nodes (4): EventoFuturo, reunirCalendario(), TIPO_LABEL, tipoLabel()

### Community 55 - "Community 55"
Cohesion: 0.38
Nodes (4): EventoTimeline, reunirTimeline(), TIPO_LABEL, tipoLabel()

### Community 58 - "Community 58"
Cohesion: 0.60
Nodes (5): criarDespesa(), criarObrigacao(), textoOpcional(), validarRelacaoDoTenant(), valorParaCents()

### Community 60 - "Community 60"
Cohesion: 0.40
Nodes (4): RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, WebhookPayload

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 62 - "Community 62"
Cohesion: 1.00
Nodes (1): config

### Community 63 - "Community 63"
Cohesion: 1.00
Nodes (1): config

## Knowledge Gaps
- **208 isolated node(s):** `csp`, `securityHeaders`, `nextConfig`, `config`, `ESTADO_LABEL` (+203 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 0`** (2 nodes): `guardarTemplate()`, `DocumentoForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `AcaoImportante`, `createClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdmin()` connect `Community 21` to `Community 31`, `Community 6`, `Community 25`, `Community 1`, `Community 32`, `Community 36`, `Community 23`, `Community 48`, `Community 22`, `Community 14`, `Community 42`, `Community 9`, `Community 38`, `Community 39`, `Community 16`, `Community 3`, `Community 28`, `Community 4`, `Community 33`, `Community 17`, `Community 10`, `Community 5`, `Community 24`, `Community 29`, `Community 26`, `Community 53`, `Community 37`, `Community 0`, `Community 2`, `Community 41`, `Community 11`, `Community 50`, `Community 8`, `Community 7`, `Community 20`, `Community 55`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 45` to `Community 31`, `Community 6`, `Community 25`, `Community 1`, `Community 21`, `Community 32`, `Community 36`, `Community 23`, `Community 48`, `Community 22`, `Community 14`, `Community 42`, `Community 9`, `Community 38`, `Community 39`, `Community 16`, `Community 3`, `Community 28`, `Community 4`, `Community 33`, `Community 17`, `Community 10`, `Community 20`, `Community 5`, `Community 24`, `Community 29`, `Community 26`, `Community 27`, `Community 7`, `Community 51`, `Community 37`, `Community 0`, `Community 44`, `Community 2`, `Community 53`, `Community 50`, `Community 55`, `Community 11`, `Community 8`, `Community 34`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `getCurrentUserInTenant` connect `Community 20` to `Community 21`, `Community 22`, `Community 9`, `Community 3`, `Community 5`, `Community 24`, `Community 29`, `Community 31`, `Community 6`, `Community 51`, `Community 37`, `Community 0`, `Community 44`, `Community 2`, `Community 28`, `Community 14`, `Community 17`, `Community 48`, `Community 11`, `Community 7`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `csp`, `securityHeaders`, `nextConfig` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11231884057971014 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.058029689608636977 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07716701902748414 - nodes in this community are weakly interconnected._