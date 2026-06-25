import { usePublicData } from "@/hooks/usePublicData";

export interface QuantityOption {
  qty: number;
  popular: boolean;
}

export interface CampanhaAnterior {
  nome: string;
  descricao: string;
  imagem: string;
  data: string;
  cotaGanhadora: string;
  nomeGanhador: string;
}

export const DEFAULT_SITE_TITLE = "Seu Sorteio | Campanhas";
export const DEFAULT_CAMPAIGN_NAME = "20.000,00 no seu PIX!";
export const DEFAULT_PRIZE_BANNER = "SÃO 20 MIL REAIS DIRETO NO SEU PIX!";
export const DEFAULT_TOTAL_COTAS = 999999;

export const DEFAULT_QUANTITY_OPTIONS: QuantityOption[] = [
  { qty: 50, popular: false },
  { qty: 250, popular: true },
  { qty: 500, popular: false },
  { qty: 1000, popular: false },
];

export const DEFAULT_REGULAMENTO = `1. PARTICIPAÇÃO

1.1. Poderão se inscrever no sorteio apenas pessoas físicas com idade igual ou superior a 18 (dezoito) anos, residentes e domiciliadas em território nacional.

1.2. Para validar a participação, o interessado deverá adquirir títulos no valor unitário de R$ 0,03 (três centavos), valor que poderá, eventualmente, ser oferecido em campanhas promocionais por preços menores. O pagamento deverá ser realizado em até 10 (dez) minutos após a geração do link de compra. Após esse prazo, o link perderá a validade automaticamente, sendo necessário gerar um novo para tentar novamente.

1.3. A organização do sorteio se reserva o direito de cancelar ou invalidar qualquer participação que utilize métodos fraudulentos, manipule o sistema, ou comprometa a integridade e o bom andamento da ação.

1.4. A participação implica total ciência e concordância com todos os termos e condições deste regulamento.

1.5. É de total responsabilidade do participante fornecer dados corretos e atualizados no momento do cadastro, especialmente nome completo e número de telefone. A organização não se responsabiliza por erros que inviabilizem o contato com o ganhador.

1.6. O participante deverá acessar a plataforma oficial para consultar os números adquiridos.

1.7. A organização não possui acesso para alterar as informações cadastrais do participante. Qualquer correção deverá ser feita pelo próprio usuário.

1.8. Cabe exclusivamente ao participante conferir os números comprados e os dados fornecidos.

2. SORTEIO

2.1. A data do sorteio será amplamente divulgada, após a venda de, no mínimo, 50% (cinquenta por cento) dos títulos disponibilizados.

2.2. A apuração será baseada nos resultados da Loteria Federal da Caixa Econômica Federal.

2.3. O número vencedor será determinado com base na combinação dos números sorteados pela Loteria Federal.

2.4. A organização não fará alterações nos resultados da Loteria Federal, sendo o resultado público e imutável.

3. PREMIAÇÃO

3.1. O prêmio será de R$ 20.000,00 (vinte mil reais), pagos diretamente via PIX ao ganhador.

3.2. O ganhador será notificado exclusivamente pelo telefone informado no cadastro. Não sendo possível o contato, o prêmio será considerado renunciado.

3.3. O prêmio não é transferível a terceiros.

3.4. O pagamento será realizado em até 3 (três) dias úteis após a confirmação do resultado.

4. DISPOSIÇÕES GERAIS

4.1. A organização se reserva o direito de alterar este regulamento, incluindo datas, valores e mecânica da ação, a qualquer momento, mediante ampla divulgação.

4.2. Ao participar, o usuário autoriza o uso de seu nome e dados para fins de divulgação da campanha.

4.3. Os dados pessoais fornecidos serão utilizados exclusivamente para fins da ação e não serão compartilhados com terceiros.`;

export interface NormalizedSettings {
  siteTitle: string;
  campaignName: string;
  prizeBanner: string;
  totalCotas: number;
  quantityOptions: QuantityOption[];
  bannerImages: string[];
  campanhasAnteriores: CampanhaAnterior[];
  regulamento: string;
  raw: Record<string, any>;
}

export function normalizeSettings(settings: Record<string, any> = {}): NormalizedSettings {
  const qo = Array.isArray(settings.quantity_options) && settings.quantity_options.length > 0
    ? settings.quantity_options
    : DEFAULT_QUANTITY_OPTIONS;
  return {
    siteTitle: settings.site_title?.texto || DEFAULT_SITE_TITLE,
    campaignName: settings.campaign_name?.nome || DEFAULT_CAMPAIGN_NAME,
    prizeBanner: settings.prize_banner?.texto || DEFAULT_PRIZE_BANNER,
    totalCotas: Number(settings.total_cotas?.quantidade) || DEFAULT_TOTAL_COTAS,
    quantityOptions: qo,
    bannerImages: Array.isArray(settings.banner_images) ? settings.banner_images : [],
    campanhasAnteriores: Array.isArray(settings.campanhas_anteriores) ? settings.campanhas_anteriores : [],
    regulamento: settings.regulamento?.texto?.trim() ? settings.regulamento.texto : DEFAULT_REGULAMENTO,
    raw: settings,
  };
}

export function useSiteSettings(): NormalizedSettings {
  const { data } = usePublicData();
  return normalizeSettings(data?.settings ?? {});
}
