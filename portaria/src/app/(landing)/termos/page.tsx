import type { Metadata } from "next";
import {
  LegalPage,
  type LegalSection,
} from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: { absolute: "Termos de Serviço — Portaria" },
  description:
    "Termos de utilização da plataforma Portaria de administração de condomínios.",
};

const SECOES: LegalSection[] = [
  {
    titulo: "1. O que é a plataforma",
    paragrafos: [
      "A Portaria é um serviço de administração de condomínios: gestão de membros e frações, ocorrências, documentos, assembleias, financeiro, reservas, comunicações e ferramentas de apoio, incluindo funcionalidades de inteligência artificial quando ativas. Cada condomínio é um espaço isolado; o que lhe diz respeito só é visível dentro do seu condomínio.",
    ],
  },
  {
    titulo: "2. Acesso e conta",
    lista: [
      "O acesso é feito por convite da administração do condomínio, com o email que esta indicar, e depende da aceitação do convite.",
      "Cada utilizador tem um papel definido pela administração (administração, comissão, condómino, inquilino), que determina o que pode ver e fazer. Inquilinos não acedem a documentos confidenciais da administração (contas, atas, contratos, apólices).",
      "É responsável pela confidencialidade da sua palavra-passe e pela veracidade dos dados que submete.",
    ],
  },
  {
    titulo: "3. Utilização da plataforma",
    paragrafos: [
      "Compromete-se a não aceder a espaços de outros condomínios, a não tentar contornar os controlos de acesso, a não injetar conteúdo malicioso, a não tratar a plataforma como canal oficial de convocatórias ou deliberações sem que o condomínio assim o configure, nem a usar o serviço para fins ilícitos. A administração do condomínio é responsável pela veracidade dos dados que recenseia e pelas comunicações que faz através da plataforma.",
    ],
  },
  {
    titulo: "4. Conteúdo submetido",
    paragrafos: [
      "Os documentos, fotografias, ocorrências e textos que submete pertencem a quem os submeteu ou a quem este representa. Ao carregá-los, autoriza a Portaria a armazená-los e tratá-los para prestar o serviço ao seu condomínio — nada mais. A Portaria não utiliza o conteúdo de um condomínio para servir outro condomínio. A administração responde pela licitude dos documentos que publica internamente (ex.: ter autorização para publicar uma ata ou um contrato).",
    ],
  },
  {
    titulo: "5. Inteligência artificial",
    paragrafos: [
      "As funcionalidades de IA (assistente, Conselheira, pesquisa semântica, extração de dados de contratos), quando ativas:",
    ],
    lista: [
      "respondem com base nos documentos e informações do seu condomínio e citam as fontes quando existem;",
      "podem enganar-se ou não encontrar a informação; não substituem aconselhamento jurídico nem a leitura dos documentos originais;",
      "podem processar partes do conteúdo do condomínio através de prestadores de serviços de IA, nos termos da Política de Privacidade (secção 5) e da lista de destinatários vigente;",
      "as extrações automáticas de contratos são rascunhos de apoio: a administração confirma sempre os dados extraídos antes de os tratar como corretos.",
    ],
  },
  {
    titulo: "6. Dados pessoais",
    paragrafos: [
      "O tratamento de dados pessoais rege-se pela Política de Privacidade publicada em /privacidade, pelo contrato de subcontratação entre a Portaria e o condomínio e pelos documentos aí referidos (retenção, direitos, subcontratantes).",
    ],
  },
  {
    titulo: "7. Disponibilidade",
    paragrafos: [
      "A plataforma está em evolução contínua e fases de acesso limitado (beta). Não há garantia de disponibilidade ininterrupta; podem existir interrupções para manutenção. As funcionalidades dependem de serviços externos (email, inteligência artificial): quando um serviço externo está indisponível ou não configurado, a funcionalidade correspondente fica temporariamente inativa, sem perda dos dados.",
    ],
  },
  {
    titulo: "8. Propriedade intelectual da plataforma",
    paragrafos: [
      "O software, o desenho e a marca da Portaria pertencem à sua autora. Estes termos não transferem qualquer direito sobre a plataforma; concedem-lhe apenas o direito de a usar enquanto membro de um condomínio cliente.",
    ],
  },
  {
    titulo: "9. Limitação de responsabilidade",
    paragrafos: [
      "Na máxima extensão permitida por lei, a Portaria não responde por danos indiretos, perda de dados imputável à administração do condomínio, nem por decisões tomadas com base nas informações apresentadas pela plataforma (incluindo respostas de IA). A responsabilidade da Portaria perante o condomínio encontra-se regulada no contrato de prestação de serviços.",
    ],
  },
  {
    titulo: "10. Cessação",
    paragrafos: [
      "A administração do condomínio pode remover um membro a qualquer momento, e o próprio membro pode deixar de ter acesso a pedido da administração. No fim do contrato entre a Portaria e o condomínio, os dados são devolvidos ou eliminados nos termos contratuais.",
    ],
  },
  {
    titulo: "11. Alterações destes termos",
    paragrafos: [
      "Alterações relevantes são publicadas nesta página com aviso prévio razoável e comunicadas aos condomínios; alterações ao conjunto de subcontratantes têm 30 dias de aviso prévio, nos termos contratuais.",
    ],
  },
  {
    titulo: "12. Lei aplicável",
    paragrafos: [
      "Aplica-se a lei portuguesa. Contacto: [nome e email de contacto da Portaria — a indicar].",
    ],
  },
];

export default function TermosPage() {
  return (
    <LegalPage
      titulo="Termos de Serviço"
      intro="Versão de 2 de setembro de 2026. Estes termos regem a utilização da plataforma Portaria («Plataforma»), explorada por GAVINHO — Arq.ª Inês Gavinho [NIPC e morada — a indicar] («Portaria»). O contrato de prestação de serviços e o contrato de subcontratação de tratamento de dados entre a Portaria e cada condomínio prevalecem sobre estes termos em caso de conflito."
      secoes={SECOES}
    />
  );
}
