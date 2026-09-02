import type { Metadata } from "next";
import {
  LegalPage,
  type LegalSection,
} from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: { absolute: "Política de Privacidade — Portaria" },
  description:
    "Como a Portaria e o seu condomínio tratam os dados pessoais na plataforma.",
};

// Secção 5 escolhida pela realidade atual (IA ativa, provedores fora da UE,
// base de transferência por fechar). Quando a decisão L-44 for registada em
// docs/legal/decisao-ia-l44.md, atualizar este bloco: a variante alternativa
// está em docs/legal/conteudo-privacidade-termos.md.
const seccaoIA: LegalSection = {
  titulo: "5. Inteligência artificial",
  paragrafos: [
    "As funcionalidades de inteligência artificial da plataforma (assistente, Conselheira, pesquisa semântica, extração de dados de contratos) podem processar partes do conteúdo do seu condomínio — por exemplo, descrições de ocorrências resolvidas, perguntas escritas, o regulamento e documentos publicados pela administração — através de prestadores de serviços de IA indicados na secção 4 (à data desta versão, OpenAI, nos Estados Unidos, e DeepSeek, na China).",
    "A base jurídica das transferências internacionais envolvidas está a ser finalizada no registo de subcontratantes da Portaria e será anexada ao contrato do seu condomínio. O conteúdo do seu condomínio não é usado para treinar modelos.",
    "Se se opuser a este processamento, envie um email para [email de contacto — a indicar] com o assunto «Oposição — IA». A sua oposição é transmitida à administração do seu condomínio, que determina a exclusão do conteúdo do âmbito da IA. Para as notificações por email, pode desativá-las imediatamente nas definições do seu perfil (ver secção 7).",
  ],
};

const SECOES: LegalSection[] = [
  {
    titulo: "1. Quem trata os seus dados",
    paragrafos: [
      "Cada condomínio que usa a plataforma é o responsável pelo tratamento dos dados pessoais dos seus condóminos, inquilinos, membros de comissões e contactos: é a administração do seu condomínio que decide que dados são recenseados e com que fins. A Portaria é subcontratante (prestadora de serviço): trata esses dados por conta e ordem do condomínio, e é também responsável pelo tratamento dos dados de acesso à própria plataforma (email, sessão, preferências).",
      "Em caso de dúvida sobre quem decidiu um determinado tratamento, comece pela administração do seu condomínio; a Portaria apoia tecnicamente ambos.",
    ],
  },
  {
    titulo: "2. Que dados são tratados",
    lista: [
      "Identificação e contacto: nome, fração, email, telefone; qualidade (proprietário, inquilino, comissão, administração).",
      "Dados da fração e do condomínio: permilagem, frações, logótipo, regulamento.",
      "Conteúdo submetido: ocorrências (com descrições e fotografias), avisos e mural, documentos (incluindo atas, contas, contratos e apólices em área confidencial), convocatórias e atas de assembleias, comunicações formais.",
      "Dados financeiros do condomínio: quotas, pagamentos, recibos, despesas, obrigações e contribuições; memória e imputações de processos de fornecedores.",
      "Reservas de espaços comuns e votações, quando estas funcionalidades estiverem ativas.",
      "Conversas com o assistente de inteligência artificial (perguntas, respostas e fontes citadas).",
      "Email: os emails dos membros são usados para enviar notificações do condomínio; caixas de correio ligadas à plataforma podem receber mensagens de fornecedores (com anexos).",
      "Dados técnicos: sessão de início de sessão, data e hora, preferências (ex.: vista e receção de email).",
    ],
    paragrafos: [
      "A plataforma não recolhe propositadamente categorias especiais de dados (ex.: saúde, opiniões políticas). O conteúdo de livre descrição pode contê-las por iniciativa de quem escreve; evite incluir este tipo de informação em ocorrências e notas.",
    ],
  },
  {
    titulo: "3. Finalidades e bases legais",
    tabela: {
      colunas: ["Finalidade", "Base legal"],
      linhas: [
        [
          "Gestão do condomínio: membros, frações, ocorrências, documentos, assembleias, financeiro, reservas, comunicações",
          "Execução do contrato entre o responsável (condomínio) e a Portaria; interesse legítimo do funcionamento do condomínio",
        ],
        [
          "Notificações por email sobre atividade do condomínio",
          "Execução do contrato; pode desativar (ver secção 7)",
        ],
        [
          "Assistente de IA, Conselheira e biblioteca documental",
          "Interesse legítimo na prestação do serviço; o conteúdo do seu condomínio só é usado para servir o próprio condomínio",
        ],
        [
          "Segurança, isolamento entre condomínios e prevenção de abuso",
          "Interesse legítimo; obrigação legal de segurança (RGPD art. 32.º)",
        ],
        [
          "Faturação do serviço ao condomínio",
          "Obrigação legal e execução do contrato",
        ],
      ],
    },
  },
  {
    titulo: "4. Quem recebe os dados",
    paragrafos: [
      "A Portaria recorre a um número limitado de prestadores («subcontratantes ulteriores»), contratados com as garantias do artigo 28.º do RGPD. A lista vigente, com serviço e condições, é mantida no registo da Portaria e anexada a cada contrato de subcontratação. Em síntese, à data desta versão:",
      "Os provedores de IA ativos em cada momento constam da mesma lista; qualquer alteração é comunicada aos condomínios com 30 dias de antecedência.",
    ],
    lista: [
      "Supabase — alojamento da base de dados, autenticação e ficheiros (União Europeia, região eu-west-1/Irlanda);",
      "Netlify — alojamento da aplicação;",
      "Resend — envio de email transacional (endereço de email e conteúdo das notificações);",
      "Hostinger — caixas de correio externas ligadas ao condomínio, quando ativas;",
      "Provedores de IA — conforme a secção 5.",
    ],
  },
  seccaoIA,
  {
    titulo: "6. Durante quanto tempo conservamos os dados",
    paragrafos: [
      "Os prazos de conservação são definidos pelo responsável (o seu condomínio), com os valores por omissão propostos pela Portaria na política de retenção, anexa a cada contrato. Em síntese: dados de conta enquanto o acesso estiver ativo; ocorrências até 5 anos após resolução; conversas de IA até 12 meses (e apagáveis por si a qualquer momento); notificações e reservas até 12 meses; documentos e dados financeiros enquanto o condomínio os tiver de conservar por lei; caixas de correio e convites por prazos curtos definidos na mesma política. No fim do contrato com um condomínio, os dados são devolvidos ou eliminados, nos termos contratuais.",
    ],
  },
  {
    titulo: "7. Os seus direitos e como exercê-los",
    paragrafos: [
      "Pode pedir à administração do seu condomínio, ou enviar à Portaria ([email de contacto — a indicar]), um pedido de acesso, retificação, apagamento, limitação, portabilidade ou oposição quanto aos seus dados.",
    ],
    lista: [
      "A resposta é dada pela administração do seu condomínio, com apoio técnico da Portaria, no prazo legal de 1 mês.",
      "Se o pedido chegar diretamente à Portaria, é reencaminhado à administração do seu condomínio no prazo máximo de 5 dias úteis.",
      "Notificações por email: pode desativá-las sozinho, a qualquer momento, nas definições do seu perfil na plataforma (preferência «receber email deste prédio»). A desativação cessa o envio de emails, mantendo as notificações dentro da aplicação.",
      "Conversas de IA: pode apagar as suas conversas na própria aplicação.",
      "Tem direito a apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em www.cnpd.pt.",
    ],
  },
  {
    titulo: "8. Segurança",
    paragrafos: [
      "A plataforma isola cada condomínio ao nível da base de dados (políticas de acesso por linha, testadas automaticamente em cada alteração), restringe documentos sensíveis por perfil, serve ficheiros privados por endereços temporários de curta duração e nunca expõe chaves de administração ao navegador. Os cookies utilizados são estritamente necessários (sessão) e de preferência de visualização; não há publicidade nem rastreio de terceiros.",
    ],
  },
  {
    titulo: "9. Contacto",
    lista: [
      "Administração do seu condomínio: contacto a indicar pelo condomínio.",
      "Portaria (subcontratante): [nome e email de contacto — a indicar].",
      "CNPD: Comissão Nacional de Proteção de Dados, www.cnpd.pt.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <LegalPage
      titulo="Política de Privacidade"
      intro="Versão de 2 de setembro de 2026. Aplica-se à plataforma Portaria (a «Plataforma»), explorada por GAVINHO — Arq.ª Inês Gavinho [NIPC e morada — a indicar] («Portaria»)."
      secoes={SECOES}
    />
  );
}
