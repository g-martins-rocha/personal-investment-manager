// ********** PARTE 1 - Estado Global, Funções Utilitárias e Configurações
// --- ESTADO DA APLICAÇÃO ---
// --- ESTADO DE AUTENTICAÇÃO ---
let currentUser = null;
const APP_VERSION = 35;
const BACKUP_ALERT_THRESHOLD = 10; // Número de alterações para o alerta visual
const BACKUP_PROMPT_THRESHOLD = 100;  // Número de alterações para o pop-up
let mainContent, sidebar;
let alteracoesDesdeUltimoBackup = 0;
let todasAsMetas = [];
let sortConfigRendaVariavel = { 'FII': { key: 'ticker', direction: 'ascending' }, 'Ação': { key: 'ticker', direction: 'ascending' }, 'ETF': { key: 'ticker', direction: 'ascending' } };
let sortConfigModalProventos = { key: 'dataPagamento', direction: 'descending' };
let sortConfigPerformanceRV = { key: 'valorDeMercado', direction: 'descending' };
let userName = '';
let autoUpdateEnabled = false;
let autoUpdateIntervalId = null;
let dadosComparacao = null;
let configuracoesGraficos = { evolucao: { hidden: [] }, desempenho: { hidden: [] } };
let linksExternos = { acoes: '', fiis: '', etfs: '' };
let notaAtual = null, todasAsNotas = [], todosOsAtivos = [], posicaoInicial = [], todosOsAjustes = [], todosOsProventos = [], todasAsContas = [], todosOsFeriados = [], todosOsAjustesIR = [];
let todosOsAtivosRF = [], todosOsRendimentosRealizadosRF = [], todosOsRendimentosRFNaoRealizados = [];
let dadosMoedas = { cotacoes: {} };
let todosOsAtivosMoedas = [];
let todasAsMovimentacoes = [];
let todasAsTransacoesRecorrentes = [];
let dadosAlocacao = { categorias: {}, ativos: {} };
let dadosDeMercado = { timestamp: null, cotacoes: {} };
let dadosSimulacaoNegociar = { fiis: {}, acoes: {} };
let configuracoesFiscais = { 
    aliquotaAcoes: 0.15, 
    aliquotaFiisDt: 0.20, 
    limiteIsencaoAcoes: 20000,
    tabelaRegressivaIR: {
        180: 0.225,
        360: 0.200,
        720: 0.175,
        9999: 0.150
    }
};
let salarioMinimo = 1518.00; // Valor padrão para 2025, pode ser ajustado pelo usuário
let urlCotacoesCSV = '';
let telas = {}, modalCadastroAtivo, modalResumoNegociacao, modalEdicaoOperacao, modalPosicaoInicial, modalLancamentoProvento, modalCadastroConta, modalCadastroFeriado, modalNovaTransacao, modalEdicaoTransacaoProvento, modalCorrigirData, modalResumoDividendosAtivo, modalInformarValoresVenda, modalPerformanceDetalhes, modalProventosCalendario, modalProventosCalendarioAcoes, modalEventoCorporativo, modalBalanceamentoDetalhes, modalEventoAtivo, modalCorrigirProventosOrfaos, modalDetalhesIRMes, modalDashboardAlertas;
let graficoAlocacaoInstance = null;
let graficoProventosInstance = null;
let graficoCarteiraInstance = null;
let graficoDesempenhoInstance = null;
let graficoComparativoPrecoInstance = null;
let graficoBreakEvenInstance = null;
let graficoPrecoVsPmInstance = null;
let graficoPrecoVsPmModalInstance = null;
let modalGraficoCotacoes;
let graficoHistoricoCotacoesInstance = null;
let historicoCarteira = [];      
let modalCadastroAtivoRF, modalAporteRF, modalResgateRF;
let modalCadastroAtivoMoeda, modalNovaTransacaoMoeda; // Novos modais para Moedas
let modalCalendarioRecorrentes; // Adicione a nova variável aqui
let modalProjecaoFutura;
let modalDetalhesRendimento;
let planoDeAcaoAtual = { compras: [], vendas: [] };
let telaImportacaoNotas, telaImportacaoHistorico;
let containerListaPosicoes, containerAdicionarHistorico, containerTabelaHistorico;
let dropdownCorretorasCache = '';
let tipoVistaCalendarioAcoes = 'dataCom'; // Controla a visão do calendário de ações
let isAtivosEditMode = false;
let isProventosEditMode = false;
let sortConfigAtivos = { key: 'ticker', direction: 'ascending' };
let sortConfigProventos = { key: 'dataPagamento', direction: 'descending' };
let sortConfigTransacoes = { key: 'data', direction: 'descending' };
let estadoSelecaoVendas = {};
let resumoProventosChartInstance = null;
let graficoAportesInstance = null;
let tipoGraficoAportes = 'barras'; // Pode ser 'barras' ou 'linhas'
let timestampUltimoBackup = null;
let isNavigating = false; // Flag para controlar o listener durante a navegação


// Função para registrar uma alteração e verificar se um alerta é necessário
function registrarAlteracao() {
    alteracoesDesdeUltimoBackup++;
    localStorage.setItem('carteira_alteracoes_pendentes', alteracoesDesdeUltimoBackup);
    verificarStatusBackup();
}

function abrirModalInvestimentosDetalhes() {
    const container = document.getElementById('modal-investimentos-detalhes-conteudo');
    container.innerHTML = '<h4><i class="fas fa-spinner fa-spin"></i> Calculando posições...</h4>';

    // Adiciona a data e hora atuais ao elemento de timestamp para impressão
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timestampCompleto = `Posição em ${dataFormatada} às ${horaFormatada}`;
    document.getElementById('print-timestamp').textContent = timestampCompleto;

    abrirModal('modal-investimentos-detalhes');

    setTimeout(() => {
        const hoje = new Date().toISOString().split('T')[0];
        const posicoesRV = gerarPosicaoDetalhada(hoje);
        const ativosRFAtivos = todosOsAtivosRF.filter(a => !(a.descricao || '').toLowerCase().includes('inativa'));

        const dadosAgrupados = {
            'FIIs': [],
            'Ações': [],
            'ETFs': [],
            'Renda Fixa': []
        };

        for (const ticker in posicoesRV) {
            const posicao = posicoesRV[ticker];
            if (posicao.quantidade > 0.000001) {
                const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
                if (ativoInfo && ativoInfo.tipo) {
                    const tipoMapeado = ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : ativoInfo.tipo;
                    const cotacao = dadosDeMercado.cotacoes[ticker] || {};
                    const precoAtual = cotacao.valor || 0;
                    
                    if (dadosAgrupados[tipoMapeado]) {
                        dadosAgrupados[tipoMapeado].push({
                            ticker: ticker,
                            quantidade: posicao.quantidade,
                            precoAtual: precoAtual,
                            valorDeMercado: posicao.quantidade * precoAtual
                        });
                    }
                }
            }
        }

        ativosRFAtivos.forEach(ativo => {
            const saldo = calcularSaldosRFEmData(ativo, hoje).saldoLiquido;
            if (saldo > 0.01) {
                dadosAgrupados['Renda Fixa'].push({
                    descricao: ativo.descricao,
                    saldoLiquido: saldo
                });
            }
        });

        let htmlModal = '';
        let totalGeral = 0;
        const ordemCategorias = ['FIIs', 'Ações', 'ETFs', 'Renda Fixa'];

        ordemCategorias.forEach(categoria => {
            const ativos = dadosAgrupados[categoria];
            if (ativos.length > 0) {
                let subtotalCategoria = 0;
                let cabecalhoTabela = '';
                let corpoTabela = '';

                if (categoria === 'Renda Fixa') {
                    htmlModal += `<h4>Renda Fixa</h4>`;
                    cabecalhoTabela = '<tr><th>Ativo</th><th class="numero">Saldo Líquido Atual</th></tr>';
                    ativos.sort((a, b) => a.descricao.localeCompare(b.descricao));
                    ativos.forEach(ativo => {
                        corpoTabela += `<tr><td>${ativo.descricao}</td><td class="numero">${formatarMoeda(ativo.saldoLiquido)}</td></tr>`;
                        subtotalCategoria += ativo.saldoLiquido;
                    });
                } else {
                    htmlModal += `<h4>${categoria}</h4>`;
                    cabecalhoTabela = '<tr><th>Ativo</th><th class="numero">Quantidade</th><th class="numero">Preço de Mercado</th><th class="numero">Valor Total</th></tr>';
                    ativos.sort((a, b) => b.valorDeMercado - a.valorDeMercado);
                    ativos.forEach(ativo => {
                        corpoTabela += `<tr>
                            <td>${ativo.ticker}</td>
                            <td class="numero">${Math.round(ativo.quantidade)}</td>
                            <td class="numero">${formatarMoeda(ativo.precoAtual)}</td>
                            <td class="numero">${formatarMoeda(ativo.valorDeMercado)}</td>
                        </tr>`;
                        subtotalCategoria += ativo.valorDeMercado;
                    });
                }

                htmlModal += `<table><thead>${cabecalhoTabela}</thead><tbody>${corpoTabela}</tbody>
                    <tfoot><tr>
                        <td colspan="${categoria === 'Renda Fixa' ? 1 : 3}" style="text-align: right;"><strong>Subtotal ${categoria}:</strong></td>
                        <td class="numero"><strong>${formatarMoeda(subtotalCategoria)}</strong></td>
                    </tr></tfoot>
                </table>`;
                totalGeral += subtotalCategoria;
            }
        });

        htmlModal += `<h3 id="modal-investimentos-detalhes-total-geral">Total Geral Investido: ${formatarMoeda(totalGeral)}</h3>`;
        container.innerHTML = htmlModal;

    }, 50);
}
function abrirModalDetalhesContas() {
    const hoje = new Date().toISOString().split('T')[0];
    const contasAtivas = getTodasContasAtivas();
    
    let conteudoHtml = '<table><thead><tr><th>Conta</th><th class="numero">Saldo Atual</th></tr></thead><tbody>';
    
    if (contasAtivas.length > 0) {
        contasAtivas.sort((a, b) => a.banco.localeCompare(b.banco)).forEach(conta => {
            const saldoConta = calcularSaldoEmData(conta, hoje);
            conteudoHtml += `
                <tr>
                    <td>${conta.banco} (${conta.tipo})</td>
                    <td class="numero">${formatarMoeda(saldoConta)}</td>
                </tr>`;
        });
    } else {
        conteudoHtml += '<tr><td colspan="2" style="text-align:center;">Nenhuma conta BRL ativa cadastrada.</td></tr>';
    }
    
    conteudoHtml += '</tbody></table>';

    document.getElementById('modal-dashboard-detalhes-titulo').textContent = 'Detalhes do Saldo em Contas (BRL)';
    document.getElementById('modal-dashboard-detalhes-conteudo').innerHTML = conteudoHtml;
    abrirModal('modal-dashboard-detalhes');
}
function renderizarTelaPerformanceRV() {
    const container = document.getElementById('container-tabela-performance');
    container.innerHTML = '<h4><i class="fas fa-spinner fa-spin"></i> Calculando performance de todos os ciclos de investimento...</h4>';

    setTimeout(() => {
        const filtroTipo = document.getElementById('performance-filtro-tipo').value;
        const filtroPeriodo = document.getElementById('performance-filtro-periodo').value;
        const hoje = new Date().toISOString().split('T')[0];
        
        let dadosParaTabela = [];

        // --- PARTE 1: Processar Ciclos Atuais (Abertos) ---
        const posicoesAtuais = gerarPosicaoDetalhada();
        for (const ticker in posicoesAtuais) {
            const posicao = posicoesAtuais[ticker];
            if (posicao.quantidade < 0.000001) continue;

            const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
            if (!ativoInfo || (filtroTipo !== 'todos' && ativoInfo.tipo !== filtroTipo)) continue;

            const dataInicioCiclo = getInicioIninterrupto(ticker);
            if (!dataInicioCiclo) continue; // Pula se não encontrar um início claro

            // Filtra os eventos para o ciclo atual
            const proventosDoCiclo = todosOsProventos.filter(p => p.ticker === ticker && p.dataPagamento && p.dataPagamento >= dataInicioCiclo);
            const resultadosRealizadosMap = calcularResultadosRealizados([ticker], new Map([[ticker, dataInicioCiclo]]));

            const dadosMercado = dadosDeMercado.cotacoes[ticker] || {};
            const precoAtual = dadosMercado.valor || 0;
            const custoTotal = posicao.quantidade * posicao.precoMedio;
            const valorDeMercado = posicao.quantidade * precoAtual;
            
            const proventosRecebidos = proventosDoCiclo.reduce((soma, p) => soma + p.valorTotalRecebido, 0);
            const projecaoAnual = (ativoInfo.tipo === 'Ação') ? calcularProjecaoAnualUnitaria(ticker, {limiteAnos: 5}) : (getUltimoProvento(ticker) * 12);
            
            const variacaoNaoRealizada = valorDeMercado - custoTotal;
            const resultadoRealizado = resultadosRealizadosMap.get(ticker) || 0;
            const retornoTotal = variacaoNaoRealizada + resultadoRealizado + proventosRecebidos;
            const variacaoPercentual = custoTotal > 0 ? variacaoNaoRealizada / custoTotal : 0;

            let { fluxos, datas } = construirFluxoDeCaixa([ticker], hoje);
            if (fluxos.length > 0) {
                fluxos.push(valorDeMercado); // Adiciona o valor de mercado como última entrada de caixa
                datas.push(hoje);
            }
            const tir = calcularTIR(fluxos, datas);

            const vp = dadosMercado.vpa || 0;
            const yieldSobreVP = (vp > 0 && projecaoAnual > 0) ? projecaoAnual / vp : 0;

            dadosParaTabela.push({
                ticker: ticker, tipo: ativoInfo.tipo, status: 'Em Carteira',
                periodo: `${new Date(dataInicioCiclo + 'T12:00:00').toLocaleDateString('pt-BR')} - Atual`,
                quantidade: posicao.quantidade, precoMedio: posicao.precoMedio, custoTotal: custoTotal, valorDeMercado: valorDeMercado,
                variacaoNaoRealizada, variacaoPercentual, resultadoRealizado, proventosRecebidos, retornoTotal, tir,
                yocProjetado: posicao.precoMedio > 0 ? projecaoAnual / posicao.precoMedio : 0,
                dyProjetado: precoAtual > 0 ? projecaoAnual / precoAtual : 0,
                pl: (ativoInfo.tipo === 'Ação' && dadosMercado.lpa_acao > 0 && precoAtual > 0) ? precoAtual / dadosMercado.lpa_acao : 0,
                pvp: (vp > 0 && precoAtual > 0) ? precoAtual / vp : 0, // P/VP unificado
                yieldSobreVP: yieldSobreVP
            });
        }

        // --- PARTE 2: Processar Ciclos Encerrados (Zerados) ---
        const ciclosEncerrados = gerarRelatorioPosicoesZeradas();
        ciclosEncerrados.forEach(ciclo => {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === ciclo.ticker);
            if (!ativoInfo || (filtroTipo !== 'todos' && ativoInfo.tipo !== filtroTipo)) return;

            let { fluxos, datas } = construirFluxoDeCaixa([ciclo.ticker], ciclo.dataEncerramento);
            
            const fluxosFiltrados = [], datasFiltradas = [];
            for(let i = 0; i < datas.length; i++) {
                if (datas[i] >= ciclo.dataInicio && datas[i] <= ciclo.dataEncerramento) {
                    fluxosFiltrados.push(fluxos[i]);
                    datasFiltradas.push(datas[i]);
                }
            }
            
            if (fluxosFiltrados.length === 0) return;
            
            const custoTotalCiclo = -fluxosFiltrados.filter(v => v < 0).reduce((soma, v) => soma + v, 0);
            const proventosRecebidos = fluxosFiltrados.filter((v, i) => v > 0 && todosOsProventos.some(p => p.dataPagamento === datasFiltradas[i] && p.valorTotalRecebido === v)).reduce((soma, v) => soma + v, 0);
            const valorTotalVendas = fluxosFiltrados.filter(v => v > 0).reduce((soma, v) => soma + v, 0) - proventosRecebidos;
            
            const resultadoRealizado = valorTotalVendas - custoTotalCiclo;
            const retornoTotal = resultadoRealizado + proventosRecebidos;
            const tir = calcularTIR(fluxosFiltrados, datasFiltradas);
            
            dadosParaTabela.push({
                ticker: ciclo.ticker, tipo: ativoInfo.tipo, status: 'Zerado',
                periodo: `${new Date(ciclo.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} - ${new Date(ciclo.dataEncerramento + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                quantidade: 0, precoMedio: 0, custoTotal: custoTotalCiclo, valorDeMercado: valorTotalVendas,
                variacaoNaoRealizada: 0, variacaoPercentual: 0, resultadoRealizado, proventosRecebidos, retornoTotal, tir,
                yocProjetado: 0, dyProjetado: 0, pl: 0, pvp: 0,
                yieldSobreVP: 0
            });
        });
        
        if (filtroPeriodo === 'atuais') {
            dadosParaTabela = dadosParaTabela.filter(d => d.status === 'Em Carteira');
        } else if (filtroPeriodo === 'encerrados') {
            dadosParaTabela = dadosParaTabela.filter(d => d.status === 'Zerado');
        }

        const sortKey = sortConfigPerformanceRV.key;
        const sortDirection = sortConfigPerformanceRV.direction === 'ascending' ? 1 : -1;
        dadosParaTabela.sort((a, b) => {
            let valA = a[sortKey] || 0;
            let valB = b[sortKey] || 0;
            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * sortDirection;
            }
            return (valA - valB) * sortDirection;
        });

        // --- INÍCIO DA ALTERAÇÃO TAREFA 1: Ajuste de Cabeçalhos ---
        const headers = `
            <tr>
                <th rowspan="2" class="sortable" data-key="ticker">Ativo</th>
                <th rowspan="2" class="sortable" data-key="periodo">Período</th>
                <th colspan="4" class="group-header group-1">Posição na Carteira</th>
                <th colspan="4" class="group-header group-2">Performance Pessoal</th>
                <th colspan="5" class="group-header group-3">Indicadores de Mercado</th> 
            </tr>
            <tr>
                <th class="numero sortable group-1" data-key="quantidade">Qtd.</th>
                <th class="numero sortable group-1" data-key="precoMedio">Preço Médio</th>
                <th class="numero sortable group-1" data-key="custoTotal">Custo Total</th>
                <th class="numero sortable group-1" data-key="valorDeMercado">Valor Mercado / Final</th>
                <th class="numero sortable group-2" data-key="resultadoRealizado">Variação / Result.</th>
                <th class="numero sortable group-2" data-key="proventosRecebidos">Proventos</th>
                <th class="numero sortable group-2 col-retorno-total" data-key="retornoTotal">Retorno Total</th>
                <th class="percentual sortable group-2" data-key="tir">TIR Anual</th>
                <th class="percentual sortable group-3" data-key="yocProjetado">YoC Proj.</th>
                <th class="percentual sortable group-3" data-key="dyProjetado">DY Proj.</th>
                <th class="numero sortable group-3" data-key="pvp">P/VP</th>
                <th class="numero sortable group-3" data-key="pl">P/L</th> 
                <th class="percentual sortable group-3" data-key="yieldSobreVP">Yield s/VP</th>
            </tr>`;
        // --- FIM DA ALTERAÇÃO TAREFA 1 ---

        let corpoTabela = '';
        dadosParaTabela.forEach(d => {
            const isEmCarteira = d.status === 'Em Carteira';
            const valorPrincipalVariacao = isEmCarteira ? d.variacaoNaoRealizada : d.resultadoRealizado;
            const percentualVariacao = d.custoTotal > 0 ? valorPrincipalVariacao / d.custoTotal : 0;
            const labelVariacao = isEmCarteira ? 'Variação (Não Realizada)' : 'Resultado Realizado';

            const classeRetorno = d.retornoTotal >= 0 ? 'valor-positivo' : 'valor-negativo';
            const classeVariacao = valorPrincipalVariacao >= 0 ? 'valor-positivo' : 'valor-negativo';
            const classeTir = d.tir >= 0 ? 'valor-positivo' : 'valor-negativo';
            
            // --- INÍCIO DA ALTERAÇÃO TAREFA 1: Separação P/VP e P/L ---
            const pvpFormatado = (d.pvp > 0 && isEmCarteira) ? formatarDecimal(d.pvp) : 'N/A';
            const plFormatado = (d.tipo === 'Ação' && d.pl > 0 && isEmCarteira) ? formatarDecimal(d.pl) : 'N/A';
            // --- FIM DA ALTERAÇÃO TAREFA 1 ---

            corpoTabela += `<tr class="row-clickable" data-ticker="${d.ticker}" data-custo-total="${d.custoTotal}" data-proventos="${d.proventosRecebidos}" data-realizado="${d.resultadoRealizado}">
                <td><strong>${d.ticker}</strong><small style="display: block;">${d.tipo} / ${d.status}</small></td>
                <td class="col-posicao-desde">${d.periodo}</td>
                <td class="numero group-1">${isEmCarteira ? Math.round(d.quantidade) : '-'}</td>
                <td class="numero group-1">${isEmCarteira ? formatarPrecoMedio(d.precoMedio) : '-'}</td>
                <td class="numero group-1">${formatarMoeda(d.custoTotal)}</td>
                <td class="numero group-1">${formatarMoeda(d.valorDeMercado)}</td>
                <td class="numero group-2 ${classeVariacao}">
                    <span class="valor-principal" title="${labelVariacao}">${formatarMoeda(valorPrincipalVariacao)}</span>
                    <span class="valor-secundario ${classeVariacao}">${formatarPercentual(percentualVariacao)}</span>
                </td>
                <td class="numero group-2 valor-positivo">${formatarMoeda(d.proventosRecebidos)}</td>
                <td class="numero group-2 col-retorno-total ${classeRetorno}">
                    <span class="valor-principal">${formatarMoeda(d.retornoTotal)}</span>
                </td>
                <td class="percentual group-2 ${classeTir}">${isNaN(d.tir) ? 'N/A' : formatarPercentual(d.tir)}</td>
                <td class="percentual group-3">${isEmCarteira ? formatarPercentual(d.yocProjetado) : '-'}</td>
                <td class="percentual group-3">${isEmCarteira ? formatarPercentual(d.dyProjetado) : '-'}</td>
                <td class="numero group-3">${pvpFormatado}</td>
                <td class="numero group-3">${plFormatado}</td>
                <td class="percentual group-3">${isEmCarteira ? formatarPercentual(d.yieldSobreVP) : '-'}</td>
            </tr>`;
        });
        
        container.innerHTML = `<table id="tabela-performance"><thead>${headers}</thead><tbody>${corpoTabela}</tbody></table>`;
        
        document.querySelectorAll('#tabela-performance .sortable').forEach(header => {
            header.classList.remove('ascending', 'descending');
            if (header.dataset.key === sortConfigPerformanceRV.key) {
                header.classList.add(sortConfigPerformanceRV.direction);
            }
        });

    }, 50);
}
function abrirModalGraficoBreakEven(ticker, custoTotal, proventosRecebidos, resultadoRealizado) {
    if (custoTotal <= 0) {
        alert(`Não é possível gerar o gráfico para ${ticker}, pois o custo total é zero ou negativo.`);
        return;
    }

    const modal = document.getElementById('modal-performance-ativo-grafico');
    const tituloModal = document.getElementById('modal-performance-ativo-titulo');
    const infoModal = document.getElementById('modal-performance-ativo-info');
    const ctx = document.getElementById('grafico-comparativo-preco').getContext('2d');

    const totalRetornado = proventosRecebidos + resultadoRealizado;
    const valorRestante = Math.max(0, custoTotal - totalRetornado);
    const percentualPago = (totalRetornado / custoTotal);

    // Converte os valores absolutos para percentuais para o gráfico
    const percProventos = (proventosRecebidos / custoTotal) * 100;
    const percRealizado = (resultadoRealizado / custoTotal) * 100;
    const percRestante = (valorRestante / custoTotal) * 100;

    tituloModal.textContent = `Ponto de Equilíbrio (Break-Even) - ${ticker}`;
    infoModal.innerHTML = `Progresso para se pagar: <strong class="${percentualPago >= 1 ? 'valor-positivo' : ''}">${formatarPercentual(percentualPago)}</strong>`;

    if (graficoBreakEvenInstance) {
        graficoBreakEvenInstance.destroy();
    }
    
    graficoBreakEvenInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [ticker],
            datasets: [
                {
                    label: 'Proventos Recebidos',
                    data: [percProventos],
                    backgroundColor: 'rgba(46, 204, 113, 0.7)', // Verde
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Resultados Realizados',
                    data: [percRealizado],
                    backgroundColor: 'rgba(52, 152, 219, 0.7)', // Azul
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Falta para se Pagar',
                    data: [percRestante],
                    backgroundColor: 'rgba(149, 165, 166, 0.7)', // Cinza
                    borderColor: 'rgba(149, 165, 166, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Custo Total: ${formatarMoeda(custoTotal)}`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const perc = context.raw;
                            const valorAbsoluto = (perc / 100) * custoTotal;
                            return `${label}: ${formatarMoeda(valorAbsoluto)} (${perc.toFixed(1)}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    max: 100, // Força a escala a ir sempre até 100%
                    ticks: {
                        callback: function(value) {
                            return value + '%'; // Adiciona o símbolo de % no eixo
                        }
                    }
                },
                y: {
                    stacked: true
                }
            }
        }
    });

    abrirModal('modal-performance-ativo-grafico');
}
function abrirModalDetalhesMoedas() {
    const hoje = new Date().toISOString().split('T')[0];
    const todosOsEventosCaixa = obterTodosOsEventosDeCaixa();

    let conteudoHtml = '<table><thead><tr><th>Ativo</th><th class="numero">Saldo Original</th><th class="numero">Saldo Convertido (BRL)</th></tr></thead><tbody>';
    
    if (todosOsAtivosMoedas.length > 0) {
        todosOsAtivosMoedas.sort((a, b) => a.nomeAtivo.localeCompare(b.nomeAtivo)).forEach(ativo => {
            const transacoesPassadasEPresentes = todosOsEventosCaixa.filter(e =>
                e.tipo === 'moeda' && String(e.idAlvo) === String(ativo.id) && e.source !== 'recorrente_futura' && e.data <= hoje
            );
            const saldoAtivoAtual = transacoesPassadasEPresentes.reduce((soma, t) => soma + arredondarMoeda(t.valor), ativo.saldoInicial);
            const cotacao = dadosMoedas.cotacoes[ativo.moeda] || 0;
            const valorEmBRL = saldoAtivoAtual * cotacao;
            
            conteudoHtml += `
                <tr>
                    <td>${ativo.nomeAtivo} (${ativo.moeda})</td>
                    <td class="numero">${formatarMoedaEstrangeira(saldoAtivoAtual, ativo.moeda)}</td>
                    <td class="numero">${formatarMoeda(valorEmBRL)}</td>
                </tr>`;
        });
    } else {
        conteudoHtml += '<tr><td colspan="3" style="text-align:center;">Nenhum ativo em moeda estrangeira cadastrado.</td></tr>';
    }

    conteudoHtml += '</tbody></table>';

    document.getElementById('modal-dashboard-detalhes-titulo').textContent = 'Detalhes de Moedas Estrangeiras';
    document.getElementById('modal-dashboard-detalhes-conteudo').innerHTML = conteudoHtml;
    abrirModal('modal-dashboard-detalhes');
}

function abrirModalDetalhesProventos() {
    const hoje = new Date().toISOString().split('T')[0];
    const proventosProvisionados = todosOsProventos.filter(p => p.dataCom && p.dataPagamento && p.dataCom < hoje && p.dataPagamento > hoje);

    let conteudoHtml = '';

    if (proventosProvisionados.length > 0) {
        const proventosPorCorretora = {};
        proventosProvisionados.forEach(p => {
            for (const corretora in p.posicaoPorCorretora) {
                if (!proventosPorCorretora[corretora]) {
                    proventosPorCorretora[corretora] = [];
                }
                const dadosCorretora = p.posicaoPorCorretora[corretora];
                proventosPorCorretora[corretora].push({
                    ticker: p.ticker, tipo: p.tipo, dataCom: p.dataCom, dataPagamento: p.dataPagamento, valor: dadosCorretora.valorRecebido
                });
            }
        });

        Object.keys(proventosPorCorretora).sort().forEach(corretora => {
            const dados = proventosPorCorretora[corretora];
            const totalCorretora = dados.reduce((soma, item) => soma + item.valor, 0);
            
            conteudoHtml += `
                <h4 style="margin-top: 20px;">${corretora} - Total: ${formatarMoeda(totalCorretora)}</h4>
                <table><thead><tr><th>Ativo</th><th>Tipo</th><th>Data Com</th><th>Data Pag.</th><th class="numero">Valor (R$)</th></tr></thead><tbody>
            `;
            dados.sort((a, b) => new Date(a.dataPagamento) - new Date(b.dataPagamento)).forEach(detalhe => {
                const dataComFmt = new Date(detalhe.dataCom + 'T12:00:00').toLocaleDateString('pt-BR');
                const dataPagFmt = new Date(detalhe.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR');
                conteudoHtml += `
                    <tr>
                        <td>${detalhe.ticker}</td>
                        <td>${detalhe.tipo}</td>
                        <td>${dataComFmt}</td>
                        <td>${dataPagFmt}</td>
                        <td class="numero">${formatarMoeda(detalhe.valor)}</td>
                    </tr>
                `;
            });
            conteudoHtml += '</tbody></table>';
        });

    } else {
        conteudoHtml = '<p style="text-align:center;">Nenhum provento provisionado para receber.</p>';
    }

    document.getElementById('modal-dashboard-detalhes-titulo').textContent = 'Detalhes dos Proventos Provisionados';
    document.getElementById('modal-dashboard-detalhes-conteudo').innerHTML = conteudoHtml;
    abrirModal('modal-dashboard-detalhes');
}
function limparDadosLocais() {
    console.log("Limpando dados locais (variáveis e localStorage)...");
    // Reseta todas as variáveis de estado para o padrão inicial
    todosOsAtivos = []; todasAsNotas = []; posicaoInicial = []; todosOsAjustes = [];
    todosOsProventos = []; todasAsContas = []; todosOsFeriados = []; todosOsAjustesIR = [];
    todosOsAtivosRF = []; todosOsRendimentosRealizadosRF = []; todosOsRendimentosRFNaoRealizados = [];
    dadosMoedas = { cotacoes: {} }; todosOsAtivosMoedas = []; todasAsMovimentacoes = [];
    todasAsTransacoesRecorrentes = []; dadosAlocacao = { categorias: {}, ativos: {} };
    dadosSimulacaoNegociar = { fiis: {}, acoes: {}, aporteTotal: '' };
    historicoCarteira = []; todasAsMetas = [];
    userName = '';

    // Remove todos os itens do localStorage relacionados à carteira
    Object.keys(localStorage)
        .filter(key => key.startsWith('carteira_'))
        .forEach(key => localStorage.removeItem(key));

    alteracoesDesdeUltimoBackup = 0; // Reseta o contador de alterações
}
function verificarStatusBackup() {
    const backupButtons = document.querySelectorAll('#btn-dashboard-backup, #btn-backup');
    const footer = document.querySelector('.sidebar-footer');
    let alertElement = document.getElementById('backup-alert-footer');

    if (alteracoesDesdeUltimoBackup >= BACKUP_PROMPT_THRESHOLD) {
        if (!alertElement) {
            alertElement = document.createElement('div');
            alertElement.id = 'backup-alert-footer';
            alertElement.className = 'footer-info backup-alerta-ativo';
            alertElement.innerHTML = '<span><i class="fas fa-exclamation-triangle"></i> Atenção: Efetuar Backup</span>';
            if (footer) {
                footer.prepend(alertElement);
            }
        }
    } else {
        if (alertElement) {
            alertElement.remove();
        }
    }

    backupButtons.forEach(btn => {
        btn.innerHTML = `<i class="fas fa-save"></i> Fazer Backup`;
    });
}

async function carregarSalarioMinimo() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            salarioMinimo = docSnap.exists() ? (docSnap.data().salarioMinimo || 1518.00) : 1518.00;
        } catch (error) {
            console.error("Erro ao carregar salário mínimo:", error);
            salarioMinimo = 1518.00;
        }
    } else {
        const data = localStorage.getItem('carteira_salario_minimo_offline');
        salarioMinimo = data ? parseFloat(data) : 1518.00;
    }
}

function calcularTotalProventosProvisionados() {
    const hojeStr = new Date().toISOString().split('T')[0];
    const proventosProvisionados = todosOsProventos.filter(p =>
        p.dataCom && p.dataPagamento &&
        p.dataCom < hojeStr &&
        p.dataPagamento > hojeStr
    );
    return proventosProvisionados.reduce((soma, p) => soma + (p.valorTotalRecebido || 0), 0);
}

// Função para carregar o contador do armazenamento local
function carregarContadorAlteracoes() {
    alteracoesDesdeUltimoBackup = parseInt(localStorage.getItem('carteira_alteracoes_pendentes'), 10) || 0;
}
/**
 * NOVA FUNÇÃO AUXILIAR: Atualiza os valores em cache (saldo e capital) de um ativo de RF.
 * Centraliza a lógica para garantir consistência após qualquer movimentação.
 * @param {number} ativoId - O ID do ativo de Renda Fixa a ser atualizado.
 */
function atualizarSaldosCacheAtivoRF(ativoId) {
    const ativo = todosOsAtivosRF.find(a => a.id === ativoId);
    if (!ativo) return;

    const hojeStr = new Date().toISOString().split('T')[0];
    const saldosAtuais = calcularSaldosRFEmData(ativo, hojeStr);
    
    // CORREÇÃO DEFINITIVA: Apenas o saldo líquido, que é um cache, deve ser atualizado.
    // O `valorInvestido` do objeto principal é o valor de aporte inicial e NUNCA deve ser modificado aqui.
    ativo.saldoLiquido = saldosAtuais.saldoLiquido;
    
    salvarAtivosRF();
}
/**
 * NOVA FUNÇÃO-CHAVE: Analisa todo o histórico de um ativo para encontrar
 * a data de início do ciclo de investimento atual.
 * @param {object} ativo - O objeto do ativo de Renda Fixa.
 * @returns {string} - A data ('AAAA-MM-DD') do início do ciclo atual.
 */
function getDataInicioCicloAtualRF(ativo) {
    const eventos = [];

    // Adiciona o aporte inicial
    eventos.push({ data: ativo.dataAplicacao, valor: ativo.valorInvestido, tipo: 'aporte' });

    // Adiciona todos os aportes e resgates do histórico de movimentações
    todasAsMovimentacoes
        .filter(t => t.sourceId === ativo.id && (t.source === 'aporte_rf' || t.source === 'resgate_rf'))
        .forEach(t => {
            eventos.push({
                data: t.data,
                valor: t.source === 'aporte_rf' ? Math.abs(t.valor) : -Math.abs(t.valor), // Resgate é negativo
                tipo: t.source
            });
        });

    // Ordena todos os eventos cronologicamente
    eventos.sort((a, b) => new Date(a.data) - new Date(b.data));

    let capitalAcumulado = 0;
    let dataUltimoEncerramento = '1970-01-01';

    // Simula o fluxo de capital para encontrar a data do último zeramento
    eventos.forEach(evento => {
        if (evento.tipo === 'aporte' || evento.tipo === 'aporte_rf') {
            capitalAcumulado += evento.valor;
        } else if (evento.tipo === 'resgate_rf') {
            // Para zerar o ciclo, o resgate precisa consumir todo o capital
            // A lógica de `devolucaoCapital` é complexa de simular aqui, então usamos uma aproximação:
            // Se o resgate zera o saldo total (capital + rendimento), consideramos o ciclo encerrado.
            // Para simplificar e ser robusto, vamos assumir que se o capital ficou próximo de zero, o ciclo fechou.
            // A forma mais segura é simular o saldo líquido. Para isso precisamos dos rendimentos.
            // Vamos simplificar a lógica para o capital.
            
            // Re-lendo a função de resgate, ela já calcula a devolução de capital. Vamos usar isso.
            const movimentacaoOriginal = todasAsMovimentacoes.find(m => m.data === evento.data && m.valor === -evento.valor && m.sourceId === ativo.id);
            if(movimentacaoOriginal){
                capitalAcumulado -= (movimentacaoOriginal.devolucaoCapital || 0);
            }
        }
        
        // Se o capital acumulado ficou zerado ou negativo, marca esta data
        if (capitalAcumulado < 0.01) {
            dataUltimoEncerramento = evento.data;
        }
    });

    // A data de início do ciclo atual é a data do último zeramento
    return dataUltimoEncerramento;
}
/**
 * NOVA FUNÇÃO AUXILIAR: Calcula o total de capital aportado em um ativo de RF
 * dentro do seu ciclo de investimento atual (após o último resgate total).
 * @param {object} ativo - O objeto do ativo de Renda Fixa.
 * @param {string} dataLimite - A data final para considerar os aportes.
 * @returns {number} - O valor total do capital investido no ciclo atual até a data limite.
 */
function getCapitalInvestidoNoCicloAtual(ativo, dataLimite) {
    // --- INÍCIO DA ALTERAÇÃO ---
    // Agora, a data de corte é descoberta dinamicamente, analisando todo o histórico.
    const dataDeCorte = getDataInicioCicloAtualRF(ativo);
    // --- FIM DA ALTERAÇÃO ---
    let capitalTotalCiclo = 0;

    if (ativo.dataAplicacao <= dataLimite && ativo.dataAplicacao > dataDeCorte) {
        capitalTotalCiclo += ativo.valorInvestido;
    }

    todasAsMovimentacoes
        .filter(t =>
            t.source === 'aporte_rf' &&
            t.sourceId === ativo.id &&
            t.data <= dataLimite &&
            t.data > dataDeCorte
        )
        .forEach(aporte => {
            capitalTotalCiclo += Math.abs(aporte.valor);
        });

    return capitalTotalCiclo;
}
/**
 * VERSÃO CORRETA E DEFINITIVA 2.0: Calcula o estado de um ativo de RF.
 * A lógica foi reestruturada para calcular corretamente o capital restante e o saldo líquido
 * em todos os cenários de resgate (parcial ou total).
 *
 * @param {object} ativoRF - O objeto do ativo de renda fixa.
 * @param {string} dataLimite - A data final para o cálculo (formato 'AAAA-MM-DD').
 * @returns {object} - Um objeto contendo valorInvestido, saldoLiquido e rendimentoBruto na data.
 */
function calcularSaldosRFEmData(ativoRF, dataLimite) {
    // --- INÍCIO DA ALTERAÇÃO ---
    // Descobre dinamicamente a data de início do ciclo de investimento atual.
    const dataDeCorte = getDataInicioCicloAtualRF(ativoRF);

    // 1. Usa a função auxiliar para obter o capital investido APENAS no ciclo atual.
    const capitalInvestidoTotal = getCapitalInvestidoNoCicloAtual(ativoRF, dataLimite);

    // 2. Filtra as movimentações de resgate APENAS do ciclo atual.
    const resgatesNoCiclo = todasAsMovimentacoes.filter(t =>
        t.source === 'resgate_rf' &&
        t.sourceId === ativoRF.id &&
        t.data <= dataLimite &&
        t.data > dataDeCorte
    );
    
    // 3. Calcula o capital retornado e o total resgatado a partir do filtro acima.
    const capitalRetornadoTotal = resgatesNoCiclo.reduce((sum, m) => sum + (m.devolucaoCapital || 0), 0);
    const resgatesTotais = resgatesNoCiclo.reduce((sum, m) => sum + Math.abs(m.valor), 0);

    const capitalInvestidoRestante = capitalInvestidoTotal - capitalRetornadoTotal;

    // 4. Encontra o último rendimento bruto registrado APENAS no ciclo atual.
    const rendimentosPassados = todosOsRendimentosRFNaoRealizados
        .filter(r => 
            r.ativoId === ativoRF.id && 
            r.data <= dataLimite &&
            r.data > dataDeCorte
        )
        .sort((a, b) => new Date(b.data) - new Date(a.data));
    
    const rendimentoAcumuladoTotal = rendimentosPassados.length > 0 ? rendimentosPassados[0].rendimento : 0;

    // 5. A lógica de cálculo do saldo e rendimento permanece a mesma, mas agora com dados filtrados.
    const saldoLiquidoNaData = (capitalInvestidoTotal + rendimentoAcumuladoTotal) - resgatesTotais;
    const rendimentoBrutoRestante = saldoLiquidoNaData - capitalInvestidoRestante;

    return {
        valorInvestido: arredondarMoeda(capitalInvestidoRestante),
        saldoLiquido: arredondarMoeda(saldoLiquidoNaData),
        rendimentoBruto: arredondarMoeda(rendimentoBrutoRestante)
    };
    // --- FIM DA ALTERAÇÃO ---
}
function toggleSelecaoVenda(ticker) {
    // Se não estiver definido, assume que estava 'true' (padrão) e vira 'false'
    if (estadoSelecaoVendas[ticker] === undefined) {
        estadoSelecaoVendas[ticker] = false;
    } else {
        // Inverte o estado atual
        estadoSelecaoVendas[ticker] = !estadoSelecaoVendas[ticker];
    }
    renderizarTelaConsultaBalanceamento();
}
function getUltimoProvento(ticker, dataLimite = null) {
    const hoje = new Date().toISOString().split('T')[0];
    const dataFinal = dataLimite || hoje;

    const proventosDoAtivo = todosOsProventos
        .filter(p => p.ticker === ticker && p.valorIndividual > 0 && p.dataCom && p.dataCom <= dataFinal)
        .sort((a, b) => new Date(b.dataCom) - new Date(a.dataCom));

    return proventosDoAtivo.length > 0 ? proventosDoAtivo[0].valorIndividual : 0;
}

/**
 * Formata um número total de dias em uma string legível (anos, meses, dias).
 * @param {number} totalDias - O número total de dias.
 * @returns {string} - A string formatada, ex: "1 ano, 2 meses, 15 dias".
 */
function formatarIntervaloDias(totalDias) {
    if (isNaN(totalDias) || totalDias <= 0) return "-";

    const diasPorMesMedio = 365.25 / 12;
    
    const anos = Math.floor(totalDias / 365.25);
    const diasRestantesAposAnos = totalDias % 365.25;
    const meses = Math.floor(diasRestantesAposAnos / diasPorMesMedio);
    const dias = Math.round(diasRestantesAposAnos % diasPorMesMedio);

    let partes = [];
    if (anos > 0) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
    if (meses > 0) partes.push(`${meses} mes${meses > 1 ? 'es' : ''}`);
    // Mostra dias se for a única unidade ou se houver anos/meses. Evita mostrar "0 dias" se for exatamente X meses.
    if (dias > 0 || partes.length === 0) partes.push(`${dias} dia${dias !== 1 ? 's' : ''}`);
    
    return partes.join(', ');
}

/**
 * Processa o histórico de snapshots para calcular os marcos de crescimento patrimonial.
 * VERSÃO 3: Implementa a lógica de crescimento relativo ao último marco registrado.
 * Um novo marco só é registrado quando: Saldo Atual >= Saldo do Último Marco + Intervalo.
 *
 * @param {string} tipoSaldo - A chave do tipo de saldo a ser analisado (ex: 'patrimonioTotal', 'FIIs').
 * @param {number} intervaloValor - O valor do incremento para definir o próximo marco.
 * @returns {Array<object>} - Um array de objetos contendo os marcos encontrados.
 */
function calcularCrescimentoPatrimonial(tipoSaldo, intervaloValor) {
    // 1. Preparar a série temporal de dados com base na seleção do usuário.
    const timeSeries = [];
    historicoCarteira.forEach(snapshot => {
        let valorSnapshot = 0;
        switch (tipoSaldo) {
            case 'patrimonioTotal':
                valorSnapshot = snapshot.patrimonioTotal || 0;
                break;
            case 'valorTotalInvestimentos':
                valorSnapshot = snapshot.valorTotalInvestimentos || 0;
                break;
            case 'FIIs':
                valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['FIIs'] || 0;
                break;
            case 'Ações':
                valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['Ações'] || 0;
                break;
            case 'ETF':
                valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['ETF'] || 0;
                break;
            case 'Renda Fixa':
                valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['Renda Fixa'] || 0;
                break;
        }
        timeSeries.push({ data: snapshot.data, valor: valorSnapshot });
    });
    let startIndex = timeSeries.findIndex(item => item.valor > 0);
    if (startIndex === -1) return null; // Não há dados positivos para analisar.

    const resultados = [];
    // Define o ponto de partida (baseline) com o primeiro snapshot válido.
    let dataReferencia = timeSeries[startIndex].data;
    let saldoReferencia = timeSeries[startIndex].valor;
    resultados.push({ data: dataReferencia, saldo: saldoReferencia, tempo: '-', diffValor: 0 });

    // 3. Iterar sobre os snapshots restantes aplicando a lógica de intervalo relativo ao último marco registrado.
    for (let i = startIndex + 1; i < timeSeries.length; i++) {
        const snapshotAtual = timeSeries[i];
        
        // Condição: O saldo atual deve ser maior ou igual ao saldo do último marco + o intervalo definido.
        if (snapshotAtual.valor >= saldoReferencia + intervaloValor) {
            const diasDecorridos = calcularDiffDias(dataReferencia, snapshotAtual.data);
            const crescimentoReal = snapshotAtual.valor - saldoReferencia;

            resultados.push({
                data: snapshotAtual.data,
                saldo: snapshotAtual.valor,
                tempo: formatarIntervaloDias(diasDecorridos),
                diffValor: crescimentoReal
            });
            
            // Atualiza a base de referência para o próximo cálculo.
            dataReferencia = snapshotAtual.data;
            saldoReferencia = snapshotAtual.valor;
        }
    }
    return resultados;
}

/**
 * Renderiza a tabela de resultados do crescimento patrimonial na interface.
 */
function renderizarResultadoCrescimento(resultados, intervaloValor) {
    const container = document.getElementById('container-resultado-crescimento');
    if (!resultados || resultados.length <= 1) {
        container.innerHTML = '<p>Não foi possível encontrar marcos de crescimento suficientes com o intervalo de valor fornecido.</p>';
        container.style.display = 'block';
        return;
    }

    let tableHtml = `
        <h4>Marcos de Crescimento (Intervalo de R$ ${formatarDecimal(intervaloValor)})</h4>
        <table>
            <thead>
                <tr>
                    <th>Data do Marco</th>
                    <th class="numero">Saldo Atingido</th>
                    <th class="numero">Crescimento Realizado</th>
                    <th>Tempo desde o Marco Anterior</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let i = 0; i < resultados.length; i++) {
        const item = resultados[i];
        const dataFormatada = new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR');
        tableHtml += `
            <tr>
                <td>${dataFormatada}</td>
                <td class="numero">${formatarMoeda(item.saldo)}</td>
                <td class="numero">${i === 0 ? '-' : formatarMoeda(item.diffValor)}</td>
                <td>${item.tempo}</td>
            </tr>
        `;
    }

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
    container.style.display = 'block';
}

function calcularCrescimentoPorPeriodo(tipoSaldo, periodo, dataInicioUsuario) {
    const timeSeriesAll = historicoCarteira.map(snapshot => {
        let valorSnapshot = 0;
        switch (tipoSaldo) {
            case 'patrimonioTotal': valorSnapshot = snapshot.patrimonioTotal || 0; break;
            case 'valorTotalInvestimentos': valorSnapshot = snapshot.valorTotalInvestimentos || 0; break;
            case 'FIIs': valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['FIIs'] || 0; break;
            case 'Ações': valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['Ações'] || 0; break;
            case 'ETF': valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['ETF'] || 0; break;
            case 'Renda Fixa': valorSnapshot = snapshot.detalhesCarteira?.valorPorClasse?.['Renda Fixa'] || 0; break;
        }
        return { data: snapshot.data, valor: valorSnapshot };
    });

    const timeSeriesValida = timeSeriesAll.slice(timeSeriesAll.findIndex(item => item.valor > 0));
    if (timeSeriesValida.length < 1) return null;

    const getSaldoNaData = (dataAlvoStr, series) => {
        let ultimoSnapshotValido = null;
        for (const snapshot of series) {
            if (snapshot.data <= dataAlvoStr) {
                ultimoSnapshotValido = snapshot;
            } else {
                break;
            }
        }
        return ultimoSnapshotValido;
    };

    let dataDePartida = new Date(dataInicioUsuario + 'T12:00:00');
    const primeiraDataSnapshotValida = new Date(timeSeriesValida[0].data + 'T12:00:00');
    if (dataDePartida < primeiraDataSnapshotValida) {
        dataDePartida = primeiraDataSnapshotValida;
    }

    const resultados = [];
    let dataMarcoAnterior = new Date(dataDePartida);
    const hoje = new Date();
    const dataUltimoSnapshot = new Date(timeSeriesValida[timeSeriesValida.length - 1].data + 'T12:00:00');

    while (dataMarcoAnterior <= dataUltimoSnapshot && dataMarcoAnterior < hoje) {
        let dataMarcoAtual = new Date(dataMarcoAnterior);
        switch (periodo) {
            case 'mensal': dataMarcoAtual.setUTCMonth(dataMarcoAtual.getUTCMonth() + 1); break;
            case 'trimestral': dataMarcoAtual.setUTCMonth(dataMarcoAtual.getUTCMonth() + 3); break;
            case 'semestral': dataMarcoAtual.setUTCMonth(dataMarcoAtual.getUTCMonth() + 6); break;
            case 'anual': dataMarcoAtual.setUTCFullYear(dataMarcoAtual.getUTCFullYear() + 1); break;
            case 'semanal': dataMarcoAtual.setUTCDate(dataMarcoAtual.getUTCDate() + 7); break;
        }

        const snapshotInicioPeriodo = getSaldoNaData(dataMarcoAnterior.toISOString().split('T')[0], timeSeriesValida);
        const snapshotFimPeriodo = getSaldoNaData(dataMarcoAtual.toISOString().split('T')[0], timeSeriesValida);

        if (!snapshotInicioPeriodo || !snapshotFimPeriodo || snapshotInicioPeriodo.data === snapshotFimPeriodo.data) {
            dataMarcoAnterior = dataMarcoAtual;
            if (dataMarcoAtual > hoje) break;
            continue;
        }

        resultados.push({
            dataInicioPeriodo: new Date(snapshotInicioPeriodo.data + 'T12:00:00'),
            dataFimPeriodo: new Date(snapshotFimPeriodo.data + 'T12:00:00'),
            saldoInicial: snapshotInicioPeriodo.valor,
            saldoFinal: snapshotFimPeriodo.valor
        });

        dataMarcoAnterior = dataMarcoAtual;
    }
    
    return resultados.length > 0 ? resultados : null;
}

function renderizarResultadoCrescimentoPorPeriodo(resultados) {
    const container = document.getElementById('container-resultado-crescimento');
    if (!resultados || resultados.length === 0) {
        container.innerHTML = '<p>Não foi possível encontrar dados de crescimento para o período e filtros selecionados.</p>';
        container.style.display = 'block';
        return;
    }

    let tableHtml = `
        <h4>Performance por Período</h4>
        <table>
            <thead>
                <tr>
                    <th>Período</th>
                    <th class="numero">Saldo Inicial</th>
                    <th class="numero">Saldo Final</th>
                    <th class="numero">Crescimento (R$)</th>
                    <th class="percentual">Crescimento (%)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let saldoPeriodoAnterior = resultados[0].saldoInicial;

    resultados.forEach((item, index) => {
        const dataInicioFmt = item.dataInicioPeriodo.toLocaleDateString('pt-BR');
        const dataFimFmt = item.dataFimPeriodo.toLocaleDateString('pt-BR');
        
        let crescimentoValor, crescimentoPercentual, classeResultado, saldoInicialFmt;

        if (index === 0) {
            crescimentoValor = '-';
            crescimentoPercentual = '-';
            classeResultado = '';
            saldoInicialFmt = '-';
        } else {
            const crescimento = item.saldoFinal - saldoPeriodoAnterior;
            classeResultado = crescimento >= 0 ? 'valor-positivo' : 'valor-negativo';
            crescimentoValor = formatarMoeda(crescimento);
            crescimentoPercentual = saldoPeriodoAnterior > 0 ? formatarPercentual(crescimento / saldoPeriodoAnterior) : 'Infinity%';
            saldoInicialFmt = formatarMoeda(saldoPeriodoAnterior);
        }
        
        tableHtml += `
            <tr>
                <td>${dataInicioFmt} - ${dataFimFmt}</td>
                <td class="numero">${saldoInicialFmt}</td>
                <td class="numero">${formatarMoeda(item.saldoFinal)}</td>
                <td class="numero ${classeResultado}">${crescimentoValor}</td>
                <td class="percentual ${classeResultado}">${crescimentoPercentual}</td>
            </tr>
        `;
        
        saldoPeriodoAnterior = item.saldoFinal;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
    container.style.display = 'block';
}

/**
 * NOVA FUNÇÃO CENTRAL: Calcula a projeção de rendimento anual por unidade de um ativo.
 * @param {string} ticker - O ticker do ativo.
 * @param {object} options - Opções para o cálculo.
 * @param {string} options.dataFim - A data final para considerar o histórico (normalmente hoje).
 * @param {string} [options.dataInicio] - A data inicial do período. Se não for fornecida, busca o início do investimento.
 * @param {number} [options.limiteAnos] - Limita o histórico aos últimos N anos a partir da dataFim.
 * @returns {number} - O valor do rendimento anualizado por unidade.
 */

function calcularProjecaoAnualUnitaria(ticker, options = {}) {
    const hoje = new Date().toISOString().split('T')[0];
    const dataFim = options.dataLimite || hoje;

    let dataInicio = options.dataInicio || getInicioInvestimento([ticker], dataFim);
    
    if (!dataInicio) {
        return 0;
    }

    if (options.limiteAnos) {
        let dataCorte5Anos = new Date(dataFim);
        dataCorte5Anos.setFullYear(dataCorte5Anos.getFullYear() - options.limiteAnos);
        const dataCorte5AnosStr = dataCorte5Anos.toISOString().split('T')[0];

        if (new Date(dataInicio) < new Date(dataCorte5AnosStr)) {
            dataInicio = dataCorte5AnosStr;
        }
    }

    const diasDeHistorico = calcularDiffDias(dataInicio, dataFim);
    if (diasDeHistorico <= 0) {
        return 0;
    }
    
    const fonteDeProventos = options.proventosParaCalculo || todosOsProventos;
    
    const proventosNoPeriodo = fonteDeProventos.filter(p =>
        p.ticker === ticker &&
        p.dataCom >= dataInicio &&
        p.dataCom <= dataFim
    );

    const somaTotalPeriodo = proventosNoPeriodo.reduce((acc, p) => acc + p.valorIndividual, 0);

    return (somaTotalPeriodo / diasDeHistorico) * 365.25;
}

/**
 * Calcula o Preço Teto pelo método de Bazin.
 */
function calcularPrecoTetoBazin(dividendoAnual, metaYield) {
    if (metaYield <= 0) return 0;
    return dividendoAnual / metaYield;
}

/**
 * Calcula o Preço Teto pela fórmula de Graham.
 */
function calcularPrecoTetoGraham(lpa, vpa) {
    if (lpa <= 0 || vpa <= 0) return 0;
    const valor = 22.5 * lpa * vpa;
    return Math.sqrt(valor);
}
// Substitua esta função inteira
function fecharModal(modalId) {
    const modalParaFechar = document.getElementById(modalId);
    if (modalParaFechar) {
        modalParaFechar.style.display = 'none';
        modalParaFechar.classList.remove('modal-no-topo');
    }

    // Encontra os modais que ainda estão visíveis
    const modaisVisiveis = document.querySelectorAll('.modal[style*="display: block"]');
    if (modaisVisiveis.length > 0) {
        // Garante que o último modal da lista (o que estava por baixo) se torne o do topo
        modaisVisiveis[modaisVisiveis.length - 1].classList.add('modal-no-topo');
    }
}
// Adicione esta nova função
function abrirModal(modalId) {
    const modalParaAbrir = document.getElementById(modalId);
    if (!modalParaAbrir) {
        console.error(`Tentativa de abrir um modal que não existe: ${modalId}`);
        return;
    }

    // Remove a classe 'no-topo' de qualquer outro modal que já esteja aberto
    document.querySelectorAll('.modal.modal-no-topo').forEach(m => m.classList.remove('modal-no-topo'));

    // Adiciona a classe 'no-topo' ao novo modal e o exibe
    modalParaAbrir.classList.add('modal-no-topo');
    modalParaAbrir.style.display = 'block';
}
function mostrarTela(idTela) {
    // Limpa o destaque de qualquer item de menu anteriormente ativo
    document.querySelectorAll('.sidebar .active').forEach(el => el.classList.remove('active'));

    // Encontra o link ou o menu pai correspondente à nova tela
    const linkAtivo = document.querySelector(`.sidebar a[data-tela="${idTela}"]`);
    if (linkAtivo) {
        // Adiciona a classe 'active' ao link clicado
        linkAtivo.classList.add('active');
        
        // Verifica se o link está dentro de um submenu
        const submenu = linkAtivo.closest('.submenu');
        if (submenu) {
            // Se estiver, abre o submenu e destaca o menu pai também
            submenu.style.display = 'block';
            const menuPai = submenu.previousElementSibling;
            if (menuPai && menuPai.classList.contains('menu-parent')) {
                menuPai.classList.add('active');
            }
        }
    }
    
    Object.values(telas).forEach(tela => tela.style.display = 'none'); 
    if (telas[idTela]) { 
        telas[idTela].style.display = 'block'; 
    } 
}
function formatarMoeda(valor) {
    // Adição: Garante que valores que arredondam para 0,00 não mostrem sinal negativo.
    if (Math.abs(valor) < 0.005) {
        valor = 0;
    }
    if (typeof valor !== 'number' || isNaN(valor)) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarMoedaEstrangeira(valor, moeda) {
    if (typeof valor !== 'number' || isNaN(valor)) valor = 0;
    const opcoes = { style: 'currency', currency: moeda, minimumFractionDigits: 2, maximumFractionDigits: 2 };
    // Omitir o código da moeda (USD, EUR) para um visual mais limpo se o símbolo for único
    if (moeda === 'USD' || moeda === 'EUR' || moeda === 'GBP') {
        opcoes.currencyDisplay = 'symbol';
    }
    return valor.toLocaleString('en-US', opcoes); // Usar 'en-US' para garantir o formato correto do símbolo
}
/**
 * Formata um valor monetário, decidindo entre a moeda local (BRL) e estrangeira.
 * @param {number} valor - O valor numérico a ser formatado.
 * @param {string} moeda - O código da moeda (ex: 'BRL', 'USD', 'EUR').
 * @returns {string} - O valor formatado como string.
 */
function formatarValor(valor, moeda = 'BRL') {
    if (moeda === 'BRL') {
        return formatarMoeda(valor);
    }
    return formatarMoedaEstrangeira(valor, moeda);
}
function formatarPercentual(valor) { if (typeof valor !== 'number' || isNaN(valor)) return '0,00%'; return (valor * 100).toFixed(2).replace('.', ',') + '%'; }
function formatarDecimal(valor, casas = 2) { if (typeof valor !== 'number' || isNaN(valor)) { const zero = 0; return zero.toFixed(casas).replace('.', ','); } return valor.toFixed(casas).replace('.', ','); }
function arredondarMoeda(valor) { if (typeof valor !== 'number' || isNaN(valor)) { return 0; } return Math.round(valor * 100) / 100; }
function formatarDecimalParaInput(valor) { if (typeof valor !== 'number' || isNaN(valor)) return ''; return String(valor).replace('.', ',');}
function formatarPrecoMedio(valor) { return formatarDecimal(valor, 6); }
function formatarValorComCeD(valor) { if (typeof valor !== 'number' || isNaN(valor)) return '0,00C'; const formatado = formatarDecimal(Math.abs(valor)); return valor >= 0 ? `${formatado}C` : `${formatado}D`; }
function parseDecimal(str) {
    if (!str || typeof str !== 'string') return 0;

    // Etapa 1 (CORRIGIDA): Limpa tudo que não for dígito, vírgula, ponto ou sinal de menos.
    // Isso remove "R$", espaços normais, espaços não-quebráveis (nbsp), etc. de forma robusta.
    const cleanStr = str.replace(/[^\d,.-]/g, '');

    // Etapa 2: A lógica para determinar o separador decimal (vírgula ou ponto) continua a mesma.
    const lastComma = cleanStr.lastIndexOf(',');
    const lastDot = cleanStr.lastIndexOf('.');
    let numberStr;

    if (lastComma > lastDot) {
        // Formato brasileiro (ex: 1.234,56) -> remove pontos de milhar, troca vírgula por ponto decimal.
        numberStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
        // Formato americano (ex: 1,234.56) ou sem separador de milhar -> remove vírgulas.
        numberStr = cleanStr.replace(/,/g, '');
    }

    const num = parseFloat(numberStr);
    return isNaN(num) ? 0 : num;
}

/**
 * Inicia o listener em tempo real para o documento da carteira do usuário no Firestore.
 * Qualquer alteração no documento (de qualquer dispositivo) irá disparar este listener.
 */
let unsubcribeFirestoreListener = null; // Variável global para guardar a função de desligar o listener

/**
 * Trunca uma string se ela for maior que um determinado comprimento, adicionando "..."
 * @param {string} texto - O texto a ser truncado.
 * @param {number} limite - O número máximo de caracteres.
 * @returns {string} - O texto truncado ou o original se for menor que o limite.
 */
function truncarTexto(texto, limite) {
    if (texto.length <= limite) {
        return texto;
    }
    return texto.substring(0, limite) + '...';
}
function normalizarDataParaInput(dataStr) {
    if (!dataStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        return dataStr;
    }
    const parts = dataStr.split(/[/.-]/);
    if (parts.length === 3) {
        let [p1, p2, p3] = parts;
        if (p3.length === 4) {
            if (p1.length === 2 && p2.length === 2) {
                return `${p3}-${p2}-${p1}`;
            }
        }
    }
    console.warn(`Formato de data não reconhecido: "${dataStr}". Tentando usar como está.`);
    return dataStr;
}
function formatarCNPJ(cnpj) { if (!cnpj) return ""; cnpj = cnpj.replace(/\D/g, ''); cnpj = cnpj.replace(/^(\d{2})(\d)/, '$1.$2'); cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); cnpj = cnpj.replace(/\.(\d{3})(\d)/, '.$1/$2'); cnpj = cnpj.replace(/(\d{4})(\d)/, '$1-$2'); return cnpj; }
function validarCNPJ(cnpj) { cnpj = cnpj.replace(/[^\d]+/g,''); if(cnpj === '' || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false; let t = cnpj.length - 2, n = cnpj.substring(0,t), d = cnpj.substring(t), s = 0, p = t - 7; for (let i = t; i >= 1; i--) { s += parseInt(n.charAt(t - i)) * p--; if (p < 2) p = 9; } let r = s % 11 < 2 ? 0 : 11 - s % 11; if (r !== parseInt(d.charAt(0))) return false; t = t + 1; n = cnpj.substring(0,t); s = 0, p = t - 7; for (let i = t; i >= 1; i--) { s += parseInt(n.charAt(t - i)) * p--; if (p < 2) p = 9; } r = s % 11 < 2 ? 0 : 11 - s % 11; if (r !== parseInt(d.charAt(1))) return false; return true; }
/**
 * Retorna uma lista de corretoras que possuem pelo menos uma conta de investimento ativa.
 * Usado para popular dropdowns de novas transações de RV.
 * @returns {Array<string>} Lista de nomes de corretoras ativas.
 */
function getCorretorasAtivasParaNotas() {
    const nomesCorretorasAtivas = new Set();
    const contasInvestimentoAtivas = todasAsContas.filter(conta => {
        const notas = (conta.notas || '').toLowerCase();
        const isAtiva = !notas.includes('inativa') && !notas.includes('encerrada');
        // Filtra especificamente por contas de investimento ativas
        return conta.tipo === 'Conta Investimento' && isAtiva;
    });

    contasInvestimentoAtivas.forEach(conta => {
        if (conta.banco) {
            nomesCorretorasAtivas.add(conta.banco.trim());
        }
    });
    return [...nomesCorretorasAtivas].sort();
}
function getTodasCorretoras() {
    const nomesInstituicoes = new Set();
    const contasAtivas = todasAsContas.filter(conta => {
        const notas = (conta.notas || '').toLowerCase();
        return !notas.includes('inativa') && !notas.includes('encerrada');
    });
    contasAtivas.forEach(conta => {
        if (conta.banco) {
            nomesInstituicoes.add(conta.banco.trim());
        }
    });
    todosOsAtivosRF.forEach(ativoRF => {
        if (ativoRF.instituicao) {
            nomesInstituicoes.add(ativoRF.instituicao.trim());
        }
    });
    const posicoesRV = gerarPosicaoDetalhada();
    Object.values(posicoesRV).forEach(posicao => {
        Object.keys(posicao.porCorretora).forEach(corretora => {
            nomesInstituicoes.add(corretora.trim());
        });
    });

    return [...nomesInstituicoes].sort();
}
function inicializarIconesCalculadora() {
    ['nota-custos', 'op-valor'].forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input && !input.parentElement.classList.contains('input-with-icon')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'input-with-icon';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            wrapper.insertAdjacentHTML('beforeend', ` <i class="fas fa-calculator calculator-icon" data-target-input="${inputId}" title="Abrir calculadora"></i>`);
        }
    });
}
function getTodasInstituicoesAtivas() {
    const nomesDeBancos = new Set();
    
    // Filtra as contas para considerar qualquer tipo, desde que não esteja inativa/encerrada.
    const contasAtivas = todasAsContas.filter(conta => {
        const notas = (conta.notas || '').toLowerCase();
        return !notas.includes('inativa') && !notas.includes('encerrada');
    });

    contasAtivas.forEach(conta => {
        if (conta.banco) {
            nomesDeBancos.add(conta.banco.trim());
        }
    });

    return [...nomesDeBancos].sort();
}
function getTodasContasAtivas() {
    return todasAsContas.filter(conta => {
        const notas = (conta.notas || '').toLowerCase();
        return !notas.includes('inativa') && !notas.includes('encerrada');
    });
}
function getCorretorasComPosicaoNaData(data) {
    const nomesCorretoras = new Set();
    const posicoesRV = gerarPosicaoDetalhada(data);

    Object.values(posicoesRV).forEach(posicao => {
        for (const corretora in posicao.porCorretora) {
            if (posicao.porCorretora[corretora] > 0.000001) {
                nomesCorretoras.add(corretora.trim());
            }
        }
    });

    return [...nomesCorretoras].sort();
}
function popularFiltrosCorretora() {
    const corretoras = getTodasCorretoras();
    const corretorasHtml = corretoras.map(c => `<option value="${c}">${c}</option>`).join('');
    document.querySelectorAll('.broker-filter').forEach(select => {
        select.innerHTML = '<option value="consolidado">Consolidado</option>' + corretorasHtml;
    });
}
function calcularSaldoEmData(conta, dataLimite) {
    if (!dataLimite) return 0;

    // --- INÍCIO DA ALTERAÇÃO ---
    // Agora, esta função usa a mesma fonte de dados que o extrato detalhado.
    const todosOsEventos = obterTodosOsEventosDeCaixa();

    // Filtra todos os eventos relevantes para a conta até a data limite.
    const eventosFiltrados = todosOsEventos.filter(e =>
        e.tipo === 'conta' &&
        String(e.idAlvo) === String(conta.id) &&
        e.source !== 'recorrente_futura' && // Ignora lançamentos futuros não confirmados
        new Date(e.data + 'T12:00:00') <= new Date(dataLimite + 'T12:00:00') &&
        new Date(e.data + 'T12:00:00') >= new Date(conta.dataSaldoInicial + 'T12:00:00')
    );

    // Começa com o saldo inicial e soma cada evento, arredondando-o antes da soma.
    const saldoFinal = eventosFiltrados.reduce((acc, evento) => {
        return acc + arredondarMoeda(evento.valor);
    }, conta.saldoInicial);
    
    return arredondarMoeda(saldoFinal); // Retorna o saldo final também arredondado.
    // --- FIM DA ALTERAÇÃO ---
}

/**
 * Calcula o saldo projetado de uma conta ou ativo em moeda em uma data futura, incluindo transações recorrentes.
 * VERSÃO CORRIGIDA: Calcula o saldo atual e soma apenas os eventos futuros relevantes.
 *
 * @param {object} item - O objeto da conta ou do ativo em moeda.
 * @param {string} dataLimite - A data final para o cálculo (formato 'AAAA-MM-DD').
 * @param {'conta'|'moeda'} tipoItem - O tipo de item sendo calculado.
 * @returns {number} - O saldo projetado na data limite.
 */
function calcularSaldoProjetado(item, dataLimite, tipoItem = 'conta') {
    if (!item || !dataLimite) return 0;
    
    const todosOsEventos = obterTodosOsEventosDeCaixa();
    const hojeStr = new Date().toISOString().split('T')[0];
    const transacoesAtuaisEPassadas = todosOsEventos.filter(e =>
        e.tipo === tipoItem &&
        String(e.idAlvo) === String(item.id) &&
        e.source !== 'recorrente_futura' &&
        new Date(e.data + 'T12:00:00') <= new Date(hojeStr + 'T12:00:00') &&
        new Date(e.data + 'T12:00:00') >= new Date(item.dataSaldoInicial + 'T12:00:00')
    );
    const saldoAtual = transacoesAtuaisEPassadas.reduce((acc, t) => acc + arredondarMoeda(t.valor), item.saldoInicial);
    const eventosFuturosFiltrados = todosOsEventos.filter(e => 
        e.tipo === tipoItem &&
        String(e.idAlvo) === String(item.id) &&
        new Date(e.data + 'T12:00:00') > new Date(hojeStr + 'T12:00:00') && // Data maior que hoje
        new Date(e.data + 'T12:00:00') <= new Date(dataLimite + 'T12:00:00') // Data até o limite da projeção
    );
    const saldoProjetado = eventosFuturosFiltrados.reduce((acc, t) => acc + arredondarMoeda(t.valor), saldoAtual);
    
    return arredondarMoeda(saldoProjetado);
}

function getPrimeiraData() { const datas = []; todasAsNotas.forEach(n => datas.push(new Date(n.data))); posicaoInicial.forEach(p => { if(p.data) datas.push(new Date(p.data)) }); todosOsAjustes.forEach(a => datas.push(new Date(a.data))); if (datas.length === 0) return null; const dataMaisAntiga = new Date(Math.min.apply(null, datas)); return dataMaisAntiga.toLocaleDateString('pt-BR', {timeZone: 'UTC'}); }
function calcularDiffDias(dataInicio, dataFim) {
    if (!dataInicio || !dataFim || new Date(dataInicio) > new Date(dataFim)) return 0;
    const umDia = 1000 * 60 * 60 * 24;
    const inicio = new Date(dataInicio + 'T12:00:00');
    const fim = new Date(dataFim + 'T12:00:00');
    return Math.round(Math.abs((fim - inicio) / umDia));
}
function calcularDataLiquidacao(dataInicialStr, diasUteis) {
    if(!dataInicialStr || isNaN(new Date(dataInicialStr).getTime())) return new Date('1970-01-01');
    let dataAtual = new Date(dataInicialStr + 'T12:00:00'); 
    let diasContados = 0;
    const feriadosFormatados = todosOsFeriados.map(f => f.data);
    while (diasContados < diasUteis) {
        dataAtual.setDate(dataAtual.getDate() + 1);
        const diaDaSemana = dataAtual.getDay();
        const dataAtualStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`;
        if (diaDaSemana !== 0 && diaDaSemana !== 6 && !feriadosFormatados.includes(dataAtualStr)) {
            diasContados++;
        }
    }
    return dataAtual;
}
function calcularTIR(fluxosDeCaixa, datas) {
    if (fluxosDeCaixa.length < 2 || !fluxosDeCaixa.some(v => v > 0) || !fluxosDeCaixa.some(v => v < 0)) {
        return NaN;
    }

    const calcularVPL = (taxa) => {
        let vpl = 0;
        const dataInicial = new Date(datas[0] + 'T12:00:00').getTime();
        for (let i = 0; i < fluxosDeCaixa.length; i++) {
            const dataFluxo = new Date(datas[i] + 'T12:00:00').getTime();
            const dias = (dataFluxo - dataInicial) / (1000 * 60 * 60 * 24);
            vpl += fluxosDeCaixa[i] / Math.pow(1 + taxa, dias / 365.25);
        }
        return vpl;
    };
    
    let taxaMin = -0.999;
    let taxaMax = 5.0;
    const precisao = 1.0e-7;
    const maxIteracoes = 100;
    let taxaMedia, vplMedio;

    for (let i = 0; i < maxIteracoes; i++) {
        taxaMedia = (taxaMin + taxaMax) / 2;
        vplMedio = calcularVPL(taxaMedia);

        if (Math.abs(vplMedio) < precisao) {
            return taxaMedia;
        }

        if (calcularVPL(taxaMin) * vplMedio < 0) {
            taxaMax = taxaMedia;
        } else {
            taxaMin = taxaMedia;
        }
    }
    return NaN; 
}
// ==================================================================
// == INÍCIO: NOVA FUNÇÃO DE CÁLCULO DE PROVENTOS PARA EXPORTAÇÃO
// ==================================================================
/**
 * VERSÃO CORRIGIDA: Agora aceita um snapshot de ativos para calcular projeções passadas.
 * @param {object} [ativosSnapshot=null] - Opcional. Um objeto de ativos de um snapshot do histórico.
 * @returns {object} - Um objeto com a projeção de proventos para ações e FIIs.
 */
function calcularProjecaoProventosNegociacao(ativosSnapshot = null) {
    // Se nenhum snapshot for fornecido, usa a posição atual da carteira.
    const posicoesParaCalculo = ativosSnapshot ? ativosSnapshot : gerarPosicaoDetalhada();

    let totalRendimentoAtualFIIs = 0;
    let totalRendimentoAtualAcoes = 0;

    // Itera sobre os tickers da carteira (atual ou do snapshot)
    for (const ticker in posicoesParaCalculo) {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        if (!ativoInfo) continue;

        const posicao = posicoesParaCalculo[ticker];
        if (!posicao || posicao.quantidade <= 0) continue;

        if (ativoInfo.tipo === 'FII') {
            const ultimoProvento = getUltimoProvento(ticker);
            totalRendimentoAtualFIIs += ultimoProvento * posicao.quantidade;
        } else if (ativoInfo.tipo === 'Ação') {
            const projecaoAnualUnitaria = calcularProjecaoAnualUnitaria(ticker, { limiteAnos: 5 });
            totalRendimentoAtualAcoes += (projecaoAnualUnitaria * posicao.quantidade) / 12;
        }
    }

    return {
        acoes: totalRendimentoAtualAcoes,
        fiis: totalRendimentoAtualFIIs
    };
}

async function carregarLinksExternos() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            linksExternos = docSnap.exists() ? (docSnap.data().linksExternos || { acoes: '', fiis: '', etfs: '' }) : { acoes: '', fiis: '', etfs: '' };
        } catch (error) {
            console.error("Erro ao carregar links externos:", error);
            linksExternos = { acoes: '', fiis: '', etfs: '' };
        }
    } else {
        const data = localStorage.getItem('carteira_links_externos_offline');
        linksExternos = data ? JSON.parse(data) : { acoes: '', fiis: '', etfs: '' };
    }
}
async function carregarConfiguracoesGraficos() {
    const defaultConfig = { evolucao: { hidden: [] }, desempenho: { hidden: [] } };
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            configuracoesGraficos = docSnap.exists() ? (docSnap.data().configuracoesGraficos || defaultConfig) : defaultConfig;
        } catch (error) {
            console.error("Erro ao carregar configs de gráficos:", error);
            configuracoesGraficos = defaultConfig;
        }
    } else {
        const data = localStorage.getItem('carteira_config_graficos_offline');
        configuracoesGraficos = data ? JSON.parse(data) : defaultConfig;
    }
}
async function carregarUrlCotacoes() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            urlCotacoesCSV = docSnap.exists() ? (docSnap.data().urlCotacoesCSV || '') : '';
        } catch (error) {
            console.error("Erro ao carregar URL de cotações:", error);
            urlCotacoesCSV = '';
        }
    } else {
        urlCotacoesCSV = localStorage.getItem('carteira_url_cotacoes_csv_offline') || '';
    }
}

async function carregarConfiguracaoAutoUpdate() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            autoUpdateEnabled = docSnap.exists() ? (docSnap.data().autoUpdateEnabled === true) : false;
        } catch (error) {
            console.error("Erro ao carregar config de auto-update:", error);
            autoUpdateEnabled = false;
        }
    } else {
        const salvo = localStorage.getItem('carteira_auto_update_enabled_offline');
        autoUpdateEnabled = salvo === 'true';
    }
}

function iniciarAutoUpdate() {
    if (autoUpdateIntervalId) {
        clearInterval(autoUpdateIntervalId); // Limpa qualquer timer anterior
    }
    console.log("Iniciando atualização automática de cotações.");
    atualizarCotacoesComAPI(true); // Executa uma vez imediatamente de forma silenciosa
    autoUpdateIntervalId = setInterval(() => {
        console.log("Executando atualização automática agendada...");
        atualizarCotacoesComAPI(true); // Executa a cada 10 minutos de forma silenciosa
    }, 10 * 60 * 1000);
}

function pararAutoUpdate() {
    if (autoUpdateIntervalId) {
        clearInterval(autoUpdateIntervalId);
        autoUpdateIntervalId = null;
        console.log("Atualização automática de cotações interrompida.");
    }
}
function verificarEMigrarDadosNaInicializacao() {
    let dadosForamMigrados = false;
    if (todosOsAtivos && todosOsAtivos.length > 0) {
        todosOsAtivos.forEach(ativo => {
            if (typeof ativo.statusAporte === 'undefined') {
                ativo.statusAporte = 'Ativo'; // Define 'Ativo' como padrão
                dadosForamMigrados = true;
            }
        });
    }

    if (dadosForamMigrados) {
        console.log("MIGRAÇÃO DE DADOS: A propriedade 'statusAporte' foi adicionada aos ativos existentes.");
        salvarAtivos(); // Salva os dados corrigidos de volta no localStorage
    }
}
function carregarHistoricoCarteira() { // Renomeado
    const data = localStorage.getItem('carteira_historico_carteira'); // Chave renomeada
    historicoCarteira = data ? JSON.parse(data) : [];
}

// --- FUNÇÕES DE CONFIGURAÇÕES FISCAIS E RENDA FIXA ---
async function carregarConfiguracoesFiscais() {
    const defaultConfig = { aliquotaAcoes: 0.15, aliquotaFiisDt: 0.20, limiteIsencaoAcoes: 20000, tabelaRegressivaIR: { 180: 0.225, 360: 0.200, 720: 0.175, 9999: 0.150 } };
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().configuracoesFiscais) {
                configuracoesFiscais = { ...defaultConfig, ...docSnap.data().configuracoesFiscais };
            } else {
                configuracoesFiscais = defaultConfig;
            }
        } catch (error) {
            console.error("Erro ao carregar configs fiscais:", error);
            configuracoesFiscais = defaultConfig;
        }
    } else {
        const data = localStorage.getItem('carteira_config_fiscais_offline');
        configuracoesFiscais = data ? { ...defaultConfig, ...JSON.parse(data) } : defaultConfig;
    }
}
async function carregarAjustesIR() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                todosOsAjustesIR = docSnap.data().ajustesIR || [];
            } else {
                todosOsAjustesIR = [];
            }
        } catch (error) {
            console.error("Erro ao carregar ajustes de IR do Firestore:", error);
            todosOsAjustesIR = [];
        }
    } else {
        const data = localStorage.getItem('carteira_ajustes_ir_offline');
        todosOsAjustesIR = data ? JSON.parse(data) : [];
    }
}
async function carregarUserName() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            userName = docSnap.exists() ? (docSnap.data().userName || '') : '';
        } catch (error) {
            console.error("Erro ao carregar nome do usuário:", error);
            userName = '';
        }
    } else {
        userName = localStorage.getItem('carteira_user_name_offline') || '';
    }
}
async function carregarDadosComparacao() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            dadosComparacao = docSnap.exists() ? (docSnap.data().dadosComparacao || null) : null;
        } catch (error) {
            console.error("Erro ao carregar dados de comparação:", error);
            dadosComparacao = null;
        }
    } else {
        const data = localStorage.getItem('carteira_dados_comparacao_offline');
        dadosComparacao = data ? JSON.parse(data) : null;
    }
}
function salvarTimestampBackup(timestamp = null) {
    const dataParaSalvar = timestamp ? timestamp : new Date().toISOString();
    localStorage.setItem('carteira_ultimo_backup', dataParaSalvar);
    timestampUltimoBackup = dataParaSalvar;
    salvarDadosNaFonte({ timestampUltimoBackup: timestampUltimoBackup });
    renderizarInfoBackup();
}
function renderizarInfoBackup() {
    const container = document.getElementById('backup-info');
    if (!container) return;

    // Prioriza a variável global (vinda do Firestore) e usa o localStorage como fallback
    const timestamp = timestampUltimoBackup || localStorage.getItem('carteira_ultimo_backup');

    if (timestamp) {
        const data = new Date(timestamp);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        container.innerHTML = `<span>Último backup: ${dataFormatada} às ${horaFormatada}</span>`;
    } else {
        container.innerHTML = `<span>Último backup: Nunca</span>`;
    }
}

/**
 * NOVA FUNÇÃO: Exibe um feedback visual temporário no rodapé da sidebar.
 * @param {string} mensagem - O texto a ser exibido.
 * @param {'success'|'error'|'loading'} status - O tipo de feedback.
 */
function mostrarFeedbackAtualizacao(mensagem, status) {
    const footerInfo = document.getElementById('market-data-info');
    if (!footerInfo) return;

    // Limpa classes antigas
    footerInfo.classList.remove('update-success', 'update-error');

    // Define a mensagem e a classe de status
    footerInfo.innerHTML = `<span>${mensagem}</span>`;
    if (status === 'success') {
        footerInfo.classList.add('update-success');
    } else if (status === 'error') {
        footerInfo.classList.add('update-error');
    }

    // Se não for um carregamento, remove a cor após um tempo e restaura o texto original
    if (status === 'success' || status === 'error') {
        setTimeout(() => {
            footerInfo.classList.remove('update-success', 'update-error');
            renderizarInfoAtualizacaoMercado(); // Restaura o texto do timestamp
        }, 3000); // A cor de feedback some após 3 segundos
    }
}
function fazerBackup() {
    // Sincroniza antes para garantir dados frescos na memória
    salvarSnapshotCarteira(true);
    
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const hora = String(hoje.getHours()).padStart(2, '0');
    const minuto = String(hoje.getMinutes()).padStart(2, '0');
    const segundo = String(hoje.getSeconds()).padStart(2, '0');

    const nomeUsuario = userName.trim() ? userName.trim().toUpperCase() : 'BACKUP';
    const nomeArquivo = `${nomeUsuario}_${ano}${mes}${dia}_${hora}${minuto}${segundo}.json`;

    // Monta o objeto com segurança, garantindo que variáveis existam
    const backupData = {
        version: APP_VERSION,
        timestampUltimoBackup: timestampUltimoBackup,
        ativos: todosOsAtivos,
        notas: todasAsNotas,
        posicoes: posicaoInicial,
        ajustes: todosOsAjustes,
        proventos: todosOsProventos,
        contas: todasAsContas,
        feriados: todosOsFeriados,
        movimentacoes: todasAsMovimentacoes,
        todosOsAtivosRF: todosOsAtivosRF,
        todosOsRendimentosRealizadosRF: todosOsRendimentosRealizadosRF,
        todosOsRendimentosRFNaoRealizados: todosOsRendimentosRFNaoRealizados,
        dadosMoedas: dadosMoedas,
        todosOsAtivosMoedas: todosOsAtivosMoedas,
        dadosAlocacao: dadosAlocacao,
        mercado: dadosDeMercado, // Salva as cotações atuais
        configFiscais: configuracoesFiscais,
        ajustesIR: todosOsAjustesIR,
        urlCotacoesCSV: urlCotacoesCSV,
        historicoCarteira: historicoCarteira,
        dadosSimulacaoNegociar: dadosSimulacaoNegociar,
        todasAsTransacoesRecorrentes: todasAsTransacoesRecorrentes,
        userName: userName,
        dadosComparacao: dadosComparacao,
        configuracoesGraficos: configuracoesGraficos,
        linksExternos: linksExternos,
        metas: todasAsMetas,
        salarioMinimo: salarioMinimo,
        autoUpdateEnabled: typeof autoUpdateEnabled !== 'undefined' ? autoUpdateEnabled : false
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alteracoesDesdeUltimoBackup = 0;
    localStorage.setItem('carteira_alteracoes_pendentes', '0');
    salvarTimestampBackup();

    const alertElement = document.getElementById('backup-alert-footer');
    if (alertElement) {
        alertElement.remove();
    }
    verificarStatusBackup();
}

async function restaurarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loadingOverlay = document.getElementById('loading-overlay');
    const reader = new FileReader();

    reader.onload = async (e) => {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        try {
            const rawBackupData = JSON.parse(e.target.result);

            if (!rawBackupData.ativos || (!rawBackupData.notas && !rawBackupData.posicoes)) {
                throw new Error('Formato de arquivo de backup inválido.');
            }

            // Resgate inteligente de configurações
            const urlFinal = rawBackupData.urlCotacoesCSV || rawBackupData.url_cotacoes_csv || '';
            const configFinal = rawBackupData.configFiscais || rawBackupData.configuracoesFiscais || { 
                aliquotaAcoes: 0.15, 
                aliquotaFiisDt: 0.20, 
                limiteIsencaoAcoes: 20000, 
                tabelaRegressivaIR: { 180: 0.225, 360: 0.200, 720: 0.175, 9999: 0.150 } 
            };
            const linksFinais = rawBackupData.linksExternos || rawBackupData.links_externos || { acoes: '', fiis: '', etfs: '' };
            
            let autoUpdateFinal = false;
            if (typeof rawBackupData.autoUpdateEnabled !== 'undefined') autoUpdateFinal = rawBackupData.autoUpdateEnabled;
            else if (typeof rawBackupData.auto_update_enabled !== 'undefined') autoUpdateFinal = rawBackupData.auto_update_enabled;

            // Migração de dados
            const backupData = migrarDadosDoBackup(rawBackupData);

            if (confirm('ATENÇÃO! Isto substituirá TODOS os dados atuais pelos dados do arquivo de backup. Esta ação é irreversível. Deseja continuar?')) {

                // Atualiza variáveis globais
                todosOsAtivos = backupData.ativos || [];
                todasAsNotas = backupData.notas || [];
                posicaoInicial = backupData.posicoes || [];
                todosOsAjustes = backupData.ajustes || [];
                todosOsProventos = backupData.proventos || [];
                todasAsContas = backupData.contas || [];
                todosOsFeriados = backupData.feriados || [];
                todasAsMovimentacoes = backupData.movimentacoes || [];
                todosOsAtivosRF = backupData.todosOsAtivosRF || [];
                todosOsRendimentosRealizadosRF = backupData.todosOsRendimentosRealizadosRF || [];
                todosOsRendimentosRFNaoRealizados = backupData.todosOsRendimentosRFNaoRealizados || [];
                dadosMoedas = backupData.dadosMoedas || { cotacoes: {} };
                todosOsAtivosMoedas = backupData.todosOsAtivosMoedas || [];
                dadosAlocacao = backupData.dadosAlocacao || { categorias: {}, ativos: {} };
                todosOsAjustesIR = backupData.ajustesIR || [];
                historicoCarteira = backupData.historicoCarteira || [];
                todasAsTransacoesRecorrentes = backupData.todasAsTransacoesRecorrentes || [];
                todasAsMetas = backupData.metas || [];
                userName = backupData.userName || '';
                dadosComparacao = backupData.dadosComparacao || null;
                configuracoesGraficos = backupData.configuracoesGraficos || { evolucao: { hidden: [] }, desempenho: { hidden: [] } };
                salarioMinimo = backupData.salarioMinimo || 1518.00;
                dadosSimulacaoNegociar = backupData.dadosSimulacaoNegociar || { fiis: {}, acoes: {}, aporteTotal: '' };
                timestampUltimoBackup = backupData.timestampUltimoBackup || null;
                
                // Restaura Dados de Mercado (Importante para Offline)
                dadosDeMercado = backupData.mercado || { timestamp: null, cotacoes: {}, ifix: 0, ibov: 0 };

                // Atualiza variáveis de configuração
                urlCotacoesCSV = urlFinal;
                configuracoesFiscais = configFinal;
                linksExternos = linksFinais;
                autoUpdateEnabled = autoUpdateFinal;
                
                // Gravação Explícita de Configurações Críticas
                try {
                    localStorage.setItem('carteira_url_cotacoes_csv_offline', JSON.stringify(urlFinal));
                    localStorage.setItem('carteira_configuracoes_fiscais_offline', JSON.stringify(configFinal));
                    localStorage.setItem('carteira_links_externos_offline', JSON.stringify(linksFinais));
                    localStorage.setItem('carteira_auto_update_enabled_offline', JSON.stringify(autoUpdateFinal));
                    // Salva o mercado explicitamente
                    localStorage.setItem('carteira_dados_mercado', JSON.stringify(dadosDeMercado));
                } catch (e) {
                    console.error("Erro ao gravar configurações críticas:", e);
                }

                // Salva o restante dos dados em massa
                const dadosParaSalvar = {
                    ativos: todosOsAtivos, 
                    notas: todasAsNotas, 
                    posicoes: posicaoInicial, 
                    ajustes: todosOsAjustes,
                    proventos: todosOsProventos, 
                    contas: todasAsContas, 
                    feriados: todosOsFeriados,
                    movimentacoes: todasAsMovimentacoes, 
                    todos_os_ativos_r_f: todosOsAtivosRF, 
                    todos_os_rendimentos_realizados_r_f: todosOsRendimentosRealizadosRF,
                    todos_os_rendimentos_r_f_nao_realizados: todosOsRendimentosRFNaoRealizados,
                    dados_moedas: dadosMoedas,
                    todos_os_ativos_moedas: todosOsAtivosMoedas,
                    dados_alocacao: dadosAlocacao,
                    ajustes_ir: todosOsAjustesIR, 
                    historico_carteira: historicoCarteira,
                    todas_as_transacoes_recorrentes: todasAsTransacoesRecorrentes,
                    metas: todasAsMetas,
                    user_name: userName, 
                    dados_comparacao: dadosComparacao, 
                    configuracoes_graficos: configuracoesGraficos,
                    salario_minimo: salarioMinimo, 
                    dados_simulacao_negociar: dadosSimulacaoNegociar,
                    timestamp_ultimo_backup: timestampUltimoBackup
                };

                await salvarDadosNaFonte(dadosParaSalvar);

                alteracoesDesdeUltimoBackup = 0;
                localStorage.setItem('carteira_alteracoes_pendentes', '0');

                verificarStatusBackup();

                alert('Dados restaurados com sucesso! A aplicação será recarregada.');
                location.reload();
            } else {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        } catch (error) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            console.error(error);
            alert('Erro ao ler o arquivo de backup: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function migrarDadosDoBackup(backupData) {
    let dados = JSON.parse(JSON.stringify(backupData));
    const versaoBackup = dados.version || 0;

    if (versaoBackup >= APP_VERSION) {
        if (versaoBackup > APP_VERSION) {
            throw new Error("Atenção: O arquivo de backup é de uma versão mais nova do aplicativo. Restaure-o em uma versão compatível.");
        }
        console.log("Versão do backup é a mesma do aplicativo. Nenhuma migração necessária.");
        return dados;
    }

    console.log(`Iniciando migração de dados da versão ${versaoBackup} para ${APP_VERSION}`);

    switch (true) {
        case versaoBackup < 26:
            if (typeof dados.linksExternos === 'undefined') {
                dados.linksExternos = { acoes: '', fiis: '', etfs: '' };
            }
            console.log("Migrando da v25 para v26: Adicionando configurações de links externos.");
        
        case versaoBackup < 27:
            if (typeof dados.metas === 'undefined') {
                dados.metas = [];
            }
            console.log("Migrando da v26 para v27: Adicionando a funcionalidade de Metas.");
        
        case versaoBackup < 28:
            if (dados.transacoes) {
                dados.transacoes.forEach(t => { if (typeof t.transferenciaId === 'undefined') t.transferenciaId = null; });
            }
            if (dados.todasAsTransacoesMoedas) {
                dados.todasAsTransacoesMoedas.forEach(t => { if (typeof t.transferenciaId === 'undefined') t.transferenciaId = null; });
            }
            console.log("Migrando da v27 para v28: Adicionando campo 'transferenciaId' às transações.");
        
        case versaoBackup < 29:
            if (typeof dados.autoUpdateEnabled === 'undefined') {
                dados.autoUpdateEnabled = false;
            }
            console.log("Migrando da v28 para v29: Adicionando a configuração de atualização automática.");
        
        case versaoBackup < 30:
            if (dados.transacoes || dados.todasAsTransacoesMoedas) {
                console.log("Migrando da v29 para v30: Unificando arrays de transações.");
                const movimentacoesUnificadas = [];
                (dados.transacoes || []).forEach(t => {
                    movimentacoesUnificadas.push({ ...t, tipoAlvo: 'conta', idAlvo: t.contaId, moeda: 'BRL' });
                });
                (dados.todasAsTransacoesMoedas || []).forEach(t => {
                    const ativoMoeda = (dados.todosOsAtivosMoedas || []).find(a => String(a.id) === String(t.ativoMoedaId));
                    movimentacoesUnificadas.push({ ...t, tipoAlvo: 'moeda', idAlvo: t.ativoMoedaId, moeda: ativoMoeda ? ativoMoeda.moeda : 'N/D' });
                });
                dados.movimentacoes = movimentacoesUnificadas;
                delete dados.transacoes;
                delete dados.todasAsTransacoesMoedas;
            }
        
        case versaoBackup < 31:
            if (dados.movimentacoes) {
                dados.movimentacoes.forEach(mov => {
                    if (mov.source === 'resgate_rf' && typeof mov.devolucaoCapital === 'undefined') {
                        mov.devolucaoCapital = 0;
                    }
                });
                console.log("Migrando para compatibilidade de resgate de RF (v31): Adicionado campo 'devolucaoCapital'.");
            }
        
        case versaoBackup < 32:
            console.log("Migrando da v31 para v32: Preparando para a nova flag de proventos.");
            
        case versaoBackup < 33:
            if (dados.proventos) {
                dados.proventos.forEach(p => {
                    if (typeof p.valorBrutoIndividual === 'undefined') {
                        if (p.tipo === 'JCP') {
                            p.percentualIR = 15;
                            p.valorBrutoIndividual = p.valorIndividual / 0.85;
                        } else {
                            p.percentualIR = 0;
                            p.valorBrutoIndividual = p.valorIndividual;
                        }
                    }
                });
            }
            console.log("Migrando da v32 para v33: Adicionando campos valorBrutoIndividual e percentualIR aos proventos.");
        
        case versaoBackup < 34:
            if (typeof dados.dataInicioIntegracaoFinancas === 'undefined') {
                dados.dataInicioIntegracaoFinancas = null;
            }
            console.log("Migrando da v33 para v34: Adicionando campo dataInicioIntegracaoFinancas.");
        
        case versaoBackup < 35:
            if (dados.movimentacoes) {
                dados.movimentacoes.forEach(mov => {
                    if (typeof mov.enviarParaFinancas === 'undefined') {
                        // Se o campo já existia (de uma sincronização anterior), marca como true. Senão, false.
                        mov.enviarParaFinancas = !!mov.idLancamentoCasa;
                    }
                });
            }
            console.log("Migrando da v34 para v35: Adicionando campo 'enviarParaFinancas' às movimentações.");
            break;
    }

    console.log("Migração de dados concluída.");
    return dados;
}

function apagarTodosOsDados() {
    if (confirm('ATENÇÃO: Você está prestes a apagar TODOS os dados da aplicação. Esta ação é IRREVERSÍVEL.')) {
        if (prompt('Para confirmar, digite "APAGAR TUDO" na caixa abaixo:') === 'APAGAR TUDO') {
            localStorage.setItem('carteira_sync_needed', 'false');
            localStorage.clear();
            alert('Todos os dados foram apagados. A aplicação será recarregada.');
            location.reload();
        } else {
            alert('A confirmação falhou. Nenhuma ação foi tomada.');
        }
    }
}
async function sincronizarTodosOsRegistros(callback, silencioso = false) {
    if (!silencioso) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
    }

    console.log("Iniciando recálculo e saneamento interno dos dados...");

    try {
        // 1. Limpeza de Recorrências Órfãs (Regras que apontam para contas excluídas)
        const totalRecorrentesAntes = todasAsTransacoesRecorrentes.length;
        todasAsTransacoesRecorrentes = todasAsTransacoesRecorrentes.filter(regra => {
            if (regra.targetType === 'conta') return todasAsContas.some(conta => String(conta.id) === String(regra.targetId));
            if (regra.targetType === 'moeda') return todosOsAtivosMoedas.some(moeda => String(moeda.id) === String(regra.targetId));
            return false;
        });
        const recorrentesRemovidas = totalRecorrentesAntes - todasAsTransacoesRecorrentes.length;

        // 2. Limpeza de dados legados em contas
        let contasPixLimpas = 0;
        todasAsContas.forEach(conta => {
            if (conta.tipo === 'Conta Investimento' && conta.pix) {
                conta.pix = ''; // Contas de investimento não costumam ter chave PIX direta no sistema
                contasPixLimpas++;
            }
        });

        // 3. Regeneração de Movimentações Automáticas
        // Removemos todas as movimentações geradas automaticamente para recriá-las com base nos cadastros atuais
        todasAsMovimentacoes = todasAsMovimentacoes.filter(t => t.source !== 'nota' && t.source !== 'provento');

        // 4. Recálculo de Proventos
        for (const provento of todosOsProventos) {
            // Se não foi editado manualmente, recalcula os valores com base na posição da data-com
            if (!provento.pagamentoRedirecionadoManualmente) {
                const dadosRecalculados = calcularDadosProvento(provento.ticker, provento.dataCom, provento.valorIndividual);
                Object.assign(provento, dadosRecalculados);
            }
            // Gera a movimentação financeira (entrada de caixa) novamente
            await sincronizarProventoComTransacao(provento.id);
        }

        // 5. Recálculo de Notas de Negociação
        for (const nota of todasAsNotas) {
            // Gera a movimentação financeira (débito/crédito) novamente
            await sincronizarNotaComTransacao(nota.id);
        }

        // 6. Verificação de Ativos
        const numeroAtivosAntes = todosOsAtivos.length;
        buscarEcadastrarAtivosAusentes(true); // true = modo silencioso
        const novosAtivosEncontrados = todosOsAtivos.length - numeroAtivosAntes;
        
        // 7. Salvar Tudo
        await salvarDadosNaFonte({
            todasAsTransacoesRecorrentes, 
            contas: todasAsContas, 
            proventos: todosOsProventos, 
            movimentacoes: todasAsMovimentacoes, 
            todosOsAtivos
        });

        console.log("Saneamento interno concluído.");

        if (!silencioso) {
            let relatorio = `Manutenção de dados concluída com sucesso!\n\n` +
                            `- Valores de proventos recalculados com base no histórico.\n` +
                            `- Movimentações financeiras de notas e proventos regeneradas.\n` +
                            `- ${recorrentesRemovidas} regra(s) de recorrência inválida(s) removida(s).\n` +
                            `- ${novosAtivosEncontrados} novo(s) ativo(s) identificado(s) e cadastrado(s).`;

            alert(relatorio);
            
            // Se estiver na tela de configurações, atualiza a lista de inconsistências para mostrar que limpou
            const telaVisivel = document.querySelector('.main-content > div[style*="display: block"]');
            if(telaVisivel && telaVisivel.id === 'tela-configuracoes') {
                verificarInconsistencias();
            }
        }

        if (typeof callback === 'function') {
            callback();
        }

    } catch (error) {
        console.error("Erro durante o recálculo:", error);
        if (!silencioso) alert("Ocorreu um erro ao processar os dados. Verifique o console.");
    } finally {
        if (!silencioso) {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }
}

function verificarInconsistencias() {
    const resultadosDiv = document.getElementById('resultados-inconsistencias');
    resultadosDiv.innerHTML = '<h4>Verificando...</h4>';
    let htmlResultados = '';
    let totalInconsistencias = 0;

    const isDataInvalida = (data) => !data || isNaN(new Date(data).getTime());

    const ativosIncompletos = todosOsAtivos.filter(a => !a.tipo);
    if (ativosIncompletos.length > 0) {
        totalInconsistencias += ativosIncompletos.length;
        htmlResultados += `<div><h4>Ativos com Cadastro Incompleto (${ativosIncompletos.length})</h4><p>Os seguintes ativos não têm um tipo (Ação, FII, ETF) definido, o que é crucial para os cálculos.</p><ul>${ativosIncompletos.map(a => `<li>${a.ticker}</li>`).join('')}</ul></div>`;
    }

    const proventosOrfaos = todosOsProventos.filter(p => !p.quantidadeNaDataCom || p.quantidadeNaDataCom <= 0);
    if (proventosOrfaos.length > 0) {
        totalInconsistencias += proventosOrfaos.length;
        htmlResultados += `<div style="margin-top: 20px;"><h4>Proventos Órfãos (${proventosOrfaos.length})</h4><p>Os seguintes proventos foram lançados, mas não foi encontrada posição na "Data Com". Verifique o histórico do ativo ou a data do provento.</p><ul>${proventosOrfaos.map(p => `<li>${p.tipo} de <strong>${p.ticker}</strong> com pagamento em ${new Date(p.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</li>`).join('')}</ul><button class="btn btn-primary" id="btn-corrigir-proventos-orfaos" style="margin-top: 15px;">Corrigir Posições Órfãs</button></div>`;
    }

    const posicoesAtuais = gerarPosicaoDetalhada();
    const posicoesNegativas = Object.entries(posicoesAtuais).filter(([_, dados]) => dados.quantidade < -0.000001);
    if (posicoesNegativas.length > 0) {
        totalInconsistencias += posicoesNegativas.length;
        htmlResultados += `<div style="margin-top: 20px;"><h4>Posições Negativas Encontradas (${posicoesNegativas.length})</h4><p>Os seguintes ativos estão com quantidade negativa, indicando uma possível venda maior que a posse. Verifique seu histórico de operações.</p><ul>${posicoesNegativas.map(([ticker, dados]) => `<li><strong>${ticker}</strong> (Quantidade atual: ${Math.round(dados.quantidade)})</li>`).join('')}</ul></div>`;
    }
    
    const registrosDataCorrigivel = [];
    todasAsNotas.filter(r => isDataInvalida(r.data)).forEach(r => registrosDataCorrigivel.push({ tipo: 'nota', id: r.id, nome: `Nota de Negociação nº ${r.numero}`}));
    todosOsAjustes.filter(r => isDataInvalida(r.data)).forEach(r => registrosDataCorrigivel.push({ tipo: 'ajuste', id: r.id, nome: `Ajuste (${r.tipoAjuste})`}));
    posicaoInicial.filter(r => isDataInvalida(r.data)).forEach(r => registrosDataCorrigivel.push({ tipo: 'posicao', id: r.id, nome: `Posição Inicial para ${r.ticker}`}));
    todasAsMovimentacoes.filter(r => r.source === 'manual' && isDataInvalida(r.data)).forEach(r => registrosDataCorrigivel.push({ tipo: 'transacao', id: r.id, nome: `Transação Manual: ${r.descricao}`}));
    todosOsProventos.forEach(r => {
        if(isDataInvalida(r.dataCom)) registrosDataCorrigivel.push({ tipo: 'provento-com', id: r.id, nome: `Provento (Data Com) para ${r.ticker}`});
        if(isDataInvalida(r.dataPagamento)) registrosDataCorrigivel.push({ tipo: 'provento-pag', id: r.id, nome: `Provento (Data Pag.) para ${r.ticker}`});
    });

    if (registrosDataCorrigivel.length > 0) {
        totalInconsistencias += registrosDataCorrigivel.length;
        htmlResultados += `<div style="margin-top: 20px;"><h4>Registros com Data Manual Inválida (${registrosDataCorrigivel.length})</h4><p>Os seguintes registros inseridos manualmente precisam de uma data válida.</p><ul>${registrosDataCorrigivel.map(r => `<li>${r.nome} <button class="btn btn-sm btn-primary btn-corrigir-data" data-record-type="${r.tipo}" data-record-id="${r.id}">Corrigir</button></li>`).join('')}</ul></div>`;
    }

    const vendasHistoricasSemValor = posicaoInicial.filter(p => p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.transacao.toLowerCase() === 'venda' && (p.valorVenda === null || typeof p.valorVenda === 'undefined'));
    if (vendasHistoricasSemValor.length > 0) {
        totalInconsistencias += vendasHistoricasSemValor.length;
        htmlResultados += `<div style="margin-top: 20px;">
            <h4>Vendas Históricas com Valor Faltando (${vendasHistoricasSemValor.length})</h4>
            <p>Para o cálculo preciso do Imposto de Renda, é necessário informar o valor total de venda destas operações históricas.</p>
            <button class="btn btn-primary" id="btn-corrigir-vendas-historicas" style="margin-top: 10px;">Corrigir Vendas Agora</button>
        </div>`;
    }

    const contasSemMoeda = todasAsContas.filter(c => typeof c.moeda === 'undefined');
    if (contasSemMoeda.length > 0) {
        totalInconsistencias += contasSemMoeda.length;
        htmlResultados += `<div style="margin-top: 20px;">
            <h4>Contas com Moeda Não Especificada (${contasSemMoeda.length})</h4>
            <p>Estas contas precisam ter uma moeda definida para funcionar no novo sistema unificado. Clique no botão para corrigir.</p>
            <button class="btn btn-primary" type="button" id="btn-iniciar-correcao-contas-sem-moeda" style="margin-top: 10px;">Corrigir Contas Agora</button>
        </div>`;
    }

    if (totalInconsistencias === 0) {
        resultadosDiv.innerHTML = '<p class="no-issues"><i class="fas fa-check-circle"></i> Nenhuma inconsistência encontrada!</p>';
    } else {
        resultadosDiv.innerHTML = htmlResultados;
    }
}

function abrirModalCorrecaoContasSemMoeda() {
    const container = document.getElementById('lista-contas-sem-moeda-container');
    const contasParaCorrigir = todasAsContas.filter(c => typeof c.moeda === 'undefined');

    if (contasParaCorrigir.length === 0) {
        alert('Nenhuma conta para corrigir!');
        return;
    }

    let tableHtml = `<table class="tabela-correcao-orfaos">
        <thead>
            <tr>
                <th>Conta</th>
                <th>Moeda</th>
                <th>Detalhes (Apenas para BRL)</th>
            </tr>
        </thead>
        <tbody>`;
    
    contasParaCorrigir.forEach(conta => {
        tableHtml += `
            <tr class="conta-correcao-row" data-conta-id="${conta.id}">
                <td><strong>${conta.banco} - ${conta.tipo}</strong></td>
                <td>
                    <select class="conta-correcao-moeda" data-conta-id="${conta.id}">
                        <option value="">Selecione...</option>
                        <option value="BRL">Real (BRL)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">Libra (GBP)</option>
                    </select>
                </td>
                <td>
                    <div class="detalhes-brl-container" id="detalhes-brl-${conta.id}" style="display: none;">
                        <input type="text" class="conta-correcao-agencia" placeholder="Agência" value="${conta.agencia || ''}">
                        <input type="text" class="conta-correcao-numero" placeholder="Conta" value="${conta.numero || ''}">
                        <input type="text" class="conta-correcao-pix" placeholder="Chave Pix" value="${conta.pix || ''}">
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
    abrirModal('modal-corrigir-contas-sem-moeda');
}

function salvarCorrecaoContasSemMoeda(event) {
    event.preventDefault();
    const linhas = document.querySelectorAll('.conta-correcao-row');
    let correcoesFeitas = 0;

    linhas.forEach(linha => {
        const contaId = parseFloat(linha.dataset.contaId);
        const moedaSelecionada = linha.querySelector('.conta-correcao-moeda').value;
        const conta = todasAsContas.find(c => c.id === contaId);

        if (conta && moedaSelecionada) {
            conta.moeda = moedaSelecionada;
            if (moedaSelecionada === 'BRL') {
                conta.agencia = linha.querySelector('.conta-correcao-agencia').value;
                conta.numero = linha.querySelector('.conta-correcao-numero').value;
                conta.pix = linha.querySelector('.conta-correcao-pix').value;
            }
            correcoesFeitas++;
        }
    });

    if (correcoesFeitas > 0) {
        salvarContas();
        alert(`${correcoesFeitas} conta(s) atualizada(s) com sucesso!`);
        fecharModal('modal-corrigir-contas-sem-moeda');
        verificarInconsistencias();
    } else {
        alert('Nenhuma moeda foi selecionada. Nenhuma alteração foi salva.');
    }
}

function abrirModalValoresVenda() {
    const container = document.getElementById('lista-vendas-historicas-container');
    
    let tableHtml = `<table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Ativo</th>
                                <th class="numero">Quantidade</th>
                                <th class="venda-input-col numero">Valor Total da Venda (R$)</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    let hasVendas = false;
    posicaoInicial.forEach((p, index) => {
        if (p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.transacao.toLowerCase() === 'venda' && (p.valorVenda === null || typeof p.valorVenda === 'undefined')) {
            hasVendas = true;
            tableHtml += `<tr>
                            <td>${new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                            <td>${p.ticker}</td>
                            <td class="numero">${p.quantidade}</td>
                            <td class="venda-input-col">
                                <input type="text" class="venda-historica-valor" data-index="${index}" placeholder="Ex: 1.234,56">
                            </td>
                          </tr>`;
        }
    });

    if (!hasVendas) {
        alert("Nenhuma venda histórica para corrigir!");
        return;
    }

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
    modalInformarValoresVenda.style.display = 'block';
}

function salvarValoresVenda(event) {
    event.preventDefault();
    const inputs = document.querySelectorAll('#lista-vendas-historicas-container .venda-historica-valor');
    let count = 0;

    inputs.forEach(input => {
        const valorStr = input.value;
        if (valorStr) {
            const valorNum = parseDecimal(valorStr);
            const index = parseInt(input.dataset.index, 10);
            
            if (!isNaN(index) && posicaoInicial[index]) {
                posicaoInicial[index].valorVenda = valorNum;
                count++;
            }
        }
    });

    if (count > 0) {
        salvarPosicaoInicial().then(() => {
            alert(`${count} registro(s) de venda histórica atualizado(s) com sucesso!`);
            fecharModal('modal-informar-valores-venda');
            verificarInconsistencias();
        });
    } else {
        fecharModal('modal-informar-valores-venda');
        verificarInconsistencias();
    }
}

function salvarAtivoRF(event) {
    event.preventDefault();
    const id = document.getElementById('ativo-rf-id').value;
    const descricao = document.getElementById('ativo-rf-descricao').value;
    const instituicao = document.getElementById('ativo-rf-instituicao').value;
    const valorInvestido = parseDecimal(document.getElementById('ativo-rf-valor-investido').value);
    const dataAplicacao = document.getElementById('ativo-rf-data-aplicacao').value;
    const dataVencimento = document.getElementById('ativo-rf-data-vencimento').value;
    const isentoIR = document.getElementById('ativo-rf-isento-ir').checked;

    if (!descricao || !instituicao || !dataAplicacao || !dataVencimento) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    if (id) {
        const index = todosOsAtivosRF.findIndex(a => a.id === parseFloat(id));
        if (index > -1) {
            // MODO EDIÇÃO: Atualiza todos os campos do ativo existente.
            const ativoExistente = todosOsAtivosRF[index];
            ativoExistente.descricao = descricao;
            ativoExistente.instituicao = instituicao;
            ativoExistente.valorInvestido = valorInvestido; // CORREÇÃO APLICADA
            ativoExistente.dataAplicacao = dataAplicacao;   // CORREÇÃO APLICADA
            ativoExistente.dataVencimento = dataVencimento;
            ativoExistente.isentoIR = isentoIR;

            // --- INÍCIO DA ALTERAÇÃO ---
            // Medida de segurança: Se o usuário edita dados fundamentais do ativo,
            // removemos a marca de encerramento para forçar uma reavaliação completa do histórico.
            if (ativoExistente.ultimoEncerramento) {
                delete ativoExistente.ultimoEncerramento;
                console.log(`Marca de encerramento removida do ativo "${ativoExistente.descricao}" devido à edição.`);
            }
            // --- FIM DA ALTERAÇÃO ---

        }
    } else {
        // MODO CRIAÇÃO: Cria um novo ativo.
        const novoAtivoRF = {
            id: Date.now(),
            descricao,
            instituicao,
            valorInvestido: valorInvestido,
            saldoLiquido: valorInvestido, // Saldo inicial é igual ao valor investido
            dataAplicacao,
            dataVencimento,
            isentoIR
        };
        todosOsAtivosRF.push(novoAtivoRF);
    }
    
    salvarAtivosRF();
    // Renderiza a tela que estiver visível para o usuário.
    if (telas.cadastroRF.style.display === 'block') {
        renderizarTabelaAtivosRF();
    }
    if (telas.rendaFixa.style.display === 'block') {
        renderizarPosicaoRF();
    }
    fecharModal('modal-cadastro-ativo-rf');
}

function salvarAporteRF(event) {
    event.preventDefault();
    const ativoId = parseFloat(document.getElementById('aporte-rf-id').value);
    const valorAporte = parseDecimal(document.getElementById('aporte-rf-valor').value);
    const dataAporte = document.getElementById('aporte-rf-data').value;
    const contaOrigemId = document.getElementById('aporte-rf-conta-origem').value;

    const ativo = todosOsAtivosRF.find(a => a.id === ativoId);
    if (!ativo) {
        alert('Erro: Ativo de Renda Fixa não encontrado.');
        return;
    }

    const contaOrigem = todasAsContas.find(c => String(c.id) === contaOrigemId);
    const moedaTransacao = contaOrigem ? (contaOrigem.moeda || 'BRL') : 'BRL';

    const novaMovimentacao = {
        id: Date.now(), data: dataAporte, tipoAlvo: 'conta', idAlvo: contaOrigemId,
        moeda: moedaTransacao, descricao: `Aporte em RF: ${ativo.descricao}`,
        valor: -valorAporte, source: 'aporte_rf', sourceId: ativoId,
        enviarParaFinancas: true, // Define como true por padrão
        idLancamentoCasa: null
    };
    
    todasAsMovimentacoes.push(novaMovimentacao);
    salvarMovimentacoes();
    fecharModal('modal-aporte-rf');
    
    atualizarSaldosCacheAtivoRF(ativoId);
    
    renderizarPosicaoRF();
    if (telas.caixaGlobal.style.display === 'block') {
        renderizarTelaCaixaGlobal(true);
    }
}

function salvarResgateRF(event) {
    event.preventDefault();
    const ativoId = parseFloat(document.getElementById('resgate-rf-id').value);
    const valorResgate = parseDecimal(document.getElementById('resgate-rf-valor').value);
    const dataResgate = document.getElementById('resgate-rf-data').value;
    const contaDestinoId = document.getElementById('resgate-rf-conta-destino').value;

    const ativo = todosOsAtivosRF.find(a => a.id === ativoId);
    if (!ativo) {
        alert('Erro: Ativo de Renda Fixa não encontrado.');
        return;
    }
    
    const contaDestino = todasAsContas.find(c => String(c.id) === contaDestinoId);
    const moedaTransacao = contaDestino ? (contaDestino.moeda || 'BRL') : 'BRL';

    const saldosNaDataDoResgate = calcularSaldosRFEmData(ativo, dataResgate);
    
    if (valorResgate > saldosNaDataDoResgate.saldoLiquido) {
        alert('O valor do resgate não pode ser maior que o saldo líquido na data selecionada.');
        return;
    }

    const rendimentoDisponivel = saldosNaDataDoResgate.rendimentoBruto;
    const valorRetiradoDoCapital = Math.max(0, valorResgate - rendimentoDisponivel);

    const novaMovimentacao = {
        id: Date.now(), data: dataResgate, tipoAlvo: 'conta', idAlvo: contaDestinoId,
        moeda: moedaTransacao, descricao: `Resgate de RF: ${ativo.descricao}`,
        valor: valorResgate, source: 'resgate_rf', sourceId: ativoId,
        devolucaoCapital: arredondarMoeda(valorRetiradoDoCapital),
        enviarParaFinancas: true, // Define como true por padrão
        idLancamentoCasa: null
    };
    
    todasAsMovimentacoes.push(novaMovimentacao);
    
    atualizarSaldosCacheAtivoRF(ativoId);
    
    salvarMovimentacoes();
    fecharModal('modal-resgate-rf');
    
    renderizarPosicaoRF();
    if (telas.caixaGlobal.style.display === 'block') {
        renderizarTelaCaixaGlobal(true);
    }

    alert(`Resgate de ${formatarMoeda(valorResgate)} registrado com sucesso!`);
}

function abrirModalCorrecaoData(recordType, recordId) {
    document.getElementById('corrigir-data-record-type').value = recordType;
    document.getElementById('corrigir-data-record-id').value = recordId;
    document.getElementById('form-corrigir-data').reset();
    
    let arrayFonte, nomeDescricao, registro;
    const id = parseFloat(recordId);

    switch(recordType) {
        case 'nota': arrayFonte = todasAsNotas; nomeDescricao = 'Nota de Negociação'; break;
        case 'provento-com':
        case 'provento-pag': arrayFonte = todosOsProventos; nomeDescricao = 'Provento'; break;
        case 'ajuste': arrayFonte = todosOsAjustes; nomeDescricao = 'Ajuste'; break;
        case 'posicao': arrayFonte = posicaoInicial; nomeDescricao = 'Posição Inicial'; break;
        case 'transacao': arrayFonte = todasAsMovimentacoes; nomeDescricao = 'Transação Manual'; break;
        default: return;
    }

    registro = arrayFonte.find(r => r.id === id);
    if(registro) {
        let nomeCampo = recordType.includes('provento') ? (recordType.endsWith('-com') ? 'Data Com' : 'Data Pagamento') : 'Data';
        document.getElementById('modal-corrigir-data-descricao').textContent = `Corrigindo ${nomeCampo} para: ${nomeDescricao} (${registro.ticker || registro.numero || registro.descricao || ''})`;
    }

    modalCorrigirData.style.display = 'block';
    document.getElementById('corrigir-data-input').focus();
}

function salvarCorrecaoData(event) {
    event.preventDefault();
    const recordType = document.getElementById('corrigir-data-record-type').value;
    const recordId = parseFloat(document.getElementById('corrigir-data-record-id').value);
    const novaData = document.getElementById('corrigir-data-input').value;

    let arrayFonte, saveFunction, dataField = 'data';
    switch(recordType) {
        case 'nota': arrayFonte = todasAsNotas; saveFunction = salvarNotas; break;
        case 'provento-com': arrayFonte = todosOsProventos; saveFunction = salvarProventos; dataField = 'dataCom'; break;
        case 'provento-pag': arrayFonte = todosOsProventos; saveFunction = salvarProventos; dataField = 'dataPagamento'; break;
        case 'ajuste': arrayFonte = todosOsAjustes; saveFunction = salvarAjustes; break;
        case 'posicao': arrayFonte = posicaoInicial; saveFunction = salvarPosicaoInicial; break;
        case 'transacao': arrayFonte = todasAsMovimentacoes; saveFunction = salvarMovimentacoes; break;
        default: return;
    }

    const registro = arrayFonte.find(r => r.id === recordId);
    if(registro) {
        registro[dataField] = novaData;
        saveFunction().then(() => {
            fecharModal('modal-corrigir-data');
            verificarInconsistencias(); 
        });
    } else {
        alert('Erro: Registro não encontrado.');
    }
}
function carregarDadosDeMercado() {
    const data = localStorage.getItem('carteira_dados_mercado');
    // Adicionado ifix e ibov à estrutura padrão
    dadosDeMercado = data ? JSON.parse(data) : { timestamp: null, cotacoes: {}, ifix: 0, ibov: 0 };
}
function salvarDadosDeMercado() { localStorage.setItem('carteira_dados_mercado', JSON.stringify(dadosDeMercado)); }
function renderizarInfoAtualizacaoMercado() {
    const todosOsSpans = document.querySelectorAll('.market-data-timestamp');
    const footerInfo = document.getElementById('market-data-info');
    let textoHeader = 'Cotações: Nunca atualizado.';
    let textoFooter = '<span>Cotações: Nunca atualizado.</span>';

    if (dadosDeMercado.timestamp) {
        const data = new Date(dadosDeMercado.timestamp);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR');
        textoHeader = `Cotações atualizadas em: ${dataFormatada} às ${horaFormatada}`;
        textoFooter = `<span>Cotações: ${dataFormatada} às ${horaFormatada}</span>`;
    }

    todosOsSpans.forEach(span => span.textContent = textoHeader);
    if (footerInfo) {
        footerInfo.innerHTML = textoFooter;
    }
}
// ********** FIM DA PARTE 1






// ********** PARTE 2 - Gestão de Cadastros (Ativos, Contas, Feriados)
function salvarDadosNaFonte(dadosParaSalvar) {
    registrarAlteracao();
    
    // Versão Offline: Salva sempre no LocalStorage
    for (const key in dadosParaSalvar) {
        const dados = dadosParaSalvar[key];
        // O nome da chave no localStorage é construído dinamicamente para manter compatibilidade com o backup original
        const chaveLocalStorage = `carteira_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}_offline`;
        localStorage.setItem(chaveLocalStorage, JSON.stringify(dados));
    }
    return Promise.resolve(); // Retorna uma promessa resolvida para manter compatibilidade com .then()
}
function salvarDadosNaFonteSemContar(dadosParaSalvar) {
    // Versão Offline: Salva sempre no LocalStorage sem incrementar contador
    for (const key in dadosParaSalvar) {
        const dados = dadosParaSalvar[key];
        const chaveLocalStorage = `carteira_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}_offline`;
        localStorage.setItem(chaveLocalStorage, JSON.stringify(dados));
    }
    return Promise.resolve();
}
function salvarAtivos() { return salvarDadosNaFonte({ ativos: todosOsAtivos }); }
function salvarNotas() { return salvarDadosNaFonte({ notas: todasAsNotas }); }
function salvarPosicaoInicial() { return salvarDadosNaFonte({ posicoes: posicaoInicial }); }
function salvarAjustes() { return salvarDadosNaFonte({ ajustes: todosOsAjustes }); }
function salvarProventos() { return salvarDadosNaFonte({ proventos: todosOsProventos }); }
function salvarContas() { return salvarDadosNaFonte({ contas: todasAsContas }); }
function salvarFeriados() { return salvarDadosNaFonte({ feriados: todosOsFeriados }); }
function salvarMovimentacoes() { return salvarDadosNaFonte({ movimentacoes: todasAsMovimentacoes }); }
function salvarAjustesIR() { return salvarDadosNaFonte({ ajustesIR: todosOsAjustesIR }); }
function salvarAtivosRF() { return salvarDadosNaFonte({ todosOsAtivosRF: todosOsAtivosRF }); }
function salvarRendimentosRealizadosRF() { return salvarDadosNaFonte({ todosOsRendimentosRealizadosRF: todosOsRendimentosRealizadosRF }); }
function salvarRendimentosRFNaoRealizados() { return salvarDadosNaFonte({ todosOsRendimentosRFNaoRealizados: todosOsRendimentosRFNaoRealizados }); }
function salvarDadosMoedas() { return salvarDadosNaFonte({ dadosMoedas: dadosMoedas }); }
function salvarAtivosMoedas() { return salvarDadosNaFonte({ todosOsAtivosMoedas: todosOsAtivosMoedas }); }
function salvarDadosAlocacao() { return salvarDadosNaFonte({ dadosAlocacao: dadosAlocacao }); }
function salvarHistoricoCarteira() { return salvarDadosNaFonteSemContar({ historicoCarteira: historicoCarteira }); }
function salvarTransacoesRecorrentes() { return salvarDadosNaFonte({ todasAsTransacoesRecorrentes: todasAsTransacoesRecorrentes }); }
function salvarMetas() { return salvarDadosNaFonte({ metas: todasAsMetas }); }
function salvarUserName() { return salvarDadosNaFonte({ userName: userName }); }
function salvarDadosComparacao() { return salvarDadosNaFonte({ dadosComparacao: dadosComparacao }); }
function salvarConfiguracoesGraficos() { return salvarDadosNaFonte({ configuracoesGraficos: configuracoesGraficos }); }
function salvarLinksExternos() { return salvarDadosNaFonte({ linksExternos: linksExternos }); }
function salvarSalarioMinimo() { return salvarDadosNaFonte({ salarioMinimo: salarioMinimo }); }
function salvarConfiguracaoAutoUpdate() { return salvarDadosNaFonte({ autoUpdateEnabled: autoUpdateEnabled }); }
function salvarUrlCotacoes() { 
    // Força a chave 'url_cotacoes_csv' para evitar conversão automática errada de CamelCase
    return salvarDadosNaFonte({ url_cotacoes_csv: urlCotacoesCSV }); 
}

function salvarConfiguracoesFiscais() { 
    // Força a chave 'configuracoes_fiscais'
    return salvarDadosNaFonte({ configuracoes_fiscais: configuracoesFiscais }); 
}
function salvarDadosSimulacaoNegociar() { return salvarDadosNaFonte({ dadosSimulacaoNegociar: dadosSimulacaoNegociar }); }
function abrirModalEventoAtivo(ajusteParaEditar = null) {
    const form = document.getElementById('form-evento-ativo');
    form.reset();
    const tituloModal = document.getElementById('modal-evento-ativo-titulo');
    const idInput = document.getElementById('evento-ativo-id');
    const saveButton = form.querySelector('button[type="submit"]');

    document.getElementById('container-evento-entrada-fields').style.display = 'none';
    document.getElementById('container-evento-saida-fields').style.display = 'none';

    if (ajusteParaEditar) {
        tituloModal.textContent = 'Editar Evento de Ativo';
        idInput.value = ajusteParaEditar.id;
        document.getElementById('evento-ativo-tipo').value = ajusteParaEditar.tipoEvento;
        document.getElementById('evento-ativo-data').value = ajusteParaEditar.data;
        document.getElementById('evento-ativo-ticker').value = ajusteParaEditar.ticker;

        // Mostra o botão imediatamente se estiver editando
        saveButton.style.display = 'block';

        setTimeout(() => {
            document.getElementById('evento-ativo-tipo').dispatchEvent(new Event('change'));
            document.getElementById('evento-ativo-ticker').dispatchEvent(new Event('change'));
            
            if (ajusteParaEditar.tipoEvento === 'entrada') {
                document.getElementById('evento-ativo-pm').value = formatarDecimalParaInput(ajusteParaEditar.precoMedio);
                ajusteParaEditar.detalhes.forEach(detalhe => {
                    const inputQtd = document.querySelector(`#evento-entrada-corretoras-container .evento-entrada-qtd[data-corretora="${detalhe.corretora}"]`);
                    if (inputQtd) inputQtd.value = detalhe.quantidade;
                });
            } else if (ajusteParaEditar.tipoEvento === 'saida') {
                ajusteParaEditar.detalhes.forEach(detalhe => {
                    const inputQtd = document.querySelector(`#evento-saida-posicao-container .qtd-saida-input[data-corretora="${detalhe.corretora}"]`);
                    if (inputQtd) inputQtd.value = detalhe.quantidade;
                });
            }
        }, 150);
        
    } else {
        tituloModal.textContent = 'Registrar Evento de Ativo';
        idInput.value = '';
    }

    modalEventoAtivo.style.display = 'block';
    document.getElementById('evento-ativo-tipo').focus();
}

function renderizarTabelaFeriados() {
    const container = document.getElementById('lista-de-feriados');
    container.innerHTML = `<table><thead><tr><th>Data</th><th>Descrição</th><th class="controles-col">Controles</th></tr></thead><tbody></tbody></table>`;
    const body = container.querySelector('tbody');
    body.innerHTML = '';
    if (todosOsFeriados.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhum feriado cadastrado.</td></tr>';
        return;
    }
    todosOsFeriados.sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(feriado => {
        const tr = document.createElement('tr');
        const dataFormatada = new Date(feriado.data + 'T12:00:00').toLocaleDateString('pt-BR');
        tr.innerHTML = `<td>${dataFormatada}</td><td>${feriado.descricao}</td><td class="controles-col"><i class="fas fa-edit acao-btn edit" title="Editar Feriado" data-feriado-id="${feriado.id}"></i><i class="fas fa-trash acao-btn delete" title="Excluir Feriado" data-feriado-id="${feriado.id}"></i></td>`;
        body.appendChild(tr);
    });
}
function abrirModalFeriado(feriadoParaEditar = null) {
    const form = document.getElementById('form-cadastro-feriado');
    form.reset();
    if (feriadoParaEditar) {
        document.getElementById('modal-feriado-titulo').textContent = 'Editar Feriado';
        document.getElementById('feriado-id').value = feriadoParaEditar.id;
        document.getElementById('feriado-data').value = feriadoParaEditar.data;
        document.getElementById('feriado-descricao').value = feriadoParaEditar.descricao;
    } else {
        document.getElementById('modal-feriado-titulo').textContent = 'Cadastrar Novo Feriado';
        document.getElementById('feriado-id').value = '';
    }
    modalCadastroFeriado.style.display = 'block';
    document.getElementById('feriado-data').focus();
}
function deletarFeriado(feriadoId) {
    if (confirm('Tem certeza que deseja excluir este feriado?')) {
        todosOsFeriados = todosOsFeriados.filter(f => f.id !== feriadoId);
        salvarFeriados();
        renderizarTabelaFeriados();
    }
}

function renderizarTabelaContas() { 
    const container = document.getElementById('lista-de-contas-cadastradas'); 
    container.innerHTML = `<table><thead><tr><th>Nome</th><th>Tipo/Moeda</th><th>Agência</th><th>Conta</th><th class="numero">Saldo Inicial</th><th>Data Saldo</th><th class="controles-col">Controles</th></tr></thead><tbody></tbody></table>`; 
    const body = container.querySelector('tbody'); 
    body.innerHTML = ''; 
    
    const todosOsItens = [
        ...todasAsContas.map(c => ({...c, tipoItem: 'conta'})),
        ...todosOsAtivosMoedas.map(a => ({...a, tipoItem: 'moeda'}))
    ];

    if (todosOsItens.length === 0) { 
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhuma conta ou ativo em moeda cadastrado.</td></tr>'; 
        return; 
    } 
    
    todosOsItens.sort((a,b) => (a.banco || a.nomeAtivo).localeCompare(b.banco || b.nomeAtivo)).forEach(item => { 
        const tr = document.createElement('tr'); 
        const dataFormatada = new Date(item.dataSaldoInicial + 'T12:00:00').toLocaleDateString('pt-BR');
        
        if(item.tipoItem === 'conta') {
            tr.innerHTML = `<td>${item.banco}</td><td>${item.tipo} (BRL)</td><td>${item.agencia}</td><td>${item.numero}</td><td class="numero">${formatarMoeda(item.saldoInicial)}</td><td>${dataFormatada}</td><td class="controles-col"><i class="fas fa-edit acao-btn edit" title="Editar Conta" data-conta-id="${item.id}"></i></td>`; 
        } else {
            tr.innerHTML = `<td>${item.nomeAtivo}</td><td>Ativo em Moeda (${item.moeda})</td><td>-</td><td>-</td><td class="numero">${formatarMoedaEstrangeira(item.saldoInicial, item.moeda)}</td><td>${dataFormatada}</td><td class="controles-col"><i class="fas fa-edit acao-btn edit" title="Editar Ativo" data-ativo-moeda-id="${item.id}"></i></td>`;
        }
        body.appendChild(tr); 
    }); 
}
function abrirModalCadastroConta(contaParaEditar = null, tipoItem = 'conta') {
    const form = document.getElementById('form-cadastro-conta');
    form.reset();
    const tituloModal = document.getElementById('modal-conta-titulo');
    
    // Reseta o estado do modal
    document.getElementById('conta-moeda').value = 'BRL';
    document.getElementById('conta-moeda').dispatchEvent(new Event('change'));

    if (contaParaEditar) {
        tituloModal.textContent = 'Editar Conta / Ativo em Moeda';
        document.getElementById('conta-id').value = contaParaEditar.id;
        document.getElementById('conta-tipo-original').value = tipoItem;

        const moeda = contaParaEditar.moeda || (tipoItem === 'conta' ? 'BRL' : '');
        document.getElementById('conta-moeda').value = moeda;
        
        if (moeda === 'BRL') {
            const bancoSelect = document.getElementById('conta-banco');
            const isStandardBank = [...bancoSelect.options].some(opt => opt.value === contaParaEditar.banco);
            if (isStandardBank) { bancoSelect.value = contaParaEditar.banco; }
            else { bancoSelect.value = 'Outro'; document.getElementById('container-outro-banco').style.display = 'block'; document.getElementById('conta-outro-banco').value = contaParaEditar.banco; }
            document.getElementById('conta-tipo').value = contaParaEditar.tipo;
            document.getElementById('conta-numero-banco').value = contaParaEditar.numeroBanco;
            document.getElementById('conta-agencia').value = contaParaEditar.agencia;
            document.getElementById('conta-numero').value = contaParaEditar.numero;
            document.getElementById('conta-pix').value = contaParaEditar.pix;
        } else {
            document.getElementById('conta-nome-ativo').value = contaParaEditar.nomeAtivo;
        }
        
        document.getElementById('conta-saldo-inicial').value = formatarDecimalParaInput(contaParaEditar.saldoInicial);
        document.getElementById('conta-data-saldo-inicial').value = contaParaEditar.dataSaldoInicial;
        document.getElementById('conta-notas').value = contaParaEditar.notas || '';
        
        document.getElementById('conta-moeda').disabled = true; // Não permite mudar a moeda na edição
    } else {
        tituloModal.textContent = 'Cadastrar Nova Conta / Ativo em Moeda';
        document.getElementById('conta-id').value = '';
        document.getElementById('conta-tipo-original').value = '';
        document.getElementById('conta-data-saldo-inicial').value = new Date().toISOString().split('T')[0];
        document.getElementById('conta-moeda').disabled = false;
    }

    document.getElementById('conta-moeda').dispatchEvent(new Event('change'));
    abrirModal('modal-cadastro-conta');
}

async function carregarDadosSimulacaoNegociar() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            dadosSimulacaoNegociar = docSnap.exists() ? (docSnap.data().dadosSimulacaoNegociar || { fiis: {}, acoes: {}, aporteTotal: '' }) : { fiis: {}, acoes: {}, aporteTotal: '' };
        } catch (error) {
            console.error("Erro ao carregar dados de simulação:", error);
            dadosSimulacaoNegociar = { fiis: {}, acoes: {}, aporteTotal: '' };
        }
    } else {
        const data = localStorage.getItem('carteira_simulacao_negociar_offline');
        dadosSimulacaoNegociar = data ? JSON.parse(data) : { fiis: {}, acoes: {}, aporteTotal: '' };
    }
}
function atualizarResumoAporte() {
    // O aporte total agora pode ser negativo (ex: dinheiro da venda pagando RF)
    // ParseDecimal precisa lidar com negativos corretamente, mas geralmente remove o sinal se não for cuidadoso.
    // Como parseDecimal usa regex [^0-9,-], ele deve aceitar negativos.
    const aporteTotal = parseDecimal(document.getElementById('negociar-aporte-valor').value);

    let totalComprasFiis = 0;
    let totalVendasFiis = 0; // Novo acumulador

    for (const ticker in dadosSimulacaoNegociar.fiis) {
        const sim = dadosSimulacaoNegociar.fiis[ticker];
        if (sim.qtd && sim.preco) {
            const valorOperacao = sim.qtd * sim.preco;
            if (sim.qtd > 0) {
                totalComprasFiis += valorOperacao;
            } else {
                totalVendasFiis += Math.abs(valorOperacao); // Soma vendas
            }
        }
    }

    let totalComprasAcoes = 0;
    let totalVendasAcoes = 0; // Novo acumulador

    for (const ticker in dadosSimulacaoNegociar.acoes) {
        const sim = dadosSimulacaoNegociar.acoes[ticker];
        if (sim.qtd && sim.preco) {
            const valorOperacao = sim.qtd * sim.preco;
            if (sim.qtd > 0) {
                totalComprasAcoes += valorOperacao;
            } else {
                totalVendasAcoes += Math.abs(valorOperacao); // Soma vendas
            }
        }
    }

    // Saldo = (Dinheiro que eu coloquei) + (Dinheiro que ganhei vendendo) - (Dinheiro que gastei comprando)
    const saldoDisponivel = aporteTotal + totalVendasFiis + totalVendasAcoes - totalComprasFiis - totalComprasAcoes;

    document.getElementById('negociar-total-compras-fiis').textContent = formatarMoeda(totalComprasFiis);
    document.getElementById('negociar-total-compras-acoes').textContent = formatarMoeda(totalComprasAcoes);

    const elSaldoDisponivel = document.getElementById('negociar-saldo-disponivel');
    elSaldoDisponivel.textContent = formatarMoeda(saldoDisponivel);

    if (saldoDisponivel < -0.01) {
        elSaldoDisponivel.classList.add('valor-negativo');
        elSaldoDisponivel.classList.remove('valor-positivo');
    } else {
        elSaldoDisponivel.classList.remove('valor-negativo');
        elSaldoDisponivel.classList.add('valor-positivo');
    }
}
function abrirModalAtivosPorCNPJ(cnpj) {
    if (!cnpj) return;

    const ativosDoMesmoGrupo = todosOsAtivos.filter(a => a.cnpj === cnpj);
    if (ativosDoMesmoGrupo.length <= 1) return; // Não abre o modal se houver apenas 1 ativo

    const primeiroAtivo = ativosDoMesmoGrupo[0];
    const nomeEmpresa = primeiroAtivo.nome || primeiroAtivo.nomePregao || `CNPJ: ${formatarCNPJ(cnpj)}`;

    document.getElementById('modal-cnpj-titulo').textContent = `Ativos de: ${nomeEmpresa}`;
    
    let listaHtml = '<ul>';
    ativosDoMesmoGrupo.forEach(ativo => {
        listaHtml += `<li>${ativo.ticker}</li>`;
    });
    listaHtml += '</ul>';

    document.getElementById('modal-cnpj-conteudo').innerHTML = listaHtml;
    abrirModal('modal-lista-ativos-cnpj');
}
function renderizarTabelaAtivos() {
    const container = document.getElementById('lista-de-ativos-cadastrados');
    const tableHeaders = `
        <th class="sortable" data-key="ticker">Ativo</th>
        <th class="sortable" data-key="nomePregao">Nome Pregão</th>
        <th class="sortable" data-key="nome">Nome</th>
        <th class="sortable" data-key="tipo">Tipo</th>
        <th class="sortable" data-key="metaYieldBazin">Meta Yield Bazin (%)</th>
        <th class="sortable" data-key="cnpj">CNPJ</th>
        <th class="controles-col">Controles</th>`;
    container.innerHTML = `<table><thead><tr>${tableHeaders}</tr></thead><tbody id="tabela-ativos-body"></tbody></table>`;
    
    const body = document.getElementById('tabela-ativos-body');
    body.innerHTML = '';
    
    const sortedAtivos = [...todosOsAtivos].sort((a, b) => {
        const key = sortConfigAtivos.key;
        const direction = sortConfigAtivos.direction === 'ascending' ? 1 : -1;
        const valA = a[key] || '';
        const valB = b[key] || '';
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * direction;
        }
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });

    sortedAtivos.forEach(ativo => {
        const tr = document.createElement('tr');
        tr.dataset.id = ativo.id;
        const warningIcon = !ativo.tipo ? `<i class="fas fa-exclamation-triangle warning-icon" title="Cadastro incompleto: Tipo de Ativo é obrigatório"></i>` : '';
        
        const metaYieldBazinFmt = (ativo.tipo === 'Ação' && typeof ativo.metaYieldBazin === 'number') 
            ? formatarDecimal(ativo.metaYieldBazin * 100) 
            : 'N/A';

        if (isAtivosEditMode) {
            const campoYield = (ativo.tipo === 'Ação')
                ? `<input type="text" class="edit-field numero" data-field="metaYieldBazin" value="${metaYieldBazinFmt}">`
                : '<span>N/A</span>';

            tr.innerHTML = `
                <td><input type="text" class="edit-field" data-field="ticker" value="${ativo.ticker || ''}"></td>
                <td><input type="text" class="edit-field" data-field="nomePregao" value="${ativo.nomePregao || ''}"></td>
                <td><input type="text" class="edit-field" data-field="nome" value="${ativo.nome || ''}"></td>
                <td>
                    <select class="edit-field" data-field="tipo">
                        <option value="">Selecione...</option>
                        <option value="Ação" ${ativo.tipo === 'Ação' ? 'selected' : ''}>Ação</option>
                        <option value="FII" ${ativo.tipo === 'FII' ? 'selected' : ''}>FII</option>
                        <option value="ETF" ${ativo.tipo === 'ETF' ? 'selected' : ''}>ETF</option>
                    </select>
                </td>
                <td>${campoYield}</td>
                <td><input type="text" class="edit-field" data-field="cnpj" value="${formatarCNPJ(ativo.cnpj)}"></td>
                <td></td>`;
        } else {
            tr.innerHTML = `
                <td>${ativo.ticker} ${warningIcon}</td>
                <td>${ativo.nomePregao || ''}</td>
                <td>${ativo.nome || ''}</td>
                <td>${ativo.tipo || ''}</td>
                <td class="numero">${metaYieldBazinFmt}</td>
                <td class="cnpj-clicavel" data-cnpj="${ativo.cnpj}">${formatarCNPJ(ativo.cnpj)}</td>
                <td class="controles-col">
                    <i class="fas fa-edit acao-btn edit" title="Editar Ativo" data-ativo-id="${ativo.id}"></i>
                    <i class="fas fa-trash acao-btn delete" title="Excluir Ativo" data-ativo-id="${ativo.id}"></i>
                </td>`;
        }
        body.appendChild(tr);
    });

    document.querySelectorAll('#lista-de-ativos-cadastrados .sortable').forEach(header => {
        header.classList.remove('ascending', 'descending');
        if (header.dataset.key === sortConfigAtivos.key) {
            header.classList.add(sortConfigAtivos.direction);
        }
    });
}
function verificarTickerExistente(event) {
    const tickerInput = event.target;
    const ticker = tickerInput.value.toUpperCase().trim();
    if (!ticker) return;

    const ativoExistente = todosOsAtivos.find(a => a.ticker === ticker);

    if (ativoExistente) {
        // --- Comportamento 1: Ativo já existe, carrega para edição ---
        alert(`O ativo ${ticker} já está cadastrado. Carregando dados para edição.`);
        
        // Preenche o formulário com os dados do ativo encontrado
        document.getElementById('modal-ativo-titulo').textContent = 'Editar Ativo';
        document.getElementById('ativo-id').value = ativoExistente.id;
        document.getElementById('ativo-tipo').value = ativoExistente.tipo;
        document.getElementById('ativo-nome-pregao').value = ativoExistente.nomePregao || '';
        document.getElementById('ativo-nome').value = ativoExistente.nome;
        document.getElementById('ativo-cnpj').value = formatarCNPJ(ativoExistente.cnpj);
        document.getElementById('ativo-tipo-acao').value = ativoExistente.tipoAcao || '';
        document.getElementById('ativo-admin-nome').value = ativoExistente.adminNome || '';
        document.getElementById('ativo-admin-cnpj').value = formatarCNPJ(ativoExistente.adminCnpj);

        if (ativoExistente.tipo === 'Ação') {
            document.getElementById('ativo-meta-yield-bazin').value = ativoExistente.metaYieldBazin ? formatarDecimal(ativoExistente.metaYieldBazin * 100) : '6,00';
        }
        
        // Dispara o evento 'change' no tipo de ativo para mostrar/esconder os campos corretos
        document.getElementById('ativo-tipo').dispatchEvent(new Event('change'));

    } else {
        // --- Comportamento 2: Ativo é novo, busca por semelhantes ---
        const radical = ticker.substring(0, 4);
        const ativoSemelhante = todosOsAtivos.find(a => a.ticker.startsWith(radical));

        if (ativoSemelhante) {
            // Preenche apenas os campos de nome e CNPJ
            document.getElementById('ativo-nome-pregao').value = ativoSemelhante.nomePregao || '';
            document.getElementById('ativo-nome').value = ativoSemelhante.nome || '';
            document.getElementById('ativo-cnpj').value = formatarCNPJ(ativoSemelhante.cnpj);
        }
    }
}
function abrirModalCadastroAtivo(ativoParaEditar = null, tickerPreenchido = '') {
    const form = document.getElementById('form-cadastro-ativo');
    form.reset();
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    const tituloModal = document.getElementById('modal-ativo-titulo');
    const tipoSelect = document.getElementById('ativo-tipo');
    const tickerInput = document.getElementById('ativo-ticker');

    // --- INÍCIO DA ALTERAÇÃO ---
    // Remove qualquer listener antigo para evitar duplicação
    const novoTickerInput = tickerInput.cloneNode(true);
    tickerInput.parentNode.replaceChild(novoTickerInput, tickerInput);
    
    // Adiciona o novo listener que chamará nossa função de verificação
    novoTickerInput.addEventListener('blur', verificarTickerExistente);
    // --- FIM DA ALTERAÇÃO ---

    if (ativoParaEditar) {
        tituloModal.textContent = 'Editar Ativo';
        document.getElementById('ativo-id').value = ativoParaEditar.id;
        novoTickerInput.value = ativoParaEditar.ticker; // Usa o novo input
        tipoSelect.value = ativoParaEditar.tipo;
        document.getElementById('ativo-nome-pregao').value = ativoParaEditar.nomePregao || '';
        document.getElementById('ativo-nome').value = ativoParaEditar.nome;
        document.getElementById('ativo-cnpj').value = formatarCNPJ(ativoParaEditar.cnpj);
        document.getElementById('ativo-tipo-acao').value = ativoParaEditar.tipoAcao || '';
        document.getElementById('ativo-admin-nome').value = ativoParaEditar.adminNome || '';
        document.getElementById('ativo-admin-cnpj').value = formatarCNPJ(ativoParaEditar.adminCnpj);
        
        if (ativoParaEditar.tipo === 'Ação') {
            document.getElementById('ativo-meta-yield-bazin').value = ativoParaEditar.metaYieldBazin ? formatarDecimal(ativoParaEditar.metaYieldBazin * 100) : '6,00';
        }
    } else {
        tituloModal.textContent = 'Cadastrar Novo Ativo';
        document.getElementById('ativo-id').value = '';
        novoTickerInput.value = tickerPreenchido.toUpperCase(); // Usa o novo input
        tipoSelect.value = '';
    }

    tipoSelect.dispatchEvent(new Event('change'));
    abrirModal('modal-cadastro-ativo');
    (tickerPreenchido ? document.getElementById('ativo-nome-pregao') : novoTickerInput).focus(); // Usa o novo input
}
function deletarAtivo(ativoId) { if (confirm('Tem certeza que deseja excluir este ativo? Esta ação não pode ser desfeita e pode afetar outros registros que o utilizam.')) { todosOsAtivos = todosOsAtivos.filter(a => a.id !== ativoId); salvarAtivos(); renderizarTabelaAtivos(); } }
// ALTERADO: Incluído o campo statusAporte com valor padrão 'Ativo'
function buscarEcadastrarAtivosAusentes(silencioso = false) {
    const tickersCadastrados = new Set(todosOsAtivos.map(a => a.ticker));
    const todosOsTickersUsados = new Set();
    todasAsNotas.forEach(n => n.operacoes.forEach(op => todosOsTickersUsados.add(op.ativo)));
    posicaoInicial.forEach(p => todosOsTickersUsados.add(p.ticker));
    todosOsProventos.forEach(p => todosOsTickersUsados.add(p.ticker));
    todosOsAjustes.forEach(a => {
        if (a.tipoAjuste === 'transferencia') {
            a.ativosTransferidos.forEach(at => todosOsTickersUsados.add(at.ticker));
        } else if (a.ticker) {
            todosOsTickersUsados.add(a.ticker);
        }
    });

    const novosAtivos = [];
    todosOsTickersUsados.forEach(ticker => {
        if (ticker && !tickersCadastrados.has(ticker)) {
            const novoAtivoMinimo = {
                id: Date.now() + Math.random(),
                ticker: ticker,
                tipo: '', 
                nome: '', 
                nomePregao: '', 
                tipoAcao: '', 
                cnpj: '', 
                adminNome: '', 
                adminCnpj: '',
                statusAporte: 'Ativo' // NOVO CAMPO ADICIONADO
            };
            novosAtivos.push(novoAtivoMinimo);
        }
    });

    if (novosAtivos.length > 0) {
        todosOsAtivos.push(...novosAtivos);
        salvarAtivos();
        if (!silencioso) {
            renderizarTabelaAtivos();
            alert(`${novosAtivos.length} novo(s) ativo(s) foram encontrados e cadastrados com sucesso! Complete o cadastro deles se necessário.`);
        }
    } else {
        if (!silencioso) {
            alert('Nenhum novo ativo encontrado. Todos os ativos utilizados já estão cadastrados.');
        }
    }
}
function renderizarTabelaAtivosRF() {
    const container = document.getElementById('lista-de-ativos-rf');
    const tableHeaders = `
        <th>Descrição</th>
        <th>Instituição</th>
        <th>Data Aplicação</th>
        <th>Data Vencimento</th>
        <th class="numero">Valor Investido</th>
        <th class="numero">Saldo Líquido</th>
        <th class="controles-col">Controles</th>`;
    container.innerHTML = `<table><thead><tr>${tableHeaders}</tr></thead><tbody></tbody></table>`;
    
    const body = container.querySelector('tbody');
    body.innerHTML = '';
    
    if (todosOsAtivosRF.length === 0) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhuma aplicação de Renda Fixa cadastrada.</td></tr>';
        return;
    }

    todosOsAtivosRF.sort((a,b) => a.descricao.localeCompare(b.descricao)).forEach(ativo => {
        const tr = document.createElement('tr');
        tr.dataset.rfId = ativo.id;
        tr.innerHTML = `
            <td>${ativo.descricao}</td>
            <td>${ativo.instituicao}</td>
            <td>${new Date(ativo.dataAplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td>${new Date(ativo.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="numero">${formatarMoeda(ativo.valorInvestido)}</td>
            <td class="numero">${formatarMoeda(ativo.saldoLiquido)}</td>
            <td class="controles-col">
                <i class="fas fa-edit acao-btn edit" title="Editar Aplicação" data-ativo-rf-id="${ativo.id}"></i>
                <i class="fas fa-trash acao-btn delete" title="Excluir Aplicação" data-ativo-rf-id="${ativo.id}"></i>
            </td>`;
        body.appendChild(tr);
    });
}
function abrirModalCadastroAtivoRF(ativoRFParaEditar = null) {
    const form = document.getElementById('form-cadastro-ativo-rf');
    form.reset();
    const modalTitulo = document.getElementById('modal-ativo-rf-titulo');
    const valorInvestidoInput = document.getElementById('ativo-rf-valor-investido');
    const dataAplicacaoInput = document.getElementById('ativo-rf-data-aplicacao');
    const instituicaoSelect = document.getElementById('ativo-rf-instituicao');

    instituicaoSelect.innerHTML = '<option value="">Selecione...</option>' + getTodasInstituicoesAtivas().map(c => `<option value="${c}">${c}</option>`).join('');

    if (ativoRFParaEditar) {
        modalTitulo.textContent = 'Editar Aplicação em Renda Fixa';
        document.getElementById('ativo-rf-id').value = ativoRFParaEditar.id;
        document.getElementById('ativo-rf-descricao').value = ativoRFParaEditar.descricao;
        instituicaoSelect.value = ativoRFParaEditar.instituicao;
        valorInvestidoInput.value = formatarDecimalParaInput(ativoRFParaEditar.valorInvestido);
        dataAplicacaoInput.value = ativoRFParaEditar.dataAplicacao;
        document.getElementById('ativo-rf-data-vencimento').value = ativoRFParaEditar.dataVencimento;
        document.getElementById('ativo-rf-isento-ir').checked = ativoRFParaEditar.isentoIR;

        // CORREÇÃO: Campos de valor e data inicial agora são editáveis
        valorInvestidoInput.readOnly = false;
        dataAplicacaoInput.readOnly = false;
    } else {
        modalTitulo.textContent = 'Nova Aplicação em Renda Fixa';
        document.getElementById('ativo-rf-id').value = '';
        dataAplicacaoInput.value = new Date().toISOString().split('T')[0]; // Data padrão
        
        valorInvestidoInput.readOnly = false;
        dataAplicacaoInput.readOnly = false;
    }
    
    modalCadastroAtivoRF.style.display = 'block';
    document.getElementById('ativo-rf-descricao').focus();
}

function deletarAtivoRF(id) {
    const ativo = todosOsAtivosRF.find(a => a.id === id);
    if (!ativo) return;

    // --- INÍCIO DA ALTERAÇÃO ---
    // A lógica foi alterada para INATIVAR o ativo em vez de excluir.
    if (confirm(`Tem certeza que deseja INATIVAR esta aplicação de renda fixa?\n\n"${ativo.descricao}"\n\nEla será ocultada da tela de posição, mas seu histórico será mantido.`)) {
        // Verifica se a descrição já não termina com (inativa) para não duplicar
        if (!ativo.descricao.trim().toLowerCase().endsWith('(inativa)')) {
            ativo.descricao = `${ativo.descricao.trim()} (inativa)`;
        }

        salvarAtivosRF();
        
        // Atualiza ambas as telas para refletir a mudança
        if (telas.cadastroRF.style.display === 'block') {
            renderizarTabelaAtivosRF();
        }
        if(telas.rendaFixa.style.display === 'block') {
            renderizarPosicaoRF();
        }
        alert('Aplicação inativada com sucesso!');
    }
    // --- FIM DA ALTERAÇÃO ---
}

function salvarEdicaoSaldoLiquidoRF(ativoRFId, novoSaldoStr) {
    const novoSaldo = parseDecimal(novoSaldoStr);
    const ativo = todosOsAtivosRF.find(a => a.id === ativoRFId);
    
    if (ativo && !isNaN(novoSaldo)) {
        const dataEdicao = new Date().toISOString().split('T')[0];
        
        // --- INÍCIO DA ALTERAÇÃO ---
        // Agora, usa a nova função auxiliar para obter o capital investido APENAS no ciclo atual.
        const valorInvestidoTotalAtual = getCapitalInvestidoNoCicloAtual(ativo, dataEdicao);
        // --- FIM DA ALTERAÇÃO ---

        const rendimentoTotalBruto = novoSaldo - valorInvestidoTotalAtual;

        const indexExistente = todosOsRendimentosRFNaoRealizados.findIndex(
            r => r.ativoId === ativo.id && r.data === dataEdicao
        );

        if (indexExistente > -1) {
            todosOsRendimentosRFNaoRealizados[indexExistente].rendimento = rendimentoTotalBruto;
        } else {
            todosOsRendimentosRFNaoRealizados.push({
                id: Date.now(),
                ativoId: ativo.id,
                data: dataEdicao,
                rendimento: rendimentoTotalBruto
            });
        }
        
        ativo.saldoLiquido = novoSaldo;
        salvarAtivosRF();
        salvarRendimentosRFNaoRealizados();
    }
    renderizarPosicaoRF();
}

function abrirModalAporteRF(ativoRFId) {
    const ativo = todosOsAtivosRF.find(a => a.id === ativoRFId);
    if (!ativo) return;

    document.getElementById('form-aporte-rf').reset();
    document.getElementById('aporte-rf-id').value = ativo.id;
    document.getElementById('aporte-rf-descricao').textContent = ativo.descricao;
    
    const selectConta = document.getElementById('aporte-rf-conta-origem');
    selectConta.innerHTML = '<option value="">Selecione a conta de débito...</option>' + todasAsContas
        .filter(c => c.tipo === 'Conta Corrente' || c.tipo === 'Conta Investimento')
        .map(c => `<option value="${c.id}">${c.banco} - ${c.tipo}</option>`).join('');

    modalAporteRF.style.display = 'block';
    document.getElementById('aporte-rf-valor').focus();
}
function abrirModalResgateRF(ativoRFId) {
    const ativo = todosOsAtivosRF.find(a => a.id === ativoRFId);
    if (!ativo) return;

    // --- CORREÇÃO ---
    // Calcula o saldo líquido atual em tempo real para garantir precisão no modal
    const hoje = new Date().toISOString().split('T')[0];
    const saldosAtuais = calcularSaldosRFEmData(ativo, hoje);
    // --- FIM DA CORREÇÃO ---

    document.getElementById('form-resgate-rf').reset();
    document.getElementById('resgate-rf-id').value = ativo.id;
    document.getElementById('resgate-rf-descricao').textContent = ativo.descricao;
    
    // CORREÇÃO: Exibe o saldo líquido total correto e atualizado
    document.getElementById('resgate-rf-saldo-atual').textContent = formatarMoeda(saldosAtuais.saldoLiquido);

    const selectConta = document.getElementById('resgate-rf-conta-destino');
    selectConta.innerHTML = '<option value="">Selecione a conta de crédito...</option>' + getTodasContasAtivas()
        .filter(c => c.tipo === 'Conta Corrente' || c.tipo === 'Conta Investimento')
        .map(c => `<option value="${c.id}">${c.banco} - ${c.tipo}</option>`).join('');
    
    abrirModal('modal-resgate-rf');
    document.getElementById('resgate-rf-valor').focus();
}
function abrirModalHistoricoRF(ativoRFId) {
    const ativo = todosOsAtivosRF.find(a => a.id === ativoRFId);
    if (!ativo) return;

    const modal = document.getElementById('modal-historico-rf');
    document.getElementById('historico-rf-descricao').textContent = ativo.descricao;
    
    renderizarHistoricoRF(ativoRFId);

    modal.style.display = 'block';
}
function renderizarHistoricoRF(ativoRFId) {
    const container = document.getElementById('historico-rf-container');
    const ativo = todosOsAtivosRF.find(a => a.id === ativoRFId);
    if (!ativo) {
        container.innerHTML = '<p style="text-align: center;">Erro: Ativo de Renda Fixa não encontrado.</p>';
        return;
    }
    
    const movimentacoes = todasAsMovimentacoes
        .filter(t => t.sourceId === ativoRFId && (t.source === 'aporte_rf' || t.source === 'resgate_rf'))
        .map(mov => {
            const conta = todasAsContas.find(c => String(c.id) === String(mov.idAlvo));
            return {
                id: mov.id,
                data: mov.data,
                tipo: mov.source === 'aporte_rf' ? 'Aporte' : 'Resgate',
                valor: Math.abs(mov.valor),
                conta: conta ? `${conta.banco} - ${conta.tipo}` : 'N/A',
                isInitial: false
            };
        });

    const historicoCompleto = [...movimentacoes];
    
    historicoCompleto.push({
        id: `inicial_${ativo.id}`,
        data: ativo.dataAplicacao,
        tipo: 'Investimento Inicial',
        valor: ativo.valorInvestido,
        conta: 'Aplicação Direta',
        isInitial: true
    });
    
    historicoCompleto.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (historicoCompleto.length === 0) {
        container.innerHTML = '<p style="text-align: center; margin-top: 20px;">Nenhuma movimentação encontrada para esta aplicação.</p>';
        return;
    }

    let tableHtml = `<table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th class="numero">Valor (R$)</th>
                                <th>Conta</th>
                                <th class="controles-col">Ações</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    historicoCompleto.forEach(item => {
        const classe = item.tipo === 'Resgate' ? 'mov-resgate' : 'mov-aporte';
        const controlesHtml = item.isInitial
            ? `<i class="fas fa-lock" title="O aporte inicial é editado no cadastro do ativo."></i>`
            : `<i class="fas fa-edit acao-btn edit" title="Editar Movimentação" data-mov-rf-id="${item.id}"></i>
               <i class="fas fa-trash acao-btn delete" title="Excluir Movimentação" data-mov-rf-id="${item.id}"></i>`;
        
        tableHtml += `<tr class="${classe}">
                        <td>${new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>${item.tipo}</td>
                        <td class="numero">${formatarMoeda(item.valor)}</td>
                        <td>${item.conta}</td>
                        <td class="controles-col" style="width: 90px;">${controlesHtml}</td>
                      </tr>`;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

function abrirModalEdicaoMovimentacaoRF(transacaoId) {
    const transacaoParaEditar = todasAsMovimentacoes.find(t => t.id === transacaoId);
    
    if (!transacaoParaEditar) {
        alert('Erro: Transação não encontrada.');
        return;
    }
    abrirModalNovaTransacaoMoeda(transacaoParaEditar);
}
async function deletarMovimentacao(id, tipoAlvo) {
    const movIndex = todasAsMovimentacoes.findIndex(m => m.id === id);
    if (movIndex === -1) return;

    const movimentacao = todasAsMovimentacoes[movIndex];
    let confirmMessage = 'Tem certeza que deseja excluir esta movimentação?';

    if (movimentacao.transferenciaId) {
        confirmMessage = 'Esta é uma movimentação de transferência. Excluir este lançamento também excluirá o lançamento correspondente na outra conta/ativo. Deseja continuar?';
    }

    if (confirm(confirmMessage)) {
        // Lógica de Sincronização de Exclusão com Finanças da Casa
        if (currentUser && idCasaAssociada && movimentacao.idLancamentoCasa) {
            try {
                const { doc, deleteDoc } = window.dbFunctions;
                const docRef = doc(window.db, "Casas", idCasaAssociada, "Lancamentos", movimentacao.idLancamentoCasa);
                await deleteDoc(docRef);
                console.log("Lançamento correspondente excluído do Sistema de Finanças.");
            } catch (error) {
                console.error("Erro ao excluir lançamento do Sistema de Finanças:", error);
                alert("Não foi possível excluir o lançamento correspondente no sistema de finanças. A exclusão local foi cancelada para manter a consistência.");
                return; // Aborta a exclusão local se a remota falhar
            }
        }

        if (movimentacao.transferenciaId) {
            // Nova lógica: Filtra para manter apenas o que NÃO faz parte da transferência
            const idAlvoStr = String(movimentacao.transferenciaId);
            todasAsMovimentacoes = todasAsMovimentacoes.filter(m => String(m.transferenciaId) !== idAlvoStr);
        } else {
            // Lógica antiga para transações únicas (já funcionava)
            todasAsMovimentacoes = todasAsMovimentacoes.filter(m => m.id !== id);
        }
        
        await salvarMovimentacoes();
        
        // Atualiza a tela visível
        if (telas.caixaGlobal.style.display === 'block') {
            renderizarTelaCaixaGlobal(true);
        }
    }
}

async function carregarDadosAlocacao() {
    if (currentUser) {
        const { doc, getDoc } = window.dbFunctions;
        const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                dadosAlocacao = userData.dadosAlocacao || { categorias: {}, ativos: {} };
            } else {
                dadosAlocacao = { categorias: {}, ativos: {} };
            }
        } catch (error) {
            console.error("Erro ao carregar dados de alocação do Firestore:", error);
            dadosAlocacao = { categorias: {}, ativos: {} };
        }
    } else {
        const data = localStorage.getItem('carteira_dados_alocacao_offline');
        dadosAlocacao = data ? JSON.parse(data) : { categorias: {}, ativos: {} };
    }

    // Garante valor padrão para o modo de rebalanceamento se não existir
    if (!dadosAlocacao.modoRebalanceamento) {
        dadosAlocacao.modoRebalanceamento = 'categoria';
    }
}
// ********** FIM DA PARTE 2







// ********** PARTE 3 - Lançamentos (Notas, Posição Inicial, Ajustes)
// --- FUNÇÕES DE POSIção INICIAL ---
function gerarLinhaPosicaoMassaHTML() {
    const corretorasOptions = getTodasCorretoras().map(c => `<option value="${c}">${c}</option>`).join('');

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="pos-massa-ticker ticker-input" placeholder="ITSA4"></td>
        <td><input type="date" class="pos-massa-data"></td>
        <td><input type="text" class="pos-massa-pm" placeholder="Ex: 10,123456"></td>
        <td><input type="number" class="pos-massa-qtd" min="1" step="1" placeholder="100"></td>
        <td>
            <select class="pos-massa-corretora">
                <option value="">Selecione...</option>
                ${corretorasOptions}
            </select>
        </td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()" title="Remover Linha"><i class="fas fa-trash"></i></button></td>
    `;
    return tr;
}

function renderizarTelaPosicaoMassa() {
    const tbody = document.getElementById('tabela-posicao-massa-body');
    tbody.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        tbody.appendChild(gerarLinhaPosicaoMassaHTML());
    }
}

// Função para salvar os dados preenchidos
function salvarPosicoesEmMassa() {
    const linhas = document.querySelectorAll('#tabela-posicao-massa-body tr');
    const posicoesAgrupadas = new Map();
    let linhasValidasCount = 0;

    for (const linha of linhas) {
        const ticker = linha.querySelector('.pos-massa-ticker').value.toUpperCase();
        const data = linha.querySelector('.pos-massa-data').value;
        const pmStr = linha.querySelector('.pos-massa-pm').value;
        const qtdStr = linha.querySelector('.pos-massa-qtd').value;
        const corretora = linha.querySelector('.pos-massa-corretora').value;

        // Validação: ignora linha se algum campo estiver vazio
        if (!ticker || !data || !pmStr || !qtdStr || !corretora) {
            continue;
        }

        // Validação: ignora linha se o ativo não estiver cadastrado
        if (!todosOsAtivos.some(a => a.ticker === ticker)) {
            alert(`O ativo "${ticker}" não está cadastrado e será ignorado. Por favor, cadastre-o primeiro na tela de "Cadastro de Ativos".`);
            continue;
        }

        const precoMedio = parseDecimal(pmStr);
        const quantidade = parseInt(qtdStr, 10);

        // Chave de agrupamento: agrupa por ativo, data e PM.
        const chave = `${ticker}|${data}|${precoMedio}`;

        // Se a chave ainda não existe no mapa, cria uma nova entrada
        if (!posicoesAgrupadas.has(chave)) {
            posicoesAgrupadas.set(chave, {
                ticker,
                data,
                precoMedio,
                posicoesPorCorretora: []
            });
        }
        
        // Adiciona a posição da corretora à entrada correspondente
        posicoesAgrupadas.get(chave).posicoesPorCorretora.push({ corretora, quantidade });
        linhasValidasCount++;
    }

    if (linhasValidasCount === 0) {
        alert('Nenhuma linha válida foi preenchida para salvar.');
        return;
    }

    // Converte os dados agrupados do mapa para o formato final de Posição Inicial
    posicoesAgrupadas.forEach(posAgrupada => {
        const novoRegistro = {
            id: Date.now() + Math.random(),
            tipoRegistro: 'SUMARIO_MANUAL',
            ticker: posAgrupada.ticker,
            data: posAgrupada.data,
            precoMedio: posAgrupada.precoMedio,
            posicoesPorCorretora: posAgrupada.posicoesPorCorretora
        };
        posicaoInicial.push(novoRegistro);
    });

    salvarPosicaoInicial();
    alert(`${posicoesAgrupadas.size} registro(s) de posição inicial salvos com sucesso, totalizando ${linhasValidasCount} linhas válidas.`);
    
    // Volta para a tela de lista
    mostrarTela('posicaoInicial');
    renderizarTabelaPosicaoInicial();
}
/**
 * Gera o HTML para uma nova linha na tabela de lançamento de proventos em massa.
 */
function gerarLinhaProventoMassaHTML() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="prov-massa-ticker ticker-input" placeholder="ITSA4"></td>
        <td>
            <select class="prov-massa-tipo">
                <option value="Rendimento">Rendimento</option>
                <option value="Dividendo">Dividendo</option>
                <option value="JCP">JCP</option>
                <option value="Bonificação">Bonificação</option>
                <option value="Outros">Outros</option>
            </select>
        </td>
        <td><input type="date" class="prov-massa-data-com"></td>
        <td><input type="date" class="prov-massa-data-pag"></td>
        <td><input type="text" class="prov-massa-valor-bruto numero" placeholder="Ex: 0,158562"></td>
        <td><input type="text" class="prov-massa-ir numero" placeholder="Digite o percentual aqui"></td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()" title="Remover Linha"><i class="fas fa-trash"></i></button></td>
    `;
    return tr;
}

/**
 * Prepara a tela de lançamento em massa, adicionando linhas iniciais.
 */
function renderizarTelaProventosMassa() {
    const tbody = document.getElementById('tabela-proventos-massa-body');
    tbody.innerHTML = '';
    for (let i = 0; i < 20; i++) { // Começa com 20 linhas vazias
        tbody.appendChild(gerarLinhaProventoMassaHTML());
    }
}
function salvarProventosEmMassa() {
    const linhas = document.querySelectorAll('#tabela-proventos-massa-body tr');
    let proventosAdicionados = 0;

    for (const linha of linhas) {
        const ticker = linha.querySelector('.prov-massa-ticker').value.toUpperCase();
        const tipo = linha.querySelector('.prov-massa-tipo').value;
        const dataCom = linha.querySelector('.prov-massa-data-com').value;
        const dataPagamento = linha.querySelector('.prov-massa-data-pag').value;
        const valorBrutoStr = linha.querySelector('.prov-massa-valor-bruto').value;
        const irPercentStr = linha.querySelector('.prov-massa-ir').value;

        if (!ticker || !tipo || !dataCom || !dataPagamento || !valorBrutoStr) {
            continue;
        }

        if (!todosOsAtivos.some(a => a.ticker === ticker)) {
            alert(`O ativo "${ticker}" não está cadastrado e será ignorado. Por favor, cadastre-o primeiro.`);
            continue;
        }

        const valorBruto = parseDecimal(valorBrutoStr);
        const irPercent = parseDecimal(irPercentStr) || 0;
        const irValor = valorBruto * (irPercent / 100);
        const valorLiquido = valorBruto - irValor;

        const dadosCalculados = calcularDadosProvento(ticker, dataCom, valorLiquido);
        
        const novoProvento = {
            id: Date.now() + Math.random(),
            ticker,
            tipo,
            dataCom,
            dataPagamento,
            valorIndividual: valorLiquido,
            valorBrutoIndividual: valorBruto,
            percentualIR: irPercent,
            ...dadosCalculados
        };

        todosOsProventos.push(novoProvento);
        sincronizarProventoComTransacao(novoProvento.id);
        proventosAdicionados++;
    }

    if (proventosAdicionados > 0) {
        salvarProventos();
        salvarMovimentacoes();
        
        // DISPARA A SINCRONIZAÇÃO SILENCIOSA
        sincronizarTodosOsRegistros(null, true);

        alert(`${proventosAdicionados} lançamento(s) de proventos salvos com sucesso!`);
        
        mostrarTela('proventos');
        renderizarTabelaProventos();
    } else {
        alert('Nenhuma linha válida foi preenchida para salvar.');
    }
}

function renderizarTabelaPosicaoInicial() {
    const container = document.getElementById('lista-de-posicoes-iniciais');
    container.innerHTML = `<table><thead><tr><th>Tipo</th><th>Data</th><th>Ativo</th><th>Detalhes</th><th class="numero">Preço Médio</th><th class="controles-col">Controles</th></tr></thead><tbody></tbody></table>`;
    const body = container.querySelector('tbody');
    body.innerHTML = '';
    
    posicaoInicial.sort((a, b) => {
        const tickerComparison = (a.ticker || '').localeCompare(b.ticker || '');
        if (tickerComparison !== 0) {
            return tickerComparison;
        }
        return new Date(a.data) - new Date(b.data);
    }).forEach(pos => {
        const tr = document.createElement('tr');
        let detalhes = '';
        let tipoRegistroLabel = '';
        let controlesHtml = `<i class="fas fa-trash acao-btn delete" title="Excluir Registro" data-posicao-id="${pos.id}"></i>`; // Botão de excluir padrão

        switch(pos.tipoRegistro) {
            case 'SUMARIO_MANUAL':
                tipoRegistroLabel = 'Manual';
                detalhes = pos.posicoesPorCorretora.map(pc => `${pc.corretora}: ${pc.quantidade}`).join(', ');
                // Adiciona o botão de editar apenas para este tipo
                controlesHtml = `<i class="fas fa-edit acao-btn edit" title="Editar Registro" data-edit-posicao-id="${pos.id}"></i>` + controlesHtml;
                break;
            case 'TRANSACAO_HISTORICA':
                tipoRegistroLabel = 'Histórico';
                detalhes = `${pos.transacao.charAt(0).toUpperCase() + pos.transacao.slice(1)} ${pos.quantidade} @ ${pos.corretora}`;
                break;
            default:
                tipoRegistroLabel = 'Histórico (Legado)';
                detalhes = `${pos.transacao} ${pos.quantidade} @ ${pos.corretora}`;
                break;
        }
        const dataFormatada = pos.data ? new Date(pos.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data Inválida';
        tr.innerHTML = `<td>${tipoRegistroLabel}</td><td>${dataFormatada}</td><td>${pos.ticker}</td><td>${detalhes}</td><td class="numero">${formatarPrecoMedio(pos.precoMedio)}</td><td class="controles-col">${controlesHtml}</td>`;
        body.appendChild(tr);
    });
}
function adicionarLinhaCorretora(corretora = '', quantidade = '') { const container = document.getElementById('posicoes-corretoras-container'); const div = document.createElement('div'); div.className = 'corretora-row'; div.innerHTML = `<div class="form-group"><label>Corretora</label><input type="text" class="posicao-corretora" value="${corretora}" required></div><div class="form-group"><label>Quantidade</label><input type="number" step="1" class="posicao-quantidade" value="${quantidade}" required></div><button type="button" class="btn btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`; container.appendChild(div); }

// --- NOVAS FUNÇÕES PARA HISTÓRICO DE ATIVO ---
function iniciarAdicaoHistorico() {
    containerListaPosicoes.style.display = 'none';
    containerAdicionarHistorico.style.display = 'block';
    containerTabelaHistorico.style.display = 'none';
    document.getElementById('form-buscar-ativo-historico').reset();
    document.getElementById('tabela-historico-body').innerHTML = '';
    
    const corretoras = getTodasCorretoras();
    dropdownCorretorasCache = `<option value="">Selecione</option>` + corretoras.map(c => `<option value="${c}">${c}</option>`).join('');
}

function cancelarAdicaoHistorico() {
    containerListaPosicoes.style.display = 'block';
    containerAdicionarHistorico.style.display = 'none';
    mostrarTela('posicaoInicial');
}

function adicionarLinhaHistorico(tbody, data = '', transacao = '', quantidade = '', corretora = '', precoMedio = '') {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" class="hist-data" value="${data}" required></td>
        <td>
            <select class="hist-transacao" required>
                <option value="">Selecione</option>
                <option value="Compra" ${transacao.toLowerCase() === 'compra' ? 'selected' : ''}>Compra</option>
                <option value="Venda" ${transacao.toLowerCase() === 'venda' ? 'selected' : ''}>Venda</option>
            </select>
        </td>
        <td><input type="number" step="1" min="1" class="hist-qtd numero" value="${quantidade}" required></td>
        <td>
            <select class="hist-corretora" required>
                ${dropdownCorretorasCache}
            </select>
        </td>
        <td><input type="text" class="hist-pm numero" value="${precoMedio}" required></td>
        <td class="controles-col">
            <i class="fas fa-trash acao-btn delete" title="Excluir Linha" onclick="this.closest('tr').remove()"></i>
        </td>
    `;
    tbody.appendChild(tr);
    if(corretora) {
        tr.querySelector('.hist-corretora').value = corretora;
    }
}

function buscarAtivoParaHistorico(event) {
    event.preventDefault();
    const tickerInput = document.getElementById('historico-ativo-ticker');
    const ticker = tickerInput.value.toUpperCase();
    if (!ticker) return;

    if (!todosOsAtivos.some(a => a.ticker === ticker)) {
        alert(`O ativo "${ticker}" não está cadastrado. Por favor, cadastre-o primeiro.`);
        abrirModalCadastroAtivo(null, ticker);
        return;
    }

    document.getElementById('historico-ativo-selecionado').textContent = ticker;
    containerTabelaHistorico.style.display = 'block';
    const tbody = document.getElementById('tabela-historico-body');
    tbody.innerHTML = '';
    adicionarLinhaHistorico(tbody);
}

function salvarHistoricoAtivo(event) {
    event.preventDefault();
    const ticker = document.getElementById('historico-ativo-selecionado').textContent;
    const linhas = document.querySelectorAll('#tabela-historico-body tr');
    const registrosTemporarios = [];
    let linhasIncompletasEncontradas = false;

    for (const linha of linhas) {
        const data = linha.querySelector('.hist-data').value;
        const transacao = linha.querySelector('.hist-transacao').value;
        const quantidade = linha.querySelector('.hist-qtd').value;
        const corretora = linha.querySelector('.hist-corretora').value;
        const precoMedio = linha.querySelector('.hist-pm').value;

        const todosVazios = !data && !transacao && !quantidade && !corretora && !precoMedio;
        const todosPreenchidos = data && transacao && quantidade && corretora && precoMedio;

        if (todosVazios) continue;

        if (!todosPreenchidos) {
            linhasIncompletasEncontradas = true;
            continue; 
        }

        registrosTemporarios.push({ data, transacao, quantidade, corretora, precoMedio });
    }

    if (linhasIncompletasEncontradas) {
        if (!confirm('Existem linhas com preenchimento incompleto. Deseja salvar mesmo assim, descartando as linhas incompletas?')) {
            alert('Ação cancelada. Por favor, complete todas as linhas ou remova as que não deseja salvar.');
            return;
        }
    }
    
    if (registrosTemporarios.length === 0) {
        alert('Nenhuma linha completamente preenchida para salvar.');
        return;
    }

    registrosTemporarios.sort((a, b) => new Date(a.data) - new Date(b.data));

    let newCount = 0;
    let updatedCount = 0;

    registrosTemporarios.forEach(reg => {
        const quantidadeInt = parseInt(reg.quantidade);
        
        const indexExistente = posicaoInicial.findIndex(p =>
            p.tipoRegistro === 'TRANSACAO_HISTORICA' &&
            p.ticker === ticker &&
            p.data === reg.data &&
            p.transacao === reg.transacao &&
            p.quantidade === quantidadeInt &&
            p.corretora === reg.corretora
        );

        if (indexExistente > -1) {
            posicaoInicial[indexExistente].precoMedio = parseDecimal(reg.precoMedio);
            updatedCount++;
        } else {
            const novoRegistroCompleto = {
                id: Date.now() + Math.random(),
                tipoRegistro: 'TRANSACAO_HISTORICA',
                ticker: ticker,
                data: reg.data,
                transacao: reg.transacao,
                quantidade: quantidadeInt,
                corretora: reg.corretora,
                precoMedio: parseDecimal(reg.precoMedio)
            };
            posicaoInicial.push(novoRegistroCompleto);
            newCount++;
        }
    });

    salvarPosicaoInicial();
    alert(`${newCount} novo(s) registo(s) de histórico salvos e ${updatedCount} registo(s) atualizados com sucesso!`);
    
    cancelarAdicaoHistorico();
    renderizarTabelaPosicaoInicial();

    if (confirm("Histórico salvo com sucesso!\n\nDeseja recalcular e sincronizar todos os registos agora para garantir a consistência dos proventos e outros dados?")) {
        sincronizarTodosOsRegistros();
    }
}

function processarArquivoHistorico(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const todasAsLinhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
            
            if (todasAsLinhas.length < 2) {
                alert('O arquivo CSV está vazio ou contém apenas o cabeçalho.');
                return;
            }

            const tickersCadastrados = new Set(todosOsAtivos.map(a => a.ticker));
            let novosAtivosForamCadastrados = false;

            const linhasDeDados = todasAsLinhas.slice(1);
            const dadosAgrupados = {};

            linhasDeDados.forEach(linha => {
                const colunas = linha.split(',').map(c => c.trim().replace(/"/g, ''));
                if (colunas.length < 6) return;

                // --- ALTERAÇÃO: Adiciona a leitura da 7ª coluna 'valorTotal' ---
                const [tickerRaw, data, transacao, quantidade, corretora, precoMedio, valorTotal] = colunas;
                const ticker = tickerRaw.toUpperCase();
                
                if (!ticker) return;

                let isNewAsset = false;
                if (!tickersCadastrados.has(ticker)) {
                    const novoAtivoMinimo = {
                        id: Date.now() + Math.random(), ticker: ticker, tipo: '', nome: '', nomePregao: '', tipoAcao: '', cnpj: '', adminNome: '', adminCnpj: '', statusAporte: 'Ativo'
                    };
                    todosOsAtivos.push(novoAtivoMinimo);
                    tickersCadastrados.add(ticker);
                    novosAtivosForamCadastrados = true;
                    isNewAsset = true;
                }
                
                if (!dadosAgrupados[ticker]) {
                    dadosAgrupados[ticker] = { isNew: isNewAsset, registros: [] };
                }
                // --- ALTERAÇÃO: Adiciona 'valorTotal' ao objeto de registro ---
                dadosAgrupados[ticker].registros.push({ data, transacao, quantidade, corretora, precoMedio, valorTotal });
            });

            if (novosAtivosForamCadastrados) {
                salvarAtivos();
            }

            if(Object.keys(dadosAgrupados).length > 0) {
                renderizarTelaImportacaoHistorico(dadosAgrupados);
            } else {
                 alert('Nenhuma linha de dados válida foi encontrada no arquivo. Verifique se o formato está correto (separado por vírgulas) e se o arquivo não está em branco.');
            }
        } catch (error) {
            alert("Ocorreu um erro ao processar o arquivo: " + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function renderizarTelaImportacaoHistorico(dadosAgrupados) {
    mostrarTela('importacaoHistorico');
    const container = document.getElementById('container-revisao-historico');
    container.innerHTML = '';
    const corretoras = getTodasCorretoras();
    dropdownCorretorasCache = `<option value="">Selecione</option>` + corretoras.map(c => `<option value="${c}">${c}</option>`).join('');

    for (const ticker in dadosAgrupados) {
        const ativoDiv = document.createElement('div');
        ativoDiv.className = 'import-review-container';
        if (dadosAgrupados[ticker].isNew) {
            ativoDiv.classList.add('new-asset');
        }
        ativoDiv.dataset.ticker = ticker;
        
        let tableRows = '';
        dadosAgrupados[ticker].registros.forEach(reg => {
            const dataNormalizada = normalizarDataParaInput(reg.data);
            tableRows += `
                <tr>
                    <td><input type="date" class="hist-data" value="${dataNormalizada}" required></td>
                    <td>
                        <select class="hist-transacao" required>
                            <option value="">Selecione</option>
                            <option value="Compra" ${reg.transacao.toLowerCase() === 'compra' ? 'selected' : ''}>Compra</option>
                            <option value="Venda" ${reg.transacao.toLowerCase() === 'venda' ? 'selected' : ''}>Venda</option>
                        </select>
                    </td>
                    <td><input type="number" step="1" min="1" class="hist-qtd numero" value="${reg.quantidade}" required></td>
                    <td>
                        <select class="hist-corretora" required>
                            ${dropdownCorretorasCache}
                        </select>
                    </td>
                    <td><input type="text" class="hist-pm numero" value="${reg.precoMedio}" required></td>
                    <td><input type="text" class="hist-valor-total numero" value="${reg.valorTotal || ''}" placeholder="Obrigatório p/ Venda"></td>
                    <td class="controles-col">
                        <i class="fas fa-trash acao-btn delete" title="Excluir Linha" onclick="this.closest('tr').remove()"></i>
                    </td>
                </tr>
            `;
        });
        
        // --- ALTERAÇÃO: Adiciona o cabeçalho para a nova coluna ---
        ativoDiv.innerHTML = `
            <h3>Histórico para ${ticker}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Data</th><th>Transação</th><th class="numero">Quantidade</th>
                        <th>Corretora</th><th class="numero">Preço Médio Resultante</th>
                        <th class="numero">Valor Total (R$)</th>
                        <th class="controles-col">Ações</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        container.appendChild(ativoDiv);
        
        const rows = ativoDiv.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const corretora = dadosAgrupados[ticker].registros[index].corretora;
            if (corretora) {
                row.querySelector('.hist-corretora').value = corretora;
            }
        });
    }
}

function salvarHistoricoImportado() {
    const containers = document.querySelectorAll('#container-revisao-historico .import-review-container');
    let totalAdicionado = 0;
    let totalAtualizado = 0;

    // 1. Coleta e agrupa todas as linhas da tela de revisão por uma chave única.
    const dadosParaProcessar = new Map();

    containers.forEach(container => {
        const ticker = container.dataset.ticker;
        const linhas = container.querySelectorAll('tbody tr');

        linhas.forEach(linha => {
            const data = linha.querySelector('.hist-data').value;
            const transacao = linha.querySelector('.hist-transacao').value;
            const corretora = linha.querySelector('.hist-corretora').value;
            const quantidade = linha.querySelector('.hist-qtd').value;
            const precoMedio = linha.querySelector('.hist-pm').value;
            const valorTotal = linha.querySelector('.hist-valor-total').value;

            if (data && transacao && quantidade && corretora && precoMedio) {
                const chave = `${ticker}|${data}|${transacao}|${corretora}`;
                if (!dadosParaProcessar.has(chave)) {
                    dadosParaProcessar.set(chave, []);
                }
                dadosParaProcessar.get(chave).push({
                    quantidadeNum: parseInt(quantidade, 10),
                    precoMedioNum: parseDecimal(precoMedio),
                    valorTotalStr: valorTotal 
                });
            }
        });
    });

    // 2. Processa cada grupo de transações para consolidar os valores.
    dadosParaProcessar.forEach((registrosDoGrupo, chave) => {
        const [ticker, data, transacao, corretora] = chave.split('|');

        // --- INÍCIO DA ALTERAÇÃO ---
        // O cálculo de consolidação agora SOMA também o 'valorTotal'.
        const consolidado = registrosDoGrupo.reduce((acc, current) => {
            acc.quantidadeTotal += current.quantidadeNum;
            acc.valorTotalConsolidado += parseDecimal(current.valorTotalStr || '0'); // SOMA o valor total
            acc.ultimoPrecoMedio = current.precoMedioNum; // Mantém o último preço médio
            return acc;
        }, { quantidadeTotal: 0, ultimoPrecoMedio: 0, valorTotalConsolidado: 0 });
        // --- FIM DA ALTERAÇÃO ---

        const indexExistente = posicaoInicial.findIndex(p =>
            p.tipoRegistro === 'TRANSACAO_HISTORICA' &&
            p.ticker === ticker &&
            p.data === data &&
            p.transacao === transacao &&
            p.corretora === corretora
        );

        if (indexExistente > -1) {
            posicaoInicial[indexExistente].quantidade += consolidado.quantidadeTotal;
            posicaoInicial[indexExistente].precoMedio = consolidado.ultimoPrecoMedio;
            if (transacao.toLowerCase() === 'venda') {
                // Soma o novo valor total consolidado ao valor de venda já existente.
                const valorVendaExistente = posicaoInicial[indexExistente].valorVenda || 0;
                posicaoInicial[indexExistente].valorVenda = valorVendaExistente + consolidado.valorTotalConsolidado;
            }
            totalAtualizado++;
        } else {
            const novoRegistro = {
                id: Date.now() + Math.random(),
                tipoRegistro: 'TRANSACAO_HISTORICA',
                ticker: ticker,
                data: data,
                transacao: transacao,
                quantidade: consolidado.quantidadeTotal,
                corretora: corretora,
                precoMedio: consolidado.ultimoPrecoMedio
            };
            if (transacao.toLowerCase() === 'venda') {
                novoRegistro.valorVenda = consolidado.valorTotalConsolidado;
            }
            posicaoInicial.push(novoRegistro);
            totalAdicionado++;
        }
    });
    
    if (totalAdicionado > 0 || totalAtualizado > 0) {
        salvarPosicaoInicial();
        alert(`${totalAdicionado} registro(s) de histórico importado(s) com sucesso e ${totalAtualizado} registro(s) atualizado(s)!`);
        mostrarTela('posicaoInicial');
        renderizarTabelaPosicaoInicial();
    } else {
        alert('Nenhum registro válido para salvar.');
    }
}
function getProventosTransferiveis(corretoraOrigem, dataTransferencia) {
    if (!corretoraOrigem || !dataTransferencia) {
        return [];
    }

    return todosOsProventos.filter(p => {
        const temPosicaoNaOrigem = p.posicaoPorCorretora && p.posicaoPorCorretora[corretoraOrigem] && p.posicaoPorCorretora[corretoraOrigem].valorRecebido > 0;
        
        return temPosicaoNaOrigem &&
               p.dataCom && p.dataCom <= dataTransferencia &&
               p.dataPagamento && p.dataPagamento > dataTransferencia;
    });
}
function renderizarTabelaTransferencias() {
    const container = document.getElementById('lista-de-transferencias');
    const transferencias = todosOsAjustes.filter(a => a.tipoAjuste === 'transferencia');
    
    if (transferencias.length === 0) {
        container.innerHTML = '<p>Nenhum histórico de transferências encontrado.</p>';
        return;
    }

    let tableHtml = `<table><thead><tr><th>Data</th><th>Origem</th><th>Destino</th><th>Itens Transferidos</th><th class="controles-col">Controles</th></tr></thead><tbody>`;
    transferencias.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(transf => {
        const dataFormatada = new Date(transf.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        let detalhesHtml = '<div class="detalhes-transferencia-historico">';
        if (transf.ativosTransferidos && transf.ativosTransferidos.length > 0) {
            detalhesHtml += '<strong>Ativos:</strong><br>' + transf.ativosTransferidos.map(at => `${at.ticker}: ${at.quantidade} un.`).join('<br>');
        }
        if (transf.proventosTransferidos && transf.proventosTransferidos.length > 0) {
            if (transf.ativosTransferidos && transf.ativosTransferidos.length > 0) detalhesHtml += '<br><br>';
            const proventosInfo = transf.proventosTransferidos.map(id => {
                const p = todosOsProventos.find(prov => prov.id === id);
                return p ? `${p.ticker} - ${p.tipo}` : `Provento ID ${id} (não encontrado)`;
            }).join('<br>');
            detalhesHtml += `<strong>Proventos (${transf.proventosTransferidos.length}):</strong><br>${proventosInfo}`;
        }
        detalhesHtml += '</div>';

        tableHtml += `
            <tr>
                <td>${dataFormatada}</td>
                <td>${transf.corretoraOrigem}</td>
                <td>${transf.corretoraDestino}</td>
                <td>${detalhesHtml}</td>
                <td class="controles-col">
                    <i class="fas fa-edit acao-btn edit" title="Editar Transferência" data-transferencia-id="${transf.id}"></i>
                    <i class="fas fa-trash acao-btn delete" title="Excluir Transferência" data-transferencia-id="${transf.id}"></i>
                </td>
            </tr>
        `;
    });
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}
function deletarTransferencia(transferenciaId) {
    const transferenciaIndex = todosOsAjustes.findIndex(a => a.id === transferenciaId);
    if (transferenciaIndex === -1) return;

    const transferencia = todosOsAjustes[transferenciaIndex];

    if (confirm('Tem certeza que deseja excluir este registro de transferência? As alterações nos proventos também serão revertidas.')) {
        let proventosModificados = false;
        if (transferencia.proventosTransferidos && transferencia.proventosTransferidos.length > 0) {
            transferencia.proventosTransferidos.forEach(provId => {
                const provento = todosOsProventos.find(p => p.id === provId);
                if (provento && provento.posicaoPorCorretora[transferencia.corretoraDestino]) {
                    // Reverte a transferência do provento
                    provento.posicaoPorCorretora[transferencia.corretoraOrigem] = provento.posicaoPorCorretora[transferencia.corretoraDestino];
                    delete provento.posicaoPorCorretora[transferencia.corretoraDestino];
                    delete provento.pagamentoRedirecionadoManualmente; // Remove a flag
                    proventosModificados = true;
                }
            });
        }

        todosOsAjustes.splice(transferenciaIndex, 1);
        
        const promises = [salvarAjustes()];
        if (proventosModificados) {
            promises.push(salvarProventos());
        }

        Promise.all(promises).then(() => {
            renderizarTabelaTransferencias();
            alert('Transferência excluída e proventos revertidos com sucesso!');
        });
    }
}
function popularAtivosParaTransferencia(corretoraOrigem, dataTransferencia, transferenciaParaEditar = null) {
    const containerAtivos = document.getElementById('transferencia-ativos-disponiveis');
    const containerProventos = document.getElementById('transferencia-proventos-disponiveis');
    document.getElementById('transferencia-ativos-container').style.display = 'block';

    if (!corretoraOrigem || !dataTransferencia) {
        containerAtivos.innerHTML = '<p>Selecione uma corretora de origem e uma data.</p>';
        containerProventos.innerHTML = '';
        return;
    }

    const posicoes = gerarPosicaoDetalhada(dataTransferencia);
    const ativosDisponiveis = Object.entries(posicoes)
        .filter(([ticker, dados]) => (dados.porCorretora[corretoraOrigem] || 0) > 0.000001)
        .map(([ticker, dados]) => ({ ticker, quantidade: dados.porCorretora[corretoraOrigem] }));

    if (transferenciaParaEditar && transferenciaParaEditar.ativosTransferidos) {
        transferenciaParaEditar.ativosTransferidos.forEach(ativoT => {
            const ativoNaLista = ativosDisponiveis.find(a => a.ticker === ativoT.ticker);
            if (ativoNaLista) {
                ativoNaLista.quantidade += ativoT.quantidade;
            } else {
                ativosDisponiveis.push({ ticker: ativoT.ticker, quantidade: ativoT.quantidade });
            }
        });
    }

    ativosDisponiveis.sort((a,b) => a.ticker.localeCompare(b.ticker));

    if (ativosDisponiveis.length === 0) {
        containerAtivos.innerHTML = `<p>Nenhum ativo encontrado na corretora ${corretoraOrigem} na data selecionada.</p>`;
    } else {
        containerAtivos.innerHTML = ativosDisponiveis.map(ativo => `
            <div class="ativo-item">
                <input type="checkbox" id="transfer-ativo-${ativo.ticker}" name="transfer-ativo" value="${ativo.ticker}">
                <label for="transfer-ativo-${ativo.ticker}">${ativo.ticker} (Disponível: ${Math.round(ativo.quantidade)})</label>
                <input type="number" class="transfer-quantidade" placeholder="Qtd" min="1" max="${Math.round(ativo.quantidade)}" style="width: 100px;">
            </div>
        `).join('');
    }

    const proventosJaTransferidosIds = new Set(transferenciaParaEditar?.proventosTransferidos || []);
    
    let proventosDisponiveis = getProventosTransferiveis(corretoraOrigem, dataTransferencia);

    if (transferenciaParaEditar) {
        proventosJaTransferidosIds.forEach(id => {
            if (!proventosDisponiveis.some(p => p.id === id)) {
                const proventoAntigo = todosOsProventos.find(p => p.id === id);
                if (proventoAntigo) proventosDisponiveis.push(proventoAntigo);
            }
        });
    }

    proventosDisponiveis.sort((a,b) => a.ticker.localeCompare(b.ticker));

    if (proventosDisponiveis.length === 0) {
        containerProventos.innerHTML = `<p>Nenhum provento pendente encontrado para transferência nesta data.</p>`;
    } else {
        containerProventos.innerHTML = proventosDisponiveis.map(provento => {
            const isAlreadyTransferred = proventosJaTransferidosIds.has(provento.id);
            const valorNaCorretora = (provento.posicaoPorCorretora[corretoraOrigem] || provento.posicaoPorCorretora[transferenciaParaEditar?.corretoraDestino] || {valorRecebido: 0}).valorRecebido;
            const dataPagFmt = new Date(provento.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR');
            
            const checkboxHtml = `<input type="checkbox" id="transfer-provento-${provento.id}" name="transfer-provento" value="${provento.id}" ${isAlreadyTransferred ? 'checked disabled' : ''}>`;
            const labelHtml = `<label for="transfer-provento-${provento.id}">${provento.ticker} - ${provento.tipo} de ${formatarMoeda(valorNaCorretora)} (Paga em ${dataPagFmt})</label>`;
            const infoHtml = isAlreadyTransferred ? `<span class="transferencia-item-info">(Já transferido ✔️)</span>` : '';
            const revertBtnHtml = isAlreadyTransferred ? `<i class="fas fa-undo reverter-btn" title="Reverter transferência deste provento" data-provento-id="${provento.id}"></i>` : '';

            return `<div class="transferencia-item">${checkboxHtml}${labelHtml}${infoHtml}${revertBtnHtml}</div>`;
        }).join('');
    }

    if (transferenciaParaEditar) {
        setTimeout(() => {
            if (transferenciaParaEditar.ativosTransferidos) {
                transferenciaParaEditar.ativosTransferidos.forEach(ativoT => {
                    const checkbox = document.querySelector(`#transferencia-ativos-disponiveis input[value="${ativoT.ticker}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.parentElement.querySelector('.transfer-quantidade').value = ativoT.quantidade;
                    }
                });
            }
            if (transferenciaParaEditar.proventosTransferidos) {
                transferenciaParaEditar.proventosTransferidos.forEach(provId => {
                    const checkbox = document.querySelector(`#transferencia-proventos-disponiveis input[value="${provId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }, 50);
    }
}
function abrirModalEdicaoTransferencia(transferenciaId) {
    // A comparação agora é robusta, como corrigimos antes.
    const transferencia = todosOsAjustes.find(a => parseFloat(a.id) === parseFloat(transferenciaId));

    if (!transferencia) {
        console.error("Erro ao editar transferência: Não foi possível encontrar a transferência com o ID:", transferenciaId);
        alert("Ocorreu um erro ao tentar carregar os dados desta transferência.");
        return;
    }

    document.getElementById('transferencia-form-titulo').textContent = 'Editar Transferência de Custódia';
    
    const form = document.getElementById('form-transferencia-custodia');
    form.reset();
    document.getElementById('transferencia-id').value = transferencia.id;
    document.getElementById('transferencia-data').value = transferencia.data;
    document.getElementById('transferencia-corretora-origem').value = transferencia.corretoraOrigem;
    document.getElementById('transferencia-corretora-destino').value = transferencia.corretoraDestino;

    // A MUDANÇA PRINCIPAL ESTÁ AQUI: Passamos o objeto 'transferencia' para a função seguinte.
    popularAtivosParaTransferencia(transferencia.corretoraOrigem, transferencia.data, transferencia);

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderizarTabelaEventosCorporativos() {
    const container = document.getElementById('lista-de-eventos-corporativos');
    const eventos = todosOsAjustes.filter(a => a.tipoAjuste === 'split_grupamento');

    if (eventos.length === 0) {
        container.innerHTML = '<p>Nenhum evento de split ou grupamento registrado.</p>';
        return;
    }

    let tableHtml = `<table><thead><tr>
        <th>Data-Ex</th>
        <th>Ativo</th>
        <th>Evento</th>
        <th class="numero">Proporção</th>
        <th class="controles-col">Controles</th>
    </tr></thead><tbody>`;

    eventos.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(evento => {
        const dataFormatada = new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const tipoEventoLabel = evento.tipoEvento === 'split' ? 'Desdobramento (Split)' : 'Grupamento (Inplit)';
        const proporcaoLabel = `${evento.proporcaoDe} para ${evento.proporcaoPara}`;

        tableHtml += `
            <tr>
                <td>${dataFormatada}</td>
                <td>${evento.ticker}</td>
                <td>${tipoEventoLabel}</td>
                <td class="numero">${proporcaoLabel}</td>
                <td class="controles-col">
                    <i class="fas fa-edit acao-btn edit" title="Editar Evento" data-evento-corp-id="${evento.id}"></i>
                    <i class="fas fa-trash acao-btn delete" title="Excluir Evento" data-evento-corp-id="${evento.id}"></i>
                </td>
            </tr>
        `;
    });
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}
function deletarEventoCorporativo(ajusteId) {
    if (confirm('Tem certeza que deseja excluir este evento? Esta ação recalculará a posição do ativo a partir da data do evento.')) {
        todosOsAjustes = todosOsAjustes.filter(a => a.id !== ajusteId);
        salvarAjustes();
        renderizarTabelaEventosCorporativos();
    }
}
function abrirModalEventoCorporativo(ajusteParaEditar = null) {
    const form = document.getElementById('form-evento-corporativo');
    form.reset();

    if (ajusteParaEditar) {
        document.getElementById('modal-evento-titulo').textContent = 'Editar Evento Corporativo';
        document.getElementById('evento-id').value = ajusteParaEditar.id;
        document.getElementById('evento-ticker').value = ajusteParaEditar.ticker;
        document.getElementById('evento-data').value = ajusteParaEditar.data;
        document.getElementById('evento-tipo').value = ajusteParaEditar.tipoEvento;
        document.getElementById('evento-proporcao-de').value = ajusteParaEditar.proporcaoDe;
        document.getElementById('evento-proporcao-para').value = ajusteParaEditar.proporcaoPara;
    } else {
        document.getElementById('modal-evento-titulo').textContent = 'Registrar Novo Evento Corporativo';
        document.getElementById('evento-id').value = '';
    }
    modalEventoCorporativo.style.display = 'block';
    document.getElementById('evento-ticker').focus();
}
function salvarEventoAtivo(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const id = document.getElementById('evento-ativo-id').value;
    const tipoEvento = document.getElementById('evento-ativo-tipo').value;
    const data = document.getElementById('evento-ativo-data').value;
    const ticker = document.getElementById('evento-ativo-ticker').value.toUpperCase();

    if (!tipoEvento || !data || !ticker) {
        alert('Por favor, preencha todos os campos: Tipo de Evento, Data e Ativo.');
        return;
    }

    const novoEvento = {
        id: id ? parseFloat(id) : Date.now(),
        tipoAjuste: 'evento_ativo', // Identificador para o motor de cálculo
        tipoEvento: tipoEvento,
        data: data,
        ticker: ticker,
        detalhes: []
    };

    if (tipoEvento === 'entrada') {
        novoEvento.precoMedio = parseDecimal(document.getElementById('evento-ativo-pm').value);
        
        document.querySelectorAll('#evento-entrada-corretoras-container .evento-entrada-qtd').forEach(input => {
            const quantidade = parseInt(input.value, 10);
            if (quantidade > 0) {
                novoEvento.detalhes.push({
                    corretora: input.dataset.corretora,
                    quantidade: quantidade
                });
            }
        });

    } else if (tipoEvento === 'saida') {
        document.querySelectorAll('#evento-saida-posicao-container .qtd-saida-input').forEach(input => {
            const quantidade = parseInt(input.value, 10);
            if (quantidade > 0) {
                novoEvento.detalhes.push({
                    corretora: input.dataset.corretora,
                    quantidade: quantidade
                });
            }
        });
    }

    if (novoEvento.detalhes.length === 0) {
        alert('Você precisa informar a quantidade em pelo menos uma corretora.');
        return;
    }

    // Lógica para salvar (criar ou editar)
    const index = todosOsAjustes.findIndex(a => a.id === novoEvento.id);
    if (index > -1) {
        todosOsAjustes[index] = novoEvento; // Atualiza se estiver editando
    } else {
        todosOsAjustes.push(novoEvento); // Adiciona se for novo
    }

    salvarAjustes(); // Salva os dados no localStorage
    renderizarTelaEventosAtivos(); // Atualiza a tabela na tela
    modalEventoAtivo.style.display = 'none'; // Fecha o modal
    alert('Evento de ativo salvo com sucesso!');
}

function abrirModalPosicaoInicial(posicaoParaEditar = null) {
    const form = document.getElementById('form-posicao-inicial');
    form.reset();
    document.getElementById('posicoes-corretoras-container').innerHTML = '';
    
    if (posicaoParaEditar) {
        // MODO EDIÇÃO
        document.getElementById('posicao-modal-titulo').textContent = 'Editar Posição Inicial';
        document.getElementById('posicao-id').value = posicaoParaEditar.id;
        document.getElementById('posicao-ativo').value = posicaoParaEditar.ticker;
        document.getElementById('posicao-data').value = normalizarDataParaInput(posicaoParaEditar.data);
        document.getElementById('posicao-preco-medio').value = formatarDecimalParaInput(posicaoParaEditar.precoMedio);

        posicaoParaEditar.posicoesPorCorretora.forEach(pc => {
            adicionarLinhaCorretora(pc.corretora, pc.quantidade);
        });

    } else {
        // MODO CRIAÇÃO
        document.getElementById('posicao-modal-titulo').textContent = 'Adicionar Posição Inicial';
        document.getElementById('posicao-id').value = '';
        adicionarLinhaCorretora(); // Adiciona uma linha de corretora em branco para começar
    }
    
    modalPosicaoInicial.style.display = 'block';
    document.getElementById('posicao-ativo').focus();
}
async function deletarNota(notaId) {
    if (confirm('Tem certeza que deseja excluir esta nota de negociação e todas as suas operações? A movimentação financeira correspondente no extrato da conta também será removida.')) {
        const notaParaExcluir = todasAsNotas.find(n => n.id === notaId);
        if (!notaParaExcluir) return;

        // Filtra a lista de notas para remover a nota selecionada
        todasAsNotas = todasAsNotas.filter(n => n.id !== notaId);
        
        // Filtra as movimentações para remover a transação gerada por esta nota
        todasAsMovimentacoes = todasAsMovimentacoes.filter(t => t.source !== 'nota' || t.sourceId !== notaId);

        // Salva ambos os arrays atualizados
        salvarDadosNaFonte({
            notas: todasAsNotas,
            movimentacoes: todasAsMovimentacoes
        }).then(() => {
            renderizarListaNotas();
            alert('Nota de negociação e seu lançamento financeiro foram excluídos com sucesso.');
        });
    }
}
function deletarPosicao(posicaoId) {
    if (confirm('Tem certeza que deseja excluir este registro de posição inicial?')) {
        posicaoInicial = posicaoInicial.filter(p => p.id !== posicaoId);
        salvarPosicaoInicial();
        renderizarTabelaPosicaoInicial();
    }
}
function carregarNotaParaEdicao(notaId) {
    const notaParaEditar = todasAsNotas.find(n => n.id === notaId);
    if (!notaParaEditar) return;
    notaAtual = JSON.parse(JSON.stringify(notaParaEditar));

    const selectCorretora = document.getElementById('nota-corretora');
    const corretorasAtivas = getCorretorasAtivasParaNotas();
    const corretoraDaNota = notaAtual.corretora;
    let optionsHtml = '';
    const corretoraEstaAtiva = corretorasAtivas.includes(corretoraDaNota);
    optionsHtml = corretorasAtivas.map(c => `<option value="${c}">${c}</option>`).join('');
    if (!corretoraEstaAtiva) {
        optionsHtml = `<option value="${corretoraDaNota}">${corretoraDaNota} (Inativa)</option>` + optionsHtml;
    }

    selectCorretora.innerHTML = optionsHtml;
    selectCorretora.value = corretoraDaNota; // Define o valor selecionado (seja ativo ou inativo).
    selectCorretora.disabled = false; // Garante que o dropdown esteja habilitado para edição.
    document.getElementById('nota-numero').value = notaAtual.numero;
    document.getElementById('nota-data').value = notaAtual.data;
    document.getElementById('nota-custos').value = formatarDecimalParaInput(notaAtual.custos);
    document.getElementById('nota-irrf').value = formatarDecimalParaInput(notaAtual.irrf);

    const tituloTela = document.querySelector('#tela-lancamento-nota h1');
    if (tituloTela) {
        tituloTela.textContent = 'Editar Nota de Negociação';
    }
    inicializarIconesCalculadora();
    renderizarTabelaOperacoes();
    atualizarTotais();
    mostrarTela('lancamentoNota');
}
function renderizarListaNotas() {
    const container = document.getElementById('lista-de-notas-salvas');
    container.innerHTML = `<table style="font-size: 1em;"><thead><tr><th>Data</th><th>Corretora</th><th>Nota n°</th><th>Operações</th><th>Data de Liquidação</th><th class="numero">Valor Líquido</th><th class="controles-col">Controles</th></tr></thead><tbody></tbody></table>`;
    
    const body = container.querySelector('tbody');
    body.innerHTML = '';

    const filtroAtivoInput = document.getElementById('filtro-nota-ativo');
    const filtroTexto = filtroAtivoInput ? filtroAtivoInput.value.toUpperCase().trim() : '';
    const notasParaRenderizar = todasAsNotas.filter(nota => {
        if (!filtroTexto) {
            return true; // Mostra todas as notas se o filtro estiver vazio
        }
        return nota.operacoes.some(op => op.ativo.toUpperCase().includes(filtroTexto));
    });
    if (notasParaRenderizar.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhuma nota encontrada${filtroTexto ? ' para o filtro "' + filtroTexto + '"' : ''}.</td></tr>`;
        return;
    }

    notasParaRenderizar.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(nota => {
        let tooltipText = `Corretora: ${nota.corretora}\n` +
                          `Nota: ${nota.numero}\n` +
                          `Custos: ${formatarMoeda(nota.custos || 0)}\n` +
                          `IRRF: ${formatarMoeda(nota.irrf || 0)}\n\n` +
                          `Operações:\n`;

        if (nota.operacoes && nota.operacoes.length > 0) {
            nota.operacoes.forEach(op => {
                const tipoOp = op.tipo.charAt(0).toUpperCase() + op.tipo.slice(1);
                tooltipText += ` - ${tipoOp}: ${op.quantidade} ${op.ativo} @ ${formatarMoeda(op.valor)}\n`;
            });
        } else {
            tooltipText += " - Nenhuma operação nesta nota.\n";
        }

        const tr = document.createElement('tr');
        tr.setAttribute('data-tooltip', tooltipText.trim());

        const dataFormatada = nota.data ? new Date(nota.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Data Inválida';

        const totalCompras = nota.operacoes.filter(op => op.tipo === 'compra').reduce((acc, op) => acc + op.valor, 0);
        const totalVendas = nota.operacoes.filter(op => op.tipo === 'venda').reduce((acc, op) => acc + op.valor, 0);
        const totalCustos = (nota.custos || 0) + (nota.irrf || 0);
        const valorLiquido = totalVendas - totalCompras - totalCustos;
        
        const dataLiquidacao = nota.data ? calcularDataLiquidacao(nota.data, 2).toLocaleDateString('pt-BR') : 'N/A';
        
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${nota.corretora}</td>
            <td>${nota.numero}</td>
            <td>${nota.operacoes.length}</td>
            <td>${dataLiquidacao}</td>
            <td class="numero">${formatarValorComCeD(valorLiquido)}</td>
            <td class="controles-col">
                <i class="fas fa-edit acao-btn edit" title="Editar Nota" data-note-id="${nota.id}"></i>
                <i class="fas fa-trash acao-btn delete" title="Excluir Nota" data-note-id="${nota.id}"></i>
            </td>
        `;
        body.appendChild(tr);
    });
}
function renderizarTabelaOperacoes() { const tabelaOperacoesBody = document.getElementById('tabela-operacoes-body'); tabelaOperacoesBody.innerHTML = ''; if (!notaAtual || !notaAtual.operacoes) return; const custosNota = parseDecimal(document.getElementById('nota-custos').value) || 0; const irrfNota = parseDecimal(document.getElementById('nota-irrf').value) || 0; const valorTotalOperacoes = notaAtual.operacoes.reduce((acc, op) => acc + op.valor, 0); notaAtual.operacoes.forEach(op => { const tr = document.createElement('tr'); const valorOp = op.valor; const precoUnitario = op.quantidade > 0 ? valorOp / op.quantidade : 0; const custoRateado = valorTotalOperacoes > 0 ? (valorOp / valorTotalOperacoes) * (custosNota + irrfNota) : 0; const custoUnitarioRateado = op.quantidade > 0 ? custoRateado / op.quantidade : 0; const precoComCustos = op.tipo === 'compra' ? precoUnitario + custoUnitarioRateado : precoUnitario - custoUnitarioRateado; tr.innerHTML = `<td>${op.ativo}</td><td>${op.tipo.charAt(0).toUpperCase() + op.tipo.slice(1)}</td><td class="numero">${op.quantidade}</td><td class="numero">${formatarMoeda(precoUnitario)}</td><td class="numero">${formatarMoeda(valorOp)}</td><td class="numero">${formatarPrecoMedio(precoComCustos)}</td><td class="controles-col"><i class="fas fa-edit acao-btn edit" title="Editar" data-op-id="${op.id}"></i><i class="fas fa-trash acao-btn delete" title="Excluir" data-op-id="${op.id}"></i></td>`; tabelaOperacoesBody.appendChild(tr); }); }
function atualizarTotais() { if (!notaAtual) return; notaAtual.custos = parseDecimal(document.getElementById('nota-custos').value) || 0; notaAtual.irrf = parseDecimal(document.getElementById('nota-irrf').value) || 0; const totalCompras = notaAtual.operacoes.filter(op => op.tipo === 'compra').reduce((acc, op) => acc + op.valor, 0); const totalVendas = notaAtual.operacoes.filter(op => op.tipo === 'venda').reduce((acc, op) => acc + op.valor, 0); const totalCustos = notaAtual.custos + notaAtual.irrf; const valorLiquido = totalVendas - totalCompras - totalCustos; document.getElementById('subtotal-compras').textContent = formatarMoeda(totalCompras); document.getElementById('subtotal-vendas').textContent = formatarMoeda(totalVendas); document.getElementById('subtotal-custos').textContent = formatarMoeda(totalCustos); document.getElementById('subtotal-liquido').textContent = formatarValorComCeD(valorLiquido); const dataNota = document.getElementById('nota-data').value; if(dataNota) { const dataLiquidacao = calcularDataLiquidacao(dataNota, 2); document.getElementById('subtotal-liquidacao').textContent = dataLiquidacao.toLocaleDateString('pt-BR'); } else { document.getElementById('subtotal-liquidacao').textContent = '--/--/----'; } }
function iniciarNovaNota() {
    notaAtual = { id: null, corretora: 'XP', data: '', numero: '', custos: null, irrf: null, operacoes: [] };
    const formNotaGeral = document.getElementById('form-nota-geral');
    formNotaGeral.reset();
    
    // Garante que os campos de custos e IRRF fiquem vazios para mostrar o placeholder
    document.getElementById('nota-custos').value = '';
    document.getElementById('nota-irrf').value = '';

    const selectCorretora = document.getElementById('nota-corretora');
    const corretorasAtivas = getCorretorasAtivasParaNotas();
    // --- ALTERAÇÃO AQUI: Adiciona a opção "Selecione..." ---
    selectCorretora.innerHTML = '<option value="">Selecione...</option>' + corretorasAtivas.map(c => `<option value="${c}">${c}</option>`).join('');
    selectCorretora.value = ""; // Garante que "Selecione..." seja a opção padrão
    // --- FIM DA ALTERAÇÃO ---
    selectCorretora.disabled = false; // Garante que o dropdown esteja habilitado.
    const tituloTela = document.querySelector('#tela-lancamento-nota h1');
    if (tituloTela) {
        tituloTela.textContent = 'Lançamento de Nota de Negociação';
    }
    inicializarIconesCalculadora();
    renderizarTabelaOperacoes();
    atualizarTotais();
    mostrarTela('lancamentoNota');
}
function adicionarOperacao(event) { event.preventDefault(); if (!notaAtual) return; const tickerInput = document.getElementById('op-ativo'); const ticker = tickerInput.value.toUpperCase(); if(!ticker) return; const ativoExiste = todosOsAtivos.some(a => a.ticker === ticker); if (!ativoExiste) { alert(`O ativo "${ticker}" não está cadastrado. Por favor, cadastre-o primeiro.`); abrirModalCadastroAtivo(null, ticker); return; } const op = { id: Date.now(), ativo: ticker, tipo: document.getElementById('op-tipo').value, quantidade: parseInt(document.getElementById('op-quantidade').value), valor: parseDecimal(document.getElementById('op-valor').value), }; if(isNaN(op.quantidade) || isNaN(op.valor) || op.quantidade <= 0) { alert('Quantidade e Valor devem ser números positivos.'); return; } notaAtual.operacoes.push(op); renderizarTabelaOperacoes(); atualizarTotais(); document.getElementById('form-add-operacao').reset(); tickerInput.focus(); }
function deletarOperacao(opId) { if(!notaAtual) return; notaAtual.operacoes = notaAtual.operacoes.filter(op => op.id !== opId); renderizarTabelaOperacoes(); atualizarTotais(); }
function iniciarEdicaoOperacao(opId) {
    const op = notaAtual.operacoes.find(o => o.id === opId);
    if (!op) return;
    modalEdicaoOperacao.style.display = 'block';
    document.getElementById('edit-op-id').value = op.id;
    document.getElementById('edit-op-ativo').value = op.ativo;
    document.getElementById('edit-op-tipo').value = op.tipo;
    document.getElementById('edit-op-quantidade').value = op.quantidade;
    document.getElementById('edit-op-valor').value = formatarDecimalParaInput(op.valor);
}
function salvarEdicaoOperacao(event) { event.preventDefault(); const opId = parseFloat(document.getElementById('edit-op-id').value); const opIndex = notaAtual.operacoes.findIndex(o => o.id === opId); if (opIndex === -1) return; notaAtual.operacoes[opIndex].tipo = document.getElementById('edit-op-tipo').value; notaAtual.operacoes[opIndex].quantidade = parseInt(document.getElementById('edit-op-quantidade').value); notaAtual.operacoes[opIndex].valor = parseDecimal(document.getElementById('edit-op-valor').value); modalEdicaoOperacao.style.display = 'none'; renderizarTabelaOperacoes(); atualizarTotais(); }

async function sincronizarNotaComTransacao(notaId) {
    const nota = todasAsNotas.find(n => n.id === notaId);
    if (!nota || !nota.data) return [];
    
    todasAsMovimentacoes = todasAsMovimentacoes.filter(t => t.source !== 'nota' || t.sourceId !== nota.id);

    const totalCompras = nota.operacoes.filter(op => op.tipo === 'compra').reduce((acc, op) => acc + op.valor, 0);
    const totalVendas = nota.operacoes.filter(op => op.tipo === 'venda').reduce((acc, op) => acc + op.valor, 0);
    const valorLiquido = arredondarMoeda(totalVendas - totalCompras - (nota.custos + nota.irrf));
    
    if (Math.abs(valorLiquido) < 0.01) {
        return [];
    }

    const dataLiquidacao = calcularDataLiquidacao(nota.data, 2);
    const contaInvestimento = todasAsContas.find(c => c.banco === nota.corretora && c.tipo === 'Conta Investimento');

    let alertas = [];
    if (contaInvestimento) {
        if (new Date(dataLiquidacao) >= new Date(contaInvestimento.dataSaldoInicial + 'T12:00:00')) {
            const dataFormatadaNota = new Date(nota.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            
            const movimentacao = {
                id: Date.now() + Math.random(), data: dataLiquidacao.toISOString().split('T')[0],
                tipoAlvo: 'conta', idAlvo: contaInvestimento.id, moeda: 'BRL',
                descricao: `Liq. Nota Neg. ${nota.corretora} nro. ${nota.numero} de ${dataFormatadaNota}`,
                valor: valorLiquido, source: 'nota', sourceId: nota.id,
                enviarParaFinancas: false, // Offline: false
                idLancamentoCasa: null
            };
            todasAsMovimentacoes.push(movimentacao);
        } else {
            alertas.push(`A liquidação da nota não foi lançada (data anterior ao saldo inicial da conta).`);
        }
    } else {
        alertas.push(`A nota foi salva, mas o lançamento na conta não foi realizado (conta não encontrada).`);
    }
    return alertas;
}

function processarArquivoCotacoes(conteudoCsv, silencioso = false) {
    if (!conteudoCsv) {
        if (!silencioso) mostrarFeedbackAtualizacao('Erro: Nenhum conteúdo recebido.', 'error');
        return;
    }
    
    const linhas = conteudoCsv.split(/\r?\n/).filter(l => l.trim() !== '');

    if (linhas.length < 2) {
        if (!silencioso) mostrarFeedbackAtualizacao('Erro: Arquivo vazio ou inválido.', 'error');
        return;
    }

    let novasCotacoesRV = {};
    const linhasDeDados = linhas.slice(1);
    let linhasProcessadas = 0;

    linhasDeDados.forEach(linha => {
        // --- INÍCIO DA ALTERAÇÃO ---
        // Agora espera 6 colunas e unifica o VPA
        const colunas = linha.split(/[,;]/).map(c => c.trim().replace(/"/g, ''));

        if (colunas.length < 6) return;
        
        const [ativo, valor, min52, max52, vpa, lpa_acao] = colunas;
        // --- FIM DA ALTERAÇÃO ---

        const ativoUpper = ativo.toUpperCase();
        const valorNum = parseDecimal(valor || '0');

        if (!ativoUpper || isNaN(valorNum)) return;
        if (ativoUpper === 'USDBRL') {
            dadosMoedas.cotacoes['USD'] = valorNum;
        } else if (ativoUpper === 'EURBRL') {
            dadosMoedas.cotacoes['EUR'] = valorNum;
        } else if (ativoUpper === 'GBPBRL') {
            dadosMoedas.cotacoes['GBP'] = valorNum;
        } else if (ativoUpper === 'IFIX') {
            dadosDeMercado.ifix = valorNum;
        } else if (ativoUpper === 'IBOV') {
            dadosDeMercado.ibov = valorNum;
        } else {
            // --- INÍCIO DA ALTERAÇÃO ---
            // Salva no novo campo unificado '.vpa'
            novasCotacoesRV[ativoUpper] = {
                valor: valorNum,
                min52: parseDecimal(min52 || '0'),
                max52: parseDecimal(max52 || '0'),
                vpa: parseDecimal(vpa || '0'),
                lpa_acao: parseDecimal(lpa_acao || '0')
            };
            // --- FIM DA ALTERAÇÃO ---
        }
        linhasProcessadas++;
    });

    dadosDeMercado.cotacoes = novasCotacoesRV;
    dadosDeMercado.timestamp = new Date().toISOString();
    
    salvarDadosDeMercado();
    salvarDadosMoedas();
    salvarSnapshotCarteira(true); // Salva o snapshot silenciosamente

    if (!silencioso) {
        mostrarFeedbackAtualizacao('Cotações atualizadas!', 'success');
    }
    renderizarInfoAtualizacaoMercado(); // Mantém o timestamp atualizado

    const telaVisivel = document.querySelector('.main-content > div[style*="display: block"]');
    if (telaVisivel) {
        if (telaVisivel.id === 'tela-renda-variavel') renderizarTelaRendaVariavel();
        if (telaVisivel.id === 'tela-caixa-global') renderizarTelaCaixaGlobal(true);
        if (telaVisivel.id === 'tela-dashboard') renderizarDashboard();
        if (telaVisivel.id === 'tela-performanceRV') renderizarTelaPerformanceRV();
        if (telaVisivel.id === 'tela-negociar') renderizarTelaNegociar();
        if (telaVisivel.id === 'tela-consulta-balanceamento') renderizarTelaConsultaBalanceamento();
    }
}

function processarArquivoNotas(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const todasAsLinhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (todasAsLinhas.length < 2) {
            alert('Arquivo CSV vazio ou com apenas o cabeçalho.');
            return;
        }
        
        const linhasDeDados = todasAsLinhas.slice(1);
        const notasAgrupadas = new Map();

        linhasDeDados.forEach((linha, index) => {
            const cols = linha.split(/[,;]/).map(c => c.trim().replace(/"/g, ''));
            if (cols.length < 9) return; 

            const [ativo, data, operacao, corretora, quantidade, valor, numNota, custos, irrf] = cols;
            
            const chave = `${normalizarDataParaInput(data)}|${corretora}|${numNota}|${custos}|${irrf}`;

            if (!notasAgrupadas.has(chave)) {
                notasAgrupadas.set(chave, {
                    id: `import_${Date.now()}_${index}`,
                    corretora: corretora,
                    numero: numNota,
                    data: normalizarDataParaInput(data),
                    custos: parseDecimal(custos),
                    irrf: parseDecimal(irrf),
                    operacoes: []
                });
            }

            const op = {
                id: `import_op_${Date.now()}_${index}`,
                ativo: ativo.toUpperCase(),
                tipo: operacao.toLowerCase() === 'venda' ? 'venda' : 'compra',
                quantidade: parseInt(quantidade),
                valor: parseDecimal(valor)
            };
            notasAgrupadas.get(chave).operacoes.push(op);
        });

        if (notasAgrupadas.size > 0) {
            renderizarTelaImportacaoNotas(Array.from(notasAgrupadas.values()));
        } else {
            alert('Nenhuma nota válida encontrada no arquivo. Verifique o formato das colunas.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
function renderizarTelaEventosAtivos() {
    const container = document.getElementById('lista-de-eventos-ativos');
    const eventos = todosOsAjustes.filter(a => a.tipoAjuste === 'evento_ativo');

    if (eventos.length === 0) {
        container.innerHTML = '<p>Nenhum evento de entrada ou saída registrado.</p>';
        return;
    }

    let tableHtml = `<table><thead><tr>
        <th>Data</th>
        <th>Ativo</th>
        <th>Evento</th>
        <th>Detalhes</th>
        <th class="controles-col">Controles</th>
    </tr></thead><tbody>`;

    eventos.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(evento => {
        const dataFormatada = new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const tipoEventoLabel = evento.tipoEvento === 'entrada' ? 'Entrada de Ativo' : 'Saída de Ativo';
        const detalhes = evento.detalhes.map(d => `${d.corretora}: ${d.quantidade} un.`).join('<br>');

        tableHtml += `
            <tr>
                <td>${dataFormatada}</td>
                <td>${evento.ticker}</td>
                <td>${tipoEventoLabel}</td>
                <td>${detalhes}</td>
                <td class="controles-col">
                    <i class="fas fa-edit acao-btn edit" title="Editar Evento" data-evento-ativo-id="${evento.id}"></i>
                    <i class="fas fa-trash acao-btn delete" title="Excluir Evento" data-evento-ativo-id="${evento.id}"></i>
                </td>
            </tr>
        `;
    });
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}
function deletarEventoAtivo(ajusteId) {
    if (confirm('Tem certeza que deseja excluir este evento? Esta ação recalculará a posição do ativo.')) {
        todosOsAjustes = todosOsAjustes.filter(a => a.id !== ajusteId);
        salvarAjustes();
        renderizarTelaEventosAtivos();
    }
}
function renderizarTelaImportacaoNotas(notas) {
    mostrarTela('importacaoNotas');
    const container = document.getElementById('container-revisao-notas');
    container.innerHTML = '';

    const corretorasOptions = getTodasCorretoras().map(c => `<option value="${c}">${c}</option>`).join('');

    notas.forEach(nota => {
        const notaDiv = document.createElement('div');
        notaDiv.className = 'import-review-container';
        notaDiv.dataset.notaId = nota.id;

        let operacoesHtml = '';
        nota.operacoes.forEach(op => {
            operacoesHtml += `
                <tr data-op-id="${op.id}">
                    <td><input type="text" class="op-ativo ticker-input" value="${op.ativo}"></td>
                    <td>
                        <select class="op-tipo">
                            <option value="compra" ${op.tipo === 'compra' ? 'selected' : ''}>Compra</option>
                            <option value="venda" ${op.tipo === 'venda' ? 'selected' : ''}>Venda</option>
                        </select>
                    </td>
                    <td class="numero"><input type="number" class="op-quantidade" value="${op.quantidade}"></td>
                    <td class="numero"><input type="text" class="op-valor" value="${formatarDecimalParaInput(op.valor)}"></td>
                    <td class="controles-col"><i class="fas fa-trash acao-btn delete" title="Excluir" onclick="this.closest('tr').remove()"></i></td>
                </tr>
            `;
        });

        notaDiv.innerHTML = `
            <h3>Nota Nº ${nota.numero}</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Corretora</label>
                    <select class="nota-corretora">
                        ${corretorasOptions}
                    </select>
                </div>
                <div class="form-group"><label>Número da Nota</label><input type="text" class="nota-numero" value="${nota.numero}"></div>
                <div class="form-group"><label>Data da Nota</label><input type="date" class="nota-data" value="${nota.data}"></div>
                <div class="form-group"><label>Custos</label><input type="text" class="nota-custos" value="${formatarDecimalParaInput(nota.custos)}"></div>
                <div class="form-group"><label>IRRF</label><input type="text" class="nota-irrf" value="${formatarDecimalParaInput(nota.irrf)}"></div>
            </div>
            <h4 style="margin-top:20px;">Operações da Nota</h4>
            <table>
                <thead>
                    <tr>
                        <th>Ativo</th><th>Operação</th><th class="numero">Qtd</th>
                        <th class="numero">Valor Total (R$)</th><th class="controles-col">Ações</th>
                    </tr>
                </thead>
                <tbody>${operacoesHtml}</tbody>
            </table>
        `;
        container.appendChild(notaDiv);
        if (nota.corretora) {
            notaDiv.querySelector('.nota-corretora').value = nota.corretora;
        }
    });
}

function salvarNotasImportadas() {
    const containers = document.querySelectorAll('#container-revisao-notas .import-review-container');
    let notasSalvas = 0;
    
    containers.forEach(container => {
        const novaNota = {
            id: Date.now() + Math.random(),
            corretora: container.querySelector('.nota-corretora').value,
            numero: container.querySelector('.nota-numero').value,
            data: container.querySelector('.nota-data').value,
            custos: parseDecimal(container.querySelector('.nota-custos').value),
            irrf: parseDecimal(container.querySelector('.nota-irrf').value),
            operacoes: []
        };
        
        const operacoesRows = container.querySelectorAll('tbody tr');
        operacoesRows.forEach(row => {
            novaNota.operacoes.push({
                id: Date.now() + Math.random(),
                ativo: row.querySelector('.op-ativo').value.toUpperCase(),
                tipo: row.querySelector('.op-tipo').value,
                quantidade: parseInt(row.querySelector('.op-quantidade').value),
                valor: parseDecimal(row.querySelector('.op-valor').value)
            });
        });

        if (novaNota.operacoes.length > 0) {
            todasAsNotas.push(novaNota);
            sincronizarNotaComTransacao(novaNota.id);
            notasSalvas++;
        }
    });

    if (notasSalvas > 0) {
        salvarNotas();
        salvarMovimentacoes();
        
        // DISPARA A SINCRONIZAÇÃO SILENCIOSA
        sincronizarTodosOsRegistros(null, true);

        alert(`${notasSalvas} nota(s) importada(s) com sucesso!`);
        mostrarTela('listaNotas');
        renderizarListaNotas();
    } else {
        alert('Nenhuma nota para salvar.');
    }
}
// ********** FIM DA PARTE 3







// ********** PARTE 4 - Proventos e Transações em Contas
function popularDropdownsUniversais(selectDebitoId, selectCreditoId) {
    const selectDebito = document.getElementById(selectDebitoId);
    const selectCredito = document.getElementById(selectCreditoId);

    let optionsHtml = '<option value="">Nenhuma</option>';
    
    optionsHtml += '<optgroup label="Contas (BRL)">';
    getTodasContasAtivas()
        .sort((a,b) => a.banco.localeCompare(b.banco))
        .forEach(c => {
            optionsHtml += `<option value="brl_${c.id}">${c.banco} - ${c.tipo}</option>`;
        });
    optionsHtml += '</optgroup>';

    const ativosPorMoeda = todosOsAtivosMoedas.reduce((acc, a) => {
        if (!acc[a.moeda]) acc[a.moeda] = [];
        acc[a.moeda].push(a);
        return acc;
    }, {});

    Object.keys(ativosPorMoeda).sort().forEach(moeda => {
        optionsHtml += `<optgroup label="Ativos (${moeda})">`;
        ativosPorMoeda[moeda].forEach(a => {
            optionsHtml += `<option value="moeda_${a.id}">${a.nomeAtivo}</option>`;
        });
        optionsHtml += '</optgroup>';
    });

    selectDebito.innerHTML = optionsHtml;
    selectCredito.innerHTML = optionsHtml;
}

function popularDropdownAtivoRecorrente() {
    const selectAtivo = document.getElementById('transacao-moeda-ativo-recorrente');
    let optionsHtml = '<option value="">Selecione o alvo...</option>';
    
    optionsHtml += '<optgroup label="Contas (BRL)">';
    getTodasContasAtivas()
        .sort((a,b) => a.banco.localeCompare(b.banco))
        .forEach(c => {
            optionsHtml += `<option value="brl_${c.id}">${c.banco} - ${c.tipo}</option>`;
        });
    optionsHtml += '</optgroup>';

    const ativosPorMoeda = todosOsAtivosMoedas.reduce((acc, a) => {
        if (!acc[a.moeda]) acc[a.moeda] = [];
        acc[a.moeda].push(a);
        return acc;
    }, {});

    Object.keys(ativosPorMoeda).sort().forEach(moeda => {
        optionsHtml += `<optgroup label="Ativos (${moeda})">`;
        ativosPorMoeda[moeda].forEach(a => {
            optionsHtml += `<option value="moeda_${a.id}">${a.nomeAtivo}</option>`;
        });
        optionsHtml += '</optgroup>';
    });

    selectAtivo.innerHTML = optionsHtml;
}

/**
 * FUNÇÃO MESTRA: Unifica todas as fontes de movimentação de caixa (contas e moedas).
 * @returns {Array} Uma lista padronizada de todos os eventos de caixa.
 */
/**
 * FUNÇÃO MESTRA: Unifica todas as fontes de movimentação de caixa (contas e moedas).
 * @returns {Array} Uma lista padronizada de todos os eventos de caixa.
 */
function obterTodosOsEventosDeCaixa() {
    const eventos = [];

    // 1. Processa todas as movimentações já unificadas
    todasAsMovimentacoes.forEach(mov => {
        // --- CORREÇÃO AQUI ---
        // Alterado para NÃO filtrar mais 'provento' e 'provento_editado'
        if (mov.source !== 'nota') { 
            eventos.push({
                id: mov.id,
                data: mov.data,
                valor: mov.valor,
                descricao: mov.descricao,
                tipo: mov.tipoAlvo,
                idAlvo: String(mov.idAlvo),
                moeda: mov.moeda,
                source: mov.source,
                sourceId: mov.sourceId, // Mantém para rastreabilidade
                transferenciaId: mov.transferenciaId,
                enviarParaFinancas: mov.enviarParaFinancas // <-- Propriedade mantida
            });
        }
        // --- FIM DA CORREÇÃO ---
    });

    // 2. Lançamentos de Notas de Negociação (Gerados a partir da fonte original)
    todasAsNotas.forEach(n => {
        if (!n.data) return;
        const contaInvestimento = todasAsContas.find(c => c.banco === n.corretora && c.tipo === 'Conta Investimento');
        if (contaInvestimento) {
            const totalCompras = n.operacoes.filter(op => op.tipo === 'compra').reduce((acc, op) => acc + op.valor, 0);
            const totalVendas = n.operacoes.filter(op => op.tipo === 'venda').reduce((acc, op) => acc + op.valor, 0);
            const valorLiquido = arredondarMoeda(totalVendas - totalCompras - (n.custos || 0) - (n.irrf || 0));
            
            if (valorLiquido !== 0) {
                const dataLiquidacao = calcularDataLiquidacao(n.data, 2).toISOString().split('T')[0];
                const dataFormatadaNota = new Date(n.data + 'T12:00:00').toLocaleDateString('pt-BR');
                eventos.push({
                    id: `nota_${n.id}`,
                    data: dataLiquidacao,
                    valor: valorLiquido,
                    descricao: `Liq. Nota Neg. ${n.corretora} nro. ${n.numero} de ${dataFormatadaNota}`,
                    tipo: 'conta',
                    idAlvo: String(contaInvestimento.id),
                    moeda: 'BRL',
                    source: 'nota'
                });
            }
        }
    });

    // --- CORREÇÃO: O LOOP DE PROVENTOS ABAIXO FOI REMOVIDO ---
    // (O loop que começava com "todosOsProventos.forEach(p => { ... })" foi excluído)

    // 4. Lançamentos Recorrentes (gerados pela função filho)
    gerarTransacoesFilhas().forEach(filha => {
        let eventoRecorrente = {
            id: filha.id,
            data: filha.data,
            valor: filha.valor,
            descricao: filha.descricao,
            tipo: filha.targetType,
            idAlvo: String(filha.targetId),
            source: 'recorrente_futura',
            maeId: filha.sourceId
        };
        if (filha.targetType === 'moeda') {
            const ativoMoeda = todosOsAtivosMoedas.find(a => String(a.id) === String(filha.targetId));
            eventoRecorrente.moeda = ativoMoeda ? ativoMoeda.moeda : '';
        } else {
            eventoRecorrente.moeda = 'BRL';
        }
        eventos.push(eventoRecorrente);
    });

    return eventos;
}
function gerarTransacoesFilhas() {
    const transacoesGeradas = [];

    todasAsTransacoesRecorrentes.forEach(mae => {
        if (!mae.dataInicio || !mae.recorrencia || !mae.termino) return;

        let ocorrenciasGeradas = 0;
        let dataCandidata = new Date(mae.dataInicio + 'T12:00:00');

        if (mae.recorrencia.frequencia === 'mensal') {
            const diaDaRegra = mae.recorrencia.dia;
            dataCandidata.setDate(1); // Reseta para o primeiro dia do mês para evitar bugs de virada de mês
            dataCandidata.setDate(diaDaRegra);
            
            // Ajuste para o último dia do mês, se necessário
            if (dataCandidata.getMonth() !== new Date(mae.dataInicio + 'T12:00:00').getMonth()) {
                 dataCandidata = new Date(dataCandidata.getFullYear(), dataCandidata.getMonth(), 0, 12, 0, 0);
            }
        }
        
        while (true) {
            if (ocorrenciasGeradas >= 240) { // Limite de segurança
                console.warn(`Regra de recorrência para "${mae.descricao}" excedeu o limite de 240 ocorrências e foi interrompida.`);
                break;
            }
            if (mae.termino.tipo === 'data' && dataCandidata > new Date(mae.termino.valor + 'T12:00:00')) {
                break;
            }
            if (mae.termino.tipo === 'ocorrencias' && (ocorrenciasGeradas + (mae.datasProcessadas?.length || 0)) >= mae.termino.valor) {
                break;
            }

            const dataCandidataStr = dataCandidata.toISOString().split('T')[0];

            // Apenas gera a "filha" se ela ainda não foi confirmada/pulada
            if (!mae.datasProcessadas || !mae.datasProcessadas.includes(dataCandidataStr)) {
                const filha = {
                    id: `${mae.id}_${dataCandidataStr}`,
                    data: dataCandidataStr,
                    descricao: `(Recorrente) ${mae.descricao}`,
                    valor: mae.valor,
                    source: 'recorrente_futura',
                    sourceId: mae.id,
                    targetType: mae.targetType,
                    targetId: mae.targetId,
                    contaId: mae.targetType === 'conta' ? mae.targetId : undefined,
                    ativoMoedaId: mae.targetType === 'moeda' ? mae.targetId : undefined
                };
                transacoesGeradas.push(filha);
            }
            
            ocorrenciasGeradas++;
            
            switch (mae.recorrencia.frequencia) {
                case 'mensal':
                    const diaParaSetar = mae.recorrencia.dia;
                    dataCandidata.setMonth(dataCandidata.getMonth() + 1);
                    dataCandidata.setDate(diaParaSetar);
                     if (dataCandidata.getDate() !== diaParaSetar) {
                       dataCandidata = new Date(dataCandidata.getFullYear(), dataCandidata.getMonth() + 1, 0, 12, 0, 0);
                    }
                    break;
                case 'quinzenal':
                    dataCandidata.setDate(dataCandidata.getDate() + 14);
                    break;
                case 'semanal':
                    dataCandidata.setDate(dataCandidata.getDate() + 7);
                    break;
            }
        }
    });
    return transacoesGeradas;
}

function gerarHtmlExtratoParaConta(conta, dataInicio, dataFim) {
    const todosOsEventos = obterTodosOsEventosDeCaixa();
    const hojeStr = new Date().toISOString().split('T')[0];
    const dataInicioObj = new Date(dataInicio + 'T00:00:00');

    const eventosPassados = todosOsEventos.filter(e => e.tipo === 'conta' && String(e.idAlvo) === String(conta.id) && e.source !== 'recorrente_futura' && new Date(e.data + 'T12:00:00') < dataInicioObj && new Date(e.data + 'T12:00:00') >= new Date(conta.dataSaldoInicial + 'T12:00:00'));
    const saldoInicialDaLinha = eventosPassados.reduce((acc, t) => acc + arredondarMoeda(t.valor), conta.saldoInicial);
    
    const transacoesParaExibicao = todosOsEventos.filter(e => e.tipo === 'conta' && String(e.idAlvo) === String(conta.id) && e.data >= dataInicio && e.data <= dataFim && e.data >= conta.dataSaldoInicial).sort((a, b) => new Date(a.data + 'T12:00:00') - new Date(b.data + 'T12:00:00'));

    let saldoCorrente = arredondarMoeda(saldoInicialDaLinha);
    let corpoTabela = `<tr><td>${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</td><td>Saldo em ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</td><td class="numero"></td><td class="numero ${saldoCorrente < 0 ? 'valor-negativo' : ''}">${formatarMoeda(saldoCorrente)}</td><td class="controles-col"></td></tr>`;

    transacoesParaExibicao.forEach(evento => {
        saldoCorrente = arredondarMoeda(saldoCorrente + evento.valor);
        
        // LIMPEZA: Removida lógica de ícones de sincronização
        let controles = '', linhaClasse = evento.data === hojeStr ? 'data-hoje-bg' : '';

        if (evento.source === 'recorrente_futura') {
            linhaClasse += ' transacao-futura';
            controles = `
                <i class="fas fa-check-circle acao-btn-recorrente" title="Confirmar esta ocorrência" data-mae-id="${evento.maeId}" data-ocorrencia-data="${evento.data}" data-action="CONFIRMAR_OCORRENCIA"></i>
                <i class="fas fa-pencil-alt acao-btn-recorrente" title="Ações para esta ocorrência/série" data-mae-id="${evento.maeId}" data-ocorrencia-data="${evento.data}" data-action="ABRIR_MODAL_ACOES_RECORRENTE"></i>
                <i class="fas fa-times-circle acao-btn-recorrente" title="Pular esta ocorrência" data-mae-id="${evento.maeId}" data-ocorrencia-data="${evento.data}" data-action="PULAR_OCORRENCIA"></i>
            `;
        } else {
            // LIMPEZA: Botão toggle-sync removido
            
            if (evento.source === 'manual' || evento.source === 'recorrente_confirmada' || evento.transferenciaId) {
                controles += `<i class="fas fa-edit acao-btn edit" title="Editar Transação" data-id="${evento.id}" data-type="conta"></i>`;
                controles += `<i class="fas fa-trash acao-btn delete" title="Excluir Transação" data-id="${evento.id}" data-type="conta"></i>`;
            
            } else if (evento.source === 'provento' || evento.source === 'provento_editado') {
                controles += `<i class="fas fa-edit acao-btn edit" title="Editar Valor do Provento" data-transacao-provento-id="${evento.id}"></i>`;
            
            } else if (evento.source === 'aporte_rf' || evento.source === 'resgate_rf') {
                controles += `<i class="fas fa-edit acao-btn edit" title="Editar Movimentação de RF" data-mov-rf-id="${evento.id}"></i>`;
                controles += `<i class="fas fa-trash acao-btn delete" title="Excluir Movimentação de RF" data-mov-rf-id="${evento.id}"></i>`;
            
            } else if (evento.source === 'nota') {
                controles += `<i class="fas fa-lock" title="Transação da Nota de Negociação. Edite a nota para alterar."></i>`;
            }
        }

        corpoTabela += `<tr class="${linhaClasse.trim()}">
            <td>${new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td>${evento.descricao}</td> 
            <td class="numero ${evento.valor < 0 ? 'valor-negativo' : 'valor-positivo'}">${formatarMoeda(evento.valor)}</td>
            <td class="numero coluna-saldo ${saldoCorrente < 0 ? 'valor-negativo' : ''}">${formatarMoeda(saldoCorrente)}</td>
            <td class="controles-col">${controles}</td>
        </tr>`;
    });

    const saldoRealHoje = calcularSaldoEmData(conta, hojeStr);
    const temMovimentoHoje = todosOsEventos.some(t => t.tipo === 'conta' && String(t.idAlvo) === String(conta.id) && t.source !== 'recorrente_futura' && t.data === hojeStr);

    return { html: corpoTabela, saldoFinal: saldoRealHoje, temMovimentoHoje };
}

async function executarAcaoRecorrente(idMae, dataOcorrencia, acao) {
    const maeIndex = todasAsTransacoesRecorrentes.findIndex(m => String(m.id) === String(idMae));
    if (maeIndex === -1) {
        alert('Erro [executar acao]: Regra de recorrência não encontrada.');
        return;
    }
    const mae = todasAsTransacoesRecorrentes[maeIndex];
    
    const gerarIdUnico = () => Date.now() + Math.random();

    if (!mae.datasProcessadas) {
        mae.datasProcessadas = [];
    }

    switch (acao) {
        case 'CONFIRMAR_OCORRENCIA': {
            const moedaAlvo = mae.targetType === 'moeda' ? todosOsAtivosMoedas.find(a => String(a.id) === String(mae.targetId))?.moeda : 'BRL';
            const valorFormatado = (moedaAlvo === 'BRL') ? formatarMoeda(mae.valor) : formatarMoedaEstrangeira(mae.valor, moedaAlvo);
            
            if (!confirm(`Confirmar a transação "${mae.descricao}" no valor de ${valorFormatado}?`)) return;
            
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.style.display = 'flex';

            try {
                // Versão Offline: Apenas cria o lançamento local
                const novaMovimentacao = {
                    id: gerarIdUnico(),
                    data: dataOcorrencia,
                    descricao: mae.descricao,
                    valor: mae.valor,
                    tipoAlvo: mae.targetType,
                    idAlvo: mae.targetId,
                    moeda: moedaAlvo,
                    source: 'recorrente_confirmada',
                    sourceId: mae.id,
                    transferenciaId: null,
                    enviarParaFinancas: false, // Desativado no modo offline
                    idLancamentoCasa: null
                };
                todasAsMovimentacoes.push(novaMovimentacao);

                const maeAtualizada = { ...mae, datasProcessadas: [...mae.datasProcessadas, dataOcorrencia] };
                todasAsTransacoesRecorrentes[maeIndex] = maeAtualizada;

                await Promise.all([salvarMovimentacoes(), salvarTransacoesRecorrentes()]);
                
                alert('Transação confirmada com sucesso!');

            } catch (error) {
                console.error("Erro ao confirmar recorrência:", error);
                alert("Ocorreu um erro ao processar a transação. Verifique o console para mais detalhes.");
            } finally {
                loadingOverlay.style.display = 'none';
                if (telas.caixaGlobal.style.display === 'block') {
                    renderizarTelaCaixaGlobal(true);
                }
                if (modalProjecaoFutura.style.display === 'block') {
                    renderizarModalProjecaoFutura();
                }
            }
            break;
        }
        case 'EDITAR_OCORRENCIA': {
            const transacaoTemporaria = {
                descricao: mae.descricao,
                data: dataOcorrencia,
                valor: mae.valor,
                targetType: mae.targetType,
                targetId: mae.targetId,
                sourceMaeId: mae.id,
                sourceOcorrenciaData: dataOcorrencia
            };
            abrirModalNovaTransacaoMoeda(transacaoTemporaria);
            break;
        }
        case 'EDITAR_SERIE':
            abrirModalNovaTransacaoMoeda(mae);
            break;
        case 'EXCLUIR_SERIE':
            if (confirm(`Você tem certeza que deseja excluir PERMANENTEMENTE a regra de recorrência "${mae.descricao}"?`)) {
                todasAsTransacoesRecorrentes.splice(maeIndex, 1);
                await salvarTransacoesRecorrentes();
                alert('Regra de recorrência excluída com sucesso.');
                if (telas.caixaGlobal.style.display === 'block') {
                    renderizarTelaCaixaGlobal(true);
                }
                if (modalProjecaoFutura.style.display === 'block') {
                    renderizarModalProjecaoFutura();
                }
            }
            break;
        case 'PULAR_OCORRENCIA':
             if (confirm('Tem certeza que deseja pular esta ocorrência? Ela não será mais exibida.')) {
                mae.datasProcessadas.push(dataOcorrencia);
                await salvarTransacoesRecorrentes();
                alert('Ocorrência pulada com sucesso.');
                if(telas.caixaGlobal.style.display === 'block') {
                    renderizarTelaCaixaGlobal(true);
                }
                if (modalProjecaoFutura.style.display === 'block') {
                    renderizarModalProjecaoFutura();
                }
            }
            break;
    }
}

async function salvarMovimentacaoUniversal(event) {
    event.preventDefault(); 

    const saveButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    saveButton.disabled = true;

    try {
        const id = document.getElementById('transacao-moeda-id').value;
        const transferenciaId = document.getElementById('transacao-moeda-transferencia-id').value;
        const sourceMaeId = document.getElementById('transacao-moeda-source-mae-id').value;
        const sourceOcorrenciaData = document.getElementById('transacao-moeda-source-ocorrencia-data').value;
        
        const data = document.getElementById('transacao-moeda-data').value;
        const descricao = document.getElementById('transacao-moeda-descricao').value;
        const valorDebito = parseDecimal(document.getElementById('transacao-moeda-valor-debito').value);
        
        // LIMPEZA: Não lemos mais o checkbox de "enviar para finanças"

        const tipoLancamento = document.querySelector('input[name="tipo-transacao-moeda"]:checked').value;

        if (tipoLancamento === 'recorrente') {
            // --- LÓGICA PARA SALVAR UMA REGRA DE RECORRÊNCIA ---
            const tipoMovimento = document.getElementById('transacao-moeda-tipo-recorrente').value;
            const valorFinal = tipoMovimento === 'saida' ? -valorDebito : valorDebito;
            const idAlvoCompleto = document.getElementById('transacao-moeda-ativo-recorrente').value;
            
            if (!idAlvoCompleto) {
                alert('Você deve selecionar um Ativo (Conta ou Moeda) para a recorrência.');
                return;
            }
            
            const [tipoAlvoPrefix, idAlvo] = idAlvoCompleto.split('_');
            const targetType = tipoAlvoPrefix === 'brl' ? 'conta' : 'moeda';

            const frequencia = document.getElementById('recorrencia-moeda-frequencia').value;
            const dia = (frequencia === 'mensal') ? parseInt(document.getElementById('recorrencia-moeda-dia-mes').value) : parseInt(document.getElementById('recorrencia-moeda-dia-semana').value);
            
            const tipoTermino = document.querySelector('input[name="tipo-termino-moeda"]:checked').value;
            const valorTermino = (tipoTermino === 'ocorrencias') ? parseInt(document.getElementById('termino-moeda-ocorrencias-valor').value) : document.getElementById('termino-moeda-data-valor').value;

            const regra = {
                id: id ? parseFloat(id) : Date.now(),
                descricao: descricao,
                valor: valorFinal,
                dataInicio: data,
                targetType: targetType,
                targetId: idAlvo,
                recorrencia: { frequencia: frequencia, dia: dia },
                termino: { tipo: tipoTermino, valor: valorTermino },
                datasProcessadas: id ? todasAsTransacoesRecorrentes.find(m => m.id === parseFloat(id))?.datasProcessadas || [] : []
            };

            const index = todasAsTransacoesRecorrentes.findIndex(m => m.id === regra.id);
            if (index > -1) {
                todasAsTransacoesRecorrentes[index] = regra;
            } else {
                todasAsTransacoesRecorrentes.push(regra);
            }
            await salvarTransacoesRecorrentes();

        } else {
            // --- LÓGICA PARA SALVAR LANÇAMENTO ÚNICO OU TRANSFERÊNCIA ---
            const debitoSelectValue = document.getElementById('transacao-moeda-conta-debito').value;
            const creditoSelectValue = document.getElementById('transacao-moeda-conta-credito').value;
            
            if (!debitoSelectValue && !creditoSelectValue) {
                alert('Você deve selecionar uma conta de débito ou crédito.');
                return;
            }

            const isTransferencia = debitoSelectValue && creditoSelectValue;

            if (isTransferencia) {
                // --- Salvar Transferência ---
                const [tipoDebitoPrefix, idDebito] = debitoSelectValue.split('_');
                const [tipoCreditoPrefix, idCredito] = creditoSelectValue.split('_');
                const tipoAlvoDebito = tipoDebitoPrefix === 'brl' ? 'conta' : 'moeda';
                const tipoAlvoCredito = tipoCreditoPrefix === 'brl' ? 'conta' : 'moeda';
                const itemDebito = (tipoAlvoDebito === 'conta' ? todasAsContas : todosOsAtivosMoedas).find(c => String(c.id) === idDebito);
                const itemCredito = (tipoAlvoCredito === 'conta' ? todasAsContas : todosOsAtivosMoedas).find(c => String(c.id) === idCredito);
                const valorCredito = parseDecimal(document.getElementById('transacao-moeda-valor-credito').value) || valorDebito;
                
                const descFinal = descricao || `Transf. entre ${itemDebito.nomeAtivo || itemDebito.banco} e ${itemCredito.nomeAtivo || itemCredito.banco}`;
                
                const idTransferenciaBase = id ? parseFloat(id) : Date.now(); // Usa o ID do débito como base
                const idCreditoDaBase = transferenciaId ? parseFloat(transferenciaId) : idTransferenciaBase + 1;

                // Remove movimentações antigas (ambos os lados) se estiver editando
                if (id) {
                    const idDebitoAntigo = parseFloat(id);
                    const idCreditoAntigo = parseFloat(transferenciaId);
                    todasAsMovimentacoes = todasAsMovimentacoes.filter(m => m.id !== idDebitoAntigo && m.id !== idCreditoAntigo);
                }

                const movDebito = {
                    id: idTransferenciaBase, data: data, tipoAlvo: tipoAlvoDebito, idAlvo: idDebito,
                    moeda: itemDebito.moeda || 'BRL', 
                    descricao: descFinal,
                    valor: -valorDebito, source: 'manual', transferenciaId: idCreditoDaBase,
                    enviarParaFinancas: false, idLancamentoCasa: null
                };
                const movCredito = {
                    id: idCreditoDaBase, data: data, tipoAlvo: tipoAlvoCredito, idAlvo: idCredito,
                    moeda: itemCredito.moeda || 'BRL', 
                    descricao: descFinal,
                    valor: valorCredito, source: 'manual', transferenciaId: idTransferenciaBase,
                    enviarParaFinancas: false, idLancamentoCasa: null
                };
                todasAsMovimentacoes.push(movDebito, movCredito);

            } else {
                // --- Salvar Lançamento Único ---
                const valorFinal = debitoSelectValue ? -valorDebito : valorDebito;
                const idAlvoCompleto = debitoSelectValue || creditoSelectValue;
                const [tipoAlvoPrefix, idAlvo] = idAlvoCompleto.split('_');
                const tipoAlvo = tipoAlvoPrefix === 'brl' ? 'conta' : 'moeda';
                const itemAlvo = (tipoAlvo === 'conta' ? todasAsContas : todosOsAtivosMoedas).find(a => String(a.id) === idAlvo);
                const moeda = itemAlvo ? (itemAlvo.moeda || 'BRL') : 'BRL';

                let source = 'manual';
                let sourceId = null;
                if(sourceMaeId && sourceOcorrenciaData) {
                    source = 'recorrente_confirmada';
                    sourceId = parseFloat(sourceMaeId); 
                    const maeIndex = todasAsTransacoesRecorrentes.findIndex(m => String(m.id) === sourceMaeId);
                    if (maeIndex > -1) {
                        if (!todasAsTransacoesRecorrentes[maeIndex].datasProcessadas) {
                            todasAsTransacoesRecorrentes[maeIndex].datasProcessadas = [];
                        }
                        if (!todasAsTransacoesRecorrentes[maeIndex].datasProcessadas.includes(sourceOcorrenciaData)) {
                             todasAsTransacoesRecorrentes[maeIndex].datasProcessadas.push(sourceOcorrenciaData);
                             await salvarTransacoesRecorrentes();
                        }
                    }
                }

                const movimentacao = {
                    id: id ? parseFloat(id) : Date.now(), data: data, tipoAlvo: tipoAlvo,
                    idAlvo: idAlvo, moeda: moeda, descricao: descricao, valor: valorFinal,
                    source: source, sourceId: sourceId,
                    enviarParaFinancas: false, // LIMPEZA: Sempre falso no modo offline
                    idLancamentoCasa: null
                };

                // LIMPEZA: Removida a chamada de sincronização externa

                if (id) {
                    const index = todasAsMovimentacoes.findIndex(m => m.id === movimentacao.id);
                    if (index > -1) todasAsMovimentacoes[index] = movimentacao;
                } else {
                    todasAsMovimentacoes.push(movimentacao);
                }
            }
        }
        
        await salvarMovimentacoes();
        fecharModal('modal-nova-transacao-moeda');
        
        if (telas.caixaGlobal.style.display === 'block') {
            renderizarTelaCaixaGlobal(true);
        }
        if (modalProjecaoFutura.style.display === 'block') {
            renderizarModalProjecaoFutura();
        }

    } catch (error) {
        console.error("Erro ao salvar movimentação universal:", error);
        alert("Ocorreu um erro ao salvar: " + error.message);
    } finally {
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    }
}

function abrirModalEdicaoTransacaoProvento(transacaoId = null, eventoIdProvento = null) {
    let transacao, proventoOriginal;
    
    // Lógica para encontrar a transação correta
    if (transacaoId) { // Chamado com ID de transação existente (manual, editada, etc.)
        transacao = todasAsMovimentacoes.find(t => t.id === transacaoId);
    } else if (eventoIdProvento) { // Chamado para um provento original (automático)
        const proventoId = parseFloat(String(eventoIdProvento).split('_')[1]);
        const corretora = String(eventoIdProvento).split('_')[2];
        
        // Tenta encontrar uma transação já existente para este provento/corretora
        transacao = todasAsMovimentacoes.find(t => {
            if (t.source !== 'provento' && t.source !== 'provento_editado') return false;
            if (t.sourceId !== proventoId) return false;
            const contaAssociada = todasAsContas.find(c => String(c.id) === String(t.idAlvo));
            return contaAssociada && contaAssociada.banco === corretora;
        });
    }

    if (!transacao) { alert("Erro: Transação do provento não encontrada."); return; }
    
    proventoOriginal = todosOsProventos.find(p => p.id === transacao.sourceId);
    if (!proventoOriginal) { alert("Erro: O registro de provento original não foi encontrado."); return; }
    
    document.getElementById('edit-trans-provento-id').value = transacao.id;
    document.getElementById('edit-trans-provento-ticker').value = proventoOriginal.ticker;
    document.getElementById('edit-trans-provento-tipo').value = proventoOriginal.tipo;
    document.getElementById('edit-trans-provento-data').value = new Date(proventoOriginal.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR');
    document.getElementById('edit-trans-provento-valor').value = formatarDecimalParaInput(transacao.valor);
    
    abrirModal('modal-edicao-transacao-provento');
    document.getElementById('edit-trans-provento-valor').focus();
}

async function salvarEdicaoTransacaoProvento() {
    // As linhas "event" e "event.preventDefault()" foram REMOVIDAS daqui.

    const transacaoId = document.getElementById('edit-trans-provento-id').value;
    const novoValorTotal = parseDecimal(document.getElementById('edit-trans-provento-valor').value);
    const transacaoIdNum = parseFloat(transacaoId);
    const transacaoIndex = todasAsMovimentacoes.findIndex(t => t.id === transacaoIdNum);

    if (transacaoIndex === -1) {
        alert("Erro: Transação não encontrada para atualizar.");
        return;
    }

    const transacao = todasAsMovimentacoes[transacaoIndex];
    const proventoOriginal = todosOsProventos.find(p => p.id === transacao.sourceId);

    if (!proventoOriginal) {
        alert("Erro: Provento original associado a esta transação não foi encontrado.");
        return;
    }
    transacao.valor = novoValorTotal;
    const contaAssociada = todasAsContas.find(c => String(c.id) === String(transacao.idAlvo));
    let quantidadeNaContaStr = '';
    if (contaAssociada && proventoOriginal.posicaoPorCorretora[contaAssociada.banco]) {
        const quantidade = proventoOriginal.posicaoPorCorretora[contaAssociada.banco].quantidade;
        quantidadeNaContaStr = ` s/${Math.round(quantidade)}`;
    }
    transacao.descricao = `(Valor Editado) ${proventoOriginal.tipo} de ${proventoOriginal.ticker}${quantidadeNaContaStr}`;
    transacao.source = 'provento_editado';
    
    // Adiciona "await" para garantir que o salvamento termine antes de continuar
    await salvarMovimentacoes(); 
    
    // Dispara a sincronização
    sincronizarTodosOsRegistros(null, true);

    // O código de renderização/fechamento continua o mesmo
    if (telas.caixaGlobal.style.display === 'block') {
        renderizarTelaCaixaGlobal(true);
    }
    if (telas.proventos.style.display === 'block') {
        renderizarTabelaProventos();
    }  
    fecharModal('modal-edicao-transacao-provento');
    if (modalProjecaoFutura.style.display === 'block') {
        renderizarModalProjecaoFutura('contas');
    }
}

async function deletarMovimentacao(id, tipoAlvo) {
    const movIndex = todasAsMovimentacoes.findIndex(m => m.id === id);
    if (movIndex === -1) return;

    const movimentacao = todasAsMovimentacoes[movIndex];
    let confirmMessage = 'Tem certeza que deseja excluir esta movimentação?';
    
    const idsParaExcluirLocalmente = new Set();
    
    idsParaExcluirLocalmente.add(movimentacao.id);

    if (movimentacao.transferenciaId) {
        confirmMessage = 'Esta é uma movimentação de transferência. Excluir este lançamento também excluirá o lançamento correspondente na outra conta/ativo. Deseja continuar?';
        
        const idPar = movimentacao.transferenciaId;
        const movimentacaoPar = todasAsMovimentacoes.find(m => m.id === idPar);
        
        if (movimentacaoPar) {
            idsParaExcluirLocalmente.add(movimentacaoPar.id);
        }
    }

    if (confirm(confirmMessage)) {
        // Remove todos os IDs locais marcados
        todasAsMovimentacoes = todasAsMovimentacoes.filter(m => !idsParaExcluirLocalmente.has(m.id));
        
        await salvarMovimentacoes();
        
        // Atualiza a tela visível
        if (telas.caixaGlobal.style.display === 'block') {
            renderizarTelaCaixaGlobal(true);
        }
    }
}

function renderizarTelaCaixaGlobal(manterEstadoMinimizado = false) {
    if (!telas.caixaGlobal || telas.caixaGlobal.style.display !== 'block') return;

    const dataInicioInput = document.getElementById('filtro-caixa-data-inicio');
    const dataFimInput = document.getElementById('filtro-caixa-data-fim');

    if (!dataInicioInput.value) {
        dataInicioInput.value = new Date().toISOString().split('T')[0];
    }
    if (!dataFimInput.value) {
        const hoje = new Date();
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        const y = ultimoDia.getFullYear();
        const m = String(ultimoDia.getMonth() + 1).padStart(2, '0');
        const d = String(ultimoDia.getDate()).padStart(2, '0');
        dataFimInput.value = `${y}-${m}-${d}`;
    }

    const dataInicio = dataInicioInput.value;
    const dataFim = dataFimInput.value;

    const container = document.getElementById('container-caixa-global');
    const hojeStr = new Date().toISOString().split('T')[0];
    
    let estadosMinimizados = new Set();
    if (manterEstadoMinimizado) {
        container.querySelectorAll('.conta-coluna.minimized').forEach(col => {
            estadosMinimizados.add(col.dataset.idItem);
        });
    }

    container.innerHTML = '';
    const todosOsItens = [...getTodasContasAtivas(), ...todosOsAtivosMoedas];
    
    const itensAgrupados = todosOsItens.reduce((acc, item) => {
        const moeda = item.moeda || 'BRL';
        if (!acc[moeda]) acc[moeda] = [];
        acc[moeda].push(item);
        return acc;
    }, {});
    
    Object.keys(itensAgrupados).sort().forEach(moeda => {
        const grupoContainer = document.createElement('div');
        grupoContainer.className = 'grupo-moeda-container';
        
        let saldoAtualGrupo = 0;
        let saldoFuturoGrupo = 0;
        const dataFuturaD2 = calcularDataLiquidacao(hojeStr, 2);
        const dataFuturaD2Str = dataFuturaD2.toISOString().split('T')[0];

        itensAgrupados[moeda].forEach(item => {
            const isBRL = (item.moeda || 'BRL') === 'BRL';
            saldoAtualGrupo += isBRL ? calcularSaldoEmData(item, hojeStr) : gerarHtmlExtratoParaAtivoMoeda(item, dataInicio, dataFim).saldoFinal;
            if (isBRL) {
                saldoFuturoGrupo += calcularSaldoProjetado(item, dataFuturaD2Str, 'conta');
            }
        });

        let tituloSaldoHtml = `<span class="saldo-titulo">(Saldo Atual: ${formatarValor(saldoAtualGrupo, moeda)})</span>`;
        if (moeda === 'BRL') {
            tituloSaldoHtml = `<span class="saldo-titulo">(Saldo Atual: ${formatarValor(saldoAtualGrupo, 'BRL')} | Saldo D+2: ${formatarMoeda(saldoFuturoGrupo)})</span>`;
        }

        grupoContainer.innerHTML = `<h2 style="margin: 20px 0 10px 0;">Contas em ${moeda} ${tituloSaldoHtml}</h2>`;
        
        const colunasContainer = document.createElement('div');
        colunasContainer.className = 'colunas-view';
        
        itensAgrupados[moeda].sort((a,b) => (a.banco || a.nomeAtivo).localeCompare(b.banco || b.nomeAtivo)).forEach(item => {
            const isBRL = (item.moeda || 'BRL') === 'BRL';
            const { html, saldoFinal: saldoAtual, temMovimentoHoje } = isBRL 
                ? gerarHtmlExtratoParaConta(item, dataInicio, dataFim) 
                : gerarHtmlExtratoParaAtivoMoeda(item, dataInicio, dataFim);

            const saldoFuturo = calcularSaldoProjetado(item, dataFuturaD2Str, isBRL ? 'conta' : 'moeda');

            const cotacao = dadosMoedas.cotacoes[moeda] || 1;
            const saldoEmReais = saldoAtual * cotacao;
            const saldoClasse = saldoAtual < 0 ? 'valor-negativo' : '';
            const headerClasse = temMovimentoHoje ? 'hoje' : '';
            const itemId = `${isBRL ? 'conta' : 'moeda'}_${item.id}`;
            
            let minimizedClass = manterEstadoMinimizado ? (estadosMinimizados.has(itemId) ? 'minimized' : '') : (temMovimentoHoje ? '' : 'minimized');
            
            const nomeExibicao = isBRL ? `${item.banco} - ${item.tipo}` : item.nomeAtivo;
            const nomeEsaldoMinimizado = `${nomeExibicao} <span class='saldo-minimizado'>${formatarValor(saldoAtual, moeda)}</span> <span class='saldo-futuro-minimizado'>D+2: ${formatarValor(saldoFuturo, moeda)}</span>`;
            
            let controlesHeader = '';
            if(!isBRL){
                 controlesHeader = `<i class="fas fa-edit acao-btn edit" title="Editar Ativo" data-ativo-moeda-id="${item.id}"></i>
                                    <i class="fas fa-trash acao-btn delete" title="Excluir Ativo" data-ativo-moeda-id="${item.id}"></i>`;
            } else {
                 controlesHeader = `<i class="fas fa-edit acao-btn edit" title="Editar Conta" data-conta-id="${item.id}"></i>`;
            }

            let headerDetailsHtml = '';
            if (isBRL && (item.agencia || item.numero || item.pix)) {
                headerDetailsHtml += '<div class="conta-header-details">';
                if (item.agencia) headerDetailsHtml += `<span>Ag: <strong>${item.agencia}</strong></span>`;
                if (item.numero) headerDetailsHtml += `<span>Conta: <strong>${item.numero}</strong></span>`;
                if (item.pix) headerDetailsHtml += `<span>Pix: <strong>${item.pix}</strong></span>`;
                headerDetailsHtml += '</div>';
            }

            const coluna = document.createElement('div');
            coluna.className = `conta-coluna ${minimizedClass}`;
            coluna.dataset.idItem = itemId;
            
            coluna.innerHTML = `
                <div class="conta-header ${headerClasse}">
                    <div>
                        <h4>${nomeEsaldoMinimizado}</h4>
                        ${headerDetailsHtml}
                    </div>
                    <div>
                        <span class="saldo-header ${saldoClasse}" title="Saldo em BRL: ${formatarMoeda(saldoEmReais)}">${formatarValor(saldoAtual, moeda)}</span>
                        <span class="saldo-futuro-header">D+2 (${dataFuturaD2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}): ${formatarValor(saldoFuturo, moeda)}</span>
                        ${controlesHeader}
                    </div>
                </div>
                <table>
                    <thead><tr><th>Data</th><th>Descrição</th><th class="numero">Valor</th><th class="numero">Saldo</th><th class="controles-col"></th></tr></thead>
                    <tbody>${html}</tbody>
                </table>
            `;
            colunasContainer.appendChild(coluna);
        });
        
        grupoContainer.appendChild(colunasContainer);
        container.appendChild(grupoContainer);
    });
}

function abrirModalLancamentoProvento(proventoParaEditar = null, tickerPreenchido = '') {
    const form = document.getElementById('form-lancamento-provento');
    form.reset();
    const tituloModal = document.getElementById('provento-modal-titulo');
    
    if (proventoParaEditar) {
        tituloModal.textContent = 'Editar Provento';
        document.getElementById('provento-id').value = proventoParaEditar.id;
        document.getElementById('provento-ativo').value = proventoParaEditar.ticker;
        document.getElementById('provento-data-com').value = proventoParaEditar.dataCom;
        document.getElementById('provento-data-pagamento').value = proventoParaEditar.dataPagamento;
        document.getElementById('provento-tipo').value = proventoParaEditar.tipo;

        const valorBruto = proventoParaEditar.valorBrutoIndividual !== undefined 
            ? proventoParaEditar.valorBrutoIndividual 
            : (proventoParaEditar.tipo === 'JCP' ? (proventoParaEditar.valorIndividual / 0.85) : proventoParaEditar.valorIndividual);
        
        const irPercent = proventoParaEditar.percentualIR !== undefined 
            ? proventoParaEditar.percentualIR 
            : (proventoParaEditar.tipo === 'JCP' ? 15 : 0);

        document.getElementById('provento-valor-individual').value = formatarDecimalParaInput(valorBruto);
        document.getElementById('provento-ir').value = irPercent > 0 ? formatarDecimalParaInput(irPercent) : ''; 
        document.getElementById('provento-valor-individual').previousElementSibling.textContent = 'Valor Bruto por Unidade (R$)';

    } else {
        tituloModal.textContent = 'Lançar Provento';
        document.getElementById('provento-id').value = '';
        document.getElementById('provento-ativo').value = tickerPreenchido.toUpperCase(); 
        document.getElementById('provento-valor-individual').previousElementSibling.textContent = 'Valor Bruto por Unidade (R$)';
    }
    
    abrirModal('modal-lancamento-provento');
    
    if (tickerPreenchido) {
        document.getElementById('provento-tipo').focus();
    } else {
        document.getElementById('provento-ativo').focus();
    }
}
async function deletarProvento(proventoId) {
    if (confirm('Tem certeza que deseja excluir este lançamento de provento?')) {
        const provento = todosOsProventos.find(p => p.id === proventoId);
        if (!provento) return;

        const ativo = todosOsAtivos.find(a => a.ticker === provento.ticker);
        const tipoAtivo = ativo ? ativo.tipo : null;

        todosOsProventos = todosOsProventos.filter(p => p.id !== proventoId);
        // Remove também a movimentação financeira associada
        todasAsMovimentacoes = todasAsMovimentacoes.filter(t => !( (t.source === 'provento' || t.source === 'provento_editado') && t.sourceId === proventoId) );
        
        await salvarProventos();
        await salvarMovimentacoes();

        const modalUnificadoAberto = document.getElementById('modal-proventos-calendario').style.display === 'block' && document.getElementById('seletor-vista-calendario-unificado');

        if (modalUnificadoAberto) {
            const vistaParaRetornar = (tipoAtivo === 'FII') ? 'fiis' : 'acoes';
            abrirModalCalendariosUnificados(vistaParaRetornar);
        } else if (document.getElementById('modal-proventos-calendario-acoes').style.display === 'block') {
            abrirModalCalendarioProventosAcoes();
        } else if (document.getElementById('tela-proventos').style.display === 'block') {
            renderizarTabelaProventos();
        } else if (document.getElementById('modal-resumo-dividendos-ativo').style.display === 'block') {
            // Se o modal de detalhes do ativo estiver aberto, atualize-o
            const ticker = provento.ticker;
            const posicao = gerarPosicaoDetalhada()[ticker] || {};
            const dadosMercado = dadosDeMercado.cotacoes[ticker] || {};
            abrirModalResumoDividendos(ticker, posicao.precoMedio || 0, dadosMercado.valor || 0);
        }
    }
}
function calcularDadosProvento(ticker, dataCom, valorIndividual) { const posicoesNaData = gerarPosicaoDetalhada(dataCom); const posicaoDoAtivo = posicoesNaData[ticker]; if (!posicaoDoAtivo || posicaoDoAtivo.quantidade <= 0) { return { quantidadeNaDataCom: 0, valorTotalRecebido: 0, precoMedioNaDataCom: 0, yieldOnCost: 0, posicaoPorCorretora: {} }; } const quantidadeTotal = posicaoDoAtivo.quantidade; const precoMedio = posicaoDoAtivo.precoMedio; const valorTotal = quantidadeTotal * valorIndividual; const yieldOnCost = precoMedio > 0 ? (valorIndividual / precoMedio) : 0; let posPorCorretoraCalculada = {}; for (const corretora in posicaoDoAtivo.porCorretora) { const qtd = posicaoDoAtivo.porCorretora[corretora]; if (qtd > 0) { posPorCorretoraCalculada[corretora] = { quantidade: qtd, valorRecebido: qtd * valorIndividual }; } } return { quantidadeNaDataCom: quantidadeTotal, valorTotalRecebido: valorTotal, precoMedioNaDataCom: precoMedio, yieldOnCost: yieldOnCost, posicaoPorCorretora: posPorCorretoraCalculada }; }
/**
 * NOVA FUNÇÃO: Calcula um score para priorizar aportes na FASE DE CRESCIMENTO.
 * @param {object} ativo - O objeto do ativo vindo de todosOsAtivos.
 * @param {object} dadosMercadoAtivo - O objeto de cotação/dados do ativo.
 * @returns {number} - A pontuação de crescimento.
 */


/**
 * Calcula um score de 0 a 100 para priorizar aportes, considerando a alocação da categoria como fator principal.
 * @param {object} dadosAtivo - Objeto do ativo vindo da função gerarDadosBalanceamento.
 * @param {object} dadosCategoria - Objeto da categoria do ativo.
 * @returns {number} - A pontuação de oportunidade.
 */
/**
/**
 * VERSÃO CORRIGIDA E ROBUSTA: Calcula um score de 0-100 para avaliar a QUALIDADE de um ativo.
 * @param {object} ativoInfo - O objeto do ativo vindo de todosOsAtivos.
 * @param {object} dadosMercadoAtivo - O objeto de cotação/dados do ativo.
 * @returns {object} - Um objeto contendo o score final e seus componentes para transparência.
 */
function calcularScoreDeQualidade(ativoInfo, dadosMercadoAtivo) {
    const componentes = { final: 0, yield: 0, bazin: 0, payout: 0, pvp: 0, dataCom: 0 };
    if (!ativoInfo || !dadosMercadoAtivo) return componentes;

    // Lógica para ativos planejados (sem posição)
    const posicoesAtuais = gerarPosicaoDetalhada();
    const posicaoDoAtivo = posicoesAtuais[ativoInfo.ticker];
    if (!posicaoDoAtivo || posicaoDoAtivo.quantidade < 0.000001) {
        componentes.final = 50; // Score fixo e mediano
        return componentes;
    }

    const precoAtual = dadosMercadoAtivo.valor || 0;

    if (ativoInfo.tipo === 'Ação') {
        const pesos = { dy: 0.45, bazin: 0.35, payout: 0.05, dataCom: 0.15 };
        const dataInicioIninterrupto = getInicioIninterrupto(ativoInfo.ticker);
        const projecaoAnual = calcularProjecaoAnualUnitaria(ativoInfo.ticker, { limiteAnos: 5, dataInicio: dataInicioIninterrupto });

        if (projecaoAnual > 0 && precoAtual > 0) {
            const yieldProjetado = projecaoAnual / precoAtual;
            componentes.yield = Math.min((yieldProjetado / 0.12), 1) * 100;

            const metaYieldBazin = ativoInfo.metaYieldBazin || 0.06;
            if (metaYieldBazin > 0) {
                const precoTetoBazin = calcularPrecoTetoBazin(projecaoAnual, metaYieldBazin);
                if (precoTetoBazin > 0 && precoAtual < precoTetoBazin) {
                    componentes.bazin = ((precoTetoBazin - precoAtual) / precoTetoBazin) * 100;
                }
            }
            
            const lpa = dadosMercadoAtivo.lpa_acao || 0;
            if (lpa > 0) {
                const payout = projecaoAnual / lpa;
                if (payout <= 0.60) componentes.payout = 100;
                else if (payout <= 0.90) componentes.payout = 60;
                else componentes.payout = 20;
            }
        } else {
            componentes.yield = 15;
            componentes.bazin = 15;
            componentes.payout = 50;
        }

        const hoje = new Date().toISOString().split('T')[0];
        const proximoProvento = todosOsProventos.find(p => p.ticker === ativoInfo.ticker && p.dataCom >= hoje);
        if (proximoProvento) {
            componentes.dataCom = 100;
        }

        componentes.final = (componentes.yield * pesos.dy) + (componentes.bazin * pesos.bazin) + (componentes.payout * pesos.payout) + (componentes.dataCom * pesos.dataCom);

    } else if (ativoInfo.tipo === 'FII') {
        const pesos = { dy: 0.6, pvp: 0.4 };
        const ultimoProvento = getUltimoProvento(ativoInfo.ticker);
        
        if (ultimoProvento > 0 && precoAtual > 0) {
            const yieldProjetado = (ultimoProvento * 12) / precoAtual;
            componentes.yield = Math.min((yieldProjetado / 0.12), 1) * 100;
        } else {
            componentes.yield = 30;
        }

        // --- ALTERAÇÃO: Leitura unificada de VPA ---
        const vpa = dadosMercadoAtivo.vpa || 0;
        if (vpa > 0 && precoAtual > 0) {
            const pvp = precoAtual / vpa;
            if (pvp < 1) {
                componentes.pvp = Math.min(((1 - pvp) / 0.3), 1) * 100;
            }
        }
        
        componentes.final = (componentes.yield * pesos.dy) + (componentes.pvp * pesos.pvp);
    }
    
    componentes.final = Math.max(0, componentes.final);
    return componentes;
}
function calcularResumoProventosParaMultiplosAtivos(proventosFiltrados, tickers, dataInicioFiltro, dataFimFiltro) {
    let projecaoAnualTotalAgregada = 0;
    let custoTotalAgregado = 0;
    let valorMercadoTotalAgregado = 0;

    const hoje = new Date().toISOString().split('T')[0];
    const posicoesAtuais = gerarPosicaoDetalhada();

    tickers.forEach(ticker => {
        const posicaoAtualAtivo = posicoesAtuais[ticker];
        if (!posicaoAtualAtivo || posicaoAtualAtivo.quantidade <= 0) return;

        // --- CORREÇÃO APLICADA AQUI ---
        // A data de início e fim agora é calculada para CADA ticker, individualmente,
        // dentro do loop, em vez de uma vez só para o grupo todo.
        const dataInicioTicker = dataInicioFiltro || getInicioInvestimento([ticker]);
        const dataFimTicker = dataFimFiltro || getFimInvestimento([ticker]);
        // --- FIM DA CORREÇÃO ---

        const projecaoAnualUnitaria = calcularProjecaoAnualUnitaria(ticker, {
            dataInicio: dataInicioTicker,
            dataFim: dataFimTicker,
            proventosParaCalculo: proventosFiltrados
        });

        const projecaoAnualTotal = projecaoAnualUnitaria * posicaoAtualAtivo.quantidade;

        projecaoAnualTotalAgregada += projecaoAnualTotal;
        custoTotalAgregado += posicaoAtualAtivo.quantidade * posicaoAtualAtivo.precoMedio;

        const cotacao = dadosDeMercado.cotacoes[ticker];
        valorMercadoTotalAgregado += (cotacao && cotacao.valor > 0) ? posicaoAtualAtivo.quantidade * cotacao.valor : 0;
    });

    const mediaMensalTotalAgregada = projecaoAnualTotalAgregada / 12;
    const yocCustoAnualAgregado = custoTotalAgregado > 0 ? projecaoAnualTotalAgregada / custoTotalAgregado : 0;
    const yieldMercadoAnualAgregado = valorMercadoTotalAgregado > 0 ? projecaoAnualTotalAgregada / valorMercadoTotalAgregado : 0;

    const dividendoTotalPeriodo = proventosFiltrados.reduce((acc, p) => acc + p.valorTotalRecebido, 0);
    
    const mediaMensalPorUnidade = (tickers.length === 1 && posicoesAtuais[tickers[0]]?.quantidade > 0) ? mediaMensalTotalAgregada / posicoesAtuais[tickers[0]].quantidade : 0;

    return {
        dividendoTotalPeriodo,
        projecaoAnualTotal: projecaoAnualTotalAgregada,
        mediaMensalTotal: mediaMensalTotalAgregada,
        yocCustoAnual: yocCustoAnualAgregado,
        yocCustoMensal: yocCustoAnualAgregado / 12,
        yieldMercadoAnual: yieldMercadoAnualAgregado,
        yieldMercadoMensal: yieldMercadoAnualAgregado / 12,
        mediaMensalPorUnidade: mediaMensalPorUnidade
    };
}
function getInicioInvestimento(tickers, dataLimite = null) {
    const tickerSet = new Set(tickers);
    let dataMaisAntiga = null;
    const hoje = new Date().toISOString().split('T')[0];
    const dataFinal = dataLimite || hoje;

    const atualizarData = (novaData) => {
        if (novaData > dataFinal) return;
        if (!dataMaisAntiga || new Date(novaData) < new Date(dataMaisAntiga)) {
            dataMaisAntiga = novaData;
        }
    };

    todasAsNotas.forEach(n => {
        n.operacoes.forEach(op => {
            if (op.tipo === 'compra' && tickerSet.has(op.ativo)) {
                atualizarData(n.data);
            }
        });
    });

    posicaoInicial.forEach(p => {
        if (p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.transacao.toLowerCase() === 'compra' && tickerSet.has(p.ticker)) {
             atualizarData(p.data);
        } else if (p.tipoRegistro === 'SUMARIO_MANUAL' && tickerSet.has(p.ticker)) {
            atualizarData(p.data);
        }
    });
    
    return dataMaisAntiga;
}
function getFimInvestimento(tickers) {
    const tickerSet = new Set(tickers);
    const hojeStr = new Date().toISOString().split('T')[0];
    const posicoesAtuais = gerarPosicaoDetalhada();
    
    // Se qualquer um dos tickers ainda está em carteira, a data final é hoje.
    for (const ticker of tickers) {
        if (posicoesAtuais[ticker] && posicoesAtuais[ticker].quantidade > 0.000001) {
            return hojeStr;
        }
    }

    // Se todos foram zerados, encontra a data de encerramento mais recente entre eles.
    const relatorioZeradas = gerarRelatorioPosicoesZeradas();
    let dataMaisRecente = null;

    relatorioZeradas.forEach(r => {
        if (tickerSet.has(r.ticker)) {
            if (!dataMaisRecente || new Date(r.dataEncerramento) > new Date(dataMaisRecente)) {
                dataMaisRecente = r.dataEncerramento;
            }
        }
    });

    return dataMaisRecente || hojeStr; // Se não encontrar, retorna hoje por segurança.
}

function renderizarTabelaProventos() {
    const container = document.getElementById('lista-de-proventos');
    const summaryContainer = document.getElementById('proventos-summary-container');
    const summaryTitulo = document.getElementById('proventos-summary-titulo');
    
    const tableHeaders = `
        <th class="sortable" data-key="ticker">Ativo</th>
        <th class="sortable" data-key="tipo">Tipo</th>
        <th class="sortable" data-key="dataCom">Data Com</th>
        <th class="sortable" data-key="dataPagamento">Data Pag.</th>
        <th class="numero sortable col-provento-valor" data-key="valorIndividual">Provento por Unidade</th>
        <th class="numero col-provento-qtd">Qtd. Na Data</th>
        <th class="numero col-provento-valor">Preço Médio (Data Com)</th>
        <th class="numero col-provento-valor">Total Recebido</th>
        <th class="percentual col-provento-yoc">YOC</th>
        <th>Detalhes</th>
        <th class="controles-col">Controles</th>`;
    container.innerHTML = `<table><thead><tr>${tableHeaders}</tr></thead><tbody></tbody></table>`;
    
    const body = container.querySelector('tbody');
    const hojeStr = new Date().toISOString().split('T')[0];
    const hojeMeiaNoite = new Date(hojeStr + 'T00:00:00');

    const proventosFiltrados = obterProventosFiltrados();

    const filtroAtivo = document.getElementById('provento-filtro-ativo').value;
    const filtroTipo = document.getElementById('provento-filtro-tipo').value;
    const filtroStatus = document.getElementById('provento-filtro-status').value;
    const filtroDataDe = document.getElementById('provento-filtro-data-de').value;
    const filtroDataAte = document.getElementById('provento-filtro-data-ate').value;
    
    let tooltipTitle = `Exportar ${proventosFiltrados.length} proventos exibidos.`;
    const filtrosAtivos = [];
    const statusMap = { receber: 'A Receber', recebido: 'Recebidos' };
    
    if (filtroDataDe || filtroDataAte) filtrosAtivos.push(`Período: ${filtroDataDe || 'Início'} a ${filtroDataAte || 'Fim'}`);
    if (filtroAtivo) filtrosAtivos.push(`Ativo: ${filtroAtivo.toUpperCase()}`);
    if (filtroTipo !== 'todos') filtrosAtivos.push(`Tipo: ${filtroTipo}`);
    if (filtroStatus !== 'todos') filtrosAtivos.push(`Status: ${statusMap[filtroStatus]}`);

    if (filtrosAtivos.length > 0) {
        tooltipTitle += "\n\nFiltros Ativos:\n- " + filtrosAtivos.join('\n- ');
    }
    
    const btnExportar = document.getElementById('btn-exportar-proventos');
    if (btnExportar) {
        btnExportar.setAttribute('data-tooltip', tooltipTitle);
    }

    const sortedProventos = [...proventosFiltrados].sort((a, b) => {
        const key = sortConfigProventos.key;
        const direction = sortConfigProventos.direction === 'ascending' ? 1 : -1;
        const valA = key.includes('data') ? new Date(a[key]) : (a[key] || '');
        const valB = key.includes('data') ? new Date(b[key]) : (b[key] || '');
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });

    summaryContainer.style.display = 'block';
    const tickersUnicos = [...new Set(sortedProventos.map(p => p.ticker))];
    if (tickersUnicos.length > 0) {
        const resumo = calcularResumoProventosParaMultiplosAtivos(proventosFiltrados, tickersUnicos, filtroDataDe, filtroDataAte);        
        const dataInicio = filtroDataDe || getInicioInvestimento(tickersUnicos);
        const dataFim = filtroDataAte || getFimInvestimento(tickersUnicos);
        const dataInicioFmt = dataInicio ? new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início';
        const dataFimFmt = dataFim ? new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim';
        
        summaryTitulo.textContent = `Resumo do Período de ${dataInicioFmt} até ${dataFimFmt}`;        
        document.getElementById('summary-dividendo-total').textContent = formatarMoeda(resumo.dividendoTotalPeriodo);
        document.getElementById('summary-projecao-anual').textContent = formatarMoeda(resumo.projecaoAnualTotal);
        document.getElementById('summary-media-mensal').textContent = formatarMoeda(resumo.mediaMensalTotal);
        document.getElementById('summary-yoc-anual').textContent = formatarPercentual(resumo.yocCustoAnual);
        document.getElementById('summary-yoc-mensal').textContent = formatarPercentual(resumo.yocCustoMensal);
        document.getElementById('summary-yield-mercado-anual').textContent = formatarPercentual(resumo.yieldMercadoAnual);
        document.getElementById('summary-yield-mercado-mensal').textContent = formatarPercentual(resumo.yieldMercadoMensal);

        // --- INÍCIO DA ALTERAÇÃO ---
        if (tickersUnicos.length === 1) {
            // Calcula o total pago por unidade no período filtrado
            const totalPagoPorUnidade = proventosFiltrados.reduce((acc, p) => acc + p.valorIndividual, 0);
            
            // Exibe o container e preenche os dois valores
            const containerUnidade = document.getElementById('summary-media-unidade-container');
            containerUnidade.style.display = 'flex'; // Usar 'flex' para alinhar os itens
            document.getElementById('summary-media-unidade-valor').textContent = formatarMoeda(resumo.mediaMensalPorUnidade);
            document.getElementById('summary-total-unidade-valor').textContent = formatarMoeda(totalPagoPorUnidade);
        } else {
             document.getElementById('summary-media-unidade-container').style.display = 'none';
        }
        // --- FIM DA ALTERAÇÃO ---
    } else {
        summaryTitulo.textContent = `Resumo do Período`;
        document.getElementById('summary-dividendo-total').textContent = formatarMoeda(0);
        document.getElementById('summary-projecao-anual').textContent = formatarMoeda(0);
        document.getElementById('summary-media-mensal').textContent = formatarMoeda(0);
        document.getElementById('summary-yoc-anual').textContent = formatarPercentual(0);
        document.getElementById('summary-yoc-mensal').textContent = formatarPercentual(0);
        document.getElementById('summary-yield-mercado-anual').textContent = formatarPercentual(0);
        document.getElementById('summary-yield-mercado-mensal').textContent = formatarPercentual(0);
        document.getElementById('summary-media-unidade-container').style.display = 'none';
    }

    if (sortedProventos.length === 0) {
        body.innerHTML = '<tr><td colspan="11" style="text-align:center;">Nenhum provento encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    sortedProventos.forEach(p => {
        const tr = document.createElement('tr');
        tr.dataset.id = p.id;
        if (new Date(p.dataPagamento + 'T12:00:00') >= hojeMeiaNoite) tr.classList.add('pagamento-futuro');
        
        if(isProventosEditMode) {
             tr.innerHTML = `
                <td><input type="text" class="ticker-input edit-field" style="width: 80px;" data-field="ticker" value="${p.ticker}"></td>
                <td>${p.tipo}</td>
                <td><input type="date" class="edit-field" style="width: 130px;" data-field="dataCom" value="${p.dataCom}"></td>
                <td><input type="date" class="edit-field" style="width: 130px;" data-field="dataPagamento" value="${p.dataPagamento}"></td>
                <td class="numero"><input type="text" style="width: 100px;" class="numero edit-field" data-field="valorIndividual" value="${formatarDecimalParaInput(p.valorIndividual)}"></td>
                <td class="numero">${Math.round(p.quantidadeNaDataCom)}</td>
                <td class="numero">${formatarPrecoMedio(p.precoMedioNaDataCom)}</td>
                <td class="numero">${formatarMoeda(p.valorTotalRecebido)}</td>
                <td class="percentual">${formatarPercentual(p.yieldOnCost)}</td>
                <td>-</td>
                <td class="controles-col"><i class="fas fa-lock" title="Saia do modo de edição para excluir"></i></td>
             `;
        } else {
             let dataComFmt = p.dataCom ? new Date(p.dataCom + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data Inválida';
             if (p.dataCom === hojeStr) dataComFmt = `<span class="data-hoje">${dataComFmt}</span>`;
             let dataPagFmt = p.dataPagamento ? new Date(p.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data Inválida';
             if (p.dataPagamento === hojeStr) dataPagFmt = `<span class="data-hoje">${dataPagFmt}</span>`;
             let detalhesCorretoras = Object.entries(p.posicaoPorCorretora).map(([nome, dados]) => `${nome}: ${Math.round(dados.quantidade)} / ${formatarMoeda(dados.valorRecebido)}`).join('<br>');
             if (!detalhesCorretoras) detalhesCorretoras = 'N/A';
             const warningIcon = !todosOsAtivos.find(a => a.ticker === p.ticker)?.tipo ? `<i class="fas fa-exclamation-triangle warning-icon" title="Ativo com cadastro incompleto."></i>` : '';
             
             tr.innerHTML = `
                <td>${p.ticker} ${warningIcon}</td>
                <td>${p.tipo}</td>
                <td>${dataComFmt}</td>
                <td>${dataPagFmt}</td>
                <td class="numero col-provento-valor">${formatarPrecoMedio(p.valorIndividual)}</td>
                <td class="numero col-provento-qtd">${Math.round(p.quantidadeNaDataCom)}</td>
                <td class="numero col-provento-valor">${formatarPrecoMedio(p.precoMedioNaDataCom)}</td>
                <td class="numero col-provento-valor">${formatarMoeda(p.valorTotalRecebido)}</td>
                <td class="percentual col-provento-yoc">${formatarPercentual(p.yieldOnCost)}</td>
                <td class="provento-details">${detalhesCorretoras}</td>
                <td class="controles-col">
                    <i class="fas fa-edit acao-btn edit" title="Editar Provento" data-provento-id="${p.id}"></i>
                    <i class="fas fa-trash acao-btn delete" title="Excluir Provento" data-provento-id="${p.id}"></i>
                </td>`;
        }
        body.appendChild(tr);
    });

    document.querySelectorAll('#lista-de-proventos .sortable').forEach(header => {
        header.classList.remove('ascending', 'descending');
        if (header.dataset.key === sortConfigProventos.key) {
            header.classList.add(sortConfigProventos.direction);
        }
    });
}

async function sincronizarProventoComTransacao(proventoId, corretoraParaLimpar = null) {
    const provento = todosOsProventos.find(p => p.id === proventoId);
    if (!provento || !provento.dataPagamento) return [];

    todasAsMovimentacoes = todasAsMovimentacoes.filter(t => {
        const conta = todasAsContas.find(c => String(c.id) === String(t.idAlvo));
        return !( (t.source === 'provento') && t.sourceId === provento.id && (!corretoraParaLimpar || (conta && conta.banco === corretoraParaLimpar)) )
    });

    let alertas = [];
    for (const corretora in provento.posicaoPorCorretora) {
        const dadosCorretora = provento.posicaoPorCorretora[corretora];
        const contaInvestimento = todasAsContas.find(c => c.banco === corretora && c.tipo === 'Conta Investimento');

        if (contaInvestimento) {
            const transacaoEditadaExiste = todasAsMovimentacoes.some(t =>
                t.source === 'provento_editado' && t.sourceId === provento.id &&
                t.tipoAlvo === 'conta' && String(t.idAlvo) === String(contaInvestimento.id)
            );
            if (transacaoEditadaExiste) continue;

            if (new Date(provento.dataPagamento) >= new Date(contaInvestimento.dataSaldoInicial)) {
                const novaMovimentacao = {
                    id: Date.now() + Math.random(), data: provento.dataPagamento, tipoAlvo: 'conta',
                    idAlvo: contaInvestimento.id, moeda: 'BRL',
                    descricao: `${provento.tipo} de ${provento.ticker} s/${Math.round(dadosCorretora.quantidade)}`,
                    valor: arredondarMoeda(dadosCorretora.valorRecebido), source: 'provento', sourceId: provento.id,
                    enviarParaFinancas: false, // Offline: false
                    idLancamentoCasa: null
                };
                todasAsMovimentacoes.push(novaMovimentacao);
            } else {
                alertas.push(`O pagamento na ${corretora} não foi lançado.`);
            }
        } else {
            alertas.push(`Nenhuma 'Conta Investimento' encontrada para ${corretora}.`);
        }
    }
    return alertas;
}

function abrirModalCorrecaoProventosOrfaos(proventosOrfaos) {
    const container = document.getElementById('lista-proventos-orfaos-container');
    const corretorasOptions = getTodasCorretoras().map(c => `<option value="${c}">${c}</option>`).join('');

    let tableHtml = `
        <table class="tabela-correcao-orfaos">
            <thead>
                <tr>
                    <th class="col-ativo-correcao">Ativo</th>
                    <th class="col-data-correcao">Data Com</th>
                    <th class="col-pm-correcao">Preço Médio (R$)</th>
                    <th class="col-posicoes-correcao">Posições por Corretora</th>
                </tr>
            </thead>
            <tbody>
    `;

    proventosOrfaos.forEach(provento => {
        tableHtml += `
            <tr class="provento-correcao-row" data-provento-id="${provento.id}" data-ticker="${provento.ticker}" data-datacom="${provento.dataCom}">
                <td class="correcao-ativo-container"><strong>${provento.ticker}</strong></td>
                <td class="correcao-ativo-container">${new Date(provento.dataCom + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>
                    <div class="correcao-pm-container">
                        <input type="text" class="provento-correcao-pm" placeholder="Ex: 25,50">
                    </div>
                </td>
                <td>
                    <div class="posicoes-por-corretora-wrapper">
                        </div>
                    <button type="button" class="btn btn-primary btn-sm btn-add-corretora-provento" style="margin-top: 10px;">+ Add Corretora</button>
                </td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
    modalCorrigirProventosOrfaos.style.display = 'block';
}

function adicionarLinhaCorrecaoProvento(button) {
    const container = button.closest('td').querySelector('.posicoes-por-corretora-wrapper');
    const corretorasOptions = getTodasCorretoras().map(c => `<option value="${c}">${c}</option>`).join('');
    
    const div = document.createElement('div');
    div.className = 'linha-corretora-correcao';
    div.innerHTML = `
        <select class="provento-correcao-corretora">
            <option value="">Selecione...</option>
            ${corretorasOptions}
        </select>
        <input type="number" min="1" step="1" class="provento-correcao-qtd" placeholder="Qtd.">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function salvarCorrecaoProventosOrfaos(event) {
    event.preventDefault();
    const linhasDeProventos = document.querySelectorAll('#lista-proventos-orfaos-container .provento-correcao-row');
    const novosRegistrosPosicao = [];

    linhasDeProventos.forEach(row => {
        const precoMedioInput = row.querySelector('.provento-correcao-pm');
        const precoMedio = precoMedioInput ? parseDecimal(precoMedioInput.value) : 0;
        const posicoesPorCorretora = [];
        
        row.querySelectorAll('.linha-corretora-correcao').forEach(corretoraRow => {
            const corretora = corretoraRow.querySelector('.provento-correcao-corretora').value;
            const quantidadeInput = corretoraRow.querySelector('.provento-correcao-qtd');
            const quantidade = quantidadeInput ? parseInt(quantidadeInput.value, 10) : 0;
            
            if (corretora && quantidade > 0) {
                posicoesPorCorretora.push({ corretora, quantidade });
            }
        });

        if (precoMedio > 0 && posicoesPorCorretora.length > 0) {
            novosRegistrosPosicao.push({
                id: Date.now() + Math.random(),
                tipoRegistro: 'SUMARIO_MANUAL',
                ticker: row.dataset.ticker,
                data: row.dataset.datacom,
                precoMedio: precoMedio,
                posicoesPorCorretora: posicoesPorCorretora
            });
        }
    });

    if (novosRegistrosPosicao.length === 0) {
        alert('Nenhum dado válido preenchido. Nenhuma posição foi salva.');
        return;
    }

    posicaoInicial.push(...novosRegistrosPosicao);
    salvarPosicaoInicial();

    let proventosCorrigidosCount = 0;
    todosOsProventos.forEach(provento => {
        const isAffected = novosRegistrosPosicao.some(newPos =>
            newPos.ticker === provento.ticker && newPos.data === provento.dataCom
        );

        if (isAffected && (!provento.quantidadeNaDataCom || provento.quantidadeNaDataCom <= 0)) {
            const dadosRecalculados = calcularDadosProvento(provento.ticker, provento.dataCom, provento.valorIndividual);
            Object.assign(provento, dadosRecalculados);
            sincronizarProventoComTransacao(provento.id);
            proventosCorrigidosCount++;
        }
    });

    salvarProventos();
    salvarMovimentacoes(); // CORREÇÃO AQUI

    alert(`${novosRegistrosPosicao.length} registro(s) de posição foram criados e ${proventosCorrigidosCount} provento(s) foram corrigidos e sincronizados automaticamente!`);
    
    modalCorrigirProventosOrfaos.style.display = 'none';
    
    if (telas.configuracoes.style.display === 'block') {
        verificarInconsistencias();
    }
}
// ********** FIM DA PARTE 4







// ********** PARTE 5 - Motor de Cálculo e Renderização de Posições
// --- MOTOR DE CÁLCULO ---
/**
 * NOVA FUNÇÃO: Calcula os lucros/prejuízos realizados para um conjunto de tickers.
 * @param {Array<string>} tickers - A lista de tickers para analisar.
 * @param {Map<string, string>} [datasInicioMap=null] - Opcional. Um mapa de ticker para sua data de início ininterrupta. Se fornecido, apenas vendas após esta data serão consideradas.
 * @returns {Map<string, number>} - Um mapa contendo o resultado realizado para cada ticker.
 */
function calcularResultadosRealizados(tickers, datasInicioMap = null) {
    const resultadosPorTicker = new Map();
    const tickerSet = new Set(tickers);

    const todasAsVendas = [];
    // 1. Coleta vendas de Notas de Corretagem
    todasAsNotas.forEach(n => {
        n.operacoes.filter(op => op.tipo === 'venda' && tickerSet.has(op.ativo)).forEach(op => {
            const custoRateado = (n.operacoes.reduce((s, o) => s + o.valor, 0) > 0) ? (op.valor / n.operacoes.reduce((s, o) => s + o.valor, 0)) * n.custos : 0;
            todasAsVendas.push({
                ticker: op.ativo,
                data: n.data,
                quantidade: op.quantidade,
                valorLiquidoVenda: op.valor - custoRateado
            });
        });
    });
    // 2. Coleta vendas do Histórico de Posição Inicial
    posicaoInicial.forEach(p => {
        if (p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.transacao.toLowerCase() === 'venda' && tickerSet.has(p.ticker) && p.valorVenda) {
            todasAsVendas.push({
                ticker: p.ticker,
                data: p.data,
                quantidade: p.quantidade,
                valorLiquidoVenda: p.valorVenda
            });
        }
    });
    // 3. Coleta saídas de Eventos de Ativos
    todosOsAjustes.forEach(a => {
        if (a.tipoAjuste === 'evento_ativo' && a.tipoEvento === 'saida' && tickerSet.has(a.ticker)) {
            const dataAnterior = new Date(a.data + 'T12:00:00');
            dataAnterior.setDate(dataAnterior.getDate() - 1);
            const posAnterior = gerarPosicaoDetalhada(dataAnterior.toISOString().split('T')[0]);
            const pmNaSaida = posAnterior[a.ticker]?.precoMedio || 0;
            const qtdSaida = a.detalhes.reduce((soma, d) => soma + d.quantidade, 0);
            
            todasAsVendas.push({
                ticker: a.ticker,
                data: a.data,
                quantidade: qtdSaida,
                valorLiquidoVenda: qtdSaida * pmNaSaida // Valor da saída é baseado no custo
            });
        }
    });

    // Calcula o lucro/prejuízo para cada venda
    todasAsVendas.forEach(venda => {
        const dataInicioCiclo = datasInicioMap ? datasInicioMap.get(venda.ticker) : null;
        if (dataInicioCiclo && new Date(venda.data) < new Date(dataInicioCiclo)) {
            return; // Pula a venda se for anterior ao ciclo de investimento atual
        }
        
        const dataAnteriorVenda = new Date(venda.data + 'T12:00:00');
        dataAnteriorVenda.setDate(dataAnteriorVenda.getDate() - 1);
        const posicoesAnteriores = gerarPosicaoDetalhada(dataAnteriorVenda.toISOString().split('T')[0]);
        
        const pmNaVenda = posicoesAnteriores[venda.ticker]?.precoMedio || 0;
        const custoTotalAquisicao = venda.quantidade * pmNaVenda;
        const resultado = venda.valorLiquidoVenda - custoTotalAquisicao;

        const resultadoAtual = resultadosPorTicker.get(venda.ticker) || 0;
        resultadosPorTicker.set(venda.ticker, resultadoAtual + resultado);
    });

    return resultadosPorTicker;
}
function gerarPosicaoDetalhada(dataLimite = null) {
    const posicoes = {};
    let eventos = [];

    // Adiciona todos os eventos que podem alterar a posição
    posicaoInicial.forEach(p => eventos.push({ data: p.data, tipo: p.tipoRegistro, payload: p }));
    todasAsNotas.forEach(n => n.operacoes.forEach(op => eventos.push({ data: n.data, tipo: 'OPERACAO_NOTA', payload: {...op, custosNota: n.custos, irrfNota: n.irrf, corretora: n.corretora, totalOperacoesNota: n.operacoes.reduce((soma, op) => soma + op.valor, 0)} })));
    todosOsAjustes.forEach(a => eventos.push({ data: a.data, tipo: a.tipoAjuste, payload: a }));

    eventos.sort((a,b) => new Date(a.data) - new Date(b.data));

    eventos.filter(e => !dataLimite || new Date(e.data) <= new Date(dataLimite + 'T23:59:59')).forEach(evento => {
        const payload = evento.payload;
        const processaTicker = (ticker) => {
            if (!posicoes[ticker]) {
                posicoes[ticker] = { quantidade: 0, precoMedio: 0, porCorretora: {} };
            }
            return posicoes[ticker];
        };

        switch(evento.tipo) {
            case 'SUMARIO_MANUAL': {
                let pos = processaTicker(payload.ticker);
                let qtdTotalSumario = 0;
                payload.posicoesPorCorretora.forEach(pc => {
                    pos.porCorretora[pc.corretora] = (pos.porCorretora[pc.corretora] || 0) + pc.quantidade;
                    qtdTotalSumario += pc.quantidade;
                });
                pos.quantidade += qtdTotalSumario; // CORREÇÃO: Acumula o total
                pos.precoMedio = payload.precoMedio; // ATENÇÃO: Ver observação abaixo
                break;
            }
            case 'TRANSACAO_HISTORICA': {
                let pos = processaTicker(payload.ticker);
                const corretora = payload.corretora;
                const quantidade = payload.quantidade;
                if (payload.transacao.toLowerCase() === 'compra') {
                    pos.quantidade += quantidade;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) + quantidade;
                } else {
                    pos.quantidade -= quantidade;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) - quantidade;
                }
                pos.precoMedio = payload.precoMedio;
                break;
            }
            case 'OPERACAO_NOTA': {
                let pos = processaTicker(payload.ativo);
                const corretora = payload.corretora;
                const qtdAnterior = pos.quantidade;
                const pmAnterior = pos.precoMedio;
                const qtdOperacao = payload.quantidade;

                if (payload.tipo.toLowerCase() === 'compra') {
                    const valorOperacao = payload.valor;
                    const custoRateado = payload.totalOperacoesNota > 0 ? (valorOperacao / payload.totalOperacoesNota) * (payload.custosNota + payload.irrfNota) : 0;
                    const precoCompraComCustos = qtdOperacao > 0 ? (valorOperacao + custoRateado) / qtdOperacao : 0;
                    const novoTotalFinanceiro = (qtdAnterior * pmAnterior) + (qtdOperacao * precoCompraComCustos);
                    pos.quantidade += qtdOperacao;
                    pos.precoMedio = pos.quantidade > 0 ? novoTotalFinanceiro / pos.quantidade : 0;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) + qtdOperacao;
                } else { // Venda
                    pos.quantidade -= qtdOperacao;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) - qtdOperacao;
                }
                if (pos.quantidade < 0.000001) pos.precoMedio = 0;
                break;
            }
            case 'transferencia': {
                payload.ativosTransferidos.forEach(ativoT => {
                    let pos = processaTicker(ativoT.ticker);
                    pos.porCorretora[payload.corretoraOrigem] = (pos.porCorretora[payload.corretoraOrigem] || 0) - ativoT.quantidade;
                    pos.porCorretora[payload.corretoraDestino] = (pos.porCorretora[payload.corretoraDestino] || 0) + ativoT.quantidade;
                });
                break;
            }
            case 'ajuste_pm': {
                let pos = processaTicker(payload.ticker);
                pos.precoMedio = payload.novoPrecoMedio;
                break;
            }
            case 'split_grupamento': {
                let pos = processaTicker(payload.ticker);
                if (pos.quantidade > 0) {
                    const de = payload.proporcaoDe;
                    const para = payload.proporcaoPara;
                    pos.quantidade = (pos.quantidade / de) * para;
                    pos.precoMedio = (pos.precoMedio / para) * de;
                }
                break;
            }
            case 'evento_ativo': {
                let pos = processaTicker(payload.ticker);
                if (payload.tipoEvento === 'entrada') {
                    const qtdAnterior = pos.quantidade;
                    const pmAnterior = pos.precoMedio;
                    
                    let qtdEntradaTotal = 0;
                    payload.detalhes.forEach(detalhe => {
                        pos.porCorretora[detalhe.corretora] = (pos.porCorretora[detalhe.corretora] || 0) + detalhe.quantidade;
                        qtdEntradaTotal += detalhe.quantidade;
                    });
                    
                    const pmEntrada = payload.precoMedio;
                    const novoTotalFinanceiro = (qtdAnterior * pmAnterior) + (qtdEntradaTotal * pmEntrada);
                    
                    pos.quantidade += qtdEntradaTotal;
                    pos.precoMedio = pos.quantidade > 0 ? novoTotalFinanceiro / pos.quantidade : 0;

                } else if (payload.tipoEvento === 'saida') {
                    payload.detalhes.forEach(detalhe => {
                        pos.porCorretora[detalhe.corretora] = (pos.porCorretora[detalhe.corretora] || 0) - detalhe.quantidade;
                        pos.quantidade -= detalhe.quantidade;
                    });
                }
                if (pos.quantidade < 0.000001) pos.precoMedio = 0;
                break;
            }
        }
    });
    return posicoes;
}
function gerarPosicaoDetalhadaDeBackup(dadosBackup, dataLimite = null) {
    const posicoes = {};
    if (!dadosBackup) return posicoes;

    let eventos = [];
    (dadosBackup.posicoes || []).forEach(p => eventos.push({ data: p.data, tipo: p.tipoRegistro, payload: p }));
    (dadosBackup.notas || []).forEach(n => n.operacoes.forEach(op => eventos.push({ data: n.data, tipo: 'OPERACAO_NOTA', payload: {...op, custosNota: n.custos, irrfNota: n.irrf, corretora: n.corretora, totalOperacoesNota: n.operacoes.reduce((soma, op) => soma + op.valor, 0)} })));
    (dadosBackup.ajustes || []).forEach(a => eventos.push({ data: a.data, tipo: a.tipoAjuste, payload: a }));

    eventos.sort((a,b) => new Date(a.data) - new Date(b.data));

    eventos.filter(e => !dataLimite || new Date(e.data) <= new Date(dataLimite + 'T23:59:59')).forEach(evento => {
        const payload = evento.payload;
        const processaTicker = (ticker) => {
            if (!posicoes[ticker]) {
                posicoes[ticker] = { quantidade: 0, precoMedio: 0, porCorretora: {} };
            }
            return posicoes[ticker];
        };

        switch(evento.tipo) {
            case 'SUMARIO_MANUAL': {
                let pos = processaTicker(payload.ticker);
                let qtdTotalSumario = 0;
                payload.posicoesPorCorretora.forEach(pc => {
                    pos.porCorretora[pc.corretora] = (pos.porCorretora[pc.corretora] || 0) + pc.quantidade;
                    qtdTotalSumario += pc.quantidade;
                });
                pos.quantidade += qtdTotalSumario;
                pos.precoMedio = payload.precoMedio;
                break;
            }
            case 'TRANSACAO_HISTORICA': {
                let pos = processaTicker(payload.ticker);
                const corretora = payload.corretora;
                const quantidade = payload.quantidade;
                if (payload.transacao.toLowerCase() === 'compra') {
                    pos.quantidade += quantidade;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) + quantidade;
                } else {
                    pos.quantidade -= quantidade;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) - quantidade;
                }
                pos.precoMedio = payload.precoMedio;
                break;
            }
            case 'OPERACAO_NOTA': {
                let pos = processaTicker(payload.ativo);
                const corretora = payload.corretora;
                const qtdAnterior = pos.quantidade;
                const pmAnterior = pos.precoMedio;
                const qtdOperacao = payload.quantidade;

                if (payload.tipo.toLowerCase() === 'compra') {
                    const valorOperacao = payload.valor;
                    const custoRateado = payload.totalOperacoesNota > 0 ? (valorOperacao / payload.totalOperacoesNota) * (payload.custosNota + payload.irrfNota) : 0;
                    const precoCompraComCustos = qtdOperacao > 0 ? (valorOperacao + custoRateado) / qtdOperacao : 0;
                    const novoTotalFinanceiro = (qtdAnterior * pmAnterior) + (qtdOperacao * precoCompraComCustos);
                    pos.quantidade += qtdOperacao;
                    pos.precoMedio = pos.quantidade > 0 ? novoTotalFinanceiro / pos.quantidade : 0;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) + qtdOperacao;
                } else { // Venda
                    pos.quantidade -= qtdOperacao;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) - qtdOperacao;
                }
                if (pos.quantidade < 0.000001) pos.precoMedio = 0;
                break;
            }
            case 'transferencia': {
                payload.ativosTransferidos.forEach(ativoT => {
                    let pos = processaTicker(ativoT.ticker);
                    pos.porCorretora[payload.corretoraOrigem] = (pos.porCorretora[payload.corretoraOrigem] || 0) - ativoT.quantidade;
                    pos.porCorretora[payload.corretoraDestino] = (pos.porCorretora[payload.corretoraDestino] || 0) + ativoT.quantidade;
                });
                break;
            }
            case 'ajuste_pm': {
                let pos = processaTicker(payload.ticker);
                pos.precoMedio = payload.novoPrecoMedio;
                break;
            }
            case 'split_grupamento': {
                let pos = processaTicker(payload.ticker);
                if (pos.quantidade > 0) {
                    const de = payload.proporcaoDe;
                    const para = payload.proporcaoPara;
                    pos.quantidade = (pos.quantidade / de) * para;
                    pos.precoMedio = (pos.precoMedio / para) * de;
                }
                break;
            }
            case 'evento_ativo': {
                let pos = processaTicker(payload.ticker);
                if (payload.tipoEvento === 'entrada') {
                    const qtdAnterior = pos.quantidade;
                    const pmAnterior = pos.precoMedio;
                    
                    let qtdEntradaTotal = 0;
                    payload.detalhes.forEach(detalhe => {
                        pos.porCorretora[detalhe.corretora] = (pos.porCorretora[detalhe.corretora] || 0) + detalhe.quantidade;
                        qtdEntradaTotal += detalhe.quantidade;
                    });
                    
                    const pmEntrada = payload.precoMedio;
                    const novoTotalFinanceiro = (qtdAnterior * pmAnterior) + (qtdEntradaTotal * pmEntrada);
                    
                    pos.quantidade += qtdEntradaTotal;
                    pos.precoMedio = pos.quantidade > 0 ? novoTotalFinanceiro / pos.quantidade : 0;

                } else if (payload.tipoEvento === 'saida') {
                    payload.detalhes.forEach(detalhe => {
                        pos.porCorretora[detalhe.corretora] = (pos.porCorretora[detalhe.corretora] || 0) - detalhe.quantidade;
                        pos.quantidade -= detalhe.quantidade;
                    });
                }
                if (pos.quantidade < 0.000001) pos.precoMedio = 0;
                break;
            }
        }
    });
    return posicoes;
}
function calcularSaldoEmDataDeBackup(conta, dataLimite, dadosBackup) {
    if (!dataLimite) return 0;
    const todosOsEventos = obterTodosOsEventosDeCaixaDeBackup(dadosBackup);
    const eventosFiltrados = todosOsEventos.filter(e =>
        e.tipo === 'conta' &&
        String(e.idAlvo) === String(conta.id) &&
        e.source !== 'recorrente_futura' &&
        new Date(e.data + 'T12:00:00') <= new Date(dataLimite + 'T12:00:00') &&
        new Date(e.data + 'T12:00:00') >= new Date(conta.dataSaldoInicial + 'T12:00:00')
    );
    const saldoFinal = eventosFiltrados.reduce((acc, evento) => {
        return acc + arredondarMoeda(evento.valor);
    }, conta.saldoInicial);
    return arredondarMoeda(saldoFinal);
}
function obterTodosOsEventosDeCaixaDeBackup(dadosBackup) {
    const eventos = [];
    if (!dadosBackup) return eventos;
    
    const versaoBackup = dadosBackup.version || 0;

    // Etapa 1: Processa movimentações manuais/confirmadas com base na versão do backup
    if (dadosBackup.movimentacoes || versaoBackup >= 30) {
        // Lógica para ler o formato NOVO (v30 e posteriores)
        (dadosBackup.movimentacoes || [])
            .filter(mov => mov.source !== 'provento' && mov.source !== 'nota')
            .forEach(mov => {
                eventos.push({
                    id: mov.id,
                    data: mov.data,
                    valor: mov.valor,
                    descricao: mov.descricao,
                    tipo: mov.tipoAlvo,
                    idAlvo: String(mov.idAlvo),
                    moeda: mov.moeda,
                    source: mov.source,
                    sourceId: mov.sourceId,
                    transferenciaId: mov.transferenciaId
                });
            });
    } else {
        // Lógica para ler o formato ANTIGO (v29 e anteriores)
        (dadosBackup.transacoes || [])
            .filter(t => t.source !== 'provento' && t.source !== 'nota')
            .forEach(t => {
                if (t.contaId) { 
                    eventos.push({
                        id: t.id, data: t.data, valor: t.valor, descricao: t.descricao,
                        tipo: 'conta', idAlvo: String(t.contaId), moeda: 'BRL', source: t.source
                    });
                }
            });

        (dadosBackup.todasAsTransacoesMoedas || []).forEach(t => {
            const ativoMoeda = (dadosBackup.todosOsAtivosMoedas || []).find(a => String(a.id) === String(t.ativoMoedaId));
            if (ativoMoeda) {
                eventos.push({
                    id: t.id, data: t.data, valor: t.valor, descricao: t.descricao, tipo: 'moeda',
                    idAlvo: String(t.ativoMoedaId), moeda: ativoMoeda.moeda, source: t.source
                });
            }
        });
    }

    // Etapa 2: Processa eventos gerados dinamicamente (comum a todas as versões)
    (dadosBackup.notas || []).forEach(n => {
        if (!n.data) return;
        const contaInvestimento = (dadosBackup.contas || []).find(c => c.banco === n.corretora && c.tipo === 'Conta Investimento');
        if (contaInvestimento) {
            const totalCompras = n.operacoes.filter(op => op.tipo === 'compra').reduce((acc, op) => acc + op.valor, 0);
            const totalVendas = n.operacoes.filter(op => op.tipo === 'venda').reduce((acc, op) => acc + op.valor, 0);
            const valorLiquido = arredondarMoeda(totalVendas - totalCompras - (n.custos || 0) - (n.irrf || 0));
            if (valorLiquido !== 0) {
                const dataLiquidacao = calcularDataLiquidacao(n.data, 2).toISOString().split('T')[0];
                const dataFormatadaNota = new Date(n.data + 'T12:00:00').toLocaleDateString('pt-BR');
                eventos.push({
                    id: `nota_${n.id}`, data: dataLiquidacao, valor: valorLiquido,
                    descricao: `Liq. Nota Neg. ${n.corretora} nro. ${n.numero} de ${dataFormatadaNota}`,
                    tipo: 'conta', idAlvo: String(contaInvestimento.id), moeda: 'BRL', source: 'nota'
                });
            }
        }
    });

    (dadosBackup.proventos || []).forEach(p => {
        if (!p.dataPagamento || p.valorTotalRecebido === 0) return;
        for (const corretora in p.posicaoPorCorretora) {
            const dadosCorretora = p.posicaoPorCorretora[corretora];
            if (dadosCorretora.valorRecebido === 0) continue;
            const contaInvestimento = (dadosBackup.contas || []).find(c => c.banco === corretora && c.tipo === 'Conta Investimento');
            if (contaInvestimento) {
                
                let transacaoEditadaExiste = false;
                if (versaoBackup < 30) {
                    transacaoEditadaExiste = (dadosBackup.transacoes || []).some(t =>
                        t.source === 'provento_editado' && t.sourceId === p.id && String(t.contaId) === String(contaInvestimento.id)
                    );
                } else {
                    transacaoEditadaExiste = (dadosBackup.movimentacoes || []).some(t =>
                        t.source === 'provento_editado' && t.sourceId === p.id && t.tipoAlvo === 'conta' && String(t.idAlvo) === String(contaInvestimento.id)
                    );
                }

                if (transacaoEditadaExiste) continue;

                eventos.push({
                    id: `provento_${p.id}_${corretora}`, data: p.dataPagamento, valor: arredondarMoeda(dadosCorretora.valorRecebido),
                    descricao: `${p.tipo} de ${p.ticker} s/${Math.round(dadosCorretora.quantidade)}`,
                    tipo: 'conta', idAlvo: String(contaInvestimento.id), moeda: 'BRL', source: 'provento'
                });
            }
        }
    });
    
    gerarTransacoesFilhasDeBackup(dadosBackup).forEach(filha => {
        let eventoRecorrente = {
            id: filha.id, data: filha.data, valor: filha.valor, descricao: filha.descricao,
            tipo: filha.targetType, idAlvo: String(filha.targetId),
            source: 'recorrente_futura', maeId: filha.sourceId
        };
        if (filha.targetType === 'moeda') {
            const ativoMoeda = (dadosBackup.todosOsAtivosMoedas || []).find(a => String(a.id) === String(filha.targetId));
            eventoRecorrente.moeda = ativoMoeda ? ativoMoeda.moeda : '';
        } else {
            eventoRecorrente.moeda = 'BRL';
        }
        eventos.push(eventoRecorrente);
    });

    return eventos;
}
function calcularTotalProventosProvisionadosDeBackup(dadosBackup) {
    const hojeStr = new Date().toISOString().split('T')[0];
    const proventosProvisionados = (dadosBackup.proventos || []).filter(p =>
        p.dataCom && p.dataPagamento &&
        p.dataCom < hojeStr &&
        p.dataPagamento > hojeStr
    );
    return proventosProvisionados.reduce((soma, p) => soma + (p.valorTotalRecebido || 0), 0);
}
function calcularProjecaoProventosNegociacaoDeBackup(dadosBackup) {
    const posicoesParaCalculo = gerarPosicaoDetalhadaDeBackup(dadosBackup);
    let totalRendimentoAtualFIIs = 0;
    let totalRendimentoAtualAcoes = 0;

    for (const ticker in posicoesParaCalculo) {
        const ativoInfo = (dadosBackup.ativos || []).find(a => a.ticker === ticker);
        if (!ativoInfo) continue;
        const posicao = posicoesParaCalculo[ticker];
        if (!posicao || posicao.quantidade <= 0) continue;

        if (ativoInfo.tipo === 'FII') {
            const proventosDoAtivo = (dadosBackup.proventos || [])
                .filter(p => p.ticker === ticker && p.valorIndividual > 0 && p.dataCom)
                .sort((a, b) => new Date(b.dataCom) - new Date(a.dataCom));
            const ultimoProvento = proventosDoAtivo.length > 0 ? proventosDoAtivo[0].valorIndividual : 0;
            totalRendimentoAtualFIIs += ultimoProvento * posicao.quantidade;
        } else if (ativoInfo.tipo === 'Ação') {
            const projecaoAnualUnitaria = calcularProjecaoAnualUnitariaDeBackup(ticker, { limiteAnos: 5 }, dadosBackup);
            totalRendimentoAtualAcoes += (projecaoAnualUnitaria * posicao.quantidade) / 12;
        }
    }
    return {
        acoes: totalRendimentoAtualAcoes,
        fiis: totalRendimentoAtualFIIs
    };
}

function calcularSaldosRFEmDataDeBackup(ativoRF, dataLimite, dadosBackup) {
    const dataDeCorte = getDataInicioCicloAtualRFDeBackup(ativoRF, dadosBackup);
    const capitalInvestidoTotal = getCapitalInvestidoNoCicloAtualDeBackup(ativoRF, dataLimite, dadosBackup);

    const resgatesNoCiclo = (dadosBackup.movimentacoes || []).filter(t =>
        t.source === 'resgate_rf' &&
        t.sourceId === ativoRF.id &&
        t.data <= dataLimite &&
        t.data > dataDeCorte
    );
    
    const capitalRetornadoTotal = resgatesNoCiclo.reduce((sum, m) => sum + (m.devolucaoCapital || 0), 0);
    const resgatesTotais = resgatesNoCiclo.reduce((sum, m) => sum + Math.abs(m.valor), 0);
    const capitalInvestidoRestante = capitalInvestidoTotal - capitalRetornadoTotal;

    const rendimentosPassados = (dadosBackup.todosOsRendimentosRFNaoRealizados || [])
        .filter(r => 
            r.ativoId === ativoRF.id && 
            r.data <= dataLimite &&
            r.data > dataDeCorte
        )
        .sort((a, b) => new Date(b.data) - new Date(a.data));
    
    const rendimentoAcumuladoTotal = rendimentosPassados.length > 0 ? rendimentosPassados[0].rendimento : 0;

    const saldoLiquidoNaData = (capitalInvestidoTotal + rendimentoAcumuladoTotal) - resgatesTotais;
    const rendimentoBrutoRestante = saldoLiquidoNaData - capitalInvestidoRestante;

    return {
        valorInvestido: arredondarMoeda(capitalInvestidoRestante),
        saldoLiquido: arredondarMoeda(saldoLiquidoNaData),
        rendimentoBruto: arredondarMoeda(rendimentoBrutoRestante)
    };
}

function gerarTransacoesFilhasDeBackup(dadosBackup) {
    const transacoesGeradas = [];
    if (!dadosBackup || !dadosBackup.todasAsTransacoesRecorrentes) return transacoesGeradas;

    dadosBackup.todasAsTransacoesRecorrentes.forEach(mae => {
        if (!mae.dataInicio || !mae.recorrencia || !mae.termino) return;

        let ocorrenciasGeradas = 0;
        let dataCandidata = new Date(mae.dataInicio + 'T12:00:00');

        if (mae.recorrencia.frequencia === 'mensal') {
            const diaDaRegra = mae.recorrencia.dia;
            dataCandidata.setDate(1);
            dataCandidata.setDate(diaDaRegra);
            if (dataCandidata.getMonth() !== new Date(mae.dataInicio + 'T12:00:00').getMonth()) {
                 dataCandidata = new Date(dataCandidata.getFullYear(), dataCandidata.getMonth(), 0, 12, 0, 0);
            }
        }
        
        while (true) {
            if (ocorrenciasGeradas >= 240) break;
            if (mae.termino.tipo === 'data' && dataCandidata > new Date(mae.termino.valor + 'T12:00:00')) break;
            if (mae.termino.tipo === 'ocorrencias' && (ocorrenciasGeradas + (mae.datasProcessadas?.length || 0)) >= mae.termino.valor) break;

            const dataCandidataStr = dataCandidata.toISOString().split('T')[0];

            if (!mae.datasProcessadas || !mae.datasProcessadas.includes(dataCandidataStr)) {
                transacoesGeradas.push({
                    id: `${mae.id}_${dataCandidataStr}`, data: dataCandidataStr,
                    descricao: `(Recorrente) ${mae.descricao}`, valor: mae.valor,
                    source: 'recorrente_futura', sourceId: mae.id,
                    targetType: mae.targetType, targetId: mae.targetId
                });
            }
            
            ocorrenciasGeradas++;
            
            switch (mae.recorrencia.frequencia) {
                case 'mensal':
                    const diaParaSetar = mae.recorrencia.dia;
                    dataCandidata.setMonth(dataCandidata.getMonth() + 1);
                    dataCandidata.setDate(diaParaSetar);
                     if (dataCandidata.getDate() !== diaParaSetar) {
                       dataCandidata = new Date(dataCandidata.getFullYear(), dataCandidata.getMonth() + 1, 0, 12, 0, 0);
                    }
                    break;
                case 'quinzenal': dataCandidata.setDate(dataCandidata.getDate() + 14); break;
                case 'semanal': dataCandidata.setDate(dataCandidata.getDate() + 7); break;
            }
        }
    });
    return transacoesGeradas;
}
function calcularResumoDeBackup(dadosBackup) {
    const dataDoBackup = dadosBackup.mercado?.timestamp?.split('T')[0] || dadosBackup.dadosComparacao?.dataExportacao || new Date().toISOString().split('T')[0];
    const posicoesRV = gerarPosicaoDetalhadaDeBackup(dadosBackup, dataDoBackup);
    const todosOsEventosDoBackup = obterTodosOsEventosDeCaixaDeBackup(dadosBackup);

    let saldoTotalContas = 0;
    (dadosBackup.contas || []).forEach(conta => {
        saldoTotalContas += calcularSaldoEmDataDeBackup(conta, dataDoBackup, dadosBackup);
    });

    let valorTotalMoedas = 0;
    (dadosBackup.todosOsAtivosMoedas || []).forEach(ativo => {
        const transacoesDoAtivo = todosOsEventosDoBackup.filter(e =>
            e.tipo === 'moeda' &&
            String(e.idAlvo) === String(ativo.id) &&
            e.source !== 'recorrente_futura' &&
            e.data <= dataDoBackup
        );
        const saldoAtivo = transacoesDoAtivo.reduce((soma, t) => soma + arredondarMoeda(t.valor), ativo.saldoInicial);
        valorTotalMoedas += saldoAtivo * (dadosBackup.dadosMoedas?.cotacoes[ativo.moeda] || 0);
    });

    // --- INÍCIO DA ALTERAÇÃO ---
    // Agora, também calculamos o custo (baseado no Preço Médio)
    const resumoClasses = { 
        'Ações': { mercado: 0, custo: 0 }, 
        'FIIs': { mercado: 0, custo: 0 }, 
        'ETFs': { mercado: 0, custo: 0 }, 
        'Renda Fixa': { mercado: 0, custo: 0 } 
    };

    for (const ticker in posicoesRV) {
        const ativoInfo = (dadosBackup.ativos || []).find(a => a.ticker === ticker);
        const tipoMapeado = ativoInfo ? (ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
        
        if (tipoMapeado && resumoClasses.hasOwnProperty(tipoMapeado)) {
            const posicao = posicoesRV[ticker];
            const cotacao = dadosBackup.mercado?.cotacoes[ticker];
            if (posicao.quantidade > 0) {
                // Cálculo do Valor de Mercado (como já era feito)
                resumoClasses[tipoMapeado].mercado += (cotacao && cotacao.valor > 0) ? (posicao.quantidade * cotacao.valor) : (posicao.quantidade * posicao.precoMedio);
                // NOVO: Cálculo do Valor de Custo
                resumoClasses[tipoMapeado].custo += posicao.quantidade * posicao.precoMedio;
            }
        }
    }

    (dadosBackup.todosOsAtivosRF || []).forEach(ativo => {
        if ((ativo.descricao || '').toLowerCase().includes('(inativa)')) return;
        const saldosRF = calcularSaldosRFEmDataDeBackup(ativo, dataDoBackup, dadosBackup);
        resumoClasses['Renda Fixa'].mercado += saldosRF.saldoLiquido;
        resumoClasses['Renda Fixa'].custo += saldosRF.valorInvestido; // Custo da RF
    });
    
    const projecaoProventos = calcularProjecaoProventosNegociacaoDeBackup(dadosBackup);
    const proventosTotal = projecaoProventos.acoes + projecaoProventos.fiis;
    const valorCarteiraInvestimentos = Object.values(resumoClasses).reduce((s, v) => s + v.mercado, 0);
    const totalProventosProvisionados = calcularTotalProventosProvisionadosDeBackup(dadosBackup);
    const patrimonioTotal = valorCarteiraInvestimentos + saldoTotalContas + valorTotalMoedas + totalProventosProvisionados;

    return {
        nomeUsuario: dadosBackup.userName || "Carteira Importada",
        dataExportacao: dataDoBackup,
        patrimonioTotal: patrimonioTotal,
        carteiraInvestimentos: valorCarteiraInvestimentos,
        valorPorClasse: {
            'Ações': resumoClasses['Ações'].mercado, 'FIIs': resumoClasses['FIIs'].mercado,
            'ETFs': resumoClasses['ETFs'].mercado, 'Renda Fixa': resumoClasses['Renda Fixa'].mercado
        },
        // NOVO: Adiciona o objeto de custos ao retorno
        valorCustoPorClasse: {
            'Ações': resumoClasses['Ações'].custo, 'FIIs': resumoClasses['FIIs'].custo
        },
        proventosMensais: {
            acoes: projecaoProventos.acoes, fiis: projecaoProventos.fiis,
            etfs: 0, total: proventosTotal
        },
        saldoContas: saldoTotalContas,
        saldoMoedas: valorTotalMoedas,
        proventosProvisionados: totalProventosProvisionados
    };
    // --- FIM DA ALTERAÇÃO ---
}

function calcularValorTotalCarteira(dataLimite = null) {
    let valorTotal = 0;
    
    const posicoesRV = gerarPosicaoDetalhada(dataLimite);
    for (const ticker in posicoesRV) {
        const posicao = posicoesRV[ticker];
        const cotacao = dadosDeMercado.cotacoes[ticker];
        if (posicao.quantidade > 0 && cotacao && cotacao.valor > 0) {
            valorTotal += posicao.quantidade * cotacao.valor;
        }
    }

    todosOsAtivosRF.forEach(ativo => {
        if ((ativo.descricao || '').toLowerCase().includes('(inativa)')) {
            return;
        }
        if (!dataLimite || ativo.dataAplicacao <= dataLimite) {
            const saldosNaData = calcularSaldosRFEmData(ativo, dataLimite);
            valorTotal += saldosNaData.saldoLiquido;
        }
    });

    return valorTotal;
}

function getInicioIninterrupto(ticker) {
    const relatorioZeradas = gerarRelatorioPosicoesZeradas();
    const ultimaVendaTotal = relatorioZeradas
        .filter(r => r.ticker === ticker)
        .sort((a, b) => new Date(b.dataEncerramento) - new Date(a.dataEncerramento))[0];

    const dataUltimoEncerramento = ultimaVendaTotal ? ultimaVendaTotal.dataEncerramento : null;

    let eventosDeCompra = [];
    todasAsNotas.forEach(n => {
        n.operacoes.filter(op => op.ativo === ticker && op.tipo === 'compra')
            .forEach(op => eventosDeCompra.push({ data: n.data }));
    });
    posicaoInicial.filter(p => p.ticker === ticker && (!p.transacao || p.transacao.toLowerCase() === 'compra'))
        .forEach(p => eventosDeCompra.push({ data: p.data }));

    let eventosFiltrados = eventosDeCompra;
    if (dataUltimoEncerramento) {
        eventosFiltrados = eventosDeCompra.filter(e => new Date(e.data) > new Date(dataUltimoEncerramento));
    }

    if (eventosFiltrados.length === 0) return null;

    eventosFiltrados.sort((a, b) => new Date(a.data) - new Date(b.data));
    return eventosFiltrados[0].data;
}

function construirFluxoDeCaixa(tickers, dataFinal) {
    const fluxos = [];
    const datas = [];
    const tickerSet = new Set(tickers);

    // Saídas de Caixa (Compras)
    todasAsNotas.forEach(n => {
        n.operacoes.filter(op => tickerSet.has(op.ativo) && op.tipo === 'compra' && n.data <= dataFinal).forEach(op => {
            // --- INÍCIO DA CORREÇÃO ---
            // A lógica de rateio de custos foi corrigida para usar os custos corretos da nota
            const totalOperacoesNota = n.operacoes.reduce((soma, op) => soma + op.valor, 0);
            const custoRateado = totalOperacoesNota > 0 ? (op.valor / totalOperacoesNota) * (n.custos + n.irrf) : 0;
            // --- FIM DA CORREÇÃO ---
            fluxos.push(-(op.valor + custoRateado));
            datas.push(n.data);
        });
    });
    posicaoInicial.filter(p => tickerSet.has(p.ticker) && p.transacao && p.transacao.toLowerCase() === 'compra' && p.data <= dataFinal).forEach(p => {
        fluxos.push(-(p.precoMedio * p.quantidade));
        datas.push(p.data);
    });
    
    posicaoInicial.filter(p => p.tipoRegistro === 'SUMARIO_MANUAL' && tickerSet.has(p.ticker) && p.data <= dataFinal).forEach(p => {
        const quantidadeTotal = p.posicoesPorCorretora.reduce((soma, pc) => soma + pc.quantidade, 0);
        const custoTotal = quantidadeTotal * p.precoMedio;
        if (custoTotal > 0) {
            fluxos.push(-custoTotal);
            datas.push(p.data);
        }
    });

    todosOsAjustes.filter(a => a.tipoAjuste === 'evento_ativo' && a.tipoEvento === 'entrada' && tickerSet.has(a.ticker) && a.data <= dataFinal).forEach(a => {
        const qtdEntrada = a.detalhes.reduce((soma, d) => soma + d.quantidade, 0);
        fluxos.push(-(qtdEntrada * (a.precoMedio || 0)));
        datas.push(a.data);
    });

    // Entradas de Caixa (Vendas)
    todasAsNotas.forEach(n => {
        n.operacoes.filter(op => tickerSet.has(op.ativo) && op.tipo === 'venda' && n.data <= dataFinal).forEach(op => {
             const totalOperacoesNota = n.operacoes.reduce((soma, op) => soma + op.valor, 0);
            const custoRateado = totalOperacoesNota > 0 ? (op.valor / totalOperacoesNota) * n.custos : 0;
            fluxos.push(op.valor - custoRateado);
            datas.push(n.data);
        });
    });
     posicaoInicial.filter(p => tickerSet.has(p.ticker) && p.transacao && p.transacao.toLowerCase() === 'venda' && p.data <= dataFinal).forEach(p => {
        fluxos.push(p.valorVenda || 0);
        datas.push(p.data);
    });

    todosOsAjustes.filter(a => a.tipoAjuste === 'evento_ativo' && a.tipoEvento === 'saida' && tickerSet.has(a.ticker) && a.data <= dataFinal).forEach(a => {
        const dataAnterior = new Date(a.data + 'T12:00:00');
        dataAnterior.setDate(dataAnterior.getDate() - 1);
        const posAnterior = gerarPosicaoDetalhada(dataAnterior.toISOString().split('T')[0]);
        const pmNaSaida = posAnterior[a.ticker]?.precoMedio || 0;
        const qtdSaida = a.detalhes.reduce((soma, d) => soma + d.quantidade, 0);
        fluxos.push(qtdSaida * pmNaSaida);
        datas.push(a.data);
    });

    // Entradas de Caixa (Proventos)
    todosOsProventos.filter(p => tickerSet.has(p.ticker) && p.dataPagamento && p.dataPagamento <= dataFinal).forEach(p => {
        fluxos.push(p.valorTotalRecebido);
        datas.push(p.dataPagamento);
    });

    const fluxosCombinados = fluxos.map((valor, i) => ({ valor, data: datas[i] }))
        .sort((a, b) => new Date(a.data) - new Date(b.data));
    
    return {
        fluxos: fluxosCombinados.map(f => f.valor),
        datas: fluxosCombinados.map(f => f.data)
    };
}

function gerarHtmlTabelaAtivos(tipoAtivo, posicoesDetalhadas, filtroCorretora, valorTotalCarteira) {
    // 1. Inicia com os tickers que o usuário possui na carteira para esta categoria.
    const tickersEmPosicao = new Set(
        Object.keys(posicoesDetalhadas).filter(ticker => {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
            return ativoInfo && ativoInfo.tipo === tipoAtivo && posicoesDetalhadas[ticker].quantidade > 0.000001;
        })
    );

    // 2. Adiciona os tickers que estão no plano de alocação para esta categoria.
    const tickersPlanejados = new Set(
        Object.keys(dadosAlocacao.ativos).filter(ticker => {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
            return ativoInfo && ativoInfo.tipo === tipoAtivo;
        })
    );

    // 3. Combina as duas listas para ter a lista final de ativos a exibir.
    const tickersParaExibir = [...new Set([...tickersEmPosicao, ...tickersPlanejados])];

    // 4. Busca os objetos completos dos ativos que serão exibidos.
    const ativosParaProcessar = tickersParaExibir.map(ticker => todosOsAtivos.find(a => a.ticker === ticker)).filter(Boolean);


    // Pré-calcula os resultados realizados para todos os ativos de uma vez para otimização
    const tickersDaCategoria = ativosParaProcessar.map(a => a.ticker);
    const resultadosRealizadosMap = calcularResultadosRealizados(tickersDaCategoria);

    let dadosParaTabela = ativosParaProcessar.map(ativo => {
        if (!ativo) return null;

        const posTicker = posicoesDetalhadas[ativo.ticker];
        const quantidadeAtual = posTicker ? posTicker.quantidade : 0;
        
        const quantidadeFiltrada = (filtroCorretora === 'consolidado') 
            ? quantidadeAtual 
            : (posTicker ? (posTicker.porCorretora[filtroCorretora] || 0) : 0);
        
        // --- INÍCIO DA ALTERAÇÃO CORRIGIDA ---
        if (filtroCorretora !== 'consolidado') {
            // Se um filtro de corretora estiver ativo, esconde QUALQUER ativo que não tenha posição nela.
            if (quantidadeFiltrada < 0.000001) {
                return null;
            }
        } else {
            // Se estiver no "Consolidado", aplica a regra correta:
            if (quantidadeFiltrada < 0.000001) {
                const percIdeal = dadosAlocacao.ativos[ativo.ticker];
                // Esconde *APENAS SE* o ativo não estiver no plano de alocação.
                // Se ele estiver (mesmo com percIdeal === 0), ele deve ser exibido.
                if (percIdeal === undefined) {
                    return null;
                }
            }
        }
        // --- FIM DA ALTERAÇÃO CORRIGIDA ---

        const cotacao = dadosDeMercado.cotacoes[ativo.ticker];
        const precoAtual = cotacao ? cotacao.valor : 0;
        const valorDeMercado = quantidadeFiltrada * precoAtual;
        
        const projecaoAnual = (ativo.tipo === 'Ação') ? calcularProjecaoAnualUnitaria(ativo.ticker, { limiteAnos: 5 }) : getUltimoProvento(ativo.ticker) * 12;
        
        const precoMedio = posTicker ? posTicker.precoMedio : 0;
        const custoTotal = quantidadeFiltrada * precoMedio;
        
        const dataInicioCiclo = getInicioIninterrupto(ativo.ticker);
        const proventosRecebidos = todosOsProventos
            .filter(p => p.ticker === ativo.ticker && p.dataPagamento && (!dataInicioCiclo || p.dataPagamento >= dataInicioCiclo))
            .reduce((soma, p) => soma + p.valorTotalRecebido, 0);
        const resultadoRealizado = resultadosRealizadosMap.get(ativo.ticker) || 0;
        const totalRetornado = proventosRecebidos + resultadoRealizado;
        const progressoBreakEven = custoTotal > 0 ? Math.min(1, totalRetornado / custoTotal) : 0;

        return {
            ticker: ativo.ticker,
            nome: ativo.nome || 'Nome não cadastrado',
            quantidade: quantidadeFiltrada,
            precoMedio: precoMedio,
            precoAtual: precoAtual,
            custoTotal: custoTotal,
            valorDeMercado: valorDeMercado,
            variacaoPercentual: precoMedio > 0 ? (precoAtual - precoMedio) / precoMedio : 0,
            yoc: precoMedio > 0 ? projecaoAnual / precoMedio : 0,
            dy: precoAtual > 0 ? projecaoAnual / precoAtual : 0,
            pl: (ativo.tipo === 'Ação' && cotacao?.lpa_acao > 0 && precoAtual > 0) ? precoAtual / cotacao.lpa_acao : 0,
            // --- ALTERAÇÃO: Leitura unificada de P/VP ---
            pvp: (ativo.tipo === 'FII' && cotacao?.vpa > 0 && precoAtual > 0) ? precoAtual / cotacao.vpa : 0,
            alocacaoIdeal: dadosAlocacao.ativos[ativo.ticker] || 0,
            alocacaoAtual: valorTotalCarteira > 0 ? valorDeMercado / valorTotalCarteira : 0,
            progressoBreakEven: progressoBreakEven
        };
    }).filter(d => d !== null);

    if (dadosParaTabela.length === 0) {
        return { html: null, custoTotal: 0, valorMercado: 0 };
    }
    
    const sortConfig = sortConfigRendaVariavel[tipoAtivo];
    dadosParaTabela.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        const direction = sortConfig.direction === 'ascending' ? 1 : -1;
        if (typeof valA === 'string') return valA.localeCompare(valB) * direction;
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });

    const custoTotalCategoria = dadosParaTabela.reduce((soma, item) => soma + item.custoTotal, 0);
    const valorMercadoCategoria = dadosParaTabela.reduce((soma, item) => soma + item.valorDeMercado, 0);
    const alocacaoIdealTotalCategoria = dadosParaTabela.reduce((soma, item) => soma + item.alocacaoIdeal, 0);
    const alocacaoAtualTotalCategoria = dadosParaTabela.reduce((soma, item) => soma + item.alocacaoAtual, 0);
    
    let additionalHeaders = '';
    if (tipoAtivo === 'Ação') { additionalHeaders = '<th class="percentual sortable" data-key="yoc">YoC %</th><th class="percentual sortable" data-key="dy">DY %</th><th class="numero sortable" data-key="pl">P/L</th>'; } 
    else if (tipoAtivo === 'FII') { additionalHeaders = '<th class="percentual sortable" data-key="yoc">YoC %</th><th class="percentual sortable" data-key="dy">DY %</th><th class="numero sortable" data-key="pvp">P/VP</th>'; }
    
    const headers = `<th class="sortable" data-key="ticker">Ativo</th><th class="numero sortable" data-key="quantidade">Quantidade</th><th class="numero sortable" data-key="precoMedio">Preço Médio</th><th class="numero sortable" data-key="precoAtual">Preço Atual</th><th class="percentual col-variacao sortable" data-key="variacaoPercentual">Var. %</th><th class="numero sortable" data-key="custoTotal">Custo Total</th><th class="numero sortable" data-key="valorDeMercado">Valor de Mercado</th>${additionalHeaders}<th class="coluna-alocacao sortable" data-key="alocacaoIdeal">Alocação Ideal (% Global)</th><th class="coluna-alocacao sortable" data-key="alocacaoAtual">Alocação Atual (% Global)</th>`;
    
    let corpoTabela = '';
    dadosParaTabela.forEach(item => {
        const nomeAbreviado = truncarTexto(item.nome, 15);
        const valorAlocacaoIdeal = valorTotalCarteira * item.alocacaoIdeal;
        const diffPercent = item.variacaoPercentual;
        let classePreco = '', desempenhoHtml = '-';
        if (diffPercent > 0.0001) { classePreco = 'preco-maior'; desempenhoHtml = `<span class="preco-maior">↑ ${formatarPercentual(diffPercent)}</span>`; } 
        else if (diffPercent < -0.0001) { classePreco = 'preco-menor'; desempenhoHtml = `<span class="preco-menor">↓ ${formatarPercentual(Math.abs(diffPercent))}</span>`; }

        let additionalCells = '';
        if (tipoAtivo === 'Ação') {
            additionalCells = `<td class="percentual">${formatarPercentual(item.yoc)}</td><td class="percentual">${formatarPercentual(item.dy)}</td><td class="numero">${item.pl > 0 ? formatarDecimal(item.pl) : 'N/A'}</td>`;
        } else if (tipoAtivo === 'FII') {
            additionalCells = `<td class="percentual">${formatarPercentual(item.yoc)}</td><td class="percentual">${formatarPercentual(item.dy)}</td><td class="numero">${item.pvp > 0 ? formatarDecimal(item.pvp) : 'N/A'}</td>`;
        }
        
        const progressoPercentual = item.progressoBreakEven * 100;
        const corProgresso = '#d4edda';
        const estiloFundo = `background: linear-gradient(to right, ${corProgresso} ${progressoPercentual}%, transparent ${progressoPercentual}%);`;
        
        const isPlannedAsset = item.quantidade < 0.000001;
        const deleteIcon = isPlannedAsset ? `<i class="fas fa-times-circle acao-btn delete excluir-ativo-planejado" data-ticker="${item.ticker}" title="Remover da alocação planejada"></i>` : '';

        corpoTabela += `<tr class="ativo-row" data-ticker="${item.ticker}" style="${estiloFundo}" title="Progresso para o Break-Even: ${progressoPercentual.toFixed(1)}%">
            <td class="ativo-row-clickable" title="${item.nome}">${item.ticker} - ${nomeAbreviado} ${deleteIcon}</td>
            <td class="numero">${Math.round(item.quantidade)}</td><td class="numero">${formatarPrecoMedio(item.precoMedio)}</td>
            <td class="numero ${classePreco}">${formatarMoeda(item.precoAtual)}</td><td class="percentual col-variacao">${desempenhoHtml}</td>
            <td class="numero">${formatarMoeda(item.custoTotal)}</td><td class="numero ${item.valorDeMercado >= item.custoTotal ? 'valor-positivo' : 'valor-negativo'}">${formatarMoeda(item.valorDeMercado)}</td>
            ${additionalCells}
            <td class="percentual coluna-alocacao"><input type="text" class="alocacao-ativo-input" data-ativo-ticker="${item.ticker}" value="${formatarDecimal(item.alocacaoIdeal * 100)}"><span class="alocacao-valor-real">${formatarMoeda(valorAlocacaoIdeal)}</span></td>
            <td class="percentual coluna-alocacao">${formatarPercentual(item.alocacaoAtual)}<span class="alocacao-valor-real">${formatarMoeda(item.valorDeMercado)}</span></td>
        </tr>`;
    });
    
    let peTabelaHtml = '';
    let rodape = '<tr>';
    rodape += '<td colspan="5" style="text-align: right;"><strong>TOTAIS:</strong></td>';
    rodape += `<td class="numero"><strong>${formatarMoeda(custoTotalCategoria)}</strong></td>`;
    rodape += `<td class="numero"><strong>${formatarMoeda(valorMercadoCategoria)}</strong></td>`;

    if (tipoAtivo === 'Ação' || tipoAtivo === 'FII') {
        rodape += '<td></td><td></td><td></td>';
    }

    if (filtroCorretora === 'consolidado') {
        rodape += `<td class="numero coluna-alocacao"><strong>${formatarPercentual(alocacaoIdealTotalCategoria)}</strong></td>`;
        rodape += `<td class="numero coluna-alocacao"><strong>${formatarPercentual(alocacaoAtualTotalCategoria)}</strong></td>`;
    }
    rodape += '</tr>';
    peTabelaHtml = `<tfoot>${rodape}</tfoot>`;

    const classeTabela = filtroCorretora !== 'consolidado' ? 'filtro-corretora-ativo' : '';
    // --- INÍCIO DA ALTERAÇÃO TAREFA 2 ---
    // Adiciona a classe CSS e o data-attribute ao título <h2>
    const tituloSecao = tipoAtivo === 'FII' ? 'Fundos Imobiliários' : (tipoAtivo === 'Ação' ? 'Ações' : tipoAtivo + 's');
    const tituloHtml = `<h2 class="titulo-clicavel-grafico" data-tipo-ativo="${tipoAtivo}" title="Clique para ver o gráfico de cotações de ${tituloSecao}">${tituloSecao}</h2>`;
    // --- FIM DA ALTERAÇÃO TAREFA 2 ---

    const tabelaCompletaHtml = `<table class="${classeTabela}" data-tipo-ativo="${tipoAtivo}">
        <thead><tr>${headers}</tr></thead>
        <tbody>${corpoTabela}</tbody>
        ${peTabelaHtml}
    </table>`;
    
    // --- ALTERAÇÃO TAREFA 2: Retorna o título junto com o HTML da tabela ---
    return { html: tituloHtml + tabelaCompletaHtml, custoTotal: custoTotalCategoria, valorMercado: valorMercadoCategoria };
}
function abrirModalCalendariosUnificados(vistaInicial = 'fiis') {
    const container = document.getElementById('calendario-container');
    const titulo = document.getElementById('modal-calendario-titulo');
    
    container.innerHTML = `
        <div class="page-subheader" id="seletor-vista-calendario-unificado">
            <h2 class="subtitulo-calendario" data-vista="fiis">Rendimentos (FIIs)</h2>
            <h2 class="subtitulo-calendario" data-vista="acoes">Dividendos (Ações/ETFs)</h2>
        </div>
        <div id="conteudo-calendario-unificado"></div>
    `;

    const renderizarVista = (vista) => {
        const conteudoContainer = document.getElementById('conteudo-calendario-unificado');
        document.querySelector('[data-vista="fiis"]').classList.toggle('ativo', vista === 'fiis');
        document.querySelector('[data-vista="acoes"]').classList.toggle('ativo', vista === 'acoes');
        
        conteudoContainer.innerHTML = (vista === 'fiis') ? gerarHtmlCalendarioFIIs() : gerarHtmlCalendarioAcoes();

        conteudoContainer.querySelectorAll('.provento-item-container').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.target;
                const acoesDiv = item.querySelector('.provento-acoes');

                if (target.closest('.acao-btn')) {
                    const proventoId = parseFloat(item.dataset.proventoId);
                    const provento = todosOsProventos.find(p => p.id === proventoId);
                    if (provento) {
                        const tipoAtivo = todosOsAtivos.find(a => a.ticker === provento.ticker)?.tipo;
                        retornoModalProvento = `unificado-${tipoAtivo === 'FII' ? 'fiis' : 'acoes'}`;
                        if (target.closest('.edit')) {
                            abrirModalLancamentoProvento(provento);
                        } else if (target.closest('.delete')) {
                            deletarProvento(provento.id);
                        }
                    }
                } else {
                    document.querySelectorAll('.provento-acoes').forEach(el => {
                        if (el !== acoesDiv) el.style.display = 'none';
                    });
                    acoesDiv.style.display = acoesDiv.style.display === 'flex' ? 'none' : 'flex';
                }
            });
        });
    };

    document.getElementById('seletor-vista-calendario-unificado').addEventListener('click', (e) => {
        const target = e.target.closest('.subtitulo-calendario');
        if (target && !target.classList.contains('ativo')) {
            renderizarVista(target.dataset.vista);
        }
    });

    titulo.textContent = 'Calendários de Proventos';
    renderizarVista(vistaInicial); // Renderiza a aba inicial passada como parâmetro
    abrirModal('modal-proventos-calendario');
}

function abrirModalDetalhesAtivo(ticker) {
    const ativo = todosOsAtivos.find(a => a.ticker === ticker);
    const posicao = gerarPosicaoDetalhada()[ticker];
    const dadosMercado = dadosDeMercado.cotacoes[ticker] || {};
    
    if (!ativo) return;

    // 1. Busca dados de balanceamento
    const dadosBalanceamento = gerarDadosBalanceamento('todos');
    const tipoCategoria = ativo.tipo === 'Ação' ? 'Ações' : ativo.tipo === 'FII' ? 'FIIs' : 'ETF';
    const dadosDoAtivoNoBalanceamento = dadosBalanceamento.categorias[tipoCategoria]?.ativos.find(a => a.ticker === ticker);
    
    const dadosBal = dadosDoAtivoNoBalanceamento || { 
        ideal: { percentualGlobal: 0, valor: 0 }, 
        atual: { percentualGlobal: 0, valor: 0 },
        ajuste: { valor: 0, percentual: 0 }
    };

    // 2. Determina o contexto
    const isCompra = dadosBal.ajuste.valor > 0;
    const isVenda = dadosBal.ajuste.valor < 0;
    
    const modalTitulo = document.getElementById('modal-ativo-detalhes-titulo');
    const modalConteudo = document.getElementById('modal-ativo-detalhes-conteudo');
    const modalFooter = document.querySelector('#modal-ativo-detalhes .form-actions'); 

    let tituloAcao = isCompra ? 'Oportunidade (Compra)' : (isVenda ? 'Rebalanceamento (Venda)' : 'Em Equilíbrio');
    modalTitulo.textContent = `Análise de ${tituloAcao} - ${ativo.ticker}`;
    
    // --- CONSTRUÇÃO DO CONTEÚDO ---
    let conteudoHtml = '';

    // SEÇÃO 1: DIAGNÓSTICO DE ALOCAÇÃO
    const percIdeal = dadosBal.ideal.percentualGlobal;
    const percAtual = dadosBal.atual.percentualGlobal;
    const desvio = dadosBal.ajuste.percentual; 
    const classeDesvio = desvio > 0 ? 'valor-positivo' : 'valor-negativo';
    
    const tolerancia = 0.02; 
    const modoAtual = dadosAlocacao.modoRebalanceamento || 'categoria';
    const textoModo = modoAtual === 'ativo' ? 'Por Ativo (Individual)' : 'Por Categoria (Hierárquico)';

    conteudoHtml += `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; color: #495057;">Diagnóstico de Alocação (${textoModo})</h4>
            <div class="form-grid" style="grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                <div><label style="display:block; font-size:0.8em; color:#666;">Alocação Ideal</label><strong>${formatarPercentual(percIdeal)}</strong></div>
                <div><label style="display:block; font-size:0.8em; color:#666;">Alocação Atual</label><strong>${formatarPercentual(percAtual)}</strong></div>
                <div><label style="display:block; font-size:0.8em; color:#666;">Desvio</label><strong class="${classeDesvio}">${formatarPercentual(Math.abs(desvio))} ${desvio > 0 ? '(Abaixo)' : '(Acima)'}</strong></div>
            </div>
            <p style="margin-top: 10px; font-size: 0.9em; text-align: center;">
                ${isCompra ? `Necessidade de Aporte: <strong>${formatarMoeda(dadosBal.ajuste.valor)}</strong>` : `Excesso de Capital: <strong>${formatarMoeda(Math.abs(dadosBal.ajuste.valor))}</strong>`}
            </p>
        </div>
    `;

    // SEÇÃO 2: LÓGICA ESPECÍFICA
    if (isCompra || (!isCompra && !isVenda)) {
        // --- LÓGICA DE COMPRA ---
        const scores = calcularScoreDeQualidade(ativo, dadosMercado);
        
        conteudoHtml += `
            <h4 style="color: var(--success-color); border-bottom: 2px solid var(--success-color); padding-bottom: 5px;">Racional de Priorização (Score: ${scores.final.toFixed(0)}/100)</h4>
            <p style="font-size: 0.9em; color: #555; margin-bottom: 15px;">Critérios que definem a prioridade deste ativo na fila de compras.</p>
            <table class="dashboard-table">
                <thead><tr><th>Critério</th><th class="numero">Dado Atual</th><th class="numero">Pontuação</th></tr></thead>
                <tbody>
        `;

        if (ativo.tipo === 'Ação') {
            const projecaoAnual = calcularProjecaoAnualUnitaria(ticker, { limiteAnos: 5 });
            const yieldProj = (dadosMercado.valor > 0) ? projecaoAnual / dadosMercado.valor : 0;
            const tetoBazin = calcularPrecoTetoBazin(projecaoAnual, ativo.metaYieldBazin || 0.06);
            const payout = (dadosMercado.lpa_acao > 0) ? projecaoAnual / dadosMercado.lpa_acao : 0;
            
            const tipYield = `Yield Projetado (${formatarPercentual(yieldProj)}):\nEste valor representa o retorno esperado em dividendos. Valores acima de 6% ganham mais pontos.`;
            const tipBazin = `Método Bazin:\nO Preço Teto calculado é ${formatarMoeda(tetoBazin)}. Como o preço atual é ${formatarMoeda(dadosMercado.valor)}, a margem de segurança define a pontuação.`;
            
            conteudoHtml += `
                <tr><td>Yield Projetado <i class="fas fa-question-circle info-icon" data-tooltip="${tipYield}"></i></td><td class="numero">${formatarPercentual(yieldProj)}</td><td class="numero"><strong>${scores.yield.toFixed(0)}</strong> pts</td></tr>
                <tr><td>Preço Teto Bazin <i class="fas fa-question-circle info-icon" data-tooltip="${tipBazin}"></i></td><td class="numero">Teto: ${formatarMoeda(tetoBazin)}</td><td class="numero"><strong>${scores.bazin.toFixed(0)}</strong> pts</td></tr>
                <tr><td>Payout (5%)</td><td class="numero">${formatarPercentual(payout)}</td><td class="numero"><strong>${scores.payout.toFixed(0)}</strong> pts</td></tr>
                <tr><td>Data-Com Próxima (15%)</td><td class="numero">${scores.dataCom > 0 ? 'Sim' : 'Não'}</td><td class="numero"><strong>${scores.dataCom.toFixed(0)}</strong> pts</td></tr>
            `;
        } else if (ativo.tipo === 'FII') {
            const ultimoProv = getUltimoProvento(ticker);
            const yieldProj = (dadosMercado.valor > 0 && ultimoProv > 0) ? (ultimoProv * 12) / dadosMercado.valor : 0;
            const pvp = (dadosMercado.vpa > 0 && dadosMercado.valor > 0) ? dadosMercado.valor / dadosMercado.vpa : 0;
            
            const tipPVP = `P/VP (${formatarDecimal(pvp)}):\nIndica se o fundo está barato (abaixo de 1.0) ou caro. O sistema prioriza fundos descontados.`;

            conteudoHtml += `
                <tr><td>Dividend Yield <i class="fas fa-question-circle info-icon" data-tooltip="Yield projetado anualizado: ${formatarPercentual(yieldProj)}"></i></td><td class="numero">${formatarPercentual(yieldProj)}</td><td class="numero"><strong>${scores.yield.toFixed(0)}</strong> pts</td></tr>
                <tr><td>P/VP <i class="fas fa-question-circle info-icon" data-tooltip="${tipPVP}"></i></td><td class="numero">${formatarDecimal(pvp)}</td><td class="numero"><strong>${scores.pvp.toFixed(0)}</strong> pts</td></tr>
            `;
        }
        conteudoHtml += `</tbody></table>`;

    } else {
        // --- LÓGICA DE VENDA: TOOLTIPS INTELIGENTES ---
        const precoMedio = posicao ? posicao.precoMedio : 0;
        const precoAtual = dadosMercado.valor || 0;
        
        // 1. Análise da Banda de Tolerância
        const estourouTolerancia = Math.abs(desvio) > tolerancia;
        let statusTolerancia = '';
        let tipTolerancia = '';

        if (modoAtual === 'categoria' && !estourouTolerancia) {
             // Caso TVRI11: Não estourou a banda individual, mas foi chamado pela categoria
             statusTolerancia = '<span style="color:var(--warning-color); font-weight:bold;">IGNORADO (Regra da Categoria)</span>';
             tipTolerancia = `Motivo da Sugestão:\nEmbora o desvio individual (${formatarPercentual(Math.abs(desvio))}) esteja dentro da banda de ${formatarPercentual(tolerancia)}, este ativo pertence a uma Categoria (${tipoCategoria}) que excedeu a meta global. O sistema sugere reduzi-lo para reenquadrar a categoria.`;
        } else if (estourouTolerancia) {
             statusTolerancia = '<span style="color:var(--danger-color); font-weight:bold;">ACIMA DO LIMITE</span>';
             tipTolerancia = `Excesso Detectado:\nO ativo ultrapassou a banda de tolerância de ${formatarPercentual(tolerancia)}. Desvio atual: ${formatarPercentual(Math.abs(desvio))}. A venda é sugerida para reequilíbrio.`;
        } else {
             statusTolerancia = '<span style="color:var(--success-color); font-weight:bold;">DENTRO DA BANDA</span>';
             tipTolerancia = `Situação Normal:\nO desvio está dentro do limite aceitável de ${formatarPercentual(tolerancia)}.`;
        }

        // 2. Análise da Trava de Prejuízo
        const isLucro = precoAtual >= precoMedio;
        const statusLucro = isLucro 
            ? `<span style="color:var(--success-color); font-weight:bold;">LIBERADO (Lucro)</span>` 
            : `<span style="color:var(--danger-color); font-weight:bold;">BLOQUEADO (Prejuízo)</span>`;
        
        let tipLucro = '';
        if (!isLucro) {
            tipLucro = `BLOQUEIO DE PROTEÇÃO:\nPreço Atual (${formatarMoeda(precoAtual)}) é INFERIOR ao Preço Médio (${formatarMoeda(precoMedio)}).\nO sistema bloqueia a venda para evitar a realização de prejuízo financeiro, ignorando a necessidade de rebalanceamento neste momento.`;
        } else {
            tipLucro = `Venda Permitida:\nPreço Atual (${formatarMoeda(precoAtual)}) é SUPERIOR ao Preço Médio (${formatarMoeda(precoMedio)}).\nA venda gerará lucro tributável ou isento.`;
        }

        // 3. Trava de Valuation (FIIs)
        let htmlPVP = '';
        if (ativo.tipo === 'FII') {
            const vpa = dadosMercado.vpa || 0;
            const pvp = (vpa > 0 && precoAtual > 0) ? precoAtual / vpa : 0;
            const isPvpOk = pvp >= 1.0; 
            
            const statusPvp = isPvpOk 
                ? `<span style="color:var(--success-color); font-weight:bold;">LIBERADO (Ágio)</span>` 
                : `<span style="color:var(--warning-color); font-weight:bold;">ALERTA (Deságio)</span>`;
            
            let tipPVPVenda = '';
            if (!isPvpOk) {
                tipPVPVenda = `Alerta de Valuation:\nO fundo está sendo negociado abaixo do valor patrimonial (P/VP ${formatarDecimal(pvp)}). Vender agora significa entregar o patrimônio com desconto.`;
            } else {
                tipPVPVenda = `Valuation Adequado:\nO fundo está sendo negociado com ágio (P/VP ${formatarDecimal(pvp)}). Venda liberada do ponto de vista de valor.`;
            }
            
            htmlPVP = `<tr>
                <td>Trava de Valuation <i class="fas fa-question-circle info-icon" data-tooltip="${tipPVPVenda}"></i></td>
                <td class="numero">P/VP: ${formatarDecimal(pvp)}</td>
                <td class="numero">${statusPvp}</td>
            </tr>`;
        }

        conteudoHtml += `
            <h4 style="color: var(--danger-color); border-bottom: 2px solid var(--danger-color); padding-bottom: 5px;">Auditoria de Venda (Travas de Segurança)</h4>
            <p style="font-size: 0.9em; color: #555; margin-bottom: 15px;">Análise detalhada das regras que permitem ou bloqueiam a venda.</p>
            
            <table class="dashboard-table">
                <thead><tr><th>Critério / Regra</th><th class="numero">Dados do Ativo</th><th class="numero">Status</th></tr></thead>
                <tbody>
                    <tr>
                        <td>Banda de Tolerância <i class="fas fa-question-circle info-icon" data-tooltip="${tipTolerancia}"></i></td>
                        <td class="numero">Excesso: ${formatarPercentual(Math.abs(desvio))}</td>
                        <td class="numero">${statusTolerancia}</td>
                    </tr>
                    <tr>
                        <td>Trava de Prejuízo <i class="fas fa-question-circle info-icon" data-tooltip="${tipLucro}"></i></td>
                        <td class="numero">PM: <strong>${formatarMoeda(precoMedio)}</strong> <br> Atual: <strong>${formatarMoeda(precoAtual)}</strong></td>
                        <td class="numero">${statusLucro}</td>
                    </tr>
                    ${htmlPVP}
                </tbody>
            </table>
        `;
    }

    modalConteudo.innerHTML = conteudoHtml;
    
    if (modalFooter) {
        modalFooter.innerHTML = '<p class="info-esc" style="margin: 0; width: 100%; text-align: center;">Clique fora para sair</p>';
    }

    document.getElementById('modal-ativo-detalhes').style.display = 'block';
}

function gerarAlertaDeConcentracaoHtml() {
    const posicoesRV = [];
    const posicoesDetalhadas = gerarPosicaoDetalhada();
    const tiposRV = new Set(['Ação', 'FII', 'ETF']);

    for (const ticker in posicoesDetalhadas) {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        if (ativoInfo && tiposRV.has(ativoInfo.tipo)) {
            const posicao = posicoesDetalhadas[ticker];
            const cotacao = dadosDeMercado.cotacoes[ticker];
            if (posicao.quantidade > 0 && cotacao && cotacao.valor > 0) {
                posicoesRV.push({
                    ticker,
                    valorDeMercado: posicao.quantidade * cotacao.valor
                });
            }
        }
    }

    if (posicoesRV.length < 3) return '';

    const valorTotalRV = posicoesRV.reduce((soma, ativo) => soma + ativo.valorDeMercado, 0);
    if (valorTotalRV === 0) return '';
    
    posicoesRV.sort((a, b) => b.valorDeMercado - a.valorDeMercado);

    // <<< ALTERAÇÃO: Captura a lista de tickers para usar no tooltip >>>
    const tickersTop3 = posicoesRV.slice(0, 3).map(p => p.ticker).join(', ');
    const tickersTop5 = posicoesRV.slice(0, 5).map(p => p.ticker).join(', ');
    const tickersTop10 = posicoesRV.slice(0, 10).map(p => p.ticker).join(', ');
    
    const top3 = posicoesRV.slice(0, 3).reduce((soma, ativo) => soma + ativo.valorDeMercado, 0);
    const top5 = posicoesRV.slice(0, 5).reduce((soma, ativo) => soma + ativo.valorDeMercado, 0);
    const top10 = posicoesRV.slice(0, 10).reduce((soma, ativo) => soma + ativo.valorDeMercado, 0);
    
    const percTop3 = formatarPercentual(top3 / valorTotalRV);
    const percTop5 = formatarPercentual(top5 / valorTotalRV);
    const percTop10 = formatarPercentual(top10 / valorTotalRV);

    // <<< ALTERAÇÃO: Adiciona o atributo 'data-tooltip' aos elementos <strong> >>>
    return `
        <div class="rebalanceamento-item" style="flex-direction: column; align-items: flex-start; background-color: #fffaf0; border: 1px solid #ffeeba; padding: 10px; border-radius: 6px;">
            <strong style="color: #856404;"><i class="fas fa-exclamation-triangle"></i> Análise de Concentração (Renda Variável)</strong>
            <small style="display: block; margin-top: 5px; line-height: 1.5;">
                Seus <strong data-tooltip="${tickersTop3}" style="cursor: help; text-decoration: underline dotted;">3 maiores</strong> ativos representam <strong>${percTop3}</strong> da carteira.<br>
                Seus <strong data-tooltip="${tickersTop5}" style="cursor: help; text-decoration: underline dotted;">5 maiores</strong> ativos representam <strong>${percTop5}</strong> da carteira.<br>
                Seus <strong data-tooltip="${tickersTop10}" style="cursor: help; text-decoration: underline dotted;">10 maiores</strong> ativos representam <strong>${percTop10}</strong> da carteira.
            </small>
        </div>
    `;
}
function renderizarPosicaoRF() {
    const container = document.getElementById('posicao-rf-container');
    const summaryContainer = document.getElementById('summary-rf');
    const filtroDataInput = document.querySelector('#tela-renda-fixa .date-filter');
    const filtroData = filtroDataInput.value || new Date().toISOString().split('T')[0];

    const ativosParaExibir = [];
    todosOsAtivosRF.forEach(ativo => {
        const descricao = (ativo.descricao || '').toLowerCase();
        const isInativa = descricao.includes('inativa') || descricao.includes('encerrada');
        
        const existeNaData = ativo.dataAplicacao <= filtroData;
        
        if (isInativa || !existeNaData) {
            return;
        }

        const saldosNaData = calcularSaldosRFEmData(ativo, filtroData);
        
        if (ativo.dataVencimento >= filtroData || saldosNaData.saldoLiquido > 0.001) {
            ativosParaExibir.push({ ...ativo, saldosCalculados: saldosNaData });
        }
    });
    
    if (ativosParaExibir.length === 0) {
        container.innerHTML = '<p style="text-align: center;">Nenhuma aplicação de Renda Fixa encontrada para a data selecionada.</p>';
        summaryContainer.innerHTML = '';
        return;
    }
    
    let custoTotalRF = 0;
    let valorLiquidoRF = 0;
    let corpoTabela = '';
    
    ativosParaExibir.sort((a,b) => a.descricao.localeCompare(b.descricao)).forEach(ativo => {
        const saldos = ativo.saldosCalculados;
        custoTotalRF += saldos.valorInvestido;
        valorLiquidoRF += saldos.saldoLiquido;

        const diasCorridos = calcularDiffDias(ativo.dataAplicacao, filtroData);
        const rentabilidade = saldos.valorInvestido > 0 ? (saldos.rendimentoBruto / saldos.valorInvestido) : 0;

        const ultimoSnapshot = todosOsRendimentosRFNaoRealizados
            .filter(r => r.ativoId === ativo.id)
            .sort((a,b) => new Date(b.data) - new Date(a.data))[0];
        
        const dataUltimoSnapshot = ultimoSnapshot 
            ? `Atualizado em: ${new Date(ultimoSnapshot.data + 'T12:00:00').toLocaleDateString('pt-BR')}` 
            : 'Nunca atualizado';

        corpoTabela += `
            <tr>
                <td>${ativo.descricao}</td>
                <td>${ativo.instituicao}</td>
                <td class="numero">${new Date(ativo.dataAplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="numero">${new Date(ativo.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="numero">${diasCorridos}</td>
                <td class="numero">${formatarMoeda(saldos.valorInvestido)}</td>
                <td class="numero editable-cell-container">
                    <div contenteditable="true" class="editable-saldo-rf" data-rf-id="${ativo.id}" title="Clique para editar o saldo líquido">${formatarMoeda(saldos.saldoLiquido)}</div>
                    <small class="snapshot-date">${dataUltimoSnapshot}</small>
                </td>
                <td class="numero ${saldos.rendimentoBruto >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarMoeda(saldos.rendimentoBruto)}</td>
                <td class="percentual ${rentabilidade >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarPercentual(rentabilidade)}</td>
                <td class="controles-col">
                    <button class="btn btn-sm btn-success btn-aportar-rf btn-acao-rf" data-rf-id="${ativo.id}" title="Aportar">+</button>
                    <button class="btn btn-sm btn-danger btn-resgatar-rf btn-acao-rf" data-rf-id="${ativo.id}" title="Resgatar">-</button>
                    <button class="btn btn-sm btn-secondary btn-historico-rf btn-acao-rf" data-rf-id="${ativo.id}" title="Histórico"><i class="fas fa-history"></i></button>
                    <i class="fas fa-trash acao-btn delete" title="Inativar Aplicação" data-ativo-rf-id="${ativo.id}"></i>
                    </td>
            </tr>
        `;
    });

    const rendimentoTotal = valorLiquidoRF - custoTotalRF;
    const rentabilidadeTotal = custoTotalRF > 0 ? rendimentoTotal / custoTotalRF : 0;
    const classeResultado = rendimentoTotal >= 0 ? 'valor-positivo' : 'valor-negativo';

    summaryContainer.innerHTML = `
        <div class="summary-item">Custo Total (Aportes) <span>${formatarMoeda(custoTotalRF)}</span></div>
        <div class="summary-item">Saldo Líquido Atual <span>${formatarMoeda(valorLiquidoRF)}</span></div>
        <div class="summary-item">Rendimento Total <span class="${classeResultado}">${formatarMoeda(rendimentoTotal)} (${formatarPercentual(rentabilidadeTotal)})</span></div>
    `;
    const headers = `
        <th>Descrição</th>
        <th>Instituição</th>
        <th class="numero">Aplicação</th>
        <th class="numero">Vencimento</th>
        <th class="numero">Dias Corridos</th>
        <th class="numero">Valor Investido</th>
        <th class="numero">Saldo Líquido Atual</th>
        <th class="numero">Rendimento Líquido</th>
        <th class="percentual">Rentabilidade</th>
        <th class="controles-col">Ações</th>`;

    container.innerHTML = `<table><thead><tr>${headers}</tr></thead><tbody>${corpoTabela}</tbody></table>`;
}

function abrirModalPerformance(tipoAtivo) {
    const modal = document.getElementById('modal-performance-detalhes');
    const tituloModal = modal.querySelector('h3');
    const container = modal.querySelector('div[id^="modal-"]');
    
    const titulo = tipoAtivo === 'Renda Variável' ? tipoAtivo : `${tipoAtivo}s`;
    tituloModal.textContent = `Análise de Performance - ${titulo}`;
    container.innerHTML = '<h4>Calculando...</h4>';
    abrirModal('modal-performance-detalhes');

    const hoje = new Date().toISOString().split('T')[0];
    const posicoesAtuais = gerarPosicaoDetalhada();
    
    const tiposConsiderados = (tipoAtivo === 'Renda Variável') ? ['Ação', 'FII', 'ETF'] : [tipoAtivo];
    const ativosAtuaisNaCategoria = todosOsAtivos
        .filter(a => tiposConsiderados.includes(a.tipo) && posicoesAtuais[a.ticker]?.quantidade > 0.000001)
        .map(a => a.ticker);

    if (ativosAtuaisNaCategoria.length === 0) {
        container.innerHTML = `<p>Nenhuma posição em ${titulo} para analisar.</p>`;
        return;
    }

    const datasInicioMap = new Map();
    ativosAtuaisNaCategoria.forEach(ticker => {
        datasInicioMap.set(ticker, getInicioIninterrupto(ticker));
    });

    const resultadosRealizadosMap = calcularResultadosRealizados(ativosAtuaisNaCategoria, datasInicioMap);
    
    const proventosCategoria = todosOsProventos.filter(p => ativosAtuaisNaCategoria.includes(p.ticker) && new Date(p.dataPagamento) >= new Date(datasInicioMap.get(p.ticker)));
    const totalDividendosCategoria = proventosCategoria.reduce((soma, p) => soma + p.valorTotalRecebido, 0);

    const custoTotalCategoria = ativosAtuaisNaCategoria.reduce((soma, ticker) => soma + (posicoesAtuais[ticker].quantidade * posicoesAtuais[ticker].precoMedio), 0);
    const mercadoTotalCategoria = ativosAtuaisNaCategoria.reduce((soma, ticker) => {
        const cotacao = dadosDeMercado.cotacoes[ticker]?.valor || posicoesAtuais[ticker].precoMedio;
        return soma + (posicoesAtuais[ticker].quantidade * cotacao);
    }, 0);

    const ganhoCapitalCategoria = mercadoTotalCategoria - custoTotalCategoria;
    const realizadosTotalCategoria = Array.from(resultadosRealizadosMap.values()).reduce((soma, v) => soma + v, 0);
    const retornoTotalCategoria = ganhoCapitalCategoria + realizadosTotalCategoria + totalDividendosCategoria;
    
    let fluxosAgregados = [], datasAgregadas = [];
    ativosAtuaisNaCategoria.forEach(ticker => {
        const dataInicio = datasInicioMap.get(ticker);
        let { fluxos, datas } = construirFluxoDeCaixa([ticker], hoje);
        if (dataInicio) {
            for (let i = 0; i < datas.length; i++) {
                if (new Date(datas[i]) >= new Date(dataInicio)) {
                    fluxosAgregados.push(fluxos[i]);
                    datasAgregadas.push(datas[i]);
                }
            }
        }
    });
    
    if(fluxosAgregados.length > 0) {
        fluxosAgregados.push(mercadoTotalCategoria);
        datasAgregadas.push(hoje);
    }
    const tirAgregada = calcularTIR(fluxosAgregados, datasAgregadas);

    let htmlFinal = `
        <h4>Performance Consolidada da Categoria</h4>
        <table class="dashboard-table">
            <thead>
                <tr>
                    <th>Métrica</th>
                    <th class="numero">Valor (R$)</th>
                    <th class="percentual">% sobre Custo</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Custo Total dos Aportes</td><td class="numero">${formatarMoeda(custoTotalCategoria)}</td><td class="percentual"></td></tr>
                <tr><td>Ganho/Perda de Capital (Não Realizado)</td><td class="numero ${ganhoCapitalCategoria >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarMoeda(ganhoCapitalCategoria)}</td><td class="percentual ${ganhoCapitalCategoria >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarPercentual(ganhoCapitalCategoria / custoTotalCategoria)}</td></tr>
                <tr><td>Resultados Realizados (no período)</td><td class="numero ${realizadosTotalCategoria >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarMoeda(realizadosTotalCategoria)}</td><td class="percentual ${realizadosTotalCategoria >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarPercentual(realizadosTotalCategoria / custoTotalCategoria)}</td></tr>
                <tr><td>Dividendos/Rendimentos Recebidos</td><td class="numero valor-positivo">${formatarMoeda(totalDividendosCategoria)}</td><td class="percentual valor-positivo">${formatarPercentual(totalDividendosCategoria / custoTotalCategoria)}</td></tr>
                <tr class="total-row"><td>Retorno Total</td><td class="numero ${retornoTotalCategoria >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarMoeda(retornoTotalCategoria)}</td><td class="percentual ${retornoTotalCategoria >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarPercentual(retornoTotalCategoria / custoTotalCategoria)}</td></tr>
                <tr><td>TIR Anualizada (MWRR)</td><td colspan="2" class="percentual ${tirAgregada >= 0 ? 'valor-positivo' : 'valor-negativo'}">${!isNaN(tirAgregada) ? formatarPercentual(tirAgregada) : 'N/A'}</td></tr>
            </tbody>
        </table>
        <hr style="margin: 25px 0;">
        <h4>Performance Individual por Ativo</h4>
        <table class="dashboard-table">
            <thead>
                <tr>
                    <th>Ativo</th>
                    <th class="numero">Custo Total</th>
                    <th class="numero">Valor Mercado</th>
                    <th class="numero">Variação (R$)</th>
                    <th class="numero">Result. Realizado</th>
                    <th class="numero">Dividendos</th>
                    <th class="numero">Retorno Total</th>
                    <th class="percentual">TIR Anual</th>
                </tr>
            </thead>
            <tbody>`;

    const resultadosIndividuais = [];
    ativosAtuaisNaCategoria.forEach(ticker => {
        const posicao = posicoesAtuais[ticker];
        const cotacao = dadosDeMercado.cotacoes[ticker]?.valor || posicao.precoMedio;
        
        const custoTotal = posicao.quantidade * posicao.precoMedio;
        const valorMercado = posicao.quantidade * cotacao;
        const ganhoCapital = valorMercado - custoTotal;
        const dataInicio = datasInicioMap.get(ticker);

        const dividendosAtivo = todosOsProventos
            .filter(p => p.ticker === ticker && new Date(p.dataPagamento) >= new Date(dataInicio))
            .reduce((soma, p) => soma + p.valorTotalRecebido, 0);
        
        const resultadoRealizado = resultadosRealizadosMap.get(ticker) || 0;
        const retornoTotal = ganhoCapital + resultadoRealizado + dividendosAtivo;
        
        let { fluxos, datas } = construirFluxoDeCaixa([ticker], hoje);
        if (dataInicio) {
            const fluxosFiltrados = [], datasFiltradas = [];
            for (let i = 0; i < datas.length; i++) {
                if (new Date(datas[i]) >= new Date(dataInicio)) {
                    fluxosFiltrados.push(fluxos[i]);
                    datasFiltradas.push(datas[i]);
                }
            }
            fluxos = fluxosFiltrados;
            datas = datasFiltradas;
        }

        if(fluxos.length > 0) {
            fluxos.push(valorMercado);
            datas.push(hoje);
        }
        const tir = calcularTIR(fluxos, datas);
        
        resultadosIndividuais.push({ ticker, custoTotal, valorMercado, ganhoCapital, resultadoRealizado, dividendosAtivo, retornoTotal, tir });
    });

    resultadosIndividuais.sort((a,b) => b.valorMercado - a.valorMercado).forEach(res => {
        const classeGanhoCapital = res.ganhoCapital >= 0 ? 'valor-positivo' : 'valor-negativo';
        const classeRealizado = res.resultadoRealizado >= 0 ? 'valor-positivo' : 'valor-negativo';
        const classeRetorno = res.retornoTotal >= 0 ? 'valor-positivo' : 'valor-negativo';
        const classeTir = res.tir >= 0 ? 'valor-positivo' : 'valor-negativo';

        htmlFinal += `
            <tr>
                <td>${res.ticker}</td>
                <td class="numero">${formatarMoeda(res.custoTotal)}</td>
                <td class="numero">${formatarMoeda(res.valorMercado)}</td>
                <td class="numero ${classeGanhoCapital}">${formatarMoeda(res.ganhoCapital)}</td>
                <td class="numero ${classeRealizado}">${formatarMoeda(res.resultadoRealizado)}</td>
                <td class="numero">${formatarMoeda(res.dividendosAtivo)}</td>
                <td class="numero ${classeRetorno}">${formatarMoeda(res.retornoTotal)}</td>
                <td class="percentual ${classeTir}">${!isNaN(res.tir) ? formatarPercentual(res.tir) : 'N/A'}</td>
            </tr>`;
    });

    htmlFinal += `</tbody></table>`;
    container.innerHTML = htmlFinal;
}

function gerarHtmlCalendarioFIIs() {
    const tickersFIIs = todosOsAtivos.filter(a => a.tipo === 'FII').map(a => a.ticker);
    const proventosFIIs = todosOsProventos.filter(p => tickersFIIs.includes(p.ticker));

    if (proventosFIIs.length === 0) {
        return '<p>Nenhum provento de FII encontrado.</p>';
    }

    const proventosPorAno = proventosFIIs.reduce((acc, provento) => {
        const ano = new Date(provento.dataPagamento + 'T12:00:00').getUTCFullYear();
        if (!acc[ano]) acc[ano] = [];
        acc[ano].push(provento);
        return acc;
    }, {});

    const anosOrdenados = Object.keys(proventosPorAno).sort((a, b) => b - a);
    let htmlFinal = '';

    anosOrdenados.forEach(ano => {
        const proventosDoAno = proventosPorAno[ano];
        const tickersDoAno = [...new Set(proventosDoAno.map(p => p.ticker))].sort();
        const totaisMensais = Array(12).fill(0);
        
        htmlFinal += `<div class="calendario-ano"><h4>${ano}</h4><div class="tabela-projecao-wrapper"><table>`;
        htmlFinal += `<thead><tr><th class="col-ativo">Ativo</th>`;
        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        meses.forEach(mes => htmlFinal += `<th class="col-mes">${mes.toUpperCase()}</th>`);
        htmlFinal += `</tr></thead><tbody>`;

        tickersDoAno.forEach(ticker => {
            const link = linksExternos.fiis ? `<a href="${linksExternos.fiis}${ticker}" target="_blank" class="ticker-link">${ticker}</a>` : ticker;
            htmlFinal += `<tr><td class="col-ativo">
                    ${link}
                    <i class="fas fa-plus-circle acao-btn btn-adicionar-provento-ticker" 
                       data-ticker="${ticker}" 
                       title="Lançar provento para ${ticker}"></i>
                  </td>`;

            for (let mes = 0; mes < 12; mes++) {
                const proventosDoMes = proventosDoAno.filter(p => p.ticker === ticker && new Date(p.dataPagamento + 'T12:00:00').getUTCMonth() === mes);
                htmlFinal += `<td>`;
                if (proventosDoMes.length > 0) {
                    proventosDoMes.forEach(provento => {
                        totaisMensais[mes] += provento.valorTotalRecebido;
                        htmlFinal += `
                            <div class="provento-item-container" data-provento-id="${provento.id}">
                                <div class="provento-item">
                                    <div class="provento-valor-total">${formatarMoeda(provento.valorTotalRecebido)}</div>
                                    <div class="provento-detalhe" title="Quantidade de cotas e rendimento por cota">(${Math.round(provento.quantidadeNaDataCom)} x ${formatarMoeda(provento.valorIndividual)})</div>
                                    <div class="provento-detalhe" title="Yield on Cost do provento">YOC: ${formatarPercentual(provento.yieldOnCost)}</div>
                                </div>
                                <div class="provento-acoes" style="display: none;">
                                    <i class="fas fa-edit acao-btn edit" title="Editar Provento"></i>
                                    <i class="fas fa-trash acao-btn delete" title="Excluir Provento"></i>
                                </div>
                            </div>
                        `;
                    });
                }
                htmlFinal += `</td>`;
            }
            htmlFinal += `</tr>`;
        });
        
        htmlFinal += `<tr class="calendario-total-row"><td class="col-ativo">TOTAL</td>`;
        for (let mes = 0; mes < 12; mes++) {
            htmlFinal += `<td class="numero">${totaisMensais[mes] > 0 ? formatarMoeda(totaisMensais[mes]) : ''}</td>`;
        }
        htmlFinal += `</tr></tbody></table></div></div>`;
    });

    return htmlFinal;
}
function gerarHtmlCalendarioAcoes() {
    const tickersRelevantes = todosOsAtivos.filter(a => a.tipo === 'Ação' || a.tipo === 'ETF').map(a => a.ticker);
    const proventosRelevantes = todosOsProventos.filter(p => tickersRelevantes.includes(p.ticker));

    if (proventosRelevantes.length === 0) {
        return '<p>Nenhum provento de Ações ou ETFs encontrado para gerar o calendário.</p>';
    }

    const proventosPorAno = proventosRelevantes.reduce((acc, provento) => {
        const ano = new Date(provento.dataPagamento + 'T12:00:00').getUTCFullYear();
        if (!acc[ano]) acc[ano] = [];
        acc[ano].push(provento);
        return acc;
    }, {});

    const anosOrdenados = Object.keys(proventosPorAno).sort((a, b) => b - a);
    let htmlFinal = '';

    anosOrdenados.forEach(ano => {
        const proventosDoAno = proventosPorAno[ano];
        const tickersDoAno = [...new Set(proventosDoAno.map(p => p.ticker))].sort();
        const totaisMensais = Array(12).fill(0);

        htmlFinal += `<div class="calendario-ano"><h4>${ano}</h4><div class="tabela-projecao-wrapper"><table>`;
        htmlFinal += `<thead><tr><th class="col-ativo">Ativo</th>`;
        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        meses.forEach(mes => htmlFinal += `<th class="col-mes">${mes.toUpperCase()}</th>`);
        htmlFinal += `</tr></thead><tbody>`;

        tickersDoAno.forEach(ticker => {
            const link = linksExternos.acoes ? `<a href="${linksExternos.acoes}${ticker}" target="_blank" class="ticker-link">${ticker}</a>` : ticker;
            htmlFinal += `<tr><td class="col-ativo">
                    ${link}
                    <i class="fas fa-plus-circle acao-btn btn-adicionar-provento-ticker" 
                       data-ticker="${ticker}" 
                       title="Lançar provento para ${ticker}"></i>
                  </td>`;

            for (let mes = 0; mes < 12; mes++) {
                const proventosDoMes = proventosDoAno.filter(p => p.ticker === ticker && new Date(p.dataPagamento + 'T12:00:00').getUTCMonth() === mes);
                htmlFinal += `<td>`;
                if (proventosDoMes.length > 0) {
                    proventosDoMes.forEach(provento => {
                        totaisMensais[mes] += provento.valorTotalRecebido;
                        htmlFinal += `
                            <div class="provento-item-container" data-provento-id="${provento.id}">
                                <div class="provento-item">
                                    <div class="provento-valor-total">${provento.tipo}: ${formatarMoeda(provento.valorTotalRecebido)}</div>
                                    <div class="provento-detalhe" title="Quantidade de ações e provento por ação">(${Math.round(provento.quantidadeNaDataCom)} x ${formatarMoeda(provento.valorIndividual)})</div>
                                    <div class="provento-detalhe" title="Yield on Cost do provento">YOC: ${formatarPercentual(provento.yieldOnCost)}</div>
                                </div>
                                <div class="provento-acoes" style="display: none;">
                                    <i class="fas fa-edit acao-btn edit" title="Editar Provento"></i>
                                    <i class="fas fa-trash acao-btn delete" title="Excluir Provento"></i>
                                </div>
                            </div>
                        `;
                    });
                }
                htmlFinal += `</td>`;
            }
            htmlFinal += `</tr>`;
        });

        htmlFinal += `<tr class="calendario-total-row"><td class="col-ativo">TOTAL</td>`;
        for (let mes = 0; mes < 12; mes++) {
            htmlFinal += `<td class="numero">${totaisMensais[mes] > 0 ? formatarMoeda(totaisMensais[mes]) : ''}</td>`;
        }
        htmlFinal += `</tr></tbody></table></div></div>`;
    });
    return htmlFinal;
}
/**
 * Abre o modal com gráfico comparativo de desempenho (Total Return) para a categoria selecionada.
 * @param {string} filtroTipo - 'Ação', 'FII', 'ETF' ou 'todos'.
 */
function abrirModalGraficoCotacoesHistoricas(filtroTipo = 'todos') {
    if (!historicoCarteira || historicoCarteira.length < 2) {
        alert("É necessário ter pelo menos 2 snapshots salvos para gerar o gráfico de desempenho.");
        return;
    }

    const modal = document.getElementById('modal-grafico-cotacoes');
    const tituloModal = document.getElementById('modal-grafico-cotacoes-titulo');
    
    // 1. Define o Título
    let tituloGrafico = '';
    if (filtroTipo === 'todos') {
        tituloGrafico = 'Comparativo de Desempenho - Renda Variável';
    } else {
        const tituloTipo = filtroTipo === 'FII' ? 'Fundos Imobiliários' : (filtroTipo === 'Ação' ? 'Ações' : 'ETFs');
        tituloGrafico = `Comparativo de Desempenho - ${tituloTipo}`;
    }
    tituloModal.textContent = tituloGrafico;

    // 2. Lógica de Persistência (Recupera ou define padrão '1M')
    // Se não houver nada salvo (ex: após restaurar backup antigo), usa '1M'
    if (!configuracoesGraficos.modalHistoricoPeriodo) {
        configuracoesGraficos.modalHistoricoPeriodo = '1M';
    }
    const periodoInicial = configuracoesGraficos.modalHistoricoPeriodo;

    // 3. Atualiza a Interface (Marca o botão correto)
    const radioParaMarcar = document.querySelector(`input[name="periodo-grafico-modal"][value="${periodoInicial}"]`);
    if (radioParaMarcar) {
        radioParaMarcar.checked = true;
    }

    // 4. Armazena o tipo atual no modal para uso no listener
    modal.dataset.tipoAtual = filtroTipo;

    // 5. Renderiza o gráfico com o período salvo
    atualizarGraficoModal(filtroTipo, periodoInicial);

    abrirModal('modal-grafico-cotacoes');
}

/**
 * Função auxiliar chamada ao abrir o modal ou trocar o período (radio buttons).
 */
function atualizarGraficoModal(tipoAtivo, periodo) {
    const ctx = document.getElementById('grafico-cotacoes-historicas-canvas').getContext('2d');

    // Define a data de início com base no período
    const hoje = new Date();
    let dataInicio = new Date();
    
    switch (periodo) {
        case '1M':
            dataInicio.setMonth(hoje.getMonth() - 1);
            break;
        case 'YTD':
            dataInicio = new Date(hoje.getFullYear(), 0, 1); // 1º de Jan do ano atual
            break;
        case '1A':
            dataInicio.setFullYear(hoje.getFullYear() - 1);
            break;
        case '5A':
            dataInicio.setFullYear(hoje.getFullYear() - 5);
            break;
    }
    
    const dataInicioStr = dataInicio.toISOString().split('T')[0];

    // Gera os dados matemáticos (Mesma lógica do Dashboard - TWR)
    const dadosGrafico = gerarDadosComparativosModal(tipoAtivo, dataInicioStr);

    if (graficoHistoricoCotacoesInstance) {
        graficoHistoricoCotacoesInstance.destroy();
    }

    if (!dadosGrafico || dadosGrafico.datasets.length === 0) {
        // Se não houver dados, exibe mensagem no canvas (tratado via plugin ou texto anterior)
        // Aqui apenas limpamos para não quebrar
        return;
    }

    graficoHistoricoCotacoesInstance = new Chart(ctx, {
        type: 'line',
        data: dadosGrafico,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false,
                axis: 'x'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const valor = context.parsed.y;
                            if (valor === null) return null;
                            return `${label}: ${formatarPercentual(valor)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return (value * 100).toFixed(0) + '%';
                        }
                    },
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#666' : '#e5e5e5',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    }
                }
            }
        }
    });
}

/**
 * Motor de Cálculo: Adaptação da lógica do Dashboard para Ativos Individuais.
 * Calcula o Retorno Total (TWR) de cada ativo da categoria selecionada.
 */
function gerarDadosComparativosModal(tipoFiltro, dataInicio) {
    // 1. Filtra o histórico
    const historicoFiltrado = historicoCarteira
        .filter(s => s.data >= dataInicio)
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    if (historicoFiltrado.length < 2) return null;

    // 2. Identifica quais ativos estão EM CARTEIRA HOJE para essa categoria
    const posicoesAtuais = gerarPosicaoDetalhada();
    const ativosParaExibir = Object.keys(posicoesAtuais).filter(ticker => {
        if (posicoesAtuais[ticker].quantidade < 0.000001) return false; // Só quem tem saldo
        const info = todosOsAtivos.find(a => a.ticker === ticker);
        if (!info) return false;
        if (tipoFiltro === 'todos') return ['Ação', 'FII', 'ETF'].includes(info.tipo);
        return info.tipo === (tipoFiltro === 'FII' ? 'FII' : (tipoFiltro === 'Ação' ? 'Ação' : 'ETF')); // Mapeamento simples
    });

    if (ativosParaExibir.length === 0) return null;

    // 3. Inicializa Séries
    const series = {};
    ativosParaExibir.forEach(ticker => {
        series[ticker] = { dados: [], acumulado: 1, iniciado: false, ultimoValorValido: 0 };
    });

    const memoriaAtivos = {}; 

    // 4. Loop de Cálculo (Snapshot a Snapshot)
    for (let i = 0; i < historicoFiltrado.length; i++) {
        const snapAtual = historicoFiltrado[i];
        const snapAnterior = i > 0 ? historicoFiltrado[i - 1] : null;

        // Reconstrói valores do dia
        const ativosNoSnap = snapAtual.detalhesCarteira?.ativos || {};
        
        // Itera apenas sobre os ativos que queremos exibir
        ativosParaExibir.forEach(ticker => {
            const serie = series[ticker];
            const dadosSnap = ativosNoSnap[ticker];
            
            let valAtivo = 0;
            if (dadosSnap) {
                valAtivo = dadosSnap.valorDeMercado || (dadosSnap.quantidade * dadosSnap.precoAtual);
            }
            
            // Proteção de memória (igual ao dashboard)
            const valMemoria = memoriaAtivos[ticker] || 0;
            if (valAtivo <= 1 && valMemoria > 10) {
                if (!dadosSnap && snapAnterior) {
                    // Verifica venda real no período
                    const houveVenda = todasAsNotas.some(n => n.data > snapAnterior.data && n.data <= snapAtual.data && n.operacoes.some(op => op.ativo === ticker && op.tipo === 'venda'));
                    if (!houveVenda) valAtivo = valMemoria;
                    else delete memoriaAtivos[ticker];
                } else {
                    valAtivo = valMemoria;
                }
            }
            if (valAtivo > 0) memoriaAtivos[ticker] = valAtivo;

            // Cálculo TWR
            if (!serie.iniciado) {
                if (valAtivo > 0) {
                    serie.iniciado = true;
                    serie.dados.push(0); // Ponto zero
                    serie.ultimoValorValido = valAtivo;
                } else {
                    serie.dados.push(null);
                }
                return;
            }

            const valorAnterior = serie.ultimoValorValido;
            if (valAtivo <= 0.01) {
                serie.dados.push(null); // Ativo saiu da carteira ou dados falharam
                serie.ultimoValorValido = 0;
                return;
            }

            const fluxoLiquido = calcularFluxoLiquidoPeriodo(ticker, 'ativo', snapAnterior.data, snapAtual.data);
            const proventos = calcularProventosRecebidosPeriodo(ticker, 'ativo', snapAnterior.data, snapAtual.data);

            const lucroPeriodo = valAtivo - valorAnterior - fluxoLiquido + proventos;
            const denominador = valorAnterior > 1 ? valorAnterior : (fluxoLiquido > 0 ? fluxoLiquido : 1);
            const rentabilidadeDia = lucroPeriodo / denominador;

            serie.acumulado = serie.acumulado * (1 + rentabilidadeDia);
            serie.dados.push(serie.acumulado - 1);
            serie.ultimoValorValido = valAtivo;
        });
    }

    // 5. Prepara datasets do Chart.js
    const labels = historicoFiltrado.map(s => new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR'));
    const datasets = [];
    let colorIndex = 0;

    ativosParaExibir.forEach(ticker => {
        const serie = series[ticker];
        if (serie.dados.some(v => v !== null)) {
            const cor = obterCor(colorIndex++);
            datasets.push({
                label: ticker,
                data: serie.dados,
                borderColor: cor,
                backgroundColor: cor,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2
            });
        }
    });

    return { labels, datasets };
}
function renderizarTelaRendaVariavel() {
    mostrarTela('rendaVariavel');
    const container = document.getElementById('posicao-rv-container');
    const summaryContainer = document.getElementById('summary-rv');
    
    const filtroCorretoraSelect = document.getElementById('rv-filtro-corretora');
    const filtroDataInput = document.getElementById('rv-filtro-data');

    if (!filtroDataInput.value) {
        filtroDataInput.value = new Date().toISOString().split('T')[0];
    }
    const filtroData = filtroDataInput.value;

    // --- Início da Nova Lógica ---
    const corretoraSelecionadaAnteriormente = filtroCorretoraSelect.value;
    const corretorasDaData = getCorretorasComPosicaoNaData(filtroData);
    
    let optionsHtml = '<option value="consolidado">Consolidado</option>';
    optionsHtml += corretorasDaData.map(c => `<option value="${c}">${c}</option>`).join('');
    filtroCorretoraSelect.innerHTML = optionsHtml;

    // Tenta preservar a seleção anterior
    const novaListaDeOpcoes = Array.from(filtroCorretoraSelect.options).map(opt => opt.value);
    if (novaListaDeOpcoes.includes(corretoraSelecionadaAnteriormente)) {
        filtroCorretoraSelect.value = corretoraSelecionadaAnteriormente;
    }
    const filtroCorretora = filtroCorretoraSelect.value;
    // --- Fim da Nova Lógica ---

    const posicoesDetalhadas = gerarPosicaoDetalhada(filtroData);
    const valorTotalCarteira = calcularValorTotalCarteira(filtroData);
    
    let htmlGerado = '';
    let custoTotalRV = 0;
    let valorMercadoRV = 0;

    ['FII', 'Ação', 'ETF'].forEach(tipo => {
        const dadosTabela = gerarHtmlTabelaAtivos(tipo, posicoesDetalhadas, filtroCorretora, valorTotalCarteira);
        if (dadosTabela.html) {
            htmlGerado += dadosTabela.html; // AQUI ESTÁ A CORREÇÃO
            
            custoTotalRV += dadosTabela.custoTotal;
            valorMercadoRV += dadosTabela.valorMercado;
        }
    });

    if (htmlGerado === '') {
        container.innerHTML = '<p style="text-align: center;">Nenhuma posição em Renda Variável encontrada para os filtros selecionados.</p>';
        summaryContainer.innerHTML = '';
    } else {
        container.innerHTML = htmlGerado;
        const desempenhoValor = valorMercadoRV - custoTotalRV;
        const desempenhoPercentual = custoTotalRV > 0 ? desempenhoValor / custoTotalRV : 0;
        const classeDesempenho = desempenhoValor >= 0 ? 'valor-positivo' : 'valor-negativo';
        const setaDesempenho = desempenhoValor >= 0 ? '↑' : '↓';
        
        const alocacaoRVPercentual = valorTotalCarteira > 0 ? valorMercadoRV / valorTotalCarteira : 0;

        summaryContainer.innerHTML = `
            <div class="summary-item">Custo Total (RV) <span>${formatarMoeda(custoTotalRV)}</span></div>
            <div class="summary-item">Valor de Mercado (RV) <span>${formatarMoeda(valorMercadoRV)}</span></div>
            <div class="summary-item">Alocação na Carteira <span>${formatarPercentual(alocacaoRVPercentual)}</span></div>
            <div class="summary-item">Desempenho (RV) <span class="${classeDesempenho}">${formatarMoeda(desempenhoValor)} <span class="desempenho-percentual">${formatarPercentual(desempenhoPercentual)} ${setaDesempenho}</span></span></div>
        `;
        
        container.querySelectorAll('th.sortable').forEach(header => {
            const table = header.closest('table');
            if (table) {
                const tipoAtivo = table.dataset.tipoAtivo;
                const sortConfig = sortConfigRendaVariavel[tipoAtivo];
                if (sortConfig && header.dataset.key === sortConfig.key) {
                    header.classList.add(sortConfig.direction);
                }
            }
        });
    }

    renderizarFiltroAtivoInfo(filtroCorretora, 'filtro-info-rv');
}

function renderizarFiltroAtivoInfo(filtroCorretora, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Limpa o container

    const textoElement = document.createElement('span');
    textoElement.className = 'logo-texto'; // Mantemos a classe por enquanto

    if (filtroCorretora === 'consolidado') {
        textoElement.textContent = 'Consolidado';
    } else {
        textoElement.textContent = filtroCorretora;
    }

    container.appendChild(textoElement);
}
function abrirModalResumoDividendos(ticker, precoMedioAtual = 0, precoAtual = 0) {
    const modal = document.getElementById('modal-resumo-dividendos-ativo');
    modal.dataset.ticker = ticker; // Armazena o ticker para ser usado pela ordenação

    const proventosDoAtivo = todosOsProventos.filter(p => p.ticker === ticker);
    const dataInicioInvestimento = getInicioIninterrupto(ticker);
    const dataFim = getFimInvestimento([ticker]);
    
    const resumoPessoal = calcularResumoProventosParaMultiplosAtivos(proventosDoAtivo, [ticker], dataInicioInvestimento, dataFim);
    
    const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
    const projecaoAnualMercado = (ativoInfo.tipo === 'Ação') 
        ? calcularProjecaoAnualUnitaria(ticker, { limiteAnos: 5 }) 
        : (getUltimoProvento(ticker) * 12);

    const posicoesAtuais = gerarPosicaoDetalhada();
    const posicao = posicoesAtuais[ticker];
    const dadosMercado = dadosDeMercado.cotacoes[ticker] || {};
    
    const container = document.getElementById('resumo-dividendos-container');
    document.getElementById('modal-resumo-dividendos-titulo').textContent = `${ticker}`;

    const hojeStr = new Date().toISOString().split('T')[0];
    const hojeMeiaNoite = new Date(hojeStr + 'T00:00:00');

    const totalProventosPagos = proventosDoAtivo
        .filter(p => p.dataPagamento && p.dataPagamento <= hojeStr)
        .reduce((acc, p) => acc + p.valorTotalRecebido, 0);
    
    const dataInicioFmt = dataInicioInvestimento 
        ? new Date(dataInicioInvestimento + 'T12:00:00').toLocaleDateString('pt-BR') 
        : 'Início';
    
    const textoProventosPagos = `<strong>Proventos Pagos de ${dataInicioFmt} até Hoje:</strong>`;

    if (!resumoPessoal && totalProventosPagos === 0) {
        container.innerHTML = '<p>Nenhum provento ou posição encontrados para este ativo.</p>';
        abrirModal('modal-resumo-dividendos-ativo');
        return;
    }
    
    // --- INÍCIO DA ALTERAÇÃO ---
    // 1. Buscar dados de balanceamento
    const dadosBalanceamento = gerarDadosBalanceamento('todos');
    const tipoCategoria = ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : 'ETF';
    const dadosDoAtivoNoBalanceamento = dadosBalanceamento.categorias[tipoCategoria]?.ativos.find(a => a.ticker === ticker);

    let alocacaoHtml = '';
    if (dadosDoAtivoNoBalanceamento) {
        const valorIdeal = dadosDoAtivoNoBalanceamento.ideal.valor;
        const valorDeMercado = posicao ? (posicao.quantidade * (dadosMercado.valor || 0)) : 0;
        
        let progressoPercentual = 0;
        if (valorIdeal > 0) {
            progressoPercentual = (valorDeMercado / valorIdeal) * 100;
        } else if (valorDeMercado > 0) {
            progressoPercentual = 100; // Se o ideal é 0, mas tem valor, está 100% (ou mais) "acima"
        }

        // 2. Lógica para o estilo da barra (gradiente ou cor sólida)
        let barStyle = '';
        if (progressoPercentual <= 100) {
            // Abaixo ou no ideal: Barra verde simples
            barStyle = `width: ${progressoPercentual}%; background-color: var(--success-color);`;
        } else {
            // Acima do ideal: Barra 100% cheia com gradiente
            // Calcula a proporção que o "ideal" (100%) ocupa do "total" (progressoPercentual)
            const idealPercentOfTotal = (100 / progressoPercentual) * 100;
            barStyle = `
                width: 100%; 
                background: linear-gradient(to right, 
                    var(--success-color) ${idealPercentOfTotal}%, 
                    var(--danger-color) ${idealPercentOfTotal}%
                );
            `;
        }

        alocacaoHtml = `
            <div class="meta-card-body" style="margin-top: 20px; background-color: #f8f9fa; border-radius: 6px; padding: 15px;">
                <div class="meta-progresso-info" style="margin-bottom: 8px;">
                    <span>Progresso da Alocação Ideal: <strong>${progressoPercentual.toFixed(2)}%</strong></span>
                </div>
                <div class="meta-progresso-barra-container" style="height: 12px; background-color: #e9ecef; border-radius: 6px; overflow: hidden;">
                    <div class="meta-progresso-barra" style="${barStyle}"></div>
                </div>
                <div class="meta-valores" style="margin-top: 10px; border-top: none; padding-top: 0;">
                    <div class="meta-valor-item">
                        <label>Posição Atual</label>
                        <span>${formatarMoeda(valorDeMercado)}</span>
                    </div>
                    <div class="meta-valor-item">
                        <label>Posição Ideal</label>
                        <span>${formatarMoeda(valorIdeal)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    // --- FIM DA ALTERAÇÃO ---
    
    let projectionHtml = '<p>Não há projeção de proventos (sem posição atual ou proventos recentes).</p>';
    if(posicao && posicao.quantidade > 0) {
        const yocAnualPessoal = resumoPessoal ? resumoPessoal.yocCustoAnual : 0;
        const yieldAnualMercado = (dadosMercado.valor > 0) ? projecaoAnualMercado / dadosMercado.valor : 0;

        projectionHtml = `
            <div class="summary-columns-container">
                <div class="summary-column">
                    <h4>Minha Performance (Pessoal)</h4>
                    <div class="summary-data-point"><label>Preço Médio Atual</label><span>${formatarMoeda(precoMedioAtual)}</span></div>
                    <div class="summary-data-point">
                        <label>Projeção Anual (Pos. Atual)</label>
                        <span>${formatarMoeda(resumoPessoal.projecaoAnualTotal)}</span>
                    </div>
                    <div class="summary-data-point">
                        <label>Média Mensal (Pos. Atual)</label>
                        <span>${formatarMoeda(resumoPessoal.mediaMensalTotal)}</span>
                    </div>
                    <div class="summary-data-point">
                        <label>Yield on Cost (Anualizado)</label>
                        <span>${formatarPercentual(yocAnualPessoal)}</span>
                    </div>
                </div>
                <div class="summary-column">
                    <h4>Visão de Mercado (Atual)</h4>
                     <div class="summary-data-point"><label>Preço de Mercado</label><span>${formatarMoeda(precoAtual)}</span></div>
                     <div class="summary-data-point">
                        <label>Projeção Anual (por Unidade)</label>
                        <span>${formatarMoeda(projecaoAnualMercado)}</span>
                    </div>
                    <div class="summary-data-point">
                        <label>Média Mensal (por Unidade)</label>
                        <span>${formatarMoeda(projecaoAnualMercado / 12)}</span>
                    </div>
                    <div class="summary-data-point">
                        <label>Dividend Yield (Anualizado)</label>
                        <span>${formatarPercentual(yieldAnualMercado)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    let frequenciaHtml = '';
    if (proventosDoAtivo.length > 0) {
        const frequenciaPorAno = {};
        proventosDoAtivo.forEach(p => {
            if (!p.dataPagamento || !p.dataCom) return;
            const anoPagamento = new Date(p.dataPagamento + 'T12:00:00').getUTCFullYear();
            if (!frequenciaPorAno[anoPagamento]) {
                frequenciaPorAno[anoPagamento] = { com: new Set(), pag: new Set() };
            }
            frequenciaPorAno[anoPagamento].com.add(new Date(p.dataCom + 'T12:00:00').getUTCMonth());
            frequenciaPorAno[anoPagamento].pag.add(new Date(p.dataPagamento + 'T12:00:00').getUTCMonth());
        });

        frequenciaHtml += '<hr style="margin: 20px 0;"><h4 class="frequencia-titulo">Frequência de Proventos</h4>';
        const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const anos = Object.keys(frequenciaPorAno).sort((a, b) => b - a);

        anos.forEach(ano => {
            const dadosAno = frequenciaPorAno[ano];
            const mesesCom = [...dadosAno.com].sort((a,b) => a - b).map(m => mesesAbrev[m]).join(', ');
            const mesesPag = [...dadosAno.pag].sort((a,b) => a - b).map(m => mesesAbrev[m]).join(', ');
            frequenciaHtml += `<div class="frequencia-ano-bloco">
                                <strong>${ano}</strong>
                                <div class="frequencia-linha"><span>Data-Com:</span> ${mesesCom}</div>
                                <div class="frequencia-linha"><span>Pagamento:</span> ${mesesPag}</div>
                           </div>`;
        });
    }

    const historicoMovimentacoes = gerarHistoricoCompletoParaAtivo(ticker);
    let historicoHtml = `
        <hr style="margin: 20px 0;">
        <h4>Histórico de Movimentações</h4>
    `;

    if (historicoMovimentacoes.length === 0) {
        historicoHtml += '<p>Nenhuma movimentação encontrada para este ativo.</p>';
    } else {
        historicoHtml += `
            <div class="tabela-projecao-wrapper" style="max-height: 250px; overflow-y: auto; margin-top: 10px;">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Transação</th>
                            <th class="numero">Preço Unit.</th>
                            <th class="numero">Qtd. Consolidada</th>
                            <th class="numero">Preço Médio</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        historicoMovimentacoes.slice().reverse().forEach(item => {
            const dataFormatada = item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A';
            const precoUnitarioFmt = (item.precoUnitario !== null && typeof item.precoUnitario === 'number' && item.precoUnitario > 0) ? formatarMoeda(item.precoUnitario) : '-';
            
            historicoHtml += `
                <tr>
                    <td>${dataFormatada}</td>
                    <td>${item.descricaoTransacao}</td>
                    <td class="numero">${precoUnitarioFmt}</td>
                    <td class="numero">${Math.round(item.qtdConsolidada)}</td>
                    <td class="numero">${formatarPrecoMedio(item.precoMedio)}</td>
                </tr>
            `;
        });
        historicoHtml += `</tbody></table></div>`;
    }

    let proventosTabelaHtml = `
        <hr style="margin: 20px 0;">
        <h4>Histórico de Proventos</h4>
    `;

    if (proventosDoAtivo.length === 0) {
        proventosTabelaHtml += '<p>Nenhum provento encontrado para este ativo.</p>';
    } else {
        proventosTabelaHtml += `
            <div class="tabela-projecao-wrapper" style="max-height: 250px; overflow-y: auto; margin-top: 10px;">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th class="sortable" data-key="dataCom">Data Com</th>
                            <th class="sortable" data-key="dataPagamento">Data Pgto</th>
                            <th>Tipo</th>
                            <th class="numero">Valor Unit/YoC</th>
                            <th class="numero">Qtd. Base</th>
                            <th class="numero">Vlr. Liq. Pago</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        proventosDoAtivo.sort((a, b) => {
            const key = sortConfigModalProventos.key;
            const direction = sortConfigModalProventos.direction === 'ascending' ? 1 : -1;
            const dataA = a[key] || a.dataCom;
            const dataB = b[key] || b.dataCom;
            return (new Date(dataA) - new Date(dataB)) * direction;
        }).forEach(p => {
            const dataComObj = p.dataCom ? new Date(p.dataCom + 'T12:00:00') : null;
            const precoMedioParaCalculo = (dataComObj && dataComObj < hojeMeiaNoite) ? p.precoMedioNaDataCom : precoMedioAtual;
            const yocNoPeriodo = (precoMedioParaCalculo > 0) ? (p.valorIndividual || 0) / precoMedioParaCalculo : 0;
            
            const tipoAbreviado = p.tipo ? p.tipo.substring(0, 4) : 'N/D';
            const dataComFmt = p.dataCom ? dataComObj.toLocaleDateString('pt-BR') : 'Inválida';
            const dataPagFmt = p.dataPagamento ? new Date(p.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Inválida';
            const qtdBaseFmt = Math.round(p.quantidadeNaDataCom || 0);
            const valorPagoFmt = formatarMoeda(p.valorTotalRecebido || 0);

            proventosTabelaHtml += `
                <tr>
                    <td>${dataComFmt}</td>
                    <td>${dataPagFmt}</td>
                    <td>${tipoAbreviado}</td>
                    <td class="numero">
                        <span class="valor-principal">${formatarDecimal(p.valorIndividual || 0, 5)}</span>
                        <span class="valor-secundario ${yocNoPeriodo >= 0 ? 'valor-positivo' : 'valor-negativo'}">${formatarPercentual(yocNoPeriodo)}</span>
                    </td>
                    <td class="numero">${qtdBaseFmt}</td>
                    <td class="numero">${valorPagoFmt}</td>
                </tr>
            `;
        });

        proventosTabelaHtml += `</tbody></table></div>`;
    }

    container.innerHTML = `
        <div class="form-grid" style="grid-template-columns: 1fr; gap: 15px;">
             <div style="background-color: #e9ecef; padding: 10px; border-radius: 4px;">
                ${textoProventosPagos}
                <span style="font-size: 1.1em; font-weight: bold;">${formatarMoeda(totalProventosPagos)}</span>
            </div>
        </div>
        
        ${alocacaoHtml}

        <hr style="margin: 20px 0;">
        ${projectionHtml}
        ${historicoHtml} 

        <hr style="margin: 20px 0;">
        <h4>Cotação vs. Preço Médio (Histórico de Snapshots)</h4>
        <div class="grafico-barras-container" style="height: 300px; margin-top: 10px;">
            <canvas id="grafico-preco-vs-pm-modal-canvas"></canvas>
        </div>

        ${proventosTabelaHtml}
        <div style="margin-top: 25px;">
            <h4>Evolução Anual de Proventos Pagos</h4>
            <div class="grafico-barras-container" style="height: 300px;">
                <canvas id="grafico-resumo-proventos-anual"></canvas>
            </div>
        </div>
        ${frequenciaHtml} 
    `;
    
    const ctx = document.getElementById('grafico-resumo-proventos-anual')?.getContext('2d');
    if (ctx) {
        const dadosGrafico = { labels: [], valores: [], yields: [] };
        const proventosPorAno = proventosDoAtivo
            .filter(p => p.dataPagamento && p.dataPagamento <= hojeStr)
            .reduce((acc, p) => {
                const ano = new Date(p.dataPagamento + 'T12:00:00').getUTCFullYear();
                if (!acc[ano]) {
                    acc[ano] = [];
                }
                acc[ano].push(p);
                return acc;
            }, {});
        Object.keys(proventosPorAno).sort().forEach(ano => {
            const proventosDoAno = proventosPorAno[ano];
            const valorTotalAno = proventosDoAno.reduce((soma, p) => soma + p.valorTotalRecebido, 0);
            let somaPonderadaCusto = 0;
            let somaPesos = 0;
            proventosDoAno.forEach(p => {
                const custoNaDataCom = p.quantidadeNaDataCom * p.precoMedioNaDataCom;
                if (custoNaDataCom > 0) {
                    somaPonderadaCusto += custoNaDataCom * p.valorTotalRecebido;
                    somaPesos += p.valorTotalRecebido;
                }
            });
            const custoMedioPonderadoAno = somaPesos > 0 ? somaPonderadaCusto / somaPesos : 0;
            const yocAnual = custoMedioPonderadoAno > 0 ? (valorTotalAno / custoMedioPonderadoAno) : 0;
            dadosGrafico.labels.push(ano);
            dadosGrafico.valores.push(valorTotalAno);
            dadosGrafico.yields.push(yocAnual);
        });

        if (resumoProventosChartInstance) {
            resumoProventosChartInstance.destroy();
        }
        resumoProventosChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dadosGrafico.labels,
                datasets: [{
                    label: 'Total Recebido (R$)',
                    data: dadosGrafico.valores,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const valor = context.parsed.y;
                                return `Valor: ${formatarMoeda(valor)}`;
                            },
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const yoc = dadosGrafico.yields[index];
                                return `YOC no Ano: ${formatarPercentual(yoc)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return formatarMoeda(value); }
                        }
                    }
                }
            }
        });
        
        setTimeout(() => {
            const btnImprimir = document.getElementById('btn-imprimir-resumo-ativo');
            if (btnImprimir) {
                const novoBtn = btnImprimir.cloneNode(true);
                btnImprimir.parentNode.replaceChild(novoBtn, btnImprimir);
                
                // ATUALIZAÇÃO AQUI: Passa ambas as instâncias de gráfico para a função de impressão
                novoBtn.addEventListener('click', () => {
                    imprimirResumoAtivo(ticker, resumoProventosChartInstance, graficoPrecoVsPmModalInstance);
                });
            }
        }, 200);
    }

    // --- INÍCIO DA NOVA LÓGICA PARA O GRÁFICO DE LINHA ---
    const ctxLinha = document.getElementById('grafico-preco-vs-pm-modal-canvas')?.getContext('2d');
    if (ctxLinha) {
        if (graficoPrecoVsPmModalInstance) {
            graficoPrecoVsPmModalInstance.destroy();
        }

        const dadosHistorico = [];
        historicoCarteira.forEach(snapshot => {
            if (snapshot.detalhesCarteira && snapshot.detalhesCarteira.ativos && snapshot.detalhesCarteira.ativos[ticker]) {
                const dadosAtivo = snapshot.detalhesCarteira.ativos[ticker];
                if (dadosAtivo.quantidade > 0) { // Apenas inclui se havia posição
                    dadosHistorico.push({
                        data: snapshot.data,
                        cotacao: dadosAtivo.precoAtual,
                        precoMedio: dadosAtivo.precoMedio
                    });
                }
            }
        });

        if (dadosHistorico.length > 0) {
            graficoPrecoVsPmModalInstance = new Chart(ctxLinha, {
                type: 'line',
                data: {
                    labels: dadosHistorico.map(d => new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit'})),
                    datasets: [
                        {
                            label: 'Cotação (R$)',
                            data: dadosHistorico.map(d => d.cotacao),
                            borderColor: 'rgba(52, 152, 219, 1)',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            fill: false,
                            tension: 0.1
                        },
                        {
                            label: 'Preço Médio (R$)',
                            data: dadosHistorico.map(d => d.precoMedio),
                            borderColor: 'rgba(46, 204, 113, 1)',
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            fill: false,
                            tension: 0.1,
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return formatarMoeda(value);
                                }
                            }
                        }
                    }
                }
            });
        } else {
             ctxLinha.font = "14px 'Segoe UI'";
             ctxLinha.fillStyle = "#888";
             ctxLinha.textAlign = "center";
             ctxLinha.fillText("Nenhum dado de snapshot encontrado para este ativo.", ctxLinha.canvas.width / 2, ctxLinha.canvas.height / 2);
        }
    }
    // --- FIM DA NOVA LÓGICA PARA O GRÁFICO DE LINHA ---

    const modalTableHeaders = document.querySelectorAll('#modal-resumo-dividendos-ativo .sortable');
    modalTableHeaders.forEach(header => {
        header.classList.remove('ascending', 'descending');
        if (header.dataset.key === sortConfigModalProventos.key) {
            header.classList.add(sortConfigModalProventos.direction);
        }
    });

    abrirModal('modal-resumo-dividendos-ativo');
}

function abrirModalCalendarioProventos() {
    const container = document.getElementById('calendario-container');
    container.innerHTML = '<h4>Carregando calendário...</h4>';
    
    // Agora apenas chama a função auxiliar para gerar o HTML
    const htmlFinal = gerarHtmlCalendarioFIIs();
    container.innerHTML = htmlFinal;

    container.querySelectorAll('.provento-item-container').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target;
            const acoesDiv = item.querySelector('.provento-acoes');

            if (target.closest('.acao-btn')) {
                const proventoId = parseFloat(item.dataset.proventoId);
                if (target.closest('.edit')) {
                    const provento = todosOsProventos.find(p => p.id === proventoId);
                    if (provento) {
                        retornoModalProvento = 'calendario-fiis';
                        abrirModalLancamentoProvento(provento);
                    }
                } else if (target.closest('.delete')) {
                    deletarProvento(proventoId);
                }
            } else { 
                document.querySelectorAll('.provento-acoes').forEach(el => {
                    if (el !== acoesDiv) el.style.display = 'none';
                });
                acoesDiv.style.display = acoesDiv.style.display === 'flex' ? 'none' : 'flex';
            }
        });
    });
    
    abrirModal('modal-proventos-calendario');
}
function abrirModalCalendarioProventosAcoes() {
    const container = document.getElementById('calendario-container-acoes');
    container.innerHTML = '<h4>Carregando calendário...</h4>';

    // Agora apenas chama a função auxiliar para gerar o HTML
    const htmlFinal = gerarHtmlCalendarioAcoes();
    container.innerHTML = htmlFinal;
    
    container.querySelectorAll('.provento-item-container').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target;
            const acoesDiv = item.querySelector('.provento-acoes');

            if (target.closest('.acao-btn')) {
                const proventoId = parseFloat(item.dataset.proventoId);
                const provento = todosOsProventos.find(p => p.id === proventoId);
                if (provento) {
                    if (target.closest('.edit')) {
                        retornoModalProvento = 'calendario-acoes';
                        abrirModalLancamentoProvento(provento);
                    } else if (target.closest('.delete')) {
                        deletarProvento(provento.id);
                    }
                }
            } else {
                document.querySelectorAll('.provento-acoes').forEach(el => {
                    if (el !== acoesDiv) el.style.display = 'none';
                });
                acoesDiv.style.display = acoesDiv.style.display === 'flex' ? 'none' : 'flex';
            }
        });
    });

    abrirModal('modal-proventos-calendario-acoes');
}
/**
 * ATUALIZADO (FÓRMULA UNIVERSAL + JUROS RF): Calcula os dados de aportes e proventos.
 * Proventos agora incluem os juros mensais da Renda Fixa.
 * @returns {object} - Um objeto com 'labels' e 'datasets' para o Chart.js.
 */
function gerarDadosGraficoAportesProventos() {
    const dadosMensais = {};
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const initMes = (chaveMes) => {
        if (!dadosMensais[chaveMes]) {
            dadosMensais[chaveMes] = { proventos: 0, compras: 0, vendas: 0, aportesRF: 0, resgatesRF: 0 };
        }
    };

    todosOsProventos.forEach(p => {
        if (p.dataPagamento) {
            const chaveMes = p.dataPagamento.substring(0, 7);
            initMes(chaveMes);
            dadosMensais[chaveMes].proventos += p.valorTotalRecebido;
        }
    });

    const rendimentosRFPorAtivo = {};
    todosOsRendimentosRFNaoRealizados.forEach(r => {
        if (!rendimentosRFPorAtivo[r.ativoId]) rendimentosRFPorAtivo[r.ativoId] = {};
        const chaveMes = r.data.substring(0, 7);
        if (!rendimentosRFPorAtivo[r.ativoId][chaveMes]) rendimentosRFPorAtivo[r.ativoId][chaveMes] = [];
        rendimentosRFPorAtivo[r.ativoId][chaveMes].push(r.rendimento);
    });

    for (const ativoId in rendimentosRFPorAtivo) {
        let ultimoRendimento = 0;
        const chavesMeses = Object.keys(rendimentosRFPorAtivo[ativoId]).sort();
        chavesMeses.forEach(chaveMes => {
            const ano = parseInt(chaveMes.substring(0, 4));
            const rendimentosDoMes = rendimentosRFPorAtivo[ativoId][chaveMes];
            const rendimentoFinalMes = rendimentosDoMes[rendimentosDoMes.length - 1];
            const rendimentoIncremental = rendimentoFinalMes - ultimoRendimento;

            if (rendimentoIncremental > 0) {
                initMes(chaveMes);
                dadosMensais[chaveMes].proventos += rendimentoIncremental;
            }
            ultimoRendimento = rendimentoFinalMes;
        });
    }

    todasAsNotas.forEach(n => {
        const chaveMes = n.data.substring(0, 7);
        initMes(chaveMes);
        n.operacoes.forEach(op => {
            if (op.tipo === 'compra') {
                dadosMensais[chaveMes].compras += op.valor;
            } else if (op.tipo === 'venda') {
                dadosMensais[chaveMes].vendas += op.valor;
            }
        });
    });
    posicaoInicial.forEach(p => {
        if (p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.transacao.toLowerCase() === 'venda' && p.valorVenda) {
            const chaveMes = p.data.substring(0, 7);
            initMes(chaveMes);
            dadosMensais[chaveMes].vendas += p.valorVenda;
        }
    });

    todosOsAtivosRF.forEach(ativo => {
        const chaveMesInicial = ativo.dataAplicacao.substring(0, 7);
        initMes(chaveMesInicial);
    });

    todasAsMovimentacoes.forEach(t => {
        if (t.source === 'aporte_rf' || t.source === 'resgate_rf') {
            const chaveMes = t.data.substring(0, 7);
            initMes(chaveMes);
            if (t.source === 'aporte_rf') {
                dadosMensais[chaveMes].aportesRF += (-t.valor);
            } else {
                dadosMensais[chaveMes].resgatesRF += t.valor;
            }
        }
    });

    if (Object.keys(dadosMensais).length === 0) {
        return null;
    }

    const chavesOrdenadas = Object.keys(dadosMensais).sort();
    const labels = [];
    const dadosProventos = [];
    const dadosAportes = [];

    chavesOrdenadas.forEach(chave => {
        const dadosDoMes = dadosMensais[chave];
        const [ano, mesStr] = chave.split('-');
        const mes = parseInt(mesStr, 10) - 1;

        labels.push(`${mesesAbrev[mes]}/${ano.slice(-2)}`);

        const totalAplicado = dadosDoMes.compras + dadosDoMes.aportesRF;
        const capitalInterno = dadosDoMes.vendas + dadosDoMes.resgatesRF + dadosDoMes.proventos;
        const aporteExterno = totalAplicado - capitalInterno;

        dadosProventos.push(arredondarMoeda(dadosDoMes.proventos));
        dadosAportes.push(arredondarMoeda(Math.max(0, aporteExterno)));
    });

    return {
        labels,
        datasets: [
            {
                label: 'Proventos Gerados (RV + RF)',
                data: dadosProventos,
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60',
            },
            {
                label: 'Aportes Externos (Estimado)',
                data: dadosAportes,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
            }
        ]
    };
}
/**
 * Renderiza o gráfico de Aportes vs. Proventos no dashboard.
 */
function renderizarGraficoAportesProventos() {
    const container = document.getElementById('grafico-aportes-proventos-canvas');
    if (!container) return;
    const ctx = container.getContext('2d');

    if (graficoAportesInstance) {
        graficoAportesInstance.destroy();
    }

    const dadosGrafico = gerarDadosGraficoAportesProventos();

    if (!dadosGrafico) {
        ctx.font = "16px 'Segoe UI'";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Não há dados suficientes de aportes e proventos para gerar o gráfico.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const config = {
        data: dadosGrafico,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {},
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return formatarMoeda(value); }
                    }
                }
            }
        }
    };

    // Configuração específica para cada tipo de gráfico
    if (tipoGraficoAportes === 'barras') {
        config.type = 'bar';
        config.options.scales.x.stacked = true;
        config.options.scales.y.stacked = true;
    } else { // 'linhas'
        config.type = 'line';
        config.data.datasets.forEach(ds => {
            ds.borderWidth = 2;
            ds.fill = false;
            ds.tension = 0.1;
        });
    }

    graficoAportesInstance = new Chart(ctx, config);

    // Atualiza o estado visual dos botões de toggle
    document.querySelectorAll('#toggle-aportes-grafico .chart-toggle-btn').forEach(btn => {
        if (btn.dataset.tipo === tipoGraficoAportes) {
            btn.classList.add('ativo');
        } else {
            btn.classList.remove('ativo');
        }
    });
}
function gerarDadosBalanceamento(tipoAtivoFiltro = 'todos', aporteAdicional = 0) {
    const hoje = new Date().toISOString().split('T')[0];
    const posicoesAtuais = gerarPosicaoDetalhada(hoje);
    const valorTotalInvestidoAtual = calcularValorTotalCarteira(hoje);    
    const valorBaseParaCalculo = valorTotalInvestidoAtual + aporteAdicional;
    
    const categorias = {
        'Ações': { idealPercentual: 0, idealValor: 0, atual: 0, ativos: [] },
        'FIIs': { idealPercentual: 0, idealValor: 0, atual: 0, ativos: [] },
        'ETF': { idealPercentual: 0, idealValor: 0, atual: 0, ativos: [] },
        'Renda Fixa': { idealPercentual: 0, idealValor: 0, atual: 0, ativos: [] }
    };

    // --- INÍCIO DA CORREÇÃO ---
    // Passo 1: Calcular os valores IDEAIS primeiro, iterando sobre o plano de alocação.
    for (const ticker in dadosAlocacao.ativos) {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        if (ativoInfo) {
            const tipoMapeado = ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : ativoInfo.tipo;
            if (categorias[tipoMapeado]) {
                const percIdealAtivo = dadosAlocacao.ativos[ticker] || 0;
                categorias[tipoMapeado].idealValor += valorBaseParaCalculo * percIdealAtivo;
            }
        }
    }
    // Adiciona o valor ideal da Renda Fixa.
    const percIdealGlobalRF = dadosAlocacao.categorias['Renda Fixa'] || 0;
    categorias['Renda Fixa'].idealValor = valorBaseParaCalculo * percIdealGlobalRF;

    // Recalcula o percentual ideal da categoria com base na soma dos ativos.
    for (const nomeCat in categorias) {
        if (valorBaseParaCalculo > 0) {
            categorias[nomeCat].idealPercentual = categorias[nomeCat].idealValor / valorBaseParaCalculo;
        }
    }
    // --- FIM DA CORREÇÃO ---

    // Passo 2: Construir a lista completa de ativos a serem processados (em carteira + planejados).
    const todosOsTickersRelevantes = new Set(Object.keys(posicoesAtuais));
    Object.keys(dadosAlocacao.ativos).forEach(t => todosOsTickersRelevantes.add(t));
    
    // Passo 3: Processar cada ativo para preencher os dados atuais e de ajuste.
    todosOsTickersRelevantes.forEach(ticker => {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        const posicao = posicoesAtuais[ticker];
        const tipoAtivoCorrigido = ativoInfo ? (ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : ativoInfo.tipo) : null;
        
        if (tipoAtivoCorrigido && categorias[tipoAtivoCorrigido]) {
            const quantidade = posicao ? posicao.quantidade : 0;
            if (quantidade < 0.000001 && !(ticker in dadosAlocacao.ativos)) return;

            const cotacao = dadosDeMercado.cotacoes[ticker];
            const valorDeMercado = (cotacao?.valor > 0) ? quantidade * cotacao.valor : 0;
            categorias[tipoAtivoCorrigido].atual += valorDeMercado;

            const projecaoAnual = (ativoInfo.tipo === 'Ação') 
                ? calcularProjecaoAnualUnitaria(ticker, { limiteAnos: 5 })
                : getUltimoProvento(ticker) * 12;
            
            const yieldOnMarket = (cotacao?.valor > 0) ? projecaoAnual / cotacao.valor : 0;
            const variation = (posicao?.precoMedio > 0 && cotacao?.valor > 0) ? (cotacao.valor - posicao.precoMedio) / posicao.precoMedio : 0;
            // --- ALTERAÇÃO: Leitura unificada de VPA ---
            const vpaParaCalculo = (cotacao) ? (cotacao.vpa || 0) : 0;
            
            const percGlobalIdealAtivo = dadosAlocacao.ativos[ticker] || 0;
            const valorIdealAtivo = valorBaseParaCalculo * percGlobalIdealAtivo;

            categorias[tipoAtivoCorrigido].ativos.push({ 
                ticker, 
                valorDeMercado, 
                quantidade, 
                cotacao: cotacao ? cotacao.valor : 0,
                precoMedio: posicao ? posicao.precoMedio : 0,
                yieldOnMarket: yieldOnMarket,
                variation: variation,
                vpa: vpaParaCalculo,
                percGlobalIdeal: percGlobalIdealAtivo,
                valorIdeal: valorIdealAtivo
            });
        }
    });

    todosOsAtivosRF.forEach(ativoRF => {
        if ((ativoRF.descricao || '').toLowerCase().includes('(inativa)')) return;
        const saldosAtivoRF = calcularSaldosRFEmData(ativoRF, hoje);
        if (saldosAtivoRF.saldoLiquido <= 0) return;
        
        categorias['Renda Fixa'].atual += saldosAtivoRF.saldoLiquido;
    });

    const categoriasParaProcessar = tipoAtivoFiltro === 'todos' 
        ? Object.keys(categorias) 
        : [tipoAtivoFiltro === 'Ação' ? 'Ações' : tipoAtivoFiltro === 'FII' ? 'FIIs' : tipoAtivoFiltro];

    const resultado = {
        valorTotalCarteira: valorTotalInvestidoAtual, 
        valorTotalCarteiraFuturo: valorBaseParaCalculo, 
        categorias: {}
    };

    categoriasParaProcessar.forEach(nomeCategoria => {
        const categoria = categorias[nomeCategoria];
        const valorIdealCategoria = categoria.idealValor;
        const valorAtualCategoria = categoria.atual;
        const diffCategoria = valorIdealCategoria - valorAtualCategoria;
        const percentualAtualCategoria = valorTotalInvestidoAtual > 0 ? valorAtualCategoria / valorTotalInvestidoAtual : 0;
        
        resultado.categorias[nomeCategoria] = {
            ideal: { percentual: categoria.idealPercentual, valor: valorIdealCategoria },
            atual: { percentual: percentualAtualCategoria, valor: valorAtualCategoria },
            ajuste: { valor: diffCategoria },
            ativos: []
        };
        if (!Array.isArray(categoria.ativos)) return;

        categoria.ativos.sort((a,b) => a.ticker.localeCompare(b.ticker)).forEach(ativo => {
            const qtdIdeal = ativo.cotacao > 0 ? ativo.valorIdeal / ativo.cotacao : 0;
            
            const percIdealGlobal = ativo.percGlobalIdeal || 0;
            const percAtualGlobal = valorTotalInvestidoAtual > 0 ? ativo.valorDeMercado / valorTotalInvestidoAtual : 0;
            
            const diffValor = ativo.valorIdeal - ativo.valorDeMercado;
            const diffQtd = qtdIdeal - ativo.quantidade;
            
            let status = (Math.abs(diffValor) < (ativo.valorDeMercado * 0.005)) ? 'OK' : (diffValor > 0 ? 'Aportar' : 'Reduzir');
            
            resultado.categorias[nomeCategoria].ativos.push({
                ticker: ativo.ticker,
                status: status,
                precoMedio: ativo.precoMedio,
                yieldOnMarket: ativo.yieldOnMarket,
                variation: ativo.variation,
                vpa: ativo.vpa,
                ideal: {
                    valor: ativo.valorIdeal,
                    quantidade: qtdIdeal,
                    percentualGlobal: percIdealGlobal
                },
                atual: {
                    valor: ativo.valorDeMercado,
                    quantidade: ativo.quantidade,
                    cotacao: ativo.cotacao,
                    percentualGlobal: percAtualGlobal
                },
                ajuste: {
                    percentual: percIdealGlobal - percAtualGlobal, 
                    valor: diffValor,
                    quantidade: diffQtd
                }
            });
        });
    });

    return resultado;
}
/**
 * Processa os dados de balanceamento para um formato de rebalanceamento.
 * Agora suporta os modos 'categoria' (hierárquico) e 'ativo' (individual com tolerância).
 * @param {object} dadosCategorias - O objeto de categorias retornado por gerarDadosBalanceamento.
 * @param {string} modo - 'categoria' ou 'ativo'.
 * @returns {object} - Um objeto com listas de ativos a aportar/reduzir e os totais.
 */
function processarRebalanceamento(dadosCategorias, modo = 'categoria') {
    const resultado = {
        listaAportar: [],
        listaReduzir: [],
        totalRemanejar: 0
    };

    if (!dadosCategorias) {
        console.error("processarRebalanceamento foi chamada com dados de categoria indefinidos.");
        return resultado; 
    }

    for (const nomeCategoria in dadosCategorias) {
        if (dadosCategorias[nomeCategoria] && Array.isArray(dadosCategorias[nomeCategoria].ativos)) {
            
            // No modo 'categoria', só vende se a categoria inteira estiver estourada.
            // No modo 'ativo', essa trava é ignorada.
            const categoriaEstaSuperalocada = dadosCategorias[nomeCategoria]?.ajuste.valor < 0;

            dadosCategorias[nomeCategoria].ativos.forEach(ativo => {
                
                // Lógica de Aporte (Independe do modo aqui, pois a priorização ocorre na renderização)
                if (ativo.ajuste.valor > 1) {
                    resultado.listaAportar.push({
                        ticker: ativo.ticker,
                        valor: ativo.ajuste.valor,
                        cotacao: ativo.atual.cotacao,
                        yieldOnMarket: ativo.yieldOnMarket,
                        variation: ativo.variation,
                        alocacaoAtual: ativo.atual.percentualGlobal,
                        alocacaoIdeal: ativo.ideal.percentualGlobal
                    });
                } 
                // Lógica de Redução (Venda)
                else if (ativo.ajuste.quantidade <= -1) { 
                    
                    let deveSugerirVenda = false;

                    if (modo === 'categoria') {
                        // Lógica Original: Respeita hierarquia da categoria
                        if (categoriaEstaSuperalocada) {
                            deveSugerirVenda = true;
                        }
                    } else {
                        // Lógica Nova (Por Ativo): Banda de Tolerância de 2%
                        // ativo.ajuste.percentual é (Ideal - Atual). 
                        // Ex: Meta 5%, Atual 7.1% -> Diferença -2.1% (-0.021)
                        // A condição é: excedeu 2%? (ou seja, é menor que -0.02?)
                        if (ativo.ajuste.percentual < -0.02) {
                            deveSugerirVenda = true;
                        }
                    }

                    if (deveSugerirVenda) {
                        const quantidadeASerVendida = Math.floor(Math.abs(ativo.ajuste.quantidade));
                        const valorAReduzir = -(quantidadeASerVendida * ativo.atual.cotacao);
                        
                        // Trava de Prejuízo (Sempre Ativa)
                        const vendavelComLucro = ativo.atual.cotacao > ativo.precoMedio;
                        
                        let atendeCriterioPVP = true;
                        let pvpValorCalculado = 0;

                        // Trava de P/VP (Apenas no modo Categoria)
                        if (nomeCategoria === 'FIIs') {
                            const pvp = (ativo.vpa > 0) ? (ativo.atual.cotacao / ativo.vpa) : 0;
                            pvpValorCalculado = pvp;
                            
                            if (modo === 'categoria' && pvp > 0 && pvp < 1) {
                                atendeCriterioPVP = false;
                            }
                        }
                        
                        const isActionable = vendavelComLucro && atendeCriterioPVP;
                        
                        const lucroPrejuizo = (ativo.atual.cotacao - ativo.precoMedio) * quantidadeASerVendida;

                        resultado.listaReduzir.push({
                            ticker: ativo.ticker,
                            valor: valorAReduzir, 
                            cotacao: ativo.atual.cotacao,
                            isActionable: isActionable,
                            yieldOnMarket: ativo.yieldOnMarket,
                            variation: ativo.variation,
                            lucroPrejuizo: lucroPrejuizo,
                            motivoLucro: vendavelComLucro,
                            motivoPVP: atendeCriterioPVP,
                            pvp: pvpValorCalculado,
                            alocacaoAtual: ativo.atual.percentualGlobal,
                            alocacaoIdeal: ativo.ideal.percentualGlobal
                        });
                    }
                }
            });
        }
    }

    resultado.totalRemanejar = resultado.listaReduzir
        .filter(item => item.isActionable)
        .reduce((soma, item) => soma + Math.abs(item.valor), 0);

    resultado.listaAportar.sort((a, b) => b.valor - a.valor);
    
    resultado.listaReduzir.sort((a, b) => {
        if (a.isActionable && !b.isActionable) return -1;
        if (!a.isActionable && b.isActionable) return 1;
        return a.valor - b.valor;
    });

    return resultado;
}

function renderizarPlanoDeResgate(valorResgate, container) {
    planoDeAcaoAtual = { compras: [], vendas: [] };
    const hoje = new Date().toISOString().split('T')[0];

    let valorAindaNecessario = valorResgate;
    const sugestoesDeResgate = [];
    const vendasParaSimulacao = []; 

    // Prioridade 1: Renda Fixa
    const ativosRF = todosOsAtivosRF.filter(a => !(a.descricao || '').toLowerCase().includes('inativa'));
    let saldoTotalRF = 0;
    ativosRF.forEach(ativo => {
        saldoTotalRF += calcularSaldosRFEmData(ativo, hoje).saldoLiquido;
    });

    if (valorAindaNecessario > 0 && saldoTotalRF > 0) {
        const resgateDaRF = Math.min(valorAindaNecessario, saldoTotalRF);
        sugestoesDeResgate.push({
            ticker: 'Renda Fixa',
            valor: resgateDaRF,
            detalhes: `Sugerido resgatar de suas posições em Renda Fixa.`
        });
        valorAindaNecessario -= resgateDaRF;
    }

    // Prioridade 2: Renda Variável (ordenado por lucro)
    if (valorAindaNecessario > 0) {
        const posicoesRV = gerarPosicaoDetalhada();
        const ativosComLucro = [];

        Object.keys(posicoesRV).forEach(ticker => {
            const pos = posicoesRV[ticker];
            if (pos.quantidade > 0) {
                const cotacao = dadosDeMercado.cotacoes[ticker]?.valor || 0;
                if (cotacao > pos.precoMedio) {
                    const lucroPorCota = cotacao - pos.precoMedio;
                    ativosComLucro.push({
                        ticker,
                        lucroPorCota,
                        cotacao,
                        quantidade: pos.quantidade
                    });
                }
            }
        });

        ativosComLucro.sort((a, b) => b.lucroPorCota - a.lucroPorCota);

        for (const ativo of ativosComLucro) {
            if (valorAindaNecessario <= 0) break;

            const valorTotalAtivo = ativo.quantidade * ativo.cotacao;
            const valorVendaNecessario = Math.min(valorAindaNecessario, valorTotalAtivo);
            const qtdVenda = Math.ceil(valorVendaNecessario / ativo.cotacao);
            const valorVendaReal = qtdVenda * ativo.cotacao;

            sugestoesDeResgate.push({
                ticker: ativo.ticker,
                valor: valorVendaReal,
                detalhes: `Vender ${qtdVenda} cota(s) a ${formatarMoeda(ativo.cotacao)}.`
            });
            vendasParaSimulacao.push({
                ticker: ativo.ticker,
                qtd: qtdVenda,
                preco: ativo.cotacao
            });
            valorAindaNecessario -= valorVendaReal;
        }
    }
    
    planoDeAcaoAtual.vendas = vendasParaSimulacao;
    
    let visaoGeralHtml = `
        <div class="container">
            <h3>Plano de Resgate</h3>
            <p style="font-size: 0.9em; color: #555;">O sistema identificou a necessidade de um resgate de <strong>${formatarMoeda(valorResgate)}</strong>. As sugestões abaixo priorizam a liquidez (Renda Fixa) e a realização de lucros (Renda Variável).</p>
        </div>`;

    let planoAcaoHtml = `
        <div class="container" id="plano-de-acao-container">
             <div class="aporte-panel" style="background-color: #fffaf0; border: 1px solid #ffeeba; color: #856404; margin: 15px 0; display: block; text-align: center;">
                <div class="form-group aporte-input-group" style="margin-bottom: 0; justify-content: center;">
                    <label for="balanceamento-aporte-valor" style="color: #856404;">Valor do Resgate (R$):</label>
                    <input type="text" id="balanceamento-aporte-valor" value="${formatarDecimalParaInput(-valorResgate)}" onchange="renderizarTelaConsultaBalanceamento();">
                </div>
            </div>
            <div class="rebalanceamento-container">
                <div class="rebalanceamento-coluna full-width">
                    <h4><i class="fas fa-hand-holding-usd" style="color: var(--danger-color);"></i> Sugestões de Resgate/Venda</h4>`;

    sugestoesDeResgate.forEach(item => {
        planoAcaoHtml += `
            <div class="rebalanceamento-item item-aportar">
                <div class="item-aportar-linha-principal">
                    <span class="ticker-rebalanceamento" data-ticker="${item.ticker}">${item.ticker}</span>
                    <div><strong class="valor-negativo">- ${formatarMoeda(item.valor)}</strong></div>
                </div>
                <div class="indicadores-aporte"><span>${item.detalhes}</span></div>
            </div>`;
    });

    if (valorAindaNecessario > 0) {
        planoAcaoHtml += `<div class="dashboard-alert" style="background-color: #f8d7da; border-color: #f5c6cb; color: #721c24; margin-top: 15px;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span><strong>Atenção:</strong> Não foi possível atingir o valor total do resgate apenas com Renda Fixa e ativos com lucro. Falta resgatar <strong>${formatarMoeda(valorAindaNecessario)}</strong>.</span>
                        </div>`;
    }

    planoAcaoHtml += `</div></div></div>`;
    
    container.innerHTML = visaoGeralHtml + planoAcaoHtml;
    
    const aporteInputEl = document.getElementById('balanceamento-aporte-valor');
    if(aporteInputEl) {
        aporteInputEl.value = formatarDecimalParaInput(-valorResgate);
    }
}

function renderizarTelaConsultaBalanceamento() {
    planoDeAcaoAtual = { compras: [], vendas: [] };

    const container = document.getElementById('container-consulta-balanceamento');
    const containerAlerta = document.getElementById('container-alerta-concentracao');

    if (!dadosAlocacao) dadosAlocacao = { categorias: {}, ativos: {} };
    if (!dadosAlocacao.statusAporteRendaFixa) dadosAlocacao.statusAporteRendaFixa = 'Ativo';
    
    // Garante o padrão se não estiver definido
    const modoAtual = dadosAlocacao.modoRebalanceamento || 'categoria';
    const isModoAtivo = modoAtual === 'ativo';

    const isRFPausada = dadosAlocacao.statusAporteRendaFixa === 'Pausado';

    const aporteInput = document.getElementById('balanceamento-aporte-valor');
    const aporteEmDinheiro = parseDecimal(aporteInput?.value || '0');

    if (aporteEmDinheiro < 0) {
        renderizarPlanoDeResgate(Math.abs(aporteEmDinheiro), container);
        return;
    }

    //if (aporteInput && document.activeElement !== aporteInput && parseDecimal(aporteInput.value) !== parseDecimal(dadosSimulacaoNegociar.aporteTotal || '0')) {
    //    estadoSelecaoVendas = {};
    //}
    
    const dadosAtuais = gerarDadosBalanceamento('todos');
    const dadosFuturos = gerarDadosBalanceamento('todos', aporteEmDinheiro);
    // Passa o modo selecionado para a lógica de processamento de vendas
    let dadosProcessadosVenda = processarRebalanceamento(dadosFuturos.categorias, modoAtual);
    const posicoesAtuais = gerarPosicaoDetalhada();

    const alertaHtml = gerarAlertaDeConcentracaoHtml();
    containerAlerta.style.display = alertaHtml ? 'block' : 'none';
    containerAlerta.innerHTML = alertaHtml;

    if (dadosAtuais.valorTotalCarteira === 0) {
        container.innerHTML = '<p>Não há posições na carteira para analisar o balanceamento.</p>';
        return;
    }

    const ajusteRF = dadosFuturos.categorias['Renda Fixa']?.ajuste.valor || 0;
    
    const percentualAjusteRF = dadosFuturos.categorias['Renda Fixa']?.ajuste.percentual || 0;
    // CORREÇÃO AQUI: Banda de 2% para Renda Fixa no modo ativo
    const deveVenderRF = isModoAtivo ? (percentualAjusteRF < -0.02) : (ajusteRF < -1);

    if (deveVenderRF && ajusteRF < -1) {
        dadosProcessadosVenda.listaReduzir.unshift({ ticker: 'Renda Fixa', valor: ajusteRF, isActionable: true, yieldOnMarket: 0, variation: 0, lucroPrejuizo: 0, motivoLucro: true, motivoPVP: true, pvp: 0, cotacao: 1 });
    }

    const vendasSelecionadas = dadosProcessadosVenda.listaReduzir.filter(item => item.isActionable && estadoSelecaoVendas[item.ticker] !== false);
    const totalRemanejarSelecionado = vendasSelecionadas.reduce((soma, item) => soma + Math.abs(item.valor), 0);

    const capitalDisponivelInicial = totalRemanejarSelecionado + aporteEmDinheiro;
    const sugestoesDeCompra = {};
    const valorTotalFuturo = dadosAtuais.valorTotalCarteira + aporteEmDinheiro;

    const mapaValorAtual = new Map();
    const mapaDadosAtuais = new Map();
    Object.values(dadosAtuais.categorias).flatMap(c => c.ativos).forEach(a => {
        mapaValorAtual.set(a.ticker, a.atual.valor);
        mapaDadosAtuais.set(a.ticker, a);
    });

    // --- LÓGICA DE COMPRA (RAMIFICAÇÃO) ---
    
    const todosOsCandidatos = [];
    
    // Prepara os dados de todos os ativos candidatos (cálculo de Score)
    const mapaTickerParaCategoria = new Map();
    todosOsAtivos.forEach(a => mapaTickerParaCategoria.set(a.ticker, a.tipo.replace(/Ação/g, 'Ações').replace(/FII/g, 'FIIs')));

    todosOsAtivos.forEach(ativoInfo => {
        const percIdeal = dadosAlocacao.ativos[ativoInfo.ticker] || 0;
        if (percIdeal <= 0 && (!posicoesAtuais[ativoInfo.ticker] || posicoesAtuais[ativoInfo.ticker].quantidade < 0.000001)) return;

        const dadosMercadoAtivo = dadosDeMercado.cotacoes[ativoInfo.ticker] || {};
        if (!dadosMercadoAtivo.valor || dadosMercadoAtivo.valor <= 0) return;

        if (ativoInfo.tipo === 'Ação') {
            const projecaoAnual = calcularProjecaoAnualUnitaria(ativoInfo.ticker, { limiteAnos: 5 });
            const precoTetoBazin = calcularPrecoTetoBazin(projecaoAnual, ativoInfo.metaYieldBazin || 0.06);
            if (precoTetoBazin > 0 && dadosMercadoAtivo.valor > precoTetoBazin) return;
        }
        
        const valorAtualDoAtivo = mapaValorAtual.get(ativoInfo.ticker) || 0;
        const valorIdealFuturo = valorTotalFuturo * percIdeal;
        const necessidadeReal = Math.max(0, valorIdealFuturo - valorAtualDoAtivo);

        if (necessidadeReal > 0.01) {
             todosOsCandidatos.push({
                ticker: ativoInfo.ticker, 
                tipo: ativoInfo.tipo, 
                cotacao: dadosMercadoAtivo.valor,
                necessidadeRealDeAporte: necessidadeReal,
                scores: calcularScoreDeQualidade(ativoInfo, dadosMercadoAtivo),
                dadosOriginais: mapaDadosAtuais.get(ativoInfo.ticker) || {},
                categoria: mapaTickerParaCategoria.get(ativoInfo.ticker)
            });
        }
    });

    // --- RAMIFICAÇÃO AQUI ---
    if (isModoAtivo) {
        // === MODO ATIVO: IGNORA CATEGORIAS, PRIORIZA SCORE ===
        
        todosOsCandidatos.forEach(c => {
             if (todosOsAtivos.find(a => a.ticker === c.ticker)?.statusAporte !== 'Ativo') {
                 c.scoreFinalAlocacao = 0;
             } else {
                 c.scoreFinalAlocacao = c.necessidadeRealDeAporte * (1 + (c.scores.final / 100));
             }
        });

        // CORREÇÃO: Renda Fixa limita-se ao capital disponível
        if (!isRFPausada && ajusteRF > 0) {
             const valorPossivelRF = Math.min(ajusteRF, capitalDisponivelInicial);
             sugestoesDeCompra['Renda Fixa'] = { valor: valorPossivelRF, qtd: 0 };
        } else {
             sugestoesDeCompra['Renda Fixa'] = { valor: 0, qtd: 0 };
        }
        
        let capitalDisponivelParaRV = Math.max(0, capitalDisponivelInicial - sugestoesDeCompra['Renda Fixa'].valor);

        // 3. Distribuição do Capital
        const candidatosValidos = todosOsCandidatos.filter(c => c.scoreFinalAlocacao > 0);
        
        candidatosValidos.sort((a, b) => b.scoreFinalAlocacao - a.scoreFinalAlocacao);

        let iteracoes = 0;
        while (capitalDisponivelParaRV > 10 && iteracoes < 1000) { 
            let comprouAlgo = false;
            for (const candidato of candidatosValidos) {
                if (capitalDisponivelParaRV < candidato.cotacao) continue;

                const jaAlocado = (sugestoesDeCompra[candidato.ticker]?.qtd || 0) * candidato.cotacao;
                if (jaAlocado < candidato.necessidadeRealDeAporte) {
                     if (!sugestoesDeCompra[candidato.ticker]) {
                        sugestoesDeCompra[candidato.ticker] = { ticker: candidato.ticker, qtd: 0, preco: candidato.cotacao };
                    }
                    sugestoesDeCompra[candidato.ticker].qtd += 1;
                    capitalDisponivelParaRV -= candidato.cotacao;
                    comprouAlgo = true;
                }
            }
            if (!comprouAlgo) break;
            iteracoes++;
        }

    } else {
        // === MODO CATEGORIA: HIERARQUIA RÍGIDA (LÓGICA ORIGINAL) ===
        
        const orcamentoPorCategoria = {};
        const necessidadeTotalAporte = Object.values(dadosFuturos.categorias).reduce((soma, cat) => soma + Math.max(0, cat.ajuste.valor), 0);

        if (necessidadeTotalAporte > 0) {
            for (const nomeCategoria in dadosFuturos.categorias) {
                const necessidadeCategoria = Math.max(0, dadosFuturos.categorias[nomeCategoria].ajuste.valor);
                if (necessidadeCategoria > 0) {
                    const pesoCategoria = necessidadeCategoria / necessidadeTotalAporte;
                    orcamentoPorCategoria[nomeCategoria] = capitalDisponivelInicial * pesoCategoria;
                }
            }
        }

        if (orcamentoPorCategoria['Renda Fixa'] > 0 && !isRFPausada) {
            sugestoesDeCompra['Renda Fixa'] = { valor: orcamentoPorCategoria['Renda Fixa'], qtd: 0 };
        } else {
            sugestoesDeCompra['Renda Fixa'] = { valor: 0, qtd: 0 };
        }

        const alocarCapitalEmCategoria = (nomeCategoria, capitalAlocado) => {
            let candidatosDaCategoria = todosOsCandidatos.filter(c => c.categoria === nomeCategoria);
            
            candidatosDaCategoria.forEach(c => {
                 if (todosOsAtivos.find(a => a.ticker === c.ticker)?.statusAporte !== 'Ativo') {
                     c.scoreFinalAlocacao = 0;
                 } else {
                     c.scoreFinalAlocacao = c.necessidadeRealDeAporte * (1 + (c.scores.final / 100));
                 }
            });

            const candidatosOrdenados = candidatosDaCategoria.filter(c => c.scoreFinalAlocacao > 0).sort((a, b) => b.scoreFinalAlocacao - a.scoreFinalAlocacao);
            
            let capitalRestante = capitalAlocado;
            let iteracoes = 0;
            
            while (capitalRestante > 10 && iteracoes < 500) {
                let comprou = false;
                for (const candidato of candidatosOrdenados) {
                    if (capitalRestante >= candidato.cotacao) {
                         const jaAlocado = (sugestoesDeCompra[candidato.ticker]?.qtd || 0) * candidato.cotacao;
                         if (jaAlocado < candidato.necessidadeRealDeAporte) {
                            if (!sugestoesDeCompra[candidato.ticker]) {
                                sugestoesDeCompra[candidato.ticker] = { ticker: candidato.ticker, qtd: 0, preco: candidato.cotacao };
                            }
                            sugestoesDeCompra[candidato.ticker].qtd += 1;
                            capitalRestante -= candidato.cotacao;
                            comprou = true;
                         }
                    }
                }
                if (!comprou) break;
                iteracoes++;
            }
        };

        if (orcamentoPorCategoria['Ações'] > 0) alocarCapitalEmCategoria('Ações', orcamentoPorCategoria['Ações']);
        if (orcamentoPorCategoria['FIIs'] > 0) alocarCapitalEmCategoria('FIIs', orcamentoPorCategoria['FIIs']);
        if (orcamentoPorCategoria['ETFs'] > 0) alocarCapitalEmCategoria('ETFs', orcamentoPorCategoria['ETFs']);
    }

    // --- FIM DA LÓGICA DE COMPRA ---

    const aportePorCategoria = { 'Ações': 0, 'FIIs': 0, 'ETFs': 0, 'Renda Fixa': 0 };
    if (sugestoesDeCompra['Renda Fixa']) {
        aportePorCategoria['Renda Fixa'] += sugestoesDeCompra['Renda Fixa'].valor;
    }
    const mapaTickerParaCategoria2 = new Map();
    todosOsAtivos.forEach(a => mapaTickerParaCategoria2.set(a.ticker, a.tipo.replace(/Ação/g, 'Ações').replace(/FII/g, 'FIIs')));
    for (const ticker in sugestoesDeCompra) {
        const categoria = mapaTickerParaCategoria2.get(ticker);
        if (categoria && aportePorCategoria.hasOwnProperty(categoria)) {
            aportePorCategoria[categoria] += (sugestoesDeCompra[ticker].qtd || 0) * (sugestoesDeCompra[ticker].preco || 0);
        }
    }

    const vendasPorCategoria = { 'Ações': 0, 'FIIs': 0, 'ETFs': 0, 'Renda Fixa': 0 };
    vendasSelecionadas.forEach(item => {
        const categoria = mapaTickerParaCategoria2.get(item.ticker);
        if (categoria && vendasPorCategoria.hasOwnProperty(categoria)) {
            vendasPorCategoria[categoria] += Math.abs(item.valor);
        } else if (item.ticker === 'Renda Fixa') {
            vendasPorCategoria['Renda Fixa'] += Math.abs(item.valor);
        }
    });

    let valorTotalFinalSimulado = 0;
    for (const nomeCategoria in dadosAtuais.categorias) {
        const cat = dadosAtuais.categorias[nomeCategoria];
        const valorVendaCategoria = vendasPorCategoria[nomeCategoria] || 0;
        const valorAporteCategoria = aportePorCategoria[nomeCategoria] || 0;
        const valorPosAporte = cat.atual.valor - valorVendaCategoria + valorAporteCategoria;
        valorTotalFinalSimulado += valorPosAporte;
    }

    // --- RENDERIZAÇÃO HTML ---

    const seletorHtml = `
        <div style="display: flex; justify-content: center; margin-bottom: 20px; align-items: center; gap: 10px;">
            <span style="font-weight: bold; color: #555;">Método de Alocação:</span>
            <div class="radio-group" style="background: #fff;">
                <input type="radio" id="modo-alocacao-categoria" name="modo-alocacao" value="categoria" ${!isModoAtivo ? 'checked' : ''}>
                <label for="modo-alocacao-categoria" title="Preenche primeiro a meta da categoria (Macro), depois os ativos.">Priorizar Categorias</label>
                
                <input type="radio" id="modo-alocacao-ativo" name="modo-alocacao" value="ativo" ${isModoAtivo ? 'checked' : ''}>
                <label for="modo-alocacao-ativo" title="Ignora a categoria. Compra o que tem maior score e vende o que excede 3% da meta.">Priorizar Ativos (Individual)</label>
            </div>
        </div>
    `;

    let totalIdealPerc = 0, totalAtualPerc = 0, totalPosAportePerc = 0;
    let totalIdealValor = 0, totalAtualValor = 0, totalPosAporteValor = 0, totalAjusteValor = 0;

    let visaoGeralHtml = seletorHtml + `
        <div class="container">
            <h3>Visão Geral do Balanceamento por Categoria</h3>
            <p style="font-size: 0.9em; color: #555;">Diagnóstico da sua carteira e simulação do impacto do aporte.</p>
            <table class="balanceamento-tabela" style="font-size: 1em; margin-top: 15px;">
                <thead><tr>
                    <th>Categoria</th><th class="percentual header-numero">Ideal %</th><th class="percentual header-numero">Atual %</th>
                    <th class="percentual header-numero">Pós-Aporte %</th><th class="numero">Valor Ideal (R$)</th><th class="numero">Valor Atual (R$)</th>
                    <th class="numero">Valor Pós-Aporte (R$)</th><th class="numero">Ajuste Necessário (R$)</th>
                </tr></thead>
                <tbody>`;

    for (const nomeCategoria in dadosAtuais.categorias) {
        const cat = dadosAtuais.categorias[nomeCategoria];
        if (cat.ideal.percentual > 0 || cat.atual.valor > 0) {
            const classeAjuste = cat.ajuste.valor >= 0 ? 'status-aportar' : 'status-reduzir';
            const valorVendaCategoria = vendasPorCategoria[nomeCategoria] || 0;
            const valorAporteCategoria = aportePorCategoria[nomeCategoria] || 0;
            const valorPosAporte = cat.atual.valor - valorVendaCategoria + valorAporteCategoria;
            const percPosAporte = valorTotalFinalSimulado > 0 ? valorPosAporte / valorTotalFinalSimulado : 0;

            visaoGeralHtml += `<tr>
                <td><strong>${nomeCategoria}</strong></td><td class="percentual numero">${formatarPercentual(cat.ideal.percentual)}</td>
                <td class="percentual numero">${formatarPercentual(cat.atual.percentual)}</td><td class="percentual numero">${formatarPercentual(percPosAporte)}</td>
                <td class="numero">${formatarMoeda(cat.ideal.valor)}</td><td class="numero">${formatarMoeda(cat.atual.valor)}</td>
                <td class="numero">${formatarMoeda(valorPosAporte)}</td><td class="numero ${classeAjuste}">${formatarMoeda(cat.ajuste.valor)}</td>
            </tr>`;

            totalIdealPerc += cat.ideal.percentual;
            totalAtualPerc += cat.atual.percentual;
            totalPosAportePerc += percPosAporte;
            totalIdealValor += cat.ideal.valor;
            totalAtualValor += cat.atual.valor;
            totalPosAporteValor += valorPosAporte;
            totalAjusteValor += cat.ajuste.valor;
        }
    }

    visaoGeralHtml += `</tbody>
        <tfoot style="border-top: 2px solid var(--accent-color);">
            <tr>
                <td><strong>TOTAIS</strong></td><td class="percentual numero"><strong>${formatarPercentual(totalIdealPerc)}</strong></td>
                <td class="percentual numero"><strong>${formatarPercentual(totalAtualPerc)}</strong></td><td class="percentual numero"><strong>${formatarPercentual(totalPosAportePerc)}</strong></td>
                <td class="numero"><strong>${formatarMoeda(totalIdealValor)}</strong></td><td class="numero"><strong>${formatarMoeda(totalAtualValor)}</strong></td>
                <td class="numero"><strong>${formatarMoeda(totalPosAporteValor)}</strong></td><td class="numero"><strong>${formatarMoeda(totalAjusteValor)}</strong></td>
            </tr>
        </tfoot>
    </table></div>`;

    let planoAcaoHtml = `
        <div class="container" id="plano-de-acao-container">
            <div class="rebalanceamento-total-header"><h3>Plano de Ação por Ativo</h3>
                <div class="aporte-panel">
                    <div class="form-group aporte-input-group">
                        <label for="balanceamento-aporte-valor">Aporte em Dinheiro (R$):</label>
                        <input type="text" id="balanceamento-aporte-valor" placeholder="Ex: 1.000,00 ou -500,00 para resgate" onchange="estadoSelecaoVendas = {}; renderizarTelaConsultaBalanceamento();">
                    </div>
                    <div class="aporte-summary">
                        <div class="summary-data-point"><label>+ Capital de Vendas:</label><span id="balanceamento-capital-vendas">R$ 0,00</span></div>
                        <div class="summary-data-point total"><label>= Capital Total Disponível:</label><span id="balanceamento-capital-total">R$ 0,00</span></div>
                        <div class="summary-data-point"><label>- Valor Aportado (Sugerido):</label><span id="balanceamento-valor-aportado" class="valor-positivo">R$ 0,00</span></div>
                        <div class="summary-data-point"><label>= Sobra de Caixa:</label><span id="balanceamento-sobra-caixa">R$ 0,00</span></div>
                    </div>
                </div>
            </div>
            <div class="rebalanceamento-container">`;

    const exibirColunaReduzir = dadosProcessadosVenda.listaReduzir.length > 0;

    if (exibirColunaReduzir) {
        planoAcaoHtml += `<div class="rebalanceamento-coluna">
                            <h4><i class="fas fa-arrow-down" style="color: var(--danger-color);"></i> Reduzir Ativos (Fonte de Capital)</h4>
                            <div class="rebalanceamento-item-header">
                                <span>Ativo</span>
                                <div class="item-venda-valores-header" style="width: 280px;">
                                    <span>Alocação (Atual/Ideal)</span>
                                    <span>L/P Venda</span>
                                    <span>Valor a Reduzir</span>
                                </div>
                            </div>`;
        dadosProcessadosVenda.listaReduzir.forEach(item => {
            if (item.ticker === 'Renda Fixa') {
                const isChecked = item.isActionable && estadoSelecaoVendas[item.ticker] !== false;
                const isDisabled = !item.isActionable ? 'disabled' : '';
                planoAcaoHtml += `<div class="rebalanceamento-item item-venda"><div class="item-venda-controles"><input type="checkbox" id="venda-${item.ticker}" ${isChecked ? 'checked' : ''} onchange="toggleSelecaoVenda('${item.ticker}')" ${isDisabled}><span class="ticker-rebalanceamento" data-ticker="${item.ticker}">${item.ticker}</span></div><div class="item-venda-valores" style="width: 280px;"><div style="flex: 1.2; text-align: right; font-size: 0.9em;">-</div><div class="item-lucro-prejuizo" style="flex: 1; text-align: right;">-</div><strong class="valor-negativo" title="Valor a reduzir para atingir o ideal">${formatarMoeda(item.valor)}</strong></div></div>`;
                return;
            }
            const isChecked = item.isActionable && estadoSelecaoVendas[item.ticker] !== false;
            const isDisabled = !item.isActionable ? 'disabled' : '';
            const classeItem = item.isActionable ? '' : 'item-desabilitado';
            const classeLucroPrejuizo = item.lucroPrejuizo >= 0 ? 'valor-positivo' : 'valor-negativo';
            const percentualHtml = ` <span style="font-size: 0.9em; font-style: italic;" class="${classeLucroPrejuizo}">(${formatarPercentual(item.variation)})</span>`;
            const lucroPrejuizoHtml = `<div class="item-lucro-prejuizo ${classeLucroPrejuizo}" title="Lucro/Prejuízo da Posição (Valor e Percentual)">${formatarMoeda(item.lucroPrejuizo)}${percentualHtml}</div>`;
            let mensagemInativoHtml = '';
            if (!item.isActionable) {
                let razao = !item.motivoLucro ? 'Com prejuízo' : (!item.motivoPVP && !isModoAtivo) ? `P/VP < 1.0` : 'Abaixo da tolerância';
                if (!item.motivoPVP && isModoAtivo && item.motivoLucro) razao = ""; 

                if (razao) {
                    mensagemInativoHtml = `<div class="mensagem-prejuizo">${razao} - Venda não recomendada.</div>`;
                }
            }
            const alocacaoHtml = `<div class="item-alocacao-venda" style="flex: 1.2; text-align: right; font-size: 0.9em;">${formatarPercentual(item.alocacaoAtual)} / ${formatarPercentual(item.alocacaoIdeal)}</div>`;
            planoAcaoHtml += `<div class="rebalanceamento-item item-venda ${classeItem}"><div class="item-venda-controles"><input type="checkbox" id="venda-${item.ticker}" ${isChecked ? 'checked' : ''} onchange="toggleSelecaoVenda('${item.ticker}')" ${isDisabled}><span class="ticker-rebalanceamento" data-ticker="${item.ticker}">${item.ticker} <small class="ticker-cotacao">(${formatarMoeda(item.cotacao)})</small></span></div><div class="item-venda-valores" style="width: 280px;">${alocacaoHtml}${lucroPrejuizoHtml}<strong class="valor-negativo" title="Valor a reduzir para atingir o ideal">${formatarMoeda(item.valor)}</strong></div>${mensagemInativoHtml}</div>`;
        });
        planoAcaoHtml += `</div>`;
    }

    const classeColunaAporte = !exibirColunaReduzir ? 'full-width' : '';
    planoAcaoHtml += `<div class="rebalanceamento-coluna ${classeColunaAporte}"><h4><i class="fas fa-arrow-up" style="color: var(--success-color);"></i> Aportar em Ativos (Destino)</h4>`;
    
    if ((sugestoesDeCompra['Renda Fixa'] && sugestoesDeCompra['Renda Fixa'].valor > 0) || isRFPausada) {
        const classeItemPausadoRF = isRFPausada ? 'item-pausado' : '';
        const iconePausaRF = isRFPausada ? 'fa-play-circle' : 'fa-pause-circle';
        const tituloIconeRF = isRFPausada ? 'Reativar sugestão para Renda Fixa' : 'Pausar sugestão para Renda Fixa';
        const valorExibidoRF = isRFPausada ? 0 : sugestoesDeCompra['Renda Fixa']?.valor || 0;
        planoAcaoHtml += `<div class="rebalanceamento-item item-aportar ${classeItemPausadoRF}"><div class="item-aportar-linha-principal"><span class="ticker-aporte">Renda Fixa</span><div><strong class="valor-positivo">+ ${formatarMoeda(valorExibidoRF)}</strong><i class="fas ${iconePausaRF} icone-pausa-aporte" id="icone-pausa-rf" title="${tituloIconeRF}"></i></div></div><div class="indicadores-aporte"><span>Aporte para atingir a meta de alocação.</span></div></div>`;
    }

    const listaFinalParaExibir = todosOsCandidatos
        .filter(c => sugestoesDeCompra[c.ticker] || (todosOsAtivos.find(a => a.ticker === c.ticker)?.statusAporte === 'Pausado'))
        .sort((a, b) => b.scoreFinalAlocacao - a.scoreFinalAlocacao);

    if (listaFinalParaExibir.length > 0) {
        listaFinalParaExibir.forEach(candidato => {
            const ativo = todosOsAtivos.find(a => a.ticker === candidato.ticker);
            if (!ativo) return;
            const isPaused = ativo.statusAporte === 'Pausado';
            const classeVariacao = (candidato.dadosOriginais?.variation ?? 0) >= 0 ? 'variacao-positiva' : 'variacao-negativa';
            const classeItemPausado = isPaused ? 'item-pausado' : '';
            const iconePausa = isPaused ? 'fa-play-circle' : 'fa-pause-circle';
            const tituloIcone = isPaused ? 'Reativar sugestão para este ativo' : 'Pausar sugestão para este ativo';
            const sugestao = sugestoesDeCompra[candidato.ticker];

            let textoIndicadores;
            const alocacaoAtual = candidato.dadosOriginais?.atual?.percentualGlobal || 0;
            const alocacaoIdeal = candidato.dadosOriginais?.ideal?.percentualGlobal || 0;
            const alocacaoTexto = `Aloc: ${formatarPercentual(alocacaoAtual)} de ${formatarPercentual(alocacaoIdeal)}`;
            if (candidato.tipo === 'Ação') {
                textoIndicadores = `Score: ${candidato.scores.final.toFixed(1)} (Y:${candidato.scores.yield.toFixed(0)}, B:${candidato.scores.bazin.toFixed(0)}, P:${candidato.scores.payout.toFixed(0)})`;
            } else {
                textoIndicadores = `Score: ${candidato.scores.final.toFixed(1)} (Y:${candidato.scores.yield.toFixed(0)}, PVP:${candidato.scores.pvp.toFixed(0)})`;
            }
            const tooltipNecessidade = `\nNecessidade de aporte: ${formatarMoeda(candidato.necessidadeRealDeAporte)}`;
            const dadosMercadoAtivo = dadosDeMercado.cotacoes[ativo.ticker] || {};
            const precoTetoGraham = calcularPrecoTetoGraham(dadosMercadoAtivo.lpa_acao, dadosMercadoAtivo.vpa);
            let alertaGraham = '';
            const tooltipAlertaGraham = `Preço Teto Graham: ${formatarMoeda(precoTetoGraham)}`;
            if (precoTetoGraham > 0 && dadosMercadoAtivo.valor > precoTetoGraham) {
                alertaGraham = `<div class="indicador-alerta-graham" title="${tooltipAlertaGraham}"><i class="fas fa-exclamation-triangle"></i> Acima do Teto de Graham</div>`;
            }
            if (sugestao || isPaused) {
                planoAcaoHtml += `<div class="rebalanceamento-item item-aportar ${classeItemPausado}"><div class="item-aportar-linha-principal"><span class="ticker-rebalanceamento" data-ticker="${candidato.ticker}">${candidato.ticker} <small class="ticker-cotacao">(${formatarMoeda(candidato.cotacao)})</small></span><div><strong class="valor-positivo" title="Valor sugerido para este aporte">+ ${formatarMoeda(sugestao?.qtd * sugestao?.preco || 0)}</strong><i class="fas ${iconePausa} icone-pausa-aporte" data-ticker="${candidato.ticker}" title="${tituloIcone}"></i></div></div><div class="indicadores-aporte" title="${textoIndicadores + tooltipNecessidade}"><span>Score: ${candidato.scores.final.toFixed(1)}</span><span>Yield: ${formatarPercentual(candidato.dadosOriginais?.yieldOnMarket || 0)}</span><span class="${classeVariacao}">Var. PM: ${formatarPercentual(candidato.dadosOriginais?.variation || 0)}</span><span>${alocacaoTexto}</span></div>${sugestao && sugestao.qtd > 0 && !isPaused ? `<div class="sugestao-compra">Sugestão de Compra: ${sugestao.qtd} cota(s)</div>` : ''}${alertaGraham}</div>`;
            }
        });
    } else if ((!sugestoesDeCompra['Renda Fixa'] || sugestoesDeCompra['Renda Fixa'].valor === 0)) {
        planoAcaoHtml += '<p style="text-align: center; font-style: italic; color: #888;">Nenhum ativo elegível para aporte.</p>';
    }

    planoAcaoHtml += `</div></div></div>`;

    container.innerHTML = visaoGeralHtml + planoAcaoHtml;

    // Adicionado 'atualizarIconeDeAlertasGlobal()' dentro do listener de mudança de modo
    document.querySelectorAll('input[name="modo-alocacao"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            dadosAlocacao.modoRebalanceamento = e.target.value;
            salvarDadosAlocacao();
            renderizarTelaConsultaBalanceamento();
            atualizarIconeDeAlertasGlobal(); // ATUALIZA O ÍCONE INSTANTANEAMENTE
        });
    });

    const aporteInputEl = document.getElementById('balanceamento-aporte-valor');
    if (aporteInputEl) {
        aporteInputEl.value = formatarDecimalParaInput(aporteEmDinheiro);
    }

    const valorRealAportado = Object.values(aportePorCategoria).reduce((soma, v) => soma + v, 0);
    const sobra = capitalDisponivelInicial - valorRealAportado;

    document.getElementById('balanceamento-capital-vendas').textContent = formatarMoeda(totalRemanejarSelecionado);
    document.getElementById('balanceamento-capital-total').textContent = formatarMoeda(capitalDisponivelInicial);
    document.getElementById('balanceamento-valor-aportado').textContent = formatarMoeda(valorRealAportado);
    document.getElementById('balanceamento-sobra-caixa').textContent = formatarMoeda(sobra);

    planoDeAcaoAtual.compras = Object.values(sugestoesDeCompra).filter(s => s.ticker);
    planoDeAcaoAtual.vendas = dadosProcessadosVenda.listaReduzir
        .filter(item => item.isActionable && item.ticker !== 'Renda Fixa')
        .map(item => {
            const cotacaoAtual = dadosDeMercado.cotacoes[item.ticker]?.valor || 0;
            return {
                ticker: item.ticker,
                qtd: cotacaoAtual > 0 ? Math.round(Math.abs(item.valor) / cotacaoAtual) : 0,
                preco: cotacaoAtual
            };
        }).filter(item => item.qtd > 0);
}

async function aplicarPlanoDeAcaoParaSimulacao() {
    const btn = document.getElementById('btn-levar-plano-para-negociar');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    btn.disabled = true;
    isNavigating = true; 

    try {
        // --- CORREÇÃO DO BUG DE DUPLICIDADE ---
        // Antes: Pegava o capital TOTAL (Vendas + Aporte).
        // Agora: Pega apenas o APORTE NOVO (Dinheiro do bolso).
        // O dinheiro das vendas será gerado naturalmente na tela de negociação ao incluir os ativos de venda.
        const aporteDinheiroNovo = parseDecimal(document.getElementById('balanceamento-aporte-valor').value || '0');

        // Encontra o valor reservado para Renda Fixa
        const elementoAporteRF = document.querySelector('#plano-de-acao-container .ticker-aporte');
        let valorAporteRF = 0;
        if (elementoAporteRF) {
            const containerItem = elementoAporteRF.closest('.rebalanceamento-item');
            // Verifica se é um item de Renda Fixa (pelo texto do ticker) e se não está pausado
            if (elementoAporteRF.textContent.includes('Renda Fixa') && !containerItem.classList.contains('item-pausado')) {
                const elementoValor = containerItem.querySelector('strong.valor-positivo');
                if (elementoValor) {
                    valorAporteRF = parseDecimal(elementoValor.textContent);
                }
            }
        }
        
        // O Aporte para a simulação de RV é: (Dinheiro Novo - O que vai para a RF)
        // Se for negativo (ex: Venda paga a RF), o saldo inicial da simulação começa negativo, 
        // e será coberto pelas vendas que também estão indo para lá.
        const aporteLiquidoParaRV = aporteDinheiroNovo - valorAporteRF;

        dadosSimulacaoNegociar = { fiis: {}, acoes: {}, aporteTotal: '' };
        
        planoDeAcaoAtual.vendas.forEach(item => {
            if (estadoSelecaoVendas[item.ticker] !== false) {
                const ativoInfo = todosOsAtivos.find(a => a.ticker === item.ticker);
                if (!ativoInfo) return;
                const tipo = ativoInfo.tipo === 'Ação' ? 'acoes' : 'fiis';
                dadosSimulacaoNegociar[tipo][item.ticker] = {
                    qtd: -item.qtd, // Quantidade negativa para venda
                    preco: item.preco
                };
            }
        });

        planoDeAcaoAtual.compras.forEach(item => {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === item.ticker);
            if (!ativoInfo) return;
            
            if (ativoInfo.tipo === 'Ação' || ativoInfo.tipo === 'FII' || ativoInfo.tipo === 'ETF') {
                const tipo = ativoInfo.tipo === 'Ação' ? 'acoes' : 'fiis';

                if (!dadosSimulacaoNegociar[tipo][item.ticker]) {
                    const dadosParaSalvar = {
                        qtd: item.qtd,
                        preco: item.preco
                    };
                    if (tipo === 'acoes') {
                        dadosParaSalvar.bazinYield = ativoInfo.metaYieldBazin || 0.06;
                    }
                    dadosSimulacaoNegociar[tipo][item.ticker] = dadosParaSalvar;
                }
            }
        });

        dadosSimulacaoNegociar.aporteTotal = formatarDecimalParaInput(aporteLiquidoParaRV);

        await salvarDadosSimulacaoNegociar();

        mostrarTela('negociar');
        renderizarTelaNegociar();
        
        alert('Plano de ação carregado na tela de simulação!');

    } catch (error) {
        console.error("Erro ao levar plano para simulação:", error);
        alert("Ocorreu um erro ao carregar o plano. Tente novamente.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        isNavigating = false; 
    }
}
function abrirModalBalanceamento(tipoAtivo) {
    const modal = document.getElementById('modal-balanceamento-detalhes');
    const titulo = document.getElementById('modal-balanceamento-titulo');
    const container = document.getElementById('modal-balanceamento-container');
    
    titulo.textContent = `Análise de Balanceamento - ${tipoAtivo}`;
    container.innerHTML = '<h4>Calculando...</h4>';
    abrirModal('modal-balanceamento-detalhes');

    const dados = gerarDadosBalanceamento('todos'); 
    let categoria;
    let ativosParaTabela = [];
    let dadosParaProcessar = {};

    if (tipoAtivo === 'Renda Variável') {
        const catAcoes = dados.categorias['Ações'];
        const catFIIs = dados.categorias['FIIs'];
        const catETFs = dados.categorias['ETF'];

        categoria = {
            ideal: { 
                valor: (catAcoes?.ideal.valor || 0) + (catFIIs?.ideal.valor || 0) + (catETFs?.ideal.valor || 0),
                percentual: (catAcoes?.ideal.percentual || 0) + (catFIIs?.ideal.percentual || 0) + (catETFs?.ideal.percentual || 0)
            },
            atual: { 
                valor: (catAcoes?.atual.valor || 0) + (catFIIs?.atual.valor || 0) + (catETFs?.atual.valor || 0)
            },
            ajuste: {
                valor: ((catAcoes?.ideal.valor || 0) + (catFIIs?.ideal.valor || 0) + (catETFs?.ideal.valor || 0)) - ((catAcoes?.atual.valor || 0) + (catFIIs?.atual.valor || 0) + (catETFs?.atual.valor || 0))
            }
        };
        ativosParaTabela = [...(catAcoes?.ativos || []), ...(catFIIs?.ativos || []), ...(catETFs?.ativos || [])];
        
        // --- INÍCIO DA ALTERAÇÃO ---
        // Monta o objeto na estrutura correta que a função 'processarRebalanceamento' espera.
        dadosParaProcessar = {
            'Renda Variável': {
                ajuste: categoria.ajuste,
                ativos: ativosParaTabela
            }
        };
        // --- FIM DA ALTERAÇÃO ---

    } else {
        const chaveCategoria = tipoAtivo === 'Ação' ? 'Ações' : tipoAtivo === 'FII' ? 'FIIs' : tipoAtivo;
        categoria = dados.categorias[chaveCategoria];
        ativosParaTabela = categoria ? categoria.ativos : [];

        // --- INÍCIO DA ALTERAÇÃO ---
        // Monta o objeto na estrutura correta também para categorias individuais.
        if (categoria) {
            dadosParaProcessar = { [chaveCategoria]: categoria };
        }
        // --- FIM DA ALTERAÇÃO ---
    }

    if (!categoria || ativosParaTabela.length === 0) {
        container.innerHTML = `<p>Nenhuma posição ou alocação ideal definida para ${tipoAtivo}.</p>`;
    } else {
        // --- INÍCIO DA ALTERAÇÃO ---
        // A chamada agora usa o objeto 'dadosParaProcessar' que foi montado corretamente.
        const dadosProcessados = processarRebalanceamento(dadosParaProcessar);
        // --- FIM DA ALTERAÇÃO ---
        
        const rebalanceamentoHtml = `
            <div class="balanceamento-categoria-summary">
                <div><label>Valor Atual da Categoria</label><span>${formatarMoeda(categoria.atual.valor)}</span></div>
                <div><label>Valor Ideal da Categoria</label><span>${formatarMoeda(categoria.ideal.valor)}</span></div>
                <div class="remanejamento-valor"><label>Valor a Remanejar</label><span>${formatarMoeda(dadosProcessados.totalRemanejar)}</span></div>
            </div>
            <div class="rebalanceamento-container">
                <div class="rebalanceamento-coluna">
                    <h4><i class="fas fa-arrow-down" style="color: var(--danger-color);"></i> Reduzir</h4>
                     ${dadosProcessados.listaReduzir.map(item => `<div class="rebalanceamento-item"><span>${item.ticker}</span><strong class="valor-negativo">${formatarMoeda(item.valor)}</strong></div>`).join('')}
                </div>
                <div class="rebalanceamento-coluna">
                    <h4><i class="fas fa-arrow-up" style="color: var(--success-color);"></i> Aportar</h4>
                     ${dadosProcessados.listaAportar.map(item => `<div class="rebalanceamento-item"><span>${item.ticker}</span><strong class="valor-positivo">${formatarMoeda(item.valor)}</strong></div>`).join('')}
                </div>
            </div>
            <hr style="margin: 25px 0;">
            <h4 style="text-align: center; margin-bottom: 15px;">Visão Detalhada</h4>
        `;
        const tabelaDetalhadaHtml = gerarTabelaBalanceamentoHtml(ativosParaTabela);
        container.innerHTML = rebalanceamentoHtml + tabelaDetalhadaHtml;
    }
}
function gerarTabelaBalanceamentoHtml(dadosAtivos) {
    let tabelaHtml = `
        <table class="balanceamento-tabela" style="font-size: 0.9em;">
            <thead>
                <tr>
                    <th rowspan="2">Ativo</th>
                    <th rowspan="2">Status</th>
                    <th colspan="3" class="group-header group-1">Posição Ideal</th>
                    <th colspan="3" class="group-header group-2">Posição Atual</th>
                    <th colspan="3" class="group-header group-3">Ajuste Necessário</th>
                </tr>
                <tr>
                    <th class="percentual group-1">% Global</th>
                    <th class="numero group-1">Valor (R$)</th>
                    <th class="numero group-1">Qtd.</th>
                    <th class="percentual group-2">% Global</th>
                    <th class="numero group-2">Valor (R$)</th>
                    <th class="numero group-2">Qtd.</th>
                    <th class="percentual group-3">Ajuste %</th>
                    <th class="numero group-3">Ajuste (R$)</th>
                    <th class="numero group-3">Ajuste Qtd.</th>
                </tr>
            </thead>
            <tbody>
    `;

    dadosAtivos.forEach(ativo => {
        const statusLabel = ativo.status;
        let classeStatus = '';
        if (statusLabel === 'OK') {
            classeStatus = 'status-ok';
        } else if (statusLabel === 'Aportar') {
            classeStatus = 'status-aportar';
        } else {
            classeStatus = 'status-reduzir';
        }

        // <<< ALTERAÇÃO APLICADA AQUI: A classe de status agora está na tag <tr> >>>
        tabelaHtml += `
            <tr class="${classeStatus}">
                <td>${ativo.ticker}</td>
                <td><strong class="${classeStatus}">${statusLabel}</strong></td>
                <td class="percentual group-1">${formatarPercentual(ativo.ideal.percentualGlobal)}</td>
                <td class="numero group-1">${formatarMoeda(ativo.ideal.valor)}</td>
                <td class="numero group-1">${Math.round(ativo.ideal.quantidade)}</td>
                <td class="percentual group-2">${formatarPercentual(ativo.atual.percentualGlobal)}</td>
                <td class="numero group-2">${formatarMoeda(ativo.atual.valor)}</td>
                <td class="numero group-2">${Math.round(ativo.atual.quantidade)}</td>
                <td class="percentual group-3">${formatarPercentual(ativo.ajuste.percentual)}</td>
                <td class="numero group-3">${formatarMoeda(ativo.ajuste.valor)}</td>
                <td class="numero group-3">${Math.round(ativo.ajuste.quantidade)}</td>
            </tr>
        `;
    });

    tabelaHtml += `</tbody></table>`;
    return tabelaHtml;
}

function renderizarCalendarioGeral() {
    const container = document.getElementById('container-calendario-geral');
    const filtroCorretora = document.getElementById('calendario-geral-filtro-corretora')?.value || 'consolidado';
    
    const calendarioData = {}; 

    const initCalendarioData = (ano, mes, tipo) => {
        if (!calendarioData[ano]) calendarioData[ano] = Array.from({ length: 12 }, () => ({}));
        if (!calendarioData[ano][mes][tipo]) calendarioData[ano][mes][tipo] = [];
    };

    todosOsProventos.forEach(p => {
        if (!p.dataPagamento) return;
        let valorConsiderado = (filtroCorretora === 'consolidado') ? p.valorTotalRecebido : (p.posicaoPorCorretora[filtroCorretora]?.valorRecebido || 0);
        if (valorConsiderado === 0) return;

        const data = new Date(p.dataPagamento + 'T12:00:00');
        const ano = data.getUTCFullYear();
        const mes = data.getUTCMonth();
        const ativoInfo = todosOsAtivos.find(a => a.ticker === p.ticker);
        const tipoAtivo = ativoInfo ? ativoInfo.tipo : 'Outro';

        initCalendarioData(ano, mes, tipoAtivo);
        calendarioData[ano][mes][tipoAtivo].push({
            ticker: p.ticker, dataCom: p.dataCom, dataPagamento: p.dataPagamento,
            valorIndividual: p.valorIndividual, valor: valorConsiderado
        });
    });

    const rendimentosRFPorAtivo = {};
    todosOsRendimentosRFNaoRealizados.forEach(r => {
        const ativoRF = todosOsAtivosRF.find(a => a.id === r.ativoId);
        if (!ativoRF || (filtroCorretora !== 'consolidado' && ativoRF.instituicao !== filtroCorretora)) return;
        const chaveMes = r.data.substring(0, 7);
        if (!rendimentosRFPorAtivo[r.ativoId]) rendimentosRFPorAtivo[r.ativoId] = {};
        if (!rendimentosRFPorAtivo[r.ativoId][chaveMes]) rendimentosRFPorAtivo[r.ativoId][chaveMes] = [];
        rendimentosRFPorAtivo[r.ativoId][chaveMes].push(r.rendimento);
    });

    for (const ativoId in rendimentosRFPorAtivo) {
        let ultimoRendimento = 0;
        Object.keys(rendimentosRFPorAtivo[ativoId]).sort().forEach(chaveMes => {
            const [ano, mes] = chaveMes.split('-').map(Number);
            const rendimentosDoMes = rendimentosRFPorAtivo[ativoId][chaveMes];
            const rendimentoFinalMes = rendimentosDoMes[rendimentosDoMes.length - 1];
            const rendimentoIncremental = rendimentoFinalMes - ultimoRendimento;
            
            // --- INÍCIO DA ALTERAÇÃO ---
            // Adicionada a condição para apenas somar rendimentos positivos.
            if (rendimentoIncremental > 0) {
            // --- FIM DA ALTERAÇÃO ---
                 const ativoRF = todosOsAtivosRF.find(a => String(a.id) === ativoId);
                 initCalendarioData(ano, mes - 1, 'Renda Fixa');
                 calendarioData[ano][mes - 1]['Renda Fixa'].push({
                     descricao: ativoRF.descricao, valor: rendimentoIncremental
                 });
            }
            ultimoRendimento = rendimentoFinalMes;
        });
    }
    
    const anosOrdenados = Object.keys(calendarioData).sort((a, b) => b - a);
    if (anosOrdenados.length === 0) {
        container.innerHTML = `<p>Nenhum rendimento encontrado para o filtro selecionado.</p>`;
        return;
    }
    
    let htmlFinal = '';
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    anosOrdenados.forEach(ano => {
        htmlFinal += `<div class="calendario-ano-container"><h3>${ano}</h3><table>`;
        htmlFinal += `<thead><tr><th>Classe de Ativo</th>`;
        meses.forEach(mes => htmlFinal += `<th class="header-numero">${mes}</th>`);
        htmlFinal += `<th class="header-numero">Total Ano</th></tr></thead><tbody>`;

        const totaisMensais = Array(12).fill(0);

        const tiposDeAtivoComDados = new Set();
        if (calendarioData[ano]) {
            for (let i = 0; i < 12; i++) {
                if (calendarioData[ano][i]) {
                    Object.keys(calendarioData[ano][i]).forEach(tipo => {
                        if (calendarioData[ano][i][tipo].length > 0) {
                            tiposDeAtivoComDados.add(tipo);
                        }
                    });
                }
            }
        }
        const tiposOrdenados = Array.from(tiposDeAtivoComDados).sort();

        tiposOrdenados.forEach(tipo => {
            htmlFinal += `<tr><td><strong>${tipo}</strong></td>`;
            let totalTipoNoAno = 0;
            for (let i = 0; i < 12; i++) {
                const dadosDoMes = calendarioData[ano]?.[i]?.[tipo] || [];
                const valorMes = dadosDoMes.reduce((soma, item) => soma + item.valor, 0);

                const classeClicavel = valorMes !== 0 ? 'valor-clicavel' : '';
                const dataAttributes = valorMes !== 0 ? `data-ano="${ano}" data-mes="${i}" data-tipo="${tipo}"` : '';
                
                htmlFinal += `<td class="numero ${classeClicavel}" ${dataAttributes}>${valorMes !== 0 ? formatarMoeda(valorMes) : '-'}</td>`;
                totalTipoNoAno += valorMes;
                totaisMensais[i] += valorMes;
            }
            htmlFinal += `<td class="numero"><strong>${formatarMoeda(totalTipoNoAno)}</strong></td></tr>`;
        });

        htmlFinal += `<tr class="total-row"><td style="text-align: right;"><strong>TOTAIS</strong></td>`;
        let totalGeralAno = 0;
        for (let i = 0; i < 12; i++) {
            htmlFinal += `<td class="numero">${formatarMoeda(totaisMensais[i])}</td>`;
            totalGeralAno += totaisMensais[i];
        }
        htmlFinal += `<td class="numero"><strong>${formatarMoeda(totalGeralAno)}</strong></td></tr>`;
        htmlFinal += '</tbody></table></div>';
    });

    container.innerHTML = htmlFinal;

    container.addEventListener('click', (e) => {
        const targetCell = e.target.closest('.valor-clicavel');
        if (targetCell) {
            const { ano, mes, tipo } = targetCell.dataset;
            abrirModalDetalhesRendimentoMensal(ano, mes, tipo, calendarioData);
        }
    });
}
// EM script.js (adicione estas novas funções)

/**
 * Função auxiliar para verificar se um ano é bissexto.
 */
function isLeap(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Coleta e calcula todos os dados para o resumo anual de proventos.
 */
function gerarDadosProventosAnuais() {
    const resultados = {};
    const anoAtual = new Date().getFullYear();
    const hoje = new Date();
    
    // Helper para inicializar um ano no objeto de resultados
    const initAno = (ano) => {
        if (!resultados[ano]) {
            resultados[ano] = { 'Ação': 0, 'FII': 0, 'ETF': 0, 'Renda Fixa': 0, 'Total RV': 0, 'Total Geral': 0, 'MediaDiaria': 0, 'MediaMensal': 0, isProjected: false, isFuture: false };
        }
    };

    // 1. Processa Renda Variável
    todosOsProventos.forEach(p => {
        if (!p.dataPagamento) return;
        const ano = new Date(p.dataPagamento + 'T12:00:00').getUTCFullYear();
        initAno(ano);
        const ativo = todosOsAtivos.find(a => a.ticker === p.ticker);
        if (ativo && ativo.tipo) {
            resultados[ano][ativo.tipo] += p.valorTotalRecebido;
        }
    });

    // 2. Processa Renda Fixa (Incremental)
    const rendimentosRFPorAtivo = {};
    todosOsRendimentosRFNaoRealizados.forEach(r => {
        const ativoRF = todosOsAtivosRF.find(a => a.id === r.ativoId);
        if (!ativoRF) return;
        if (!rendimentosRFPorAtivo[r.ativoId]) rendimentosRFPorAtivo[r.ativoId] = {};
        const chaveMes = r.data.substring(0, 7);
        if (!rendimentosRFPorAtivo[r.ativoId][chaveMes]) rendimentosRFPorAtivo[r.ativoId][chaveMes] = [];
        rendimentosRFPorAtivo[r.ativoId][chaveMes].push(r.rendimento);
    });

    for (const ativoId in rendimentosRFPorAtivo) {
        let ultimoRendimento = 0;
        Object.keys(rendimentosRFPorAtivo[ativoId]).sort().forEach(chaveMes => {
            const ano = parseInt(chaveMes.substring(0, 4));
            const rendimentosDoMes = rendimentosRFPorAtivo[ativoId][chaveMes];
            const rendimentoFinalMes = rendimentosDoMes[rendimentosDoMes.length - 1];
            const rendimentoIncremental = rendimentoFinalMes - ultimoRendimento;
            initAno(ano);
            resultados[ano]['Renda Fixa'] += rendimentoIncremental;
            ultimoRendimento = rendimentoFinalMes;
        });
    }

    // 3. Consolida e calcula as médias
    Object.keys(resultados).sort().forEach(anoStr => {
        const ano = parseInt(anoStr);
        const res = resultados[ano];
        res['Total RV'] = res['Ação'] + res['FII'] + res['ETF'];
        res['Total Geral'] = res['Total RV'] + res['Renda Fixa'];

        const diasNoAno = isLeap(ano) ? 366 : 365;

        if (ano < anoAtual) {
            res['MediaMensal'] = res['Total Geral'] / 12;
            res['MediaDiaria'] = res['Total Geral'] / diasNoAno;
        } else if (ano === anoAtual) {
            const inicioDoAno = new Date(ano, 0, 1);
            const diasPercorridos = Math.ceil((hoje - inicioDoAno) / (1000 * 60 * 60 * 24));
            const totalProjetado = (res['Total Geral'] / diasPercorridos) * diasNoAno;
            res['MediaMensal'] = totalProjetado / 12;
            res['MediaDiaria'] = totalProjetado / diasNoAno;
            res.isProjected = true;
        } else { // ano > anoAtual
             res['MediaMensal'] = res['Total Geral'] / 12;
             res['MediaDiaria'] = res['Total Geral'] / diasNoAno;
             res.isFuture = true;
        }
    });

    return resultados;
}

/**
 * NOVA FUNÇÃO: Centraliza a lógica de filtragem da tela de proventos.
 * @returns {Array} Uma lista de proventos que corresponde aos filtros ativos na tela.
 */
function obterProventosFiltrados() {
    const filtroAtivo = document.getElementById('provento-filtro-ativo').value.toUpperCase();
    const filtroTipo = document.getElementById('provento-filtro-tipo').value;
    const filtroStatus = document.getElementById('provento-filtro-status').value;
    const filtroDataDe = document.getElementById('provento-filtro-data-de').value;
    let filtroDataAte = document.getElementById('provento-filtro-data-ate').value;
    const filtroPosicao = document.getElementById('provento-filtro-posicao').value;

    if (filtroDataDe && !filtroDataAte) {
        filtroDataAte = new Date().toISOString().split('T')[0];
    }

    let posicoesAtuais;
    if (filtroPosicao !== 'todos') {
        posicoesAtuais = gerarPosicaoDetalhada();
    }

    const proventosFiltrados = todosOsProventos.filter(p => {
        if (filtroDataDe && p.dataCom < filtroDataDe) return false;
        if (filtroDataAte && p.dataCom > filtroDataAte) return false;
        if (filtroAtivo && !p.ticker.toUpperCase().includes(filtroAtivo)) return false;
        if (filtroTipo !== 'todos') {
            const ativo = todosOsAtivos.find(a => a.ticker === p.ticker);
            if (!ativo || ativo.tipo !== filtroTipo) return false;
        }
        if (filtroStatus !== 'todos') {
            const dataPagamento = new Date(p.dataPagamento + 'T12:00:00');
            const hojeMeiaNoite = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
            if (filtroStatus === 'receber' && dataPagamento < hojeMeiaNoite) return false;
            if (filtroStatus === 'recebido' && dataPagamento >= hojeMeiaNoite) return false;
        }

        if (filtroPosicao === 'em_carteira') {
            if (!posicoesAtuais[p.ticker] || posicoesAtuais[p.ticker].quantidade < 0.000001) {
                return false;
            }
        } else if (filtroPosicao === 'zerados') {
            if (posicoesAtuais[p.ticker] && posicoesAtuais[p.ticker].quantidade > 0.000001) {
                return false;
            }
        }
        
        return true;
    });
    return proventosFiltrados;
}

/**
 * Renderiza a tabela de resumo anual no modal.
 */
function renderizarTabelaProventosAnuais(dados) {
    const container = document.getElementById('container-proventos-anuais');
    const footnotesContainer = document.getElementById('footnotes-proventos-anuais');
    let hasProjected = false;
    let hasFuture = false;

    let tableHtml = `<table class="dashboard-table">
        <thead>
            <tr>
                <th>Ano</th>
                <th class="numero">Ações</th>
                <th class="numero">FIIs</th>
                <th class="numero">ETFs</th>
                <th class="numero">Total RV</th>
                <th class="numero">Renda Fixa</th>
                <th class="numero">Total Geral</th>
                <th class="numero">Média Diária</th>
                <th class="numero">Média Mensal</th>
            </tr>
        </thead>
        <tbody>
    `;

    const anosOrdenados = Object.keys(dados).sort((a, b) => b - a);

    anosOrdenados.forEach(ano => {
        const d = dados[ano];
        let classesMedia = '';
        let footnoteMarker = '';

        if (d.isProjected) {
            classesMedia = 'valor-projetado';
            footnoteMarker = '*';
            hasProjected = true;
        }
        if (d.isFuture) {
            classesMedia = 'valor-projetado';
            footnoteMarker = '**';
            hasFuture = true;
        }
        
        tableHtml += `
            <tr>
                <td><strong>${ano}</strong></td>
                <td class="numero">${formatarMoeda(d['Ação'])}</td>
                <td class="numero">${formatarMoeda(d['FII'])}</td>
                <td class="numero">${formatarMoeda(d['ETF'])}</td>
                <td class="numero"><strong>${formatarMoeda(d['Total RV'])}</strong></td>
                <td class="numero">${formatarMoeda(d['Renda Fixa'])}</td>
                <td class="numero"><strong>${formatarMoeda(d['Total Geral'])}</strong></td>
                <td class="numero ${classesMedia}">${formatarMoeda(d['MediaDiaria'])}${footnoteMarker}</td>
                <td class="numero ${classesMedia}">${formatarMoeda(d['MediaMensal'])}${footnoteMarker}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;

    let footnotesHtml = '';
    if (hasProjected) {
        footnotesHtml += `<p><strong>*</strong> Valores projetados: Média calculada com base nos rendimentos recebidos até a data atual e projetada para o ano inteiro.</p>`;
    }
    if (hasFuture) {
        footnotesHtml += `<p><strong>**</strong> Valores para anos futuros: Média calculada com base em proventos já anunciados com data de pagamento futura.</p>`;
    }
    footnotesContainer.innerHTML = footnotesHtml;
}

/**
 * Abre o modal de resumo anual e dispara os cálculos e a renderização.
 */
function abrirModalProventosAnuais() {
    const modal = document.getElementById('modal-proventos-anuais');
    document.getElementById('container-proventos-anuais').innerHTML = '<h4>Calculando...</h4>';
    modal.style.display = 'block';

    // Usar um pequeno timeout para permitir que o modal seja exibido antes do cálculo pesado
    setTimeout(() => {
        const dados = gerarDadosProventosAnuais();
        renderizarTabelaProventosAnuais(dados);
    }, 50);
}
// ********** FIM DA PARTE 5







// ********** PARTE 5.1 - CALCULADORA DE IMPOSTO DE RENDA
function identificarOperacoes() {
    const todasAsOperacoes = [];

    todasAsNotas.forEach(n => {
        if (!n.data) return; 
        n.operacoes.forEach(op => {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === op.ativo);
            todasAsOperacoes.push({
                ...op,
                data: n.data,
                custosNota: n.custos || 0,
                irrfNota: n.irrf || 0,
                totalOperacoesNota: n.operacoes.reduce((soma, op) => soma + op.valor, 0),
                assetType: ativoInfo ? ativoInfo.tipo : 'Desconhecido',
                fonte: 'Nota de Negociação'
            });
        });
    });

    posicaoInicial.forEach(p => {
        if (p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.data) {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === p.ticker);
            
            let valorTransacao = 0;
            if (p.transacao.toLowerCase() === 'venda') {
                valorTransacao = (typeof p.valorVenda === 'number') ? p.valorVenda : 0;
            }

            todasAsOperacoes.push({
                id: p.id,
                ativo: p.ticker,
                tipo: p.transacao.toLowerCase(),
                quantidade: p.quantidade,
                valor: valorTransacao, 
                data: p.data,
                custosNota: 0, 
                irrfNota: 0,
                totalOperacoesNota: valorTransacao,
                assetType: ativoInfo ? ativoInfo.tipo : 'Desconhecido',
                fonte: 'Histórico de Ativo',
                precoMedioHistorico: p.precoMedio 
            });
        }
    });

    todasAsOperacoes.sort((a,b) => new Date(a.data) - new Date(b.data));

    const operacoesPorDia = todasAsOperacoes.reduce((acc, op) => {
        const key = `${op.data}_${op.ativo}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(op);
        return acc;
    }, {});

    const operacoesClassificadas = [];
    Object.values(operacoesPorDia).forEach(opsDoDia => {
        const compras = opsDoDia.filter(op => op.tipo === 'compra');
        const vendas = opsDoDia.filter(op => op.tipo === 'venda');

        if (compras.length > 0 && vendas.length > 0) {
            let qtdDayTrade = Math.min(
                compras.reduce((sum, op) => sum + op.quantidade, 0),
                vendas.reduce((sum, op) => sum + op.quantidade, 0)
            );

            opsDoDia.forEach(op => {
                let qtdOp = op.quantidade;
                if (qtdDayTrade > 0 && (op.tipo === 'compra' || op.tipo === 'venda')) {
                    const qtdAplicada = Math.min(qtdOp, qtdDayTrade);
                    operacoesClassificadas.push({ ...op, quantidade: qtdAplicada, tradeType: 'Day Trade' });
                    qtdDayTrade -= qtdAplicada;
                    qtdOp -= qtdAplicada;
                }
                if (qtdOp > 0) {
                    operacoesClassificadas.push({ ...op, quantidade: qtdOp, tradeType: 'Swing Trade' });
                }
            });
        } else {
            opsDoDia.forEach(op => operacoesClassificadas.push({ ...op, tradeType: 'Swing Trade' }));
        }
    });
    return operacoesClassificadas;
}
/**
 * NOVA FUNÇÃO CENTRALIZADA
 * Calcula os resultados de um conjunto de operações para um período.
 * @param {Array} operacoesDoPeriodo - Lista de operações classificadas para o período.
 * @returns {object} - Um objeto com os resultados agregados por categoria.
 */
function apurarResultadosDoPeriodo(operacoesDoPeriodo) {
    const resultados = {
        fiis: { totalVendas: 0, resultado: 0, operacoes: [] },
        geral_rv: { totalVendas: 0, resultado: 0, operacoes: [] },
        daytrade: { totalVendas: 0, resultado: 0, operacoes: [] }
    };

    operacoesDoPeriodo.forEach(op => {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === op.ativo);
        let categoria;

        if (op.tradeType === 'Day Trade') {
            categoria = 'daytrade';
        } else if (op.assetType === 'FII') {
            categoria = 'fiis';
        } else {
            categoria = 'geral_rv';
        }

        const opDetalhada = { 
            tipo: op.tipo, 
            ativo: op.ativo, 
            data: op.data, 
            quantidade: op.quantidade,
            valor: op.valor,
            tipoAcao: ativoInfo ? (ativoInfo.tipoAcao || '') : ''
        };

        if (op.tipo === 'venda') {
            const dataVenda = new Date(op.data + 'T12:00:00');
            dataVenda.setDate(dataVenda.getDate() - 1);
            const dataAnterior = dataVenda.toISOString().split('T')[0];
            const posicaoAnterior = gerarPosicaoDetalhada(dataAnterior);
            const pmNaVenda = posicaoAnterior[op.ativo] ? posicaoAnterior[op.ativo].precoMedio : 0;
            
            const custoRateado = (op.fonte === 'Nota de Negociação' && op.totalOperacoesNota > 0) 
                ? (op.valor / op.totalOperacoesNota) * (op.custosNota || 0) 
                : 0;

            opDetalhada.valorVendaLiquida = op.valor - custoRateado;
            opDetalhada.custoAquisicao = op.quantidade * pmNaVenda;
            opDetalhada.resultado = opDetalhada.valorVendaLiquida - opDetalhada.custoAquisicao;
            
            resultados[categoria].totalVendas += op.valor;
            resultados[categoria].resultado += opDetalhada.resultado;
        } else { // Compra
            if (op.fonte === 'Histórico de Ativo') {
                opDetalhada.valorCompra = op.precoMedioHistorico * op.quantidade;
            } else {
                const custoRateadoCompra = (op.totalOperacoesNota > 0) 
                    ? (op.valor / op.totalOperacoesNota) * (op.custosNota || 0) 
                    : 0;
                opDetalhada.valorCompra = op.valor + custoRateadoCompra;
            }
        }
        
        resultados[categoria].operacoes.push(opDetalhada);
    });

    return resultados;
}
function salvarAjusteIR(target) {
    const isPrejuizo = target.classList.contains('editable-prejudice-cell');
    const chaveAjuste = isPrejuizo ? target.dataset.chaveAjustePrejuizo : target.dataset.chaveAjuste;
    const novoValorExibido = parseDecimal(target.textContent);

    let valorParaSalvar;

    if (isPrejuizo) {
        // --- INÍCIO DA CORREÇÃO DEFINITIVA ---
        // Pega o valor exato digitado pelo usuário e o armazena como negativo (pois é um prejuízo).
        // Não calcula mais a diferença, tratando este valor como a "verdade absoluta" para o início do ano.
        valorParaSalvar = -Math.abs(novoValorExibido);
        // --- FIM DA CORREÇÃO DEFINITIVA ---
    } else {
        // Lógica original para ajustes de resultado do mês (que já está correta).
        const valorCalculado = parseFloat(target.dataset.resultadoCalculado);
        valorParaSalvar = novoValorExibido - valorCalculado;
    }

    const index = todosOsAjustesIR.findIndex(a => a.chave === chaveAjuste);

    // Condição ajustada: Salva se o valor for diferente de zero, ou se for um prejuízo inicial (mesmo que seja zero).
    if (Math.abs(valorParaSalvar) > 0.001 || isPrejuizo) {
         if (index > -1) {
            todosOsAjustesIR[index].valor = valorParaSalvar;
        } else {
            todosOsAjustesIR.push({ chave: chaveAjuste, valor: valorParaSalvar });
        }
    } else {
        // Se o ajuste for zero (e não for um prejuízo inicial), remove o registro.
        if (index > -1) {
            todosOsAjustesIR.splice(index, 1);
        }
    }
    
    salvarAjustesIR();
    renderizarCalculadoraIR();
}
/**
 * NOVA FUNÇÃO: Atualiza o estado visual do botão de imprimir IR com base no ano.
 */
function atualizarStatusBotaoIR() {
    const anoSelecionado = document.getElementById('ir-filtro-ano').value;
    const anoAtual = new Date().getFullYear();
    const btnImprimir = document.getElementById('btn-imprimir-ir');
    
    if (parseInt(anoSelecionado, 10) === anoAtual) {
        btnImprimir.classList.add('icone-titulo-desabilitado');
        btnImprimir.title = "Não é possível emitir o relatório para o ano corrente.";
    } else {
        btnImprimir.classList.remove('icone-titulo-desabilitado');
        btnImprimir.title = "Imprimir Relatório para IR";
    }
}
/**
 * NOVA FUNÇÃO: Gera e aciona a impressão do Relatório de Imposto de Renda.
 */
function gerarRelatorioIR(ano) {
    const container = document.getElementById('container-impressao-ir');
    const anoNum = parseInt(ano, 10);
    const dataFimAno = `${ano}-12-31`;
    let html = '';

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    html += `<h1>Relatório Auxiliar - Imposto de Renda ${ano}</h1>`;
    html += `<p class="print-timestamp">Gerado por: ${userName || 'Usuário'} em ${dataFormatada} às ${horaFormatada}</p>`;

    // --- PARTE 1: BENS E DIREITOS (PATRIMÔNIO) ---
    html += `<div class="secao-patrimonio"><h2>Bens e Direitos (Posição em 31/12/${ano})</h2>`;

    const posicoesFimAno = gerarPosicaoDetalhada(dataFimAno);
    
    // Identifica todos os tickers que tiveram movimentação no ano
    const tickersDoAno = new Set();
    const anoStr = String(ano);
    todasAsNotas.forEach(n => { if (n.data.startsWith(anoStr)) n.operacoes.forEach(op => tickersDoAno.add(op.ativo)); });
    posicaoInicial.forEach(p => { if (p.data.startsWith(anoStr)) tickersDoAno.add(p.ticker); });
    todosOsAjustes.forEach(a => { 
        if (a.data.startsWith(anoStr)) {
            if (a.ticker) tickersDoAno.add(a.ticker);
            if (a.tipoAjuste === 'transferencia') a.ativosTransferidos.forEach(at => tickersDoAno.add(at.ticker));
            if (a.tipoAjuste === 'evento_ativo') tickersDoAno.add(a.ticker);
        }
    });
    // Adiciona também quem já estava em carteira no início do ano
    Object.keys(gerarPosicaoDetalhada(`${ano}-01-01`)).forEach(t => tickersDoAno.add(t));
    
    const ativosAgrupados = { 'Ação': [], 'FII': [], 'ETF': [] };
    
    tickersDoAno.forEach(ticker => {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        if (!ativoInfo || !ativoInfo.tipo || !ativosAgrupados[ativoInfo.tipo]) return;

        const posicao = posicoesFimAno[ticker];
        const tipoAcao = (ativoInfo.tipoAcao && ativoInfo.tipoAcao !== 'N/A') ? `${ativoInfo.tipoAcao}, ` : '';
        const nome = ativoInfo.nome || ativoInfo.nomePregao || 'Nome não cadastrado';
        const cnpj = formatarCNPJ(ativoInfo.cnpj) || 'CNPJ não cadastrado';
        
        let textoAtivo = '';
        if (posicao && posicao.quantidade > 0.0001) {
            // Ativo em carteira em 31/12
            textoAtivo = `<strong>${ticker}</strong> - ${tipoAcao}${nome}, CNPJ ${cnpj}, preço médio R$ ${formatarPrecoMedio(posicao.precoMedio)} por unidade. Quantidade: ${Math.round(posicao.quantidade)}.`;
        } else {
            // Ativo zerado durante o ano
            textoAtivo = `<strong>${ticker}</strong> - ${tipoAcao}${nome}, CNPJ ${cnpj}, posição encerrada no ano ${ano}.`;
        }
        ativosAgrupados[ativoInfo.tipo].push(textoAtivo);
    });

    // Renderiza o HTML do Patrimônio
    ['Ação', 'FII', 'ETF'].forEach(tipo => {
        const listaAtivos = ativosAgrupados[tipo];
        if (listaAtivos.length > 0) {
            const tituloTipo = tipo === 'Ação' ? 'Ações' : (tipo === 'FII' ? 'Fundos Imobiliários' : 'ETFs');
            html += `<h3>${tituloTipo}</h3><ul>`;
            listaAtivos.sort().forEach(itemTexto => {
                html += `<li>${itemTexto}</li>`;
            });
            html += `</ul>`;
        }
    });
    html += `</div>`; // Fim da .secao-patrimonio

    // --- PARTE 2: RENDIMENTOS ---
    html += `<div class="secao-rendimentos"><h2>Rendimentos Recebidos em ${ano}</h2>`;

    // Filtra os proventos nos 3 baldes
    const declaradosAnoAnteriorPagosAno = todosOsProventos.filter(p => p.dataCom && p.dataPagamento && p.dataCom.startsWith(String(anoNum - 1)) && p.dataPagamento.startsWith(String(anoNum)));
    const declaradosEPagosAno = todosOsProventos.filter(p => p.dataCom && p.dataPagamento && p.dataCom.startsWith(String(anoNum)) && p.dataPagamento.startsWith(String(anoNum)));
    const declaradosAnoPagosFuturo = todosOsProventos.filter(p => p.dataCom && p.dataPagamento && p.dataCom.startsWith(String(anoNum)) && new Date(p.dataPagamento + 'T12:00:00').getUTCFullYear() > anoNum);

    // Helper para agrupar os proventos por ticker e tipo (JCP, Dividendo, etc.)
    const agruparProventos = (listaProventos) => {
        const agrupado = new Map();
        listaProventos.forEach(p => {
            if (!agrupado.has(p.ticker)) {
                agrupado.set(p.ticker, { JCP: 0, Dividendo: 0, Rendimento: 0, Outros: 0 });
            }
            const tipos = agrupado.get(p.ticker);
            const tipoNormalizado = p.tipo === 'JCP' ? 'JCP' : (p.tipo === 'Dividendo' ? 'Dividendo' : (p.tipo === 'Rendimento' ? 'Rendimento' : 'Outros'));
            tipos[tipoNormalizado] += p.valorTotalRecebido;
        });
        return agrupado;
    };

    const mapa1 = agruparProventos(declaradosAnoAnteriorPagosAno);
    const mapa2 = agruparProventos(declaradosEPagosAno);
    const mapa3 = agruparProventos(declaradosAnoPagosFuturo);

    const todosTickersDeRendimento = new Set([...mapa1.keys(), ...mapa2.keys(), ...mapa3.keys()]);
    if (todosTickersDeRendimento.size === 0) {
        html += '<p>Nenhum rendimento recebido ou provisionado encontrado para este ano.</p>';
    }

    [...todosTickersDeRendimento].sort().forEach(ticker => {
        const d1 = mapa1.get(ticker) || { JCP: 0, Dividendo: 0, Rendimento: 0, Outros: 0 };
        const d2 = mapa2.get(ticker) || { JCP: 0, Dividendo: 0, Rendimento: 0, Outros: 0 };
        const d3 = mapa3.get(ticker) || { JCP: 0, Dividendo: 0, Rendimento: 0, Outros: 0 };
        
        html += `<div class="ativo-bloco"><h3>${ticker}</h3>`;
        html += `<table>
            <thead><tr><th>Categoria de Rendimento</th><th>Tipo</th><th class="numero">Valor (R$)</th></tr></thead>
            <tbody>
                <tr>
                    <td rowspan="4" style="vertical-align: middle; text-align: center;"><strong>Declarados em ${anoNum-1}, Pagos em ${anoNum}</strong></td>
                    <td>Dividendos</td><td class="numero">${formatarMoeda(d1.Dividendo)}</td>
                </tr>
                <tr><td>Juros s/ Capital Próprio</td><td class="numero">${formatarMoeda(d1.JCP)}</td></tr>
                <tr><td>Rendimentos (FIIs/Outros)</td><td class="numero">${formatarMoeda(d1.Rendimento)}</td></tr>
                <tr><td class="total-label">Subtotal</td><td class="numero"><strong>${formatarMoeda(d1.Dividendo + d1.JCP + d1.Rendimento + d1.Outros)}</strong></td></tr>
                
                <tr>
                    <td rowspan="4" style="vertical-align: middle; text-align: center;"><strong>Declarados e Pagos em ${anoNum}</strong></td>
                    <td>Dividendos</td><td class="numero">${formatarMoeda(d2.Dividendo)}</td>
                </tr>
                <tr><td>Juros s/ Capital Próprio</td><td class="numero">${formatarMoeda(d2.JCP)}</td></tr>
                <tr><td>Rendimentos (FIIs/Outros)</td><td class="numero">${formatarMoeda(d2.Rendimento)}</td></tr>
                <tr><td class="total-label">Subtotal</td><td class="numero"><strong>${formatarMoeda(d2.Dividendo + d2.JCP + d2.Rendimento + d2.Outros)}</strong></td></tr>

                <tr>
                    <td rowspan"4" style="vertical-align: middle; text-align: center;"><strong>Declarados em ${anoNum}, Pagos no Futuro</strong></td>
                    <td>Dividendos</td><td class="numero">${formatarMoeda(d3.Dividendo)}</td>
                </tr>
                <tr><td>Juros s/ Capital Próprio</td><td class="numero">${formatarMoeda(d3.JCP)}</td></tr>
                <tr><td>Rendimentos (FIIs/Outros)</td><td class="numero">${formatarMoeda(d3.Rendimento)}</td></tr>
                <tr><td class="total-label">Subtotal</td><td class="numero"><strong>${formatarMoeda(d3.Dividendo + d3.JCP + d3.Rendimento + d3.Outros)}</strong></td></tr>
            </tbody>
        </table></div>`;
    });

    html += `</div>`; // Fim da .secao-rendimentos
    container.innerHTML = html;

    // Aciona a impressão
    const body = document.body;
    body.classList.add('imprimindo-ir');
    container.classList.add('imprimindo');

    window.print();

    // Limpa as classes após a impressão
    setTimeout(() => {
        body.classList.remove('imprimindo-ir');
        container.classList.remove('imprimindo');
    }, 500);
}
function calcularImpostoRendaAnual(ano) {
    const operacoesClassificadas = identificarOperacoes();
    const resultadosAnuais = {};

    const prejuizosAcumulados = {
        fiis: 0,
        geral_rv: 0,
        daytrade: 0
    };

    const prejuizoAnoAnteriorCalculado = calcularPrejuizoAnoAnterior(String(ano - 1));
    Object.keys(prejuizosAcumulados).forEach(cat => {
        const chaveOverride = `${ano}-00_${cat}`;
        const ajusteOverride = todosOsAjustesIR.find(a => a.chave === chaveOverride);

        if (ajusteOverride !== undefined) {
            prejuizosAcumulados[cat] = ajusteOverride.valor;
        } else {
            prejuizosAcumulados[cat] = prejuizoAnoAnteriorCalculado[cat];
        }
    });

    for (let mes = 0; mes < 12; mes++) {
        const mesStr = String(mes + 1).padStart(2, '0');
        const chaveMes = `${ano}-${mesStr}`;
        const opsDoMes = operacoesClassificadas.filter(op => op.data.startsWith(chaveMes));
        
        const totaisMes = apurarResultadosDoPeriodo(opsDoMes);
        resultadosAnuais[chaveMes] = {};

        // Processamento para FIIs e Day Trade (lógica inalterada)
        ['fiis', 'daytrade'].forEach(cat => {
            let baseDeCalculo = 0;
            let impostoDevido = 0;
            const resultadoMesOriginal = totaisMes[cat].resultado;
            const prejuizoAnterior = prejuizosAcumulados[cat];
            const ajusteManual = todosOsAjustesIR.find(a => a.chave === `${chaveMes}_${cat}`)?.valor || 0;
            const resultadoAjustado = resultadoMesOriginal + ajusteManual;
            const resultadoAposComp = resultadoAjustado + prejuizoAnterior;

            if (resultadoAposComp > 0) {
                baseDeCalculo = resultadoAposComp;
                prejuizosAcumulados[cat] = 0;
            } else {
                prejuizosAcumulados[cat] = resultadoAposComp;
            }
            
            if (baseDeCalculo > 0) {
                impostoDevido = baseDeCalculo * configuracoesFiscais.aliquotaFiisDt;
            }

            totaisMes[cat].operacoes.sort((a, b) => new Date(a.data) - new Date(b.data));
            resultadosAnuais[chaveMes][cat] = {
                totalVendas: totaisMes[cat].totalVendas,
                resultadoMes: resultadoMesOriginal,
                ajusteManual: ajusteManual,
                prejuizoAnterior: prejuizoAnterior,
                baseDeCalculo: baseDeCalculo,
                impostoDevido: impostoDevido,
                operacoes: totaisMes[cat].operacoes
            };
        });

        // Processamento para a nova categoria "Geral RV" (Ações e ETFs)
        const cat = 'geral_rv';
        const dadosMesGeral = totaisMes[cat];
        const prejuizoAnteriorGeral = prejuizosAcumulados[cat];
        const ajusteManualGeral = todosOsAjustesIR.find(a => a.chave === `${chaveMes}_${cat}`)?.valor || 0;

        const vendasOps = dadosMesGeral.operacoes.filter(op => op.tipo === 'venda');
        const vendasUnits = vendasOps.filter(op => op.tipoAcao === 'Unit');
        const vendasOutrasAcoes = vendasOps.filter(op => op.tipoAcao !== 'Unit' && todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'Ação');
        const vendasETFs = vendasOps.filter(op => todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'ETF');

        const totalVendasOutrasAcoesBruto = vendasOutrasAcoes.reduce((sum, op) => sum + op.valor, 0);

        let resultadoTributavelDoMes = 0;
        let prejuizoGeradoNoMes = 0;
        let resultadoIsento = 0;

        const somarResultados = (operacoes) => operacoes.reduce((sum, op) => sum + op.resultado, 0);

        // ETFs e Units: Lucro é sempre tributável, prejuízo sempre compensável.
        [...vendasETFs, ...vendasUnits].forEach(op => {
            if (op.resultado >= 0) {
                resultadoTributavelDoMes += op.resultado;
            } else {
                prejuizoGeradoNoMes += op.resultado;
            }
        });
        
        // Ações ON/PN: Verifica a regra de isenção.
        const resultadoOutrasAcoes = somarResultados(vendasOutrasAcoes);
        if (totalVendasOutrasAcoesBruto > configuracoesFiscais.limiteIsencaoAcoes) {
            // Se as vendas ultrapassam 20k, todo o resultado entra na apuração.
            if (resultadoOutrasAcoes >= 0) {
                resultadoTributavelDoMes += resultadoOutrasAcoes;
            } else {
                prejuizoGeradoNoMes += resultadoOutrasAcoes;
            }
        } else {
            // Se as vendas são isentas, o lucro é ignorado, mas o prejuízo é registrado.
            if (resultadoOutrasAcoes >= 0) {
                resultadoIsento += resultadoOutrasAcoes;
            } else {
                prejuizoGeradoNoMes += resultadoOutrasAcoes;
            }
        }

        const resultadoMesOriginal = resultadoTributavelDoMes + prejuizoGeradoNoMes + resultadoIsento;
        const resultadoAjustado = resultadoTributavelDoMes + ajusteManualGeral;
        const resultadoAposComp = resultadoAjustado + prejuizoAnteriorGeral;

        const baseDeCalculo = Math.max(0, resultadoAposComp);
        const impostoDevido = baseDeCalculo * configuracoesFiscais.aliquotaAcoes;
        
        const prejuizoRestanteAposComp = Math.min(0, resultadoAposComp);
        prejuizosAcumulados[cat] = prejuizoGeradoNoMes + prejuizoRestanteAposComp;

        dadosMesGeral.operacoes.sort((a, b) => new Date(a.data) - new Date(b.data));
        resultadosAnuais[chaveMes][cat] = {
            totalVendas: dadosMesGeral.totalVendas,
            resultadoMes: resultadoMesOriginal,
            ajusteManual: ajusteManualGeral,
            prejuizoAnterior: prejuizoAnteriorGeral,
            baseDeCalculo: baseDeCalculo,
            impostoDevido: impostoDevido,
            operacoes: dadosMesGeral.operacoes
        };
    }
    return resultadosAnuais;
}
function calcularPrejuizoAnoAnterior(anoAnterior) {
    const anoAnteriorNum = parseInt(anoAnterior, 10);

    const primeiroAnoDeRegistros = 2023; 
    if (anoAnteriorNum < primeiroAnoDeRegistros) {
        return { fiis: 0, geral_rv: 0, daytrade: 0 };
    }

    let prejuizoFinal = calcularPrejuizoAnoAnterior(String(anoAnteriorNum - 1));

    const operacoesClassificadas = identificarOperacoes();
    const opsAnoAnterior = operacoesClassificadas.filter(op => op.data.startsWith(anoAnterior));

    if (opsAnoAnterior.length === 0) {
        return prejuizoFinal;
    }
    
    for (let mes = 0; mes < 12; mes++) {
        const mesStr = String(mes + 1).padStart(2, '0');
        const chaveMes = `${anoAnterior}-${mesStr}`;
        const opsDoMes = opsAnoAnterior.filter(op => op.data.startsWith(chaveMes));
        
        if(opsDoMes.length === 0) continue;

        const totaisMes = apurarResultadosDoPeriodo(opsDoMes);
        
        Object.keys(prejuizoFinal).forEach(cat => {
            const ajusteManual = todosOsAjustesIR.find(a => a.chave === `${chaveMes}_${cat}`)?.valor || 0;
            let resultadoMesApurado = totaisMes[cat].resultado;

            if (cat === 'geral_rv') {
                const vendasOps = totaisMes.geral_rv.operacoes.filter(op => op.tipo === 'venda');
                const vendasOutrasAcoes = vendasOps.filter(op => op.tipoAcao !== 'Unit' && todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'Ação');
                const totalVendasOutrasAcoesBruto = vendasOutrasAcoes.reduce((sum, op) => sum + op.valor, 0);
                
                if (totalVendasOutrasAcoesBruto <= configuracoesFiscais.limiteIsencaoAcoes) {
                    const lucroIsento = vendasOutrasAcoes.reduce((sum, op) => op.resultado > 0 ? sum + op.resultado : sum, 0);
                    resultadoMesApurado -= lucroIsento;
                }
            }

            const resultadoComAjuste = resultadoMesApurado + ajusteManual;
            const resultadoComPrejuizo = resultadoComAjuste + prejuizoFinal[cat];
            prejuizoFinal[cat] = Math.min(0, resultadoComPrejuizo);
        });
    }

    return prejuizoFinal;
}
function getUltimoProventoHistorico(ticker, dataLimite) {
    const proventosDoAtivo = todosOsProventos
        .filter(p => p.ticker === ticker && p.valorIndividual > 0 && p.dataCom && p.dataCom <= dataLimite)
        .sort((a, b) => new Date(b.dataCom) - new Date(a.dataCom));

    return proventosDoAtivo.length > 0 ? proventosDoAtivo[0].valorIndividual : 0;
}

function calcularProjecaoHistoricaParaSnapshot(snapshot) {
    if (!snapshot || !snapshot.detalhesCarteira || !snapshot.detalhesCarteira.ativos) {
        return 0;
    }

    let projecaoAnualTotal = 0;
    const dataSnapshot = snapshot.data;

    for (const ticker in snapshot.detalhesCarteira.ativos) {
        const ativoSnapshot = snapshot.detalhesCarteira.ativos[ticker];
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);

        if (!ativoInfo || ativoSnapshot.quantidade <= 0) continue;

        let projecaoUnitaria = 0;
        if (ativoInfo.tipo === 'FII') {
            projecaoUnitaria = getUltimoProvento(ticker, dataSnapshot) * 12;
        } else if (ativoInfo.tipo === 'Ação') {
            projecaoUnitaria = calcularProjecaoAnualUnitaria(ticker, { dataLimite: dataSnapshot, limiteAnos: 5 });
        }

        projecaoAnualTotal += projecaoUnitaria * ativoSnapshot.quantidade;
    }

    return projecaoAnualTotal / 12; // Retorna a projeção mensal
}

function renderizarTelaHistoricoSnapshots() {
    const container = document.getElementById('container-historico-snapshots');
    
    if (!historicoCarteira || historicoCarteira.length < 2) {
        container.innerHTML = '<p>Nenhum snapshot salvo. Salve seu primeiro snapshot na tela do Dashboard.</p>';
        return;
    }

    const moedaSelecionada = document.querySelector('input[name="snapshot-currency"]:checked')?.value || 'BRL';
    const sufixoMoeda = moedaSelecionada === 'BRL' ? '' : ` (${moedaSelecionada})`;

    const cotacoes = historicoCarteira.length > 0 ? historicoCarteira[historicoCarteira.length - 1].cotacoesMoedas : dadosMoedas.cotacoes;
    const taxaCambio = moedaSelecionada === 'BRL' ? 1 : (cotacoes[moedaSelecionada] || 0);

    const formatFunction = moedaSelecionada === 'BRL' ? formatarMoeda : (valor) => formatarMoedaEstrangeira(valor, moedaSelecionada);
    const formatDecimalFunction = moedaSelecionada === 'BRL' ? (valor) => formatarDecimal(valor, 2) : (valor) => formatarDecimal(valor, 4);
    const converterValor = (valor) => (taxaCambio > 0 ? (valor || 0) / taxaCambio : 0);

    // Estrutura para armazenar os dados calculados
    const dadosCalculados = [];
    
    // 1. Prepara todos os dados e calcula os valores máximos
    const snapshotsValidos = historicoCarteira.filter(s => 
        (s.patrimonioTotal && s.patrimonioTotal > 0) || (s.valorTotalInvestimentos && s.valorTotalInvestimentos > 0)
    ).sort((a, b) => new Date(a.data) - new Date(b.data)); // Ordena do mais antigo para o mais recente

    const maxValues = { patrimonioTotal: 0, valorTotalInvestimentos: 0, valorFiis: 0, valorAcoesOutros: 0, valorTotalContas: 0, valorTotalMoedas: 0, proventosProjetadosMensal: 0, ibov: 0, ifix: 0 };
    
    // Arrays para armazenar as variações e o histórico convertido
    const historicoConvertidoComYield = [];
    let anterior = null;
    
    // 2. Itera do mais ANTIGO para o mais RECENTE para calcular variação e valores máximos
    snapshotsValidos.forEach((snapshot) => {
        const proventosProjetadosMensalBRL = calcularProjecaoHistoricaParaSnapshot(snapshot);
        const valorFiisBRL = snapshot.detalhesCarteira?.valorPorClasse?.['FIIs'] || 0;
        const valorAcoesOutrosBRL = (snapshot.detalhesCarteira?.valorPorClasse?.['Ações'] || 0) + (snapshot.detalhesCarteira?.valorPorClasse?.['ETF'] || 0);
        const valorTotalRVBRL = valorFiisBRL + valorAcoesOutrosBRL;
        
        // CÁLCULO DE YIELD: Retorna o yield anual (como decimal)
        const yieldProjetado = (valorTotalRVBRL > 0) ? (proventosProjetadosMensalBRL * 12) / valorTotalRVBRL : 0;

        const valoresBRL = {
            patrimonioTotal: snapshot.patrimonioTotal,
            valorTotalInvestimentos: snapshot.valorTotalInvestimentos,
            valorFiis: valorFiisBRL,
            valorAcoesOutros: valorAcoesOutrosBRL,
            valorTotalContas: snapshot.valorTotalContas,
            valorTotalMoedas: snapshot.valorTotalMoedas,
            proventosProjetadosMensal: proventosProjetadosMensalBRL,
            ibov: snapshot.ibov,
            ifix: snapshot.ifix
        };

        const valoresConvertidos = {};
        const variacoes = {};
        
        for (const key in valoresBRL) {
            valoresConvertidos[key] = converterValor(valoresBRL[key]);
            
            // Calcula o valor máximo
            if (valoresConvertidos[key] > maxValues[key]) {
                maxValues[key] = valoresConvertidos[key];
            }

            // Calcula a variação em relação ao item ANTERIOR
            if (anterior) {
                const diff = valoresConvertidos[key] - anterior.valoresConvertidos[key];
                const percent = anterior.valoresConvertidos[key] !== 0 ? diff / anterior.valoresConvertidos[key] : 0;
                variacoes[key] = percent;
            }
        }
        
        historicoConvertidoComYield.push({ 
            data: snapshot.data, 
            valoresConvertidos, 
            yieldProjetado, 
            variacoes // Variação em relação ao dia anterior
        });
        
        anterior = { valoresConvertidos };
    });

    // 3. Inverte o array para a ordem de exibição (Mais Recente -> Mais Antigo)
    dadosCalculados.push(...historicoConvertidoComYield.reverse());


    // 4. Cria a tabela HTML (com a ordem invertida)
    let tableHtml = `<table>
        <thead>
            <tr>
                <th>Data</th>
                <th class="numero">Patrimônio Total${sufixoMoeda}</th>
                <th class="numero">Total Investido${sufixoMoeda}</th>
                <th class="numero">FIIs${sufixoMoeda}</th>
                <th class="numero">Ações/Outros${sufixoMoeda}</th>
                <th class="numero">Saldo Contas${sufixoMoeda}</th>
                <th class="numero">Saldo Moedas${sufixoMoeda}</th>
                <th class="numero">Proventos Projetados${sufixoMoeda}</th>
                <th class="numero">IBOV</th>
                <th class="numero">IFIX</th>
                <th class="controles-col">Ações</th>
            </tr>
        </thead>
        <tbody>`;

    dadosCalculados.forEach((item, index) => {
        const dataFormatada = new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        const getCellHtml = (key, isCurrency = true) => {
            const valor = item.valoresConvertidos[key];
            const isMax = Math.abs(valor - maxValues[key]) < 0.005 && valor > 0;
            const classeValor = isMax ? 'snapshot-max-value' : '';
            
            let valorFmt, diffHtml = '';
            
            if (isCurrency) {
                valorFmt = formatFunction(valor);
            } else {
                valorFmt = formatDecimalFunction(valor);
            }

            // A variação só existe da primeira linha (índice 0) em diante
            if (index < dadosCalculados.length - 1) {
                const diff = item.variacoes[key] || 0;
                const classeDiff = diff >= 0 ? 'valor-positivo' : 'valor-negativo';
                const prefixo = "Var:";
                diffHtml = `<span class="valor-secundario ${classeDiff}" style="display: block; font-size: 0.8em; text-align: right;">${prefixo} ${formatarPercentual(diff)}</span>`;
            }

            return `<td class="numero ${classeValor}">
                        <div style="text-align: right;">
                            <span class="valor-principal">${valorFmt}</span>
                            ${diffHtml}
                        </div>
                    </td>`;
        };
        
        // Célula de Proventos Projetados (tratamento especial para o yield e variação)
        const proventoValor = item.valoresConvertidos.proventosProjetadosMensal;
        const isMaxProvento = Math.abs(proventoValor - maxValues.proventosProjetadosMensal) < 0.005 && proventoValor > 0;
        const classeValorProvento = isMaxProvento ? 'snapshot-max-value' : '';
        let proventoDiffHtml = '';

        if (index < dadosCalculados.length - 1) {
            const proventoDiff = item.variacoes.proventosProjetadosMensal || 0;
            const classeDiff = proventoDiff >= 0 ? 'valor-positivo' : 'valor-negativo';
            const prefixo = "Var:";
            proventoDiffHtml = `<span class="valor-secundario ${classeDiff}" style="display: block; font-size: 0.8em; text-align: right;">${prefixo} ${formatarPercentual(proventoDiff)}</span>`;
        }
        
        const proventoHtml = `<td class="numero ${classeValorProvento}">
                                <div style="text-align: right;">
                                    <span class="valor-principal">${formatFunction(proventoValor)}</span>
                                    <small style="display: block; color: #555; font-size: 0.8em; text-align: right;">(${formatarPercentual(item.yieldProjetado)} a.a.)</small>
                                    ${proventoDiffHtml}
                                </div>
                            </td>`;


        tableHtml += `
            <tr class="row-clickable" data-data="${item.data}">
                <td>${dataFormatada}</td>
                ${getCellHtml('patrimonioTotal')}
                ${getCellHtml('valorTotalInvestimentos')}
                ${getCellHtml('valorFiis')}
                ${getCellHtml('valorAcoesOutros')}
                ${getCellHtml('valorTotalContas')}
                ${getCellHtml('valorTotalMoedas')}
                ${proventoHtml}
                ${getCellHtml('ibov', false)}
                ${getCellHtml('ifix', false)}
                <td class="controles-col">
                    <button class="btn btn-primary btn-sm btn-detalhes-snapshot" data-data="${item.data}">Detalhes</button>
                </td>
            </tr>`;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

let graficoHistoricoAtivoInstance = null;

function abrirModalHistoricoAtivoSnapshot(ticker) {
    const modal = document.getElementById('modal-historico-ativo-snapshot');
    const tituloModal = document.getElementById('modal-historico-ativo-snapshot-titulo');
    const containerTabela = document.getElementById('container-historico-ativo-snapshot');
    const ctx = document.getElementById('grafico-historico-ativo-snapshot').getContext('2d');

    tituloModal.textContent = `Histórico de Cotações e Preço Médio - ${ticker}`;

    const dadosHistorico = [];
    historicoCarteira.forEach(snapshot => {
        if (snapshot.detalhesCarteira && snapshot.detalhesCarteira.ativos && snapshot.detalhesCarteira.ativos[ticker]) {
            const dadosAtivo = snapshot.detalhesCarteira.ativos[ticker];
            if (dadosAtivo.quantidade > 0) { // Apenas inclui se havia posição
                dadosHistorico.push({
                    data: snapshot.data,
                    cotacao: dadosAtivo.precoAtual,
                    precoMedio: dadosAtivo.precoMedio
                });
            }
        }
    });

    if (dadosHistorico.length === 0) {
        containerTabela.innerHTML = '<p>Nenhum dado histórico encontrado para este ativo nos snapshots.</p>';
        if (graficoHistoricoAtivoInstance) graficoHistoricoAtivoInstance.destroy();
        abrirModal('modal-historico-ativo-snapshot');
        return;
    }
    
    let tabelaHtml = `<table><thead><tr><th>Data</th><th class="numero">Preço Médio</th><th class="numero">Cotação</th></tr></thead><tbody>`;
    [...dadosHistorico].reverse().forEach(item => {
        tabelaHtml += `
            <tr>
                <td>${new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="numero">${formatarMoeda(item.precoMedio)}</td>
                <td class="numero">${formatarMoeda(item.cotacao)}</td>
            </tr>
        `;
    });
    tabelaHtml += `</tbody></table>`;
    containerTabela.innerHTML = tabelaHtml;

    if (graficoHistoricoAtivoInstance) {
        graficoHistoricoAtivoInstance.destroy();
    }

    graficoHistoricoAtivoInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dadosHistorico.map(d => new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')),
            datasets: [
                {
                    label: 'Cotação (R$)',
                    data: dadosHistorico.map(d => d.cotacao),
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Preço Médio (R$)',
                    data: dadosHistorico.map(d => d.precoMedio),
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: false,
                    tension: 0.1,
                    borderDash: [5, 5] // Linha tracejada para diferenciar
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatarMoeda(value);
                        }
                    }
                }
            }
        }
    });

    abrirModal('modal-historico-ativo-snapshot');
}

function abrirModalDetalhesSnapshot(data) {
    const snapshot = historicoCarteira.find(s => s.data === data);
    if (!snapshot) {
        alert('Erro: Snapshot não encontrado para esta data.');
        return;
    }

    const modalTitulo = document.getElementById('modal-snapshot-detalhes-titulo');
    const modalConteudo = document.getElementById('modal-snapshot-detalhes-conteudo');
    const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
    
    modalTitulo.textContent = `Detalhes da Carteira em ${dataFormatada}`;

    let htmlConteudo = `<div class="snapshot-summary">
        <div class="summary-item"><label>Patrimônio Total</label><span>${formatarMoeda(snapshot.patrimonioTotal)}</span></div>
        <div class="summary-item"><label>Total Investido</label><span>${formatarMoeda(snapshot.valorTotalInvestimentos)}</span></div>
        <div class="summary-item"><label>Saldo em Contas</label><span>${formatarMoeda(snapshot.valorTotalContas)}</span></div>
        <div class="summary-item"><label>Saldo em Moedas</label><span>${formatarMoeda(snapshot.valorTotalMoedas)}</span></div>
    </div>`;

    const detalhes = snapshot.detalhesCarteira;

    if (detalhes.ativos && Object.keys(detalhes.ativos).length > 0) {
        htmlConteudo += '<h4>Ativos de Renda Variável</h4><table><thead><tr><th>Ativo</th><th class="numero">Qtd.</th><th class="numero">Preço Médio</th><th class="numero">Cotação do Dia</th><th class="numero">Valor de Mercado</th></tr></thead><tbody>';
        Object.entries(detalhes.ativos).sort((a,b) => a[0].localeCompare(b[0])).forEach(([ticker, dados]) => {
            if (dados.quantidade > 0.0001) {
                const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
                const tipoHtml = ativoInfo ? `<small style="color: #555; margin-left: 8px;">(${ativoInfo.tipo})</small>` : '';
                htmlConteudo += `<tr class="row-clickable" data-ticker="${ticker}" title="Clique para ver o histórico de cotações e preço médio">
                    <td>${ticker}${tipoHtml}</td>
                    <td class="numero">${Math.round(dados.quantidade)}</td>
                    <td class="numero">${formatarMoeda(dados.precoMedio)}</td>
                    <td class="numero">${formatarMoeda(dados.precoAtual)}</td>
                    <td class="numero">${formatarMoeda(dados.valorDeMercado)}</td>
                </tr>`;
            }
        });
        htmlConteudo += `</tbody></table>`;
    }

    if (detalhes.rendaFixa && detalhes.rendaFixa.length > 0) {
        htmlConteudo += '<h4>Aplicações de Renda Fixa</h4><table><thead><tr><th>Descrição</th><th class="numero">Valor Investido</th><th class="numero">Saldo Líquido</th></tr></thead><tbody>';
        detalhes.rendaFixa.forEach(rf => {
            if (rf.saldoLiquido > 0) {
                htmlConteudo += `<tr>
                    <td>${rf.descricao}</td>
                    <td class="numero">${formatarMoeda(rf.valorInvestido)}</td>
                    <td class="numero">${formatarMoeda(rf.saldoLiquido)}</td>
                </tr>`;
            }
        });
        htmlConteudo += `</tbody></table>`;
    }
    
    modalConteudo.innerHTML = htmlConteudo;
    abrirModal('modal-snapshot-detalhes');
}
function abrirModalDetalhesIR(ano, mes) {
    const dadosIR = calcularImpostoRendaAnual(ano);
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const chaveMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    
    if (!dadosIR[chaveMes]) {
        alert('Dados não encontrados para este mês.');
        return;
    }

    const dadosGeral = dadosIR[chaveMes]['geral_rv'];
    const dadosFiis = dadosIR[chaveMes]['fiis'];
    const dadosDT = dadosIR[chaveMes]['daytrade'];

    const titulo = `Detalhamento do IR - ${meses[mes]} de ${ano}`;
    document.getElementById('modal-detalhes-ir-titulo').textContent = titulo;
    const container = document.getElementById('modal-detalhes-ir-conteudo');

    const vendasOpsGeral = dadosGeral.operacoes.filter(op => op.tipo === 'venda');
    const vendasOutrasAcoes = vendasOpsGeral.filter(op => op.tipoAcao !== 'Unit' && todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'Ação');
    const totalVendasOutrasAcoesBruto = vendasOutrasAcoes.reduce((sum, op) => sum + op.valor, 0);

    const resultadoIsento = (totalVendasOutrasAcoesBruto <= configuracoesFiscais.limiteIsencaoAcoes) 
        ? vendasOutrasAcoes.reduce((sum, op) => op.resultado > 0 ? sum + op.resultado : sum, 0)
        : 0;

    const resultadoTributavelAcoes = (totalVendasOutrasAcoesBruto > configuracoesFiscais.limiteIsencaoAcoes)
        ? vendasOutrasAcoes.filter(op => op.resultado > 0).reduce((sum, op) => sum + op.resultado, 0)
        : 0;
        
    const resultadoTributavelUnits = vendasOpsGeral.filter(op => op.tipoAcao === 'Unit' && op.resultado > 0).reduce((sum, op) => sum + op.resultado, 0);
    const resultadoTributavelETFs = vendasOpsGeral.filter(op => todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'ETF' && op.resultado > 0).reduce((sum, op) => sum + op.resultado, 0);
    const resultadoMesTributavel = resultadoTributavelAcoes + resultadoTributavelUnits + resultadoTributavelETFs;

    let irrfDoMes = 0;
    todasAsNotas.filter(n => n.data.startsWith(chaveMes)).forEach(n => {
        irrfDoMes += (n.irrf || 0);
    });

    const impostoTotalGeral = dadosGeral.impostoDevido + dadosFiis.impostoDevido + dadosDT.impostoDevido;
    const impostoFinal = Math.max(0, impostoTotalGeral - irrfDoMes);

    let html = `
        <div class="ir-detalhes-container">
            <div class="ir-detalhes-secao">
                <h4>Geral (Ações, ETFs, etc.) - SWING TRADE</h4>
                <table class="ir-detalhes-tabela">
                    <tbody>
                        <tr><td>Resultado do Mês (Bruto)</td><td class="numero">${formatarMoeda(dadosGeral.resultadoMes)}</td></tr>
                        <tr><td>&nbsp;&nbsp;&nbsp;↳ Resultado Isento (Ações ON/PN)</td><td class="numero">${formatarMoeda(resultadoIsento)}</td></tr>
                        <tr><td>&nbsp;&nbsp;&nbsp;↳ Lucro Tributável (Ações ON/PN)</td><td class="numero">${formatarMoeda(resultadoTributavelAcoes)}</td></tr>
                        <tr><td>&nbsp;&nbsp;&nbsp;↳ Lucro Tributável (Units)</td><td class="numero">${formatarMoeda(resultadoTributavelUnits)}</td></tr>
                        <tr><td>&nbsp;&nbsp;&nbsp;↳ Lucro Tributável (ETFs)</td><td class="numero">${formatarMoeda(resultadoTributavelETFs)}</td></tr>
                        <tr><td>(-) Prejuízo a Compensar</td><td class="numero valor-negativo">${formatarMoeda(dadosGeral.prejuizoAnterior)}</td></tr>
                        <tr><td>(+/-) Ajuste Manual</td><td class="numero">${formatarMoeda(dadosGeral.ajusteManual)}</td></tr>
                        <tr class="ir-detalhes-linha-subtotal"><td>(=) Base de Cálculo / Prejuízo a Compensar</td><td class="numero">${formatarMoeda(dadosGeral.baseDeCalculo > 0 ? dadosGeral.baseDeCalculo : (dadosGeral.prejuizoAnterior + dadosGeral.resultadoMes + dadosGeral.ajusteManual))}</td></tr>
                        <tr><td>Imposto Devido (${formatarPercentual(configuracoesFiscais.aliquotaAcoes)})</td><td class="numero">${formatarMoeda(dadosGeral.impostoDevido)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="ir-detalhes-secao">
                <h4>FIIs</h4>
                <table class="ir-detalhes-tabela">
                    <tbody>
                        <tr><td>Base de Cálculo / Prejuízo a Compensar</td><td class="numero">${formatarMoeda(dadosFiis.baseDeCalculo > 0 ? dadosFiis.baseDeCalculo : (dadosFiis.prejuizoAnterior + dadosFiis.resultadoMes + dadosFiis.ajusteManual))}</td></tr>
                        <tr><td>Imposto Devido (${formatarPercentual(configuracoesFiscais.aliquotaFiisDt)})</td><td class="numero">${formatarMoeda(dadosFiis.impostoDevido)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="ir-detalhes-secao">
                <h4>Operações Day Trade</h4>
                <table class="ir-detalhes-tabela">
                     <tbody>
                        <tr><td>Base de Cálculo / Prejuízo a Compensar</td><td class="numero">${formatarMoeda(dadosDT.baseDeCalculo > 0 ? dadosDT.baseDeCalculo : (dadosDT.prejuizoAnterior + dadosDT.resultadoMes + dadosDT.ajusteManual))}</td></tr>
                        <tr><td>Imposto Devido (${formatarPercentual(configuracoesFiscais.aliquotaFiisDt)})</td><td class="numero">${formatarMoeda(dadosDT.impostoDevido)}</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="ir-detalhes-secao">
                <h4>Resumo Final</h4>
                 <table class="ir-detalhes-tabela">
                    <tbody>
                        <tr><td>Total do Imposto Mensal</td><td class="numero">${formatarMoeda(impostoTotalGeral)}</td></tr>
                        <tr><td>(-) IRRF a Deduzir ("Dedo-duro")</td><td class="numero valor-negativo">${formatarMoeda(irrfDoMes)}</td></tr>
                        <tr class="ir-detalhes-linha-total"><td>(=) Imposto Devido (DARF)</td><td class="numero">${formatarMoeda(impostoFinal)}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    abrirModal('modal-detalhes-ir-mes');
}
function renderizarCalculadoraIR() {
    const anoSelecionado = document.getElementById('ir-filtro-ano').value;
    if (!anoSelecionado) return;

    document.getElementById('ir-limite-isencao-texto').textContent = formatarMoeda(configuracoesFiscais.limiteIsencaoAcoes);

    const dadosIR = calcularImpostoRendaAnual(anoSelecionado);
    let totalAnual = 0;

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const gerarTabelaHtml = (dados, tipo) => {
        let tableHtml = `<table><thead><tr>
            <th>Mês</th>
            <th class="right-aligned-header">Total Vendas</th>
            <th class="right-aligned-header">Prejuízo a Compensar</th>
            <th class="right-aligned-header">Resultado do Mês</th>
            <th class="right-aligned-header">Prejuízo a Compensar (pós-resultado)</th>
            <th class="right-aligned-header">Base de Cálculo</th>
            <th class="right-aligned-header">Imposto Devido</th>
        </tr></thead><tbody>`;

        for (let i = 0; i < 12; i++) {
            const mesStr = String(i + 1).padStart(2, '0');
            const chaveMes = `${anoSelecionado}-${mesStr}`;
            const dadosMes = dados[chaveMes][tipo];
            
            const resultadoAjustado = dadosMes.resultadoMes + dadosMes.ajusteManual;
            
            let prejuizoPosResultado;

            if (tipo === 'geral_rv') {
                const vendasOps = dadosMes.operacoes.filter(op => op.tipo === 'venda');
                const vendasOutrasAcoes = vendasOps.filter(op => op.tipoAcao !== 'Unit' && todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'Ação');
                const totalVendasOutrasAcoesBruto = vendasOutrasAcoes.reduce((sum, op) => sum + op.valor, 0);

                const resultadoUnits = vendasOps.filter(op => op.tipoAcao === 'Unit').reduce((sum, op) => sum + op.resultado, 0);
                const resultadoETFs = vendasOps.filter(op => todosOsAtivos.find(a => a.ticker === op.ativo)?.tipo === 'ETF').reduce((sum, op) => sum + op.resultado, 0);
                const resultadoOutrasAcoes = vendasOutrasAcoes.reduce((sum, op) => sum + op.resultado, 0);

                let resultadoTributavelDoMes = 0;
                if (resultadoUnits > 0) resultadoTributavelDoMes += resultadoUnits;
                if (resultadoETFs > 0) resultadoTributavelDoMes += resultadoETFs;

                if (totalVendasOutrasAcoesBruto > configuracoesFiscais.limiteIsencaoAcoes && resultadoOutrasAcoes > 0) {
                    resultadoTributavelDoMes += resultadoOutrasAcoes;
                }
                resultadoTributavelDoMes += dadosMes.ajusteManual;
                
                prejuizoPosResultado = Math.min(0, dadosMes.prejuizoAnterior + resultadoTributavelDoMes);

            } else {
                prejuizoPosResultado = Math.min(0, dadosMes.prejuizoAnterior + resultadoAjustado);
            }

            let prejuizoCellHtml;
            const prejuizoDoMes = Math.abs(dadosMes.prejuizoAnterior);
            
            if (i === 0) {
                const chaveAjustePrejuizo = `${anoSelecionado}-00_${tipo}`;
                prejuizoCellHtml = `<td class="numero editable-prejudice-cell" 
                                        contenteditable="true"
                                        data-chave-ajuste-prejuizo="${chaveAjustePrejuizo}"
                                        data-prejuizo-calculado="${prejuizoDoMes}"
                                        title="Prejuízo acumulado de anos anteriores. Clique para definir um valor inicial para este ano.">${formatarMoeda(prejuizoDoMes)}</td>`;
            } else {
                prejuizoCellHtml = `<td class="numero">${formatarMoeda(prejuizoDoMes)}</td>`;
            }

            const classeAjustado = dadosMes.ajusteManual !== 0 ? 'adjusted' : '';
            const tooltipAjuste = dadosMes.ajusteManual !== 0 ? `title="Valor Original: ${formatarMoeda(dadosMes.resultadoMes)} | Ajuste: ${formatarMoeda(dadosMes.ajusteManual)}"` : '';
            
            tableHtml += `
                <tr class="linha-mes-ir" data-mes="${i}" data-tipo="${tipo}">
                    <td>${meses[i]}</td>
                    <td class="numero">${formatarMoeda(dadosMes.totalVendas)}</td>
                    ${prejuizoCellHtml}
                    <td class="numero editable-result ${classeAjustado} ${resultadoAjustado >= 0 ? 'lucro' : 'prejuizo'}" 
                        contenteditable="true" 
                        data-chave-ajuste="${chaveMes}_${tipo}"
                        data-resultado-calculado="${dadosMes.resultadoMes}"
                        ${tooltipAjuste}>${formatarMoeda(resultadoAjustado)}</td>
                    <td class="numero ${prejuizoPosResultado < 0 ? 'prejuizo' : ''}">${formatarMoeda(Math.abs(prejuizoPosResultado))}</td>
                    <td class="numero">${formatarMoeda(dadosMes.baseDeCalculo)}</td>
                    <td class="numero ${dadosMes.impostoDevido > 0 ? 'imposto-clicavel' : ''}" data-ano="${anoSelecionado}" data-mes="${i}">${formatarMoeda(dadosMes.impostoDevido)}</td>
                </tr>
            `;
        }
        tableHtml += '</tbody></table>';
        return tableHtml;
    };
    
    const containerFiis = document.getElementById('ir-tabela-fiis');
    const containerGeralRV = document.getElementById('ir-tabela-geral-rv');
    const containerDaytrade = document.getElementById('ir-tabela-daytrade');

    containerFiis.innerHTML = gerarTabelaHtml(dadosIR, 'fiis');
    containerGeralRV.innerHTML = gerarTabelaHtml(dadosIR, 'geral_rv');
    containerDaytrade.innerHTML = gerarTabelaHtml(dadosIR, 'daytrade');

    ['fiis', 'geral_rv', 'daytrade'].forEach(tipo => {
        for (let i = 0; i < 12; i++) {
            const mesStr = String(i + 1).padStart(2, '0');
            const chaveMes = `${anoSelecionado}-${mesStr}`;
            if (dadosIR[chaveMes] && dadosIR[chaveMes][tipo]) {
                totalAnual += dadosIR[chaveMes][tipo].impostoDevido;
            }
        }
    });
    
    document.getElementById('ir-total-anual').textContent = formatarMoeda(totalAnual);
    
    const attachCellListeners = (containerElement) => {
        if (!containerElement) return;
        containerElement.addEventListener('blur', (e) => {
            const target = e.target;
            if (target.classList.contains('editable-result') || target.classList.contains('editable-prejudice-cell')) {
                salvarAjusteIR(target);
            }
        }, true);

        containerElement.addEventListener('keydown', (e) => {
            const target = e.target;
            if (e.key === 'Enter' && (target.classList.contains('editable-result') || target.classList.contains('editable-prejudice-cell'))) {
                e.preventDefault();
                target.blur();
            }
        });

        containerElement.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('imposto-clicavel')) {
                abrirModalDetalhesIR(target.dataset.ano, parseInt(target.closest('tr').dataset.mes));
                return;
            }
            
            if (target.closest('.editable-result, .editable-prejudice-cell')) {
                return;
            }

            const linhaClicada = e.target.closest('.linha-mes-ir');
            if (!linhaClicada) return;

            const proximoElemento = linhaClicada.nextElementSibling;
            
            if (proximoElemento && proximoElemento.classList.contains('ir-details-row')) {
                proximoElemento.remove();
                return;
            }

            document.querySelectorAll('.ir-details-row').forEach(row => row.remove());
            
            const ano = document.getElementById('ir-filtro-ano').value;
            const mes = parseInt(linhaClicada.dataset.mes);
            const tipo = linhaClicada.dataset.tipo;
            const chaveMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;
            const operacoes = dadosIR[chaveMes][tipo].operacoes;
            
            if (operacoes.length === 0) return;

            let detailsHtml = `<table class="ir-details-table"><thead><tr>
                <th>Operação</th><th>Ativo</th><th>Data</th>
                <th class="numero">Qtd.</th><th class="numero">Valor Líquido</th>
                <th class="numero">Custo Aquisição</th><th class="numero">Resultado</th>
            </tr></thead><tbody>`;
            
            operacoes.forEach(op => {
                if(op.tipo === 'venda') {
                     detailsHtml += `<tr>
                        <td>Venda</td><td>${op.ativo}</td>
                        <td>${new Date(op.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td class="numero">${op.quantidade}</td>
                        <td class="numero">${formatarMoeda(op.valorVendaLiquida)}</td>
                        <td class="numero">${formatarMoeda(op.custoAquisicao)}</td>
                        <td class="numero ${op.resultado >= 0 ? 'lucro' : 'prejuizo'}">${formatarMoeda(op.resultado)}</td>
                    </tr>`;
                } else {
                     detailsHtml += `<tr style="background-color: #f0f9ff;">
                        <td>Compra</td><td>${op.ativo}</td>
                        <td>${new Date(op.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td class="numero">${op.quantidade}</td>
                        <td class="numero">${formatarMoeda(op.valorCompra)}</td>
                        <td class="numero">${formatarMoeda(op.valorCompra)}</td>
                        <td class="numero">-</td>
                    </tr>`;
                }
            });

            detailsHtml += `</tbody></table>`;
            const newRow = document.createElement('tr');
            newRow.className = 'ir-details-row';
            newRow.innerHTML = `<td colspan="7">${detailsHtml}</td>`;
            linhaClicada.parentNode.insertBefore(newRow, linhaClicada.nextElementSibling);
        });
    };

    attachCellListeners(containerFiis);
    attachCellListeners(containerGeralRV);
    attachCellListeners(containerDaytrade);
}
// ********** FIM DA PARTE 5.1






// ********** PARTE 5.2 - CONSULTAS DIVERSAS
function gerarRelatorioPosicoesZeradas() {
    const todosOsEventos = [];
    posicaoInicial.forEach(p => todosOsEventos.push({ data: p.data, tipo: p.tipoRegistro, payload: p }));
    todasAsNotas.forEach(n => n.operacoes.forEach(op => todosOsEventos.push({ data: n.data, tipo: 'OPERACAO_NOTA', payload: { ...op, corretora: n.corretora } })));
    // --- INÍCIO DA CORREÇÃO ---
    // Adiciona os ajustes (incluindo eventos de entrada/saída) à lista de eventos a serem processados.
    todosOsAjustes.forEach(a => todosOsEventos.push({ data: a.data, tipo: a.tipoAjuste, payload: a }));
    // --- FIM DA CORREÇÃO ---

    todosOsEventos.sort((a,b) => new Date(a.data) - new Date(b.data));

    const todosOsTickers = [...new Set(todosOsEventos.map(e => e.payload.ticker || e.payload.ativo))].filter(Boolean);
    const relatorio = [];

    todosOsTickers.forEach(ticker => {
        if (!ticker) return;

        const eventosDoAtivo = todosOsEventos.filter(e => (e.payload.ticker || e.payload.ativo) === ticker);
        if (eventosDoAtivo.length === 0) return;

        let quantidade = 0;
        let dataInicioCiclo = null;

        eventosDoAtivo.forEach(evento => {
            const payload = evento.payload;
            let qtdOperacao = 0;
            let tipoOperacao = '';

            switch(evento.tipo) {
                case 'SUMARIO_MANUAL':
                case 'TRANSACAO_HISTORICA':
                    tipoOperacao = payload.transacao ? payload.transacao.toLowerCase() : 'compra';
                    qtdOperacao = payload.quantidade;
                    break;
                case 'OPERACAO_NOTA':
                    tipoOperacao = payload.tipo;
                    qtdOperacao = payload.quantidade;
                    break;
                // --- INÍCIO DA CORREÇÃO ---
                // Adiciona o caso para tratar os eventos de ativo
                case 'evento_ativo':
                    if (payload.tipoEvento === 'saida') {
                        tipoOperacao = 'venda'; // Trata como uma venda para fins de contagem de quantidade
                        qtdOperacao = payload.detalhes.reduce((acc, d) => acc + d.quantidade, 0);
                    } else if (payload.tipoEvento === 'entrada') {
                        tipoOperacao = 'compra';
                        qtdOperacao = payload.detalhes.reduce((acc, d) => acc + d.quantidade, 0);
                    }
                    break;
                // --- FIM DA CORREÇÃO ---
            }

            const qtdAnterior = quantidade;

            if (tipoOperacao === 'compra') {
                quantidade += qtdOperacao;
                // Se a posição anterior era zero, um novo ciclo de investimento começou.
                if (qtdAnterior <= 0.000001 && quantidade > 0.000001) {
                    dataInicioCiclo = evento.data;
                }
            } else if (tipoOperacao === 'venda') {
                quantidade -= qtdOperacao;
                // Se a posição anterior era positiva e agora é zero, o ciclo de investimento encerrou.
                if (qtdAnterior > 0.000001 && quantidade <= 0.000001) {
                    if (dataInicioCiclo) { // Garante que temos um início para este ciclo que está terminando
                        relatorio.push({
                            ticker: ticker,
                            dataInicio: dataInicioCiclo,
                            dataEncerramento: evento.data
                        });
                        dataInicioCiclo = null; // Reseta para o próximo ciclo
                    }
                }
            }
        });
    });

    return relatorio;
}

function renderizarPosicoesZeradas() {
    const container = document.getElementById('container-posicoes-zeradas');
    const dados = gerarRelatorioPosicoesZeradas();
    
    if (dados.length === 0) {
        container.innerHTML = "<p>Nenhuma posição zerada encontrada no seu histórico.</p>";
        return;
    }

    let tableHtml = `<table><thead><tr>
        <th>Ativo</th>
        <th>Data de Início da Posição</th>
        <th>Data de Encerramento da Posição</th>
    </tr></thead><tbody>`;

    dados.sort((a,b) => new Date(b.dataEncerramento) - new Date(a.dataEncerramento)).forEach(item => {
        tableHtml += `
            <tr>
                <td>${item.ticker}</td>
                <td>${new Date(item.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${new Date(item.dataEncerramento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            </tr>
        `;
    });

    tableHtml += "</tbody></table>";
    container.innerHTML = tableHtml;
}

function gerarHistoricoCompletoParaAtivo(ticker) {
    const historico = [];
    const pos = { quantidade: 0, precoMedio: 0, porCorretora: {} };
    let eventos = [];

    // Coleta todos os eventos relevantes para o ativo
    posicaoInicial.filter(p => p.ticker === ticker).forEach(p => eventos.push({ data: p.data, tipo: p.tipoRegistro, payload: p }));
    todasAsNotas.forEach(n => {
        n.operacoes.filter(op => op.ativo === ticker).forEach(op => {
            eventos.push({ data: n.data, tipo: 'OPERACAO_NOTA', payload: { ...op, custosNota: n.custos, irrfNota: n.irrf, corretora: n.corretora, numeroNota: n.numero, totalOperacoesNota: n.operacoes.reduce((soma, op) => soma + op.valor, 0) } });
        });
    });
    todosOsAjustes.forEach(a => {
        if ((a.tipoAjuste === 'transferencia' && a.ativosTransferidos.some(at => at.ticker === ticker)) || (a.ticker === ticker)) {
             eventos.push({ data: a.data, tipo: a.tipoAjuste, payload: a });
        }
    });

    eventos.sort((a,b) => new Date(a.data) - new Date(b.data));

    eventos.forEach(evento => {
        let descricaoTransacao = '';
        let precoUnitario = null;
        const payload = evento.payload;

        switch(evento.tipo) {
            case 'SUMARIO_MANUAL': {
                let qtdTotalSumario = 0;
                payload.posicoesPorCorretora.forEach(pc => {
                    pos.porCorretora[pc.corretora] = (pos.porCorretora[pc.corretora] || 0) + pc.quantidade;
                    qtdTotalSumario += pc.quantidade;
                });
                pos.quantidade = qtdTotalSumario;
                pos.precoMedio = payload.precoMedio;
                descricaoTransacao = 'Posição Manual Inicial';
                precoUnitario = payload.precoMedio;
                break;
            }
            case 'TRANSACAO_HISTORICA': {
                const corretora = payload.corretora;
                const quantidade = payload.quantidade;
                if (payload.transacao.toLowerCase() === 'compra') {
                    pos.quantidade += quantidade;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) + quantidade;
                    pos.precoMedio = payload.precoMedio;
                    precoUnitario = null;
                } else {
                    pos.quantidade -= quantidade;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) - quantidade;
                    pos.precoMedio = payload.precoMedio;
                    precoUnitario = (payload.valorVenda && quantidade > 0) ? payload.valorVenda / quantidade : 0;
                }
                descricaoTransacao = `Histórico: ${payload.transacao} de ${payload.quantidade}`;
                break;
            }
            case 'OPERACAO_NOTA': {
                const corretora = payload.corretora;
                const qtdAnterior = pos.quantidade;
                const pmAnterior = pos.precoMedio;
                const qtdOperacao = payload.quantidade;
                const custoRateado = payload.totalOperacoesNota > 0 ? (payload.valor / payload.totalOperacoesNota) * (payload.custosNota + payload.irrfNota) : 0;
                
                if (payload.tipo.toLowerCase() === 'compra') {
                    const precoCompraComCustos = qtdOperacao > 0 ? (payload.valor + custoRateado) / qtdOperacao : 0;
                    const novoTotalFinanceiro = (qtdAnterior * pmAnterior) + (qtdOperacao * precoCompraComCustos);
                    pos.quantidade += qtdOperacao;
                    pos.precoMedio = pos.quantidade > 0 ? novoTotalFinanceiro / pos.quantidade : 0;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) + qtdOperacao;
                    precoUnitario = precoCompraComCustos;
                } else {
                    pos.quantidade -= qtdOperacao;
                    pos.porCorretora[corretora] = (pos.porCorretora[corretora] || 0) - qtdOperacao;
                    precoUnitario = qtdOperacao > 0 ? (payload.valor - custoRateado) / qtdOperacao : 0;
                }
                descricaoTransacao = `Nota ${payload.numeroNota}: ${payload.tipo.charAt(0).toUpperCase() + payload.tipo.slice(1)} de ${payload.quantidade}`;
                break;
            }
            case 'evento_ativo': {
                if (payload.tipoEvento === 'entrada') {
                    const qtdAnterior = pos.quantidade;
                    const pmAnterior = pos.precoMedio;
                    let qtdEntradaTotal = 0;
                    payload.detalhes.forEach(detalhe => {
                        pos.porCorretora[detalhe.corretora] = (pos.porCorretora[detalhe.corretora] || 0) + detalhe.quantidade;
                        qtdEntradaTotal += detalhe.quantidade;
                    });
                    const pmEntrada = payload.precoMedio;
                    const novoTotalFinanceiro = (qtdAnterior * pmAnterior) + (qtdEntradaTotal * pmEntrada);
                    pos.quantidade += qtdEntradaTotal;
                    pos.precoMedio = pos.quantidade > 0 ? novoTotalFinanceiro / pos.quantidade : 0;
                    precoUnitario = pmEntrada;
                } else {
                     payload.detalhes.forEach(detalhe => {
                        pos.porCorretora[detalhe.corretora] -= detalhe.quantidade;
                        pos.quantidade -= detalhe.quantidade;
                    });
                    precoUnitario = 0;
                }
                 descricaoTransacao = `Evento: ${payload.tipoEvento} de ${payload.detalhes.reduce((acc, d) => acc + d.quantidade, 0)}`;
                if (pos.quantidade < 0.000001) pos.precoMedio = 0;
                break;
            }
            case 'transferencia': {
                const ativoT = payload.ativosTransferidos.find(at => at.ticker === ticker);
                if (ativoT) {
                    pos.porCorretora[payload.corretoraOrigem] = (pos.porCorretora[payload.corretoraOrigem] || 0) - ativoT.quantidade;
                    pos.porCorretora[payload.corretoraDestino] = (pos.porCorretora[payload.corretoraDestino] || 0) + ativoT.quantidade;
                    // --- INÍCIO DA ALTERAÇÃO ---
                    descricaoTransacao = `Transferência de ${ativoT.quantidade} un. de ${payload.corretoraOrigem} para ${payload.corretoraDestino}`;
                    // --- FIM DA ALTERAÇÃO ---
                } else {
                    descricaoTransacao = `Transferência de ${payload.corretoraOrigem} para ${payload.corretoraDestino}`;
                }
                precoUnitario = null;
                break;
            }
            case 'ajuste_pm':
                pos.precoMedio = payload.novoPrecoMedio;
                descricaoTransacao = `Ajuste manual de Preço Médio`;
                precoUnitario = null;
                break;
            case 'split_grupamento':
                const de = payload.proporcaoDe;
                const para = payload.proporcaoPara;
                pos.quantidade = (pos.quantidade / de) * para;
                pos.precoMedio = (pos.precoMedio / para) * de;
                descricaoTransacao = `Evento: ${payload.tipoEvento} ${de} para ${para}`;
                precoUnitario = null;
                break;
        }
        
        const qtdPorCorretoraStr = Object.entries(pos.porCorretora)
            .filter(([_, qtd]) => qtd > 0.0001)
            .map(([nome, qtd]) => `${nome}: ${Math.round(qtd)}`)
            .join('<br>');

        const valorTotalInvestido = pos.quantidade * pos.precoMedio;

        historico.push({
            data: evento.data,
            descricaoTransacao: descricaoTransacao,
            precoUnitario: precoUnitario,
            qtdPorCorretora: qtdPorCorretoraStr,
            qtdConsolidada: pos.quantidade,
            precoMedio: pos.precoMedio,
            valorTotalInvestido: valorTotalInvestido
        });
    });

    return historico;
}

function renderizarTelaHistoricoMovimentacao() {
    mostrarTela('historicoMovimentacao');
    const select = document.getElementById('select-ativo-historico');
    const containerTabela = document.getElementById('container-tabela-movimentacoes');
    containerTabela.innerHTML = '';
    
    const todosOsTickersHistorico = [...new Set(todosOsAtivos.map(a => a.ticker))];
    const posicoesAtuais = gerarPosicaoDetalhada();
    
    const tickersComPosicao = new Set(Object.keys(posicoesAtuais).filter(t => posicoesAtuais[t].quantidade > 0.000001));
    
    let optionsHtml = '<option value="">Selecione um ativo...</option>';
    todosOsTickersHistorico.sort().forEach(ticker => {
        if (!tickersComPosicao.has(ticker)) {
            optionsHtml += `<option value="${ticker}" class="posicao-zerada">${ticker} (zerada)</option>`;
        } else {
            optionsHtml += `<option value="${ticker}">${ticker}</option>`;
        }
    });

    select.innerHTML = optionsHtml;
}

function renderizarTabelaHistoricoParaAtivo(ticker) {
    const container = document.getElementById('container-tabela-movimentacoes');
    if (!ticker) {
        container.innerHTML = '';
        return;
    }
    const historico = gerarHistoricoCompletoParaAtivo(ticker);

    // --- CABEÇALHO ATUALIZADO ---
    let tableHtml = `<h4>Movimentações para ${ticker}</h4><table><thead><tr>
        <th>Data</th>
        <th>Transação</th>
        <th class="numero">Preço Unit. (R$)</th>
        <th>Qtd. por Corretora</th>
        <th class="numero">Qtd. Consolidada</th>
        <th class="numero">Preço Médio</th>
        <th class="numero">Valor Investido</th>
    </tr></thead><tbody>`;

    if (historico.length === 0) {
        tableHtml += '<tr><td colspan="7" style="text-align: center;">Nenhuma movimentação encontrada para este ativo.</td></tr>';
    } else {
        historico.forEach(item => {
            const dataFormatada = item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data Inválida';
            
            // --- CÉLULA ATUALIZADA PARA EXIBIR O PREÇO UNITÁRIO ---
            const precoUnitarioFmt = (item.precoUnitario !== null && item.precoUnitario > 0) ? formatarMoeda(item.precoUnitario) : 'N/A';
            
            tableHtml += `
                <tr>
                    <td>${dataFormatada}</td>
                    <td>${item.descricaoTransacao}</td>
                    <td class="numero">${precoUnitarioFmt}</td>
                    <td>${item.qtdPorCorretora || 'N/A'}</td>
                    <td class="numero">${Math.round(item.qtdConsolidada)}</td>
                    <td class="numero">${formatarPrecoMedio(item.precoMedio)}</td>
                    <td class="numero">${formatarMoeda(item.valorTotalInvestido)}</td>
                </tr>`;
        });
    }

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}
function renderizarCalendarioAcoes() {
    const subtituloDataCom = document.getElementById('subtitulo-datacom');
    const subtituloDataPag = document.getElementById('subtitulo-datapagamento');
    const container = document.getElementById('calendario-acoes-container');
    
    // Lógica principal: agora lê da nossa variável de estado
    const tipoData = tipoVistaCalendarioAcoes;

    // Atualiza o estilo dos títulos (esta parte da lógica se mantém)
    if (tipoData === 'dataCom') {
        subtituloDataCom.classList.add('ativo');
        subtituloDataPag.classList.remove('ativo');
    } else {
        subtituloDataCom.classList.remove('ativo');
        subtituloDataPag.classList.add('ativo');
    }    
    container.innerHTML = '<h4>Carregando calendário...</h4>';

    const tickersAcoes = new Set(todosOsAtivos.filter(a => a.tipo === 'Ação').map(a => a.ticker));
    const proventosAcoes = todosOsProventos.filter(p => tickersAcoes.has(p.ticker));

    if (proventosAcoes.length === 0) {
        container.innerHTML = '<p>Nenhum provento de Ações encontrado para gerar o calendário.</p>';
        return;
    }

    const proventosPorAnoMes = {};
    proventosAcoes.forEach(provento => {
        const dataDoEvento = provento[tipoData];
        if (!dataDoEvento) return;

        const data = new Date(dataDoEvento + 'T12:00:00');
        const ano = data.getUTCFullYear();
        const mes = data.getUTCMonth();

        if (!proventosPorAnoMes[ano]) proventosPorAnoMes[ano] = Array.from({ length: 12 }, () => ({}));
        
        if (!proventosPorAnoMes[ano][mes][provento.ticker]) {
            proventosPorAnoMes[ano][mes][provento.ticker] = [];
        }
        proventosPorAnoMes[ano][mes][provento.ticker].push(provento);
    });

    const anosOrdenados = Object.keys(proventosPorAnoMes).sort((a, b) => b - a);
    let htmlFinal = '';
    const mesesCabecalho = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    anosOrdenados.forEach(ano => {
        const dadosAno = proventosPorAnoMes[ano];
        const maxEventosPorMes = Math.max(...dadosAno.map(mesObj => Object.keys(mesObj).length));

        htmlFinal += `<div class="calendario-ano-container"><h3>${ano}</h3>`;
        htmlFinal += `<table class="calendario-datacom-table"><thead><tr>`;
        mesesCabecalho.forEach(mes => htmlFinal += `<th>${mes}</th>`);
        htmlFinal += `</tr></thead><tbody>`;

        if (maxEventosPorMes === 0) {
            htmlFinal += '<tr><td colspan="12" style="height: 40px; text-align: center; font-style: italic; color: #888;">Nenhum evento neste ano.</td></tr>';
        } else {
            for (let i = 0; i < maxEventosPorMes; i++) {
                htmlFinal += '<tr>';
                for (let j = 0; j < 12; j++) {
                    const proventosDoMesPorTicker = dadosAno[j] || {};
                    const tickersDoMes = Object.keys(proventosDoMesPorTicker).sort();
                    const ticker = tickersDoMes[i];
                    
                    if (ticker) {
                        const proventosDoAtivoNoMes = proventosDoMesPorTicker[ticker];
                        const totalValor = proventosDoAtivoNoMes.reduce((soma, p) => soma + p.valorTotalRecebido, 0);
                        const totalYoc = proventosDoAtivoNoMes.reduce((soma, p) => soma + p.yieldOnCost, 0);

                        htmlFinal += `<td>
                                        <div class="provento-item-acao">
                                            <div class="provento-ticker-calendario">${ticker}</div>
                                            <div class="provento-detalhe-calendario" title="Valor Total Recebido no Mês">${formatarMoeda(totalValor)}</div>
                                            <div class="provento-detalhe-calendario" title="Yield on Cost no Mês">YOC: ${formatarPercentual(totalYoc)}</div>
                                        </div>
                                      </td>`;
                    } else {
                        htmlFinal += '<td></td>';
                    }
                }
                htmlFinal += '</tr>';
            }
        }
        htmlFinal += '</tbody></table></div>';
    });
    container.innerHTML = htmlFinal;
}
function renderizarTelaPosicaoPorCorretora() {
    const container = document.getElementById('container-posicao-por-corretora');
    container.innerHTML = '<h4>Calculando posições...</h4>';

    const corretoras = getTodasCorretoras();
    const posicoesRV = gerarPosicaoDetalhada();
    const hojeStr = new Date().toISOString().split('T')[0];

    const proventosProvisionados = todosOsProventos.filter(p =>
        p.dataCom && p.dataPagamento &&
        p.dataCom < hojeStr &&
        p.dataPagamento > hojeStr
    );

    let htmlFinal = '';

    corretoras.forEach(corretora => {
        let valorTotalNaInstituicao = 0;
        
        const dadosInstituicao = {
            contasCorrente: { total: 0, itens: [] },
            contaInvestimento: { total: 0, itens: [] },
            proventosProvisionados: { total: 0, itens: [] },
            acoes: { total: 0, itens: [] },
            fiis: { total: 0, itens: [] },
            etfs: { total: 0, itens: [] },
            rendaFixa: { total: 0, itens: [] }
        };

        todasAsContas.filter(c => c.banco === corretora && !c.notas?.toLowerCase().includes('inativa')).forEach(conta => {
            const saldoAtual = calcularSaldoEmData(conta, hojeStr);
            valorTotalNaInstituicao += saldoAtual;
            if (conta.tipo === 'Conta Corrente') {
                dadosInstituicao.contasCorrente.total += saldoAtual;
                dadosInstituicao.contasCorrente.itens.push({ ...conta, saldo: saldoAtual });
            } else {
                dadosInstituicao.contaInvestimento.total += saldoAtual;
                dadosInstituicao.contaInvestimento.itens.push({ ...conta, saldo: saldoAtual });
            }
        });

        Object.entries(posicoesRV).forEach(([ticker, dados]) => {
            const qtdNaCorretora = dados.porCorretora[corretora] || 0;
            if (qtdNaCorretora > 0.000001) {
                const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker) || {};
                const cotacao = dadosDeMercado.cotacoes[ticker];
                const valorMercado = (cotacao?.valor > 0) ? qtdNaCorretora * cotacao.valor : 0;
                valorTotalNaInstituicao += valorMercado;

                const item = { nome: ticker, tipo: ativoInfo.tipo || 'N/D', quantidade: qtdNaCorretora, valor: valorMercado };
                if (ativoInfo.tipo === 'Ação') dadosInstituicao.acoes.itens.push(item);
                else if (ativoInfo.tipo === 'FII') dadosInstituicao.fiis.itens.push(item);
                else if (ativoInfo.tipo === 'ETF') dadosInstituicao.etfs.itens.push(item);
            }
        });
        dadosInstituicao.acoes.total = dadosInstituicao.acoes.itens.reduce((s, a) => s + a.valor, 0);
        dadosInstituicao.fiis.total = dadosInstituicao.fiis.itens.reduce((s, a) => s + a.valor, 0);
        dadosInstituicao.etfs.total = dadosInstituicao.etfs.itens.reduce((s, a) => s + a.valor, 0);

        todosOsAtivosRF.filter(a => a.instituicao === corretora && !(a.descricao || '').toLowerCase().includes('inativa')).forEach(ativo => {
            const saldoAtivo = calcularSaldosRFEmData(ativo, hojeStr).saldoLiquido;
            valorTotalNaInstituicao += saldoAtivo;
            dadosInstituicao.rendaFixa.total += saldoAtivo;
            dadosInstituicao.rendaFixa.itens.push({ nome: ativo.descricao, tipo: 'Renda Fixa', quantidade: null, valor: saldoAtivo });
        });

        proventosProvisionados.forEach(p => {
            if (p.posicaoPorCorretora && p.posicaoPorCorretora[corretora]) {
                const valorNaCorretora = p.posicaoPorCorretora[corretora].valorRecebido || 0;
                valorTotalNaInstituicao += valorNaCorretora;
                dadosInstituicao.proventosProvisionados.total += valorNaCorretora;
                dadosInstituicao.proventosProvisionados.itens.push({
                    nome: p.ticker,
                    dataPagamento: p.dataPagamento,
                    valor: valorNaCorretora
                });
            }
        });
        
        if (valorTotalNaInstituicao > 0) {
            const totalInvestimentos = dadosInstituicao.contaInvestimento.total + dadosInstituicao.proventosProvisionados.total + dadosInstituicao.acoes.total + dadosInstituicao.fiis.total + dadosInstituicao.etfs.total + dadosInstituicao.rendaFixa.total;

            htmlFinal += `<div class="bloco-corretora">
                            <div class="bloco-corretora-header">
                                <h3>${corretora}</h3>
                                <span class="total-corretora">${formatarMoeda(valorTotalNaInstituicao)}</span>
                            </div>
                            <div class="bloco-corretora-conteudo">`;

            if (dadosInstituicao.contasCorrente.itens.length > 0) {
                htmlFinal += `<div class="categoria-acordeao">
                    <div class="acordeao-header">
                        <h4><i class="fas fa-wallet"></i> Contas Correntes</h4>
                        <div><span class="acordeao-valor">${formatarMoeda(dadosInstituicao.contasCorrente.total)}</span> <i class="fas fa-chevron-right acordeao-icone"></i></div>
                    </div>
                    <div class="acordeao-conteudo">
                        <table><tbody>
                            ${dadosInstituicao.contasCorrente.itens.map(c => `
                                <tr>
                                    <td>${c.tipo} (Ag: ${c.agencia || 'N/A'}, C/C: ${c.numero || 'N/A'}, Pix: ${c.pix || 'N/A'})</td>
                                    <td class="numero"><strong>${formatarMoeda(c.saldo)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody></table>
                    </div>
                </div>`;
            }

            if (totalInvestimentos > 0) {
                htmlFinal += `<div class="categoria-acordeao">
                    <div class="acordeao-header">
                        <h4><i class="fas fa-chart-pie"></i> Investimentos</h4>
                        <div><span class="acordeao-valor">${formatarMoeda(totalInvestimentos)}</span> <i class="fas fa-chevron-right acordeao-icone"></i></div>
                    </div>
                    <div class="acordeao-conteudo">`;
                
                const subcategorias = [
                    { nome: 'Conta Investimento', dados: dadosInstituicao.contaInvestimento, isConta: true },
                    { nome: 'Proventos Provisionados', dados: dadosInstituicao.proventosProvisionados, isConta: false, isProvento: true },
                    { nome: 'Ações', dados: dadosInstituicao.acoes, isConta: false },
                    { nome: 'FIIs', dados: dadosInstituicao.fiis, isConta: false },
                    { nome: 'ETFs', dados: dadosInstituicao.etfs, isConta: false },
                    { nome: 'Renda Fixa', dados: dadosInstituicao.rendaFixa, isConta: false }
                ];

                subcategorias.forEach(sub => {
                    if (sub.dados.itens.length > 0) {
                        let sortedItems = [...sub.dados.itens];
                        if (sub.isProvento) {
                            sortedItems.sort((a, b) => new Date(a.dataPagamento) - new Date(b.dataPagamento));
                        } else {
                            sortedItems.sort((a,b) => (a.nome || a.banco).localeCompare(b.nome || b.banco));
                        }
                        
                        htmlFinal += `<div class="subcategoria-acordeao">
                            <div class="acordeao-header">
                                <h5>${sub.nome}</h5>
                                <div><span class="acordeao-valor">${formatarMoeda(sub.dados.total)}</span> <i class="fas fa-chevron-right acordeao-icone"></i></div>
                            </div>
                            <div class="acordeao-conteudo">
                                 <table><tbody>
                                    ${sortedItems.map(item => {
                                        if (sub.isConta) {
                                            return `<tr>
                                                        <td>${item.tipo} (Ag: ${item.agencia || 'N/A'}, C/C: ${item.numero || 'N/A'})</td>
                                                        <td></td>
                                                        <td class="numero"><strong>${formatarMoeda(item.saldo)}</strong></td>
                                                    </tr>`;
                                        } else if (sub.isProvento) {
                                            return `<tr>
                                                        <td>${item.nome}</td>
                                                        <td class="numero" style="font-size: 0.9em; color: #555;">Paga em: ${new Date(item.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                                        <td class="numero"><strong>${formatarMoeda(item.valor)}</strong></td>
                                                    </tr>`;
                                        } else {
                                            return `<tr>
                                                        <td>${item.nome}</td>
                                                        ${item.quantidade ? `<td class="numero">Qtd: ${Math.round(item.quantidade)}</td>` : '<td></td>'}
                                                        <td class="numero"><strong>${formatarMoeda(item.valor)}</strong></td>
                                                    </tr>`;
                                        }
                                    }).join('')}
                                </tbody></table>
                            </div>
                        </div>`;
                    }
                });

                htmlFinal += `</div></div>`;
            }
            
            htmlFinal += `</div></div>`;
        }
    });

    if (htmlFinal === '') {
        container.innerHTML = '<p style="text-align: center;">Nenhuma posição encontrada.</p>';
    } else {
        container.innerHTML = htmlFinal;
    }
}
async function atualizarCotacoesComAPI(silencioso = false) {
    if (!urlCotacoesCSV || !urlCotacoesCSV.startsWith('http')) {
        if (!silencioso) {
            alert('URL da planilha de cotações não configurada ou inválida. Por favor, configure na tela de Configurações.');
        }
        return;
    }

    const botoesAtualizar = document.querySelectorAll('#btn-atualizar-cotacoes-api, #btn-testar-salvar-url-cotacoes');
    botoesAtualizar.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        btn.disabled = true;
    });

    if (!silencioso) {
        mostrarFeedbackAtualizacao('Atualizando cotações...', 'loading');
    }

    try {
        const response = await fetch(urlCotacoesCSV, { mode: 'cors' }); // Adiciona modo CORS explicitamente
        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.statusText}`);
        }
        const csvText = await response.text();
        processarArquivoCotacoes(csvText, silencioso); 
    } catch (error) {
        console.error('Erro ao buscar cotações da URL:', error);
        
        // Tratamento específico para erro de CORS local
        if (window.location.protocol === 'file:' && error.message.includes('Failed to fetch')) {
             if (!silencioso) {
                alert("Atenção: O navegador bloqueou o acesso à planilha por segurança (Erro de CORS). Isso é comum ao rodar o arquivo direto do computador (file://).\n\nPara corrigir, você pode importar o CSV manualmente ou usar uma extensão de navegador que permita CORS (como 'Allow CORS').");
             }
        }
        
        if (!silencioso) {
            mostrarFeedbackAtualizacao('Falha na atualização!', 'error');
        }
    } finally {
        // Restaura os botões mesmo em caso de erro
        const btnAtualizar = document.getElementById('btn-atualizar-cotacoes-api');
        if(btnAtualizar) btnAtualizar.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar Cotações (Auto)';
        
        const btnTestar = document.getElementById('btn-testar-salvar-url-cotacoes');
        if(btnTestar) btnTestar.textContent = 'Testar e Salvar URL';
        
        botoesAtualizar.forEach(btn => btn.disabled = false);
    }
}
function calcularValorTotalInvestimentosAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    
    // A função calcularValorTotalCarteira já soma RV + RF, que é exatamente o que queremos.
    const valorCarteira = calcularValorTotalCarteira(hoje);

    return arredondarMoeda(valorCarteira);
}

function salvarSnapshotCarteira(silencioso = false) {
    const hoje = new Date().toISOString().split('T')[0];
    
    const posicoesRV = gerarPosicaoDetalhada(hoje);
    
    const detalhesCarteira = {
        valorPorClasse: { 'Ações': 0, 'FIIs': 0, 'ETFs': 0, 'Renda Fixa': 0 },
        ativos: {},
        rendaFixa: []
    };

    for (const ticker in posicoesRV) {
        const posicao = posicoesRV[ticker];
        if (posicao.quantidade <= 0.000001) continue;

        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        const tipoMapeado = ativoInfo ? (ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
        const cotacao = dadosDeMercado.cotacoes[ticker];
        const precoAtual = cotacao ? cotacao.valor : 0;
        const valorDeMercado = posicao.quantidade * precoAtual;

        if (tipoMapeado) {
            detalhesCarteira.valorPorClasse[tipoMapeado] += valorDeMercado;
        }

        detalhesCarteira.ativos[ticker] = {
            quantidade: posicao.quantidade,
            precoMedio: posicao.precoMedio,
            precoAtual: precoAtual,
            valorDeMercado: valorDeMercado
        };
    }

    todosOsAtivosRF.forEach(ativo => {
        if ((ativo.descricao || '').toLowerCase().includes('(inativa)')) {
            return;
        }
        const saldosNaData = calcularSaldosRFEmData(ativo, hoje);
        detalhesCarteira.valorPorClasse['Renda Fixa'] += saldosNaData.saldoLiquido;
        detalhesCarteira.rendaFixa.push({
            descricao: ativo.descricao,
            valorInvestido: saldosNaData.valorInvestido, 
            saldoLiquido: saldosNaData.saldoLiquido   
        });
    });

    let saldoTotalContas = 0;
    todasAsContas.forEach(conta => {
        saldoTotalContas += calcularSaldoEmData(conta, hoje);
    });

    let valorTotalMoedas = 0;
    const todosOsEventosCaixa = obterTodosOsEventosDeCaixa();
    const hojeStr = new Date().toISOString().split('T')[0];

    todosOsAtivosMoedas.forEach(ativo => {
        const transacoesPassadasEPresentes = todosOsEventosCaixa.filter(e =>
            e.tipo === 'moeda' &&
            String(e.idAlvo) === String(ativo.id) &&
            e.source !== 'recorrente_futura' &&
            e.data <= hojeStr
        );
        const saldoAtivoAtual = transacoesPassadasEPresentes.reduce((soma, t) => soma + arredondarMoeda(t.valor), ativo.saldoInicial);
        const cotacao = dadosMoedas.cotacoes[ativo.moeda] || 0;
        valorTotalMoedas += saldoAtivoAtual * cotacao;
    });
    
    const valorTotalInvestimentos = Object.values(detalhesCarteira.valorPorClasse).reduce((soma, v) => soma + v, 0);
    const totalProventosProvisionados = calcularTotalProventosProvisionados();
    const patrimonioTotal = valorTotalInvestimentos + saldoTotalContas + valorTotalMoedas + totalProventosProvisionados;

    const novoSnapshot = {
        data: hoje,
        patrimonioTotal: patrimonioTotal,
        valorTotalInvestimentos: valorTotalInvestimentos,
        valorTotalContas: saldoTotalContas,
        valorTotalMoedas: valorTotalMoedas,
        valorTotalProventosProvisionados: totalProventosProvisionados,
        cotacoesMoedas: {
            USD: dadosMoedas.cotacoes['USD'] || 0,
            EUR: dadosMoedas.cotacoes['EUR'] || 0,
            GBP: dadosMoedas.cotacoes['GBP'] || 0
        },
        ifix: dadosDeMercado.ifix || 0,
        ibov: dadosDeMercado.ibov || 0,
        detalhesCarteira: detalhesCarteira
    };

    const indexExistente = historicoCarteira.findIndex(s => s.data === hoje);

    if (indexExistente > -1) {
        if (!silencioso) { 
            if (confirm(`Já existe um snapshot de ${formatarMoeda(historicoCarteira[indexExistente].patrimonioTotal)} para hoje. Deseja atualizá-lo para ${formatarMoeda(novoSnapshot.patrimonioTotal)}?`)) {
                historicoCarteira[indexExistente] = novoSnapshot;
            } else {
                return; 
            }
        } else { 
            historicoCarteira[indexExistente] = novoSnapshot;
        }
    } else {
        historicoCarteira.push(novoSnapshot);
    }

    historicoCarteira.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    salvarHistoricoCarteira();

    if (!silencioso) {
        const dataFormatada = new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR');
        const mensagem = `Snapshot salvo com sucesso!\n\nData: ${dataFormatada}\n-----------------------------------\nPatrimônio Total: ${formatarMoeda(novoSnapshot.patrimonioTotal)}\nTotal Investimentos: ${formatarMoeda(novoSnapshot.valorTotalInvestimentos)}\nSaldo em Contas: ${formatarMoeda(novoSnapshot.valorTotalContas)}\nSaldo em Moedas: ${formatarMoeda(novoSnapshot.valorTotalMoedas)}\nProventos a Receber: ${formatarMoeda(novoSnapshot.valorTotalProventosProvisionados)}\n-----------------------------------\nIFIX: ${formatarDecimal(novoSnapshot.ifix, 2)}\nIBOV: ${formatarDecimal(novoSnapshot.ibov, 2)}\n`;
        alert(mensagem);
    } 
    
    if (telas.dashboard.style.display === 'block') {
        renderizarDashboard();
    }
}

function renderizarGraficoCarteira() {
    const ctx = document.getElementById('grafico-carteira-canvas')?.getContext('2d');
    if (!ctx) return;

    if (graficoCarteiraInstance) {
        graficoCarteiraInstance.destroy();
        graficoCarteiraInstance = null;
    }

    if (!historicoCarteira || historicoCarteira.length < 2) {
        ctx.font = "16px 'Segoe UI'";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Dados insuficientes. Salve pelo menos 2 snapshots para gerar o gráfico.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // 1. Ordenação Cronológica
    const historicoOrdenado = [...historicoCarteira].sort((a, b) => new Date(a.data) - new Date(b.data));

    const labels = [];
    const dadosBRL = [], dadosUSD = [], dadosEUR = [], dadosGBP = [];

    // Variáveis de Memória (Para proteção contra quedas a zero - GARE11)
    const memoriaAtivos = {}; 
    let memoriaRF = 0;
    
    // Flag para cortar os dias iniciais sem valor
    let encontrouPrimeiroInvestimento = false;

    historicoOrdenado.forEach(snapshot => {
        // --- A. Reconstrução Granular da Renda Variável (Ativo por Ativo) ---
        let totalRVCorrigido = 0;
        const ativosNoSnapshot = snapshot.detalhesCarteira?.ativos || {};
        // Unifica tickers do snapshot atual e da memória para não perder nada
        const todosTickers = new Set([...Object.keys(ativosNoSnapshot), ...Object.keys(memoriaAtivos)]);

        todosTickers.forEach(ticker => {
            const dadosSnap = ativosNoSnapshot[ticker];
            let valorAtivo = 0;
            let quantidade = 0;

            if (dadosSnap) {
                valorAtivo = dadosSnap.valorDeMercado || (dadosSnap.quantidade * dadosSnap.precoAtual);
                quantidade = dadosSnap.quantidade;
            }

            const valorMemoria = memoriaAtivos[ticker] || 0;
            
            // Lógica de Proteção:
            // Se o valor caiu a zero (anomalia), mas temos memória de valor alto 
            // e não houve indício claro de venda total (quantidade > 0 ou ausência súbita sem zerar qtd)
            if (valorAtivo <= 1 && valorMemoria > 10) {
                if (quantidade > 0 || !dadosSnap) {
                    valorAtivo = valorMemoria; // Repete o valor anterior
                }
            }

            if (valorAtivo > 0) {
                memoriaAtivos[ticker] = valorAtivo;
                totalRVCorrigido += valorAtivo;
            }
            
            // Se o ativo foi explicitamente zerado no snapshot (quantidade = 0), limpa da memória
            if (dadosSnap && dadosSnap.quantidade === 0) {
                delete memoriaAtivos[ticker];
            }
        });

        // --- B. Reconstrução da Renda Fixa ---
        let totalRF = 0;
        if (snapshot.detalhesCarteira?.rendaFixa) {
            snapshot.detalhesCarteira.rendaFixa.forEach(rf => totalRF += (rf.saldoLiquido || 0));
        } else {
            totalRF = snapshot.detalhesCarteira?.valorPorClasse?.['Renda Fixa'] || 0;
        }
        // Proteção básica para RF
        if (totalRF < 1 && memoriaRF > 100) {
            totalRF = memoriaRF;
        }
        if (totalRF > 0) memoriaRF = totalRF;

        // --- C. Total Apenas de Investimentos (RV + RF) ---
        // Ignora contas e moedas, conforme solicitado
        const valorInvestimentosCorrigido = totalRVCorrigido + totalRF;

        // --- D. Lógica de Corte Inicial ---
        // Só começa a registrar dados no gráfico quando encontrar o primeiro valor positivo
        if (valorInvestimentosCorrigido > 1) {
            encontrouPrimeiroInvestimento = true;
        }

        if (!encontrouPrimeiroInvestimento) {
            return; // Pula este snapshot (data vazia)
        }

        // --- E. Adiciona ao Gráfico ---
        
        // Formato de Data: dd/mm/aaaa
        const dataObj = new Date(snapshot.data + 'T12:00:00');
        const labelData = dataObj.toLocaleDateString('pt-BR'); 
        labels.push(labelData);

        dadosBRL.push(valorInvestimentosCorrigido);

        // Conversão Cambial
        const cotacoes = snapshot.cotacoesMoedas || { USD: 0, EUR: 0, GBP: 0 };
        const converter = (val, taxa) => (taxa > 0 ? val / taxa : 0);
        
        // Proteção visual para moedas: se cotação falhar (0), repete visualmente o anterior
        const pushSafe = (array, val) => {
            if (val === 0 && array.length > 0 && array[array.length - 1] > 0) {
                array.push(array[array.length - 1]);
            } else {
                array.push(val);
            }
        };

        pushSafe(dadosUSD, converter(valorInvestimentosCorrigido, cotacoes.USD));
        pushSafe(dadosEUR, converter(valorInvestimentosCorrigido, cotacoes.EUR));
        pushSafe(dadosGBP, converter(valorInvestimentosCorrigido, cotacoes.GBP));
    });

    // 4. Configuração Visual do Gráfico
    const datasets = [
        { 
            label: 'Valor em BRL', 
            data: dadosBRL, 
            borderColor: 'rgba(46, 204, 113, 1)', 
            backgroundColor: 'rgba(46, 204, 113, 0.1)', 
            fill: true, // Área preenchida apenas para BRL
            tension: 0.1, 
            borderWidth: 3, 
            pointRadius: 0, 
            pointHoverRadius: 4
        },
        { 
            label: 'Valor em USD', 
            data: dadosUSD, 
            borderColor: 'rgba(52, 152, 219, 0.9)', 
            fill: false, 
            tension: 0.1, 
            borderWidth: 1.5,
            pointRadius: 0, 
            pointHoverRadius: 4
        },
        { 
            label: 'Valor em EUR', 
            data: dadosEUR, 
            borderColor: 'rgba(241, 196, 15, 0.9)', 
            fill: false, 
            tension: 0.1, 
            borderWidth: 1.5,
            pointRadius: 0, 
            pointHoverRadius: 4
        },
        { 
            label: 'Valor em GBP', 
            data: dadosGBP, 
            borderColor: 'rgba(155, 89, 182, 0.9)', 
            fill: false, 
            tension: 0.1, 
            borderWidth: 1.5,
            pointRadius: 0, 
            pointHoverRadius: 4
        }
    ];

    // Aplica persistência de visibilidade
    const hiddenLabels = configuracoesGraficos.evolucao?.hidden || [];
    datasets.forEach(ds => {
        if (hiddenLabels.includes(ds.label)) {
            ds.hidden = true;
        }
    });

    graficoCarteiraInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        boxWidth: 15
                    },
                    onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                            legendItem.hidden = true;
                        } else {
                            ci.show(index);
                            legendItem.hidden = false;
                        }
                        const label = legendItem.text;
                        const isHidden = legendItem.hidden;
                        
                        if (!configuracoesGraficos.evolucao) configuracoesGraficos.evolucao = { hidden: [] };
                        const hiddenSet = new Set(configuracoesGraficos.evolucao.hidden || []);

                        if (isHidden) hiddenSet.add(label);
                        else hiddenSet.delete(label);
                        
                        configuracoesGraficos.evolucao.hidden = Array.from(hiddenSet);
                        salvarConfiguracoesGraficos();
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const valor = context.parsed.y;
                            if (label.includes('BRL')) return `${label}: ${formatarMoeda(valor)}`;
                            if (label.includes('USD')) return `${label}: ${formatarMoedaEstrangeira(valor, 'USD')}`;
                            if (label.includes('EUR')) return `${label}: ${formatarMoedaEstrangeira(valor, 'EUR')}`;
                            if (label.includes('GBP')) return `${label}: ${formatarMoedaEstrangeira(valor, 'GBP')}`;
                            return `${label}: ${valor}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                        }
                    }
                }
            }
        }
    });
}
/**
 * Função auxiliar para obter cores distintas para o gráfico de desempenho.
 * @param {number} index - O índice do ativo/índice na lista.
 * @returns {string} Uma cor em formato hexadecimal.
 */
function obterCor(index) {
    const cores = [
        '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', 
        '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', 
        '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', 
        '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'
    ];
    return cores[index % cores.length];
}

/**
 * Gera os dados normalizados para o gráfico de comparação de desempenho (Total Return).
 * AGORA FOCADO APENAS EM RENDA VARIÁVEL (Carteira RV Consolidada).
 */
function gerarDadosGraficoDesempenho(dataInicio) {
    if (!dataInicio) return null;

    // 1. Filtra e ordena o histórico pela data
    const historicoFiltrado = historicoCarteira
        .filter(s => s.data >= dataInicio)
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    if (historicoFiltrado.length < 2) return null;

    // 2. Identifica TODOS os ativos presentes no período
    const ativosNoPeriodo = new Set();
    historicoFiltrado.forEach(snap => {
        if (snap.detalhesCarteira && snap.detalhesCarteira.ativos) {
            Object.keys(snap.detalhesCarteira.ativos).forEach(ticker => {
                const dados = snap.detalhesCarteira.ativos[ticker];
                if (dados.quantidade > 0.0001 || dados.valorDeMercado > 1) {
                    ativosNoPeriodo.add(ticker);
                }
            });
        }
    });

    // 3. Inicializa as Séries
    // Substituída 'Renda Fixa' por 'Carteira RV'
    const series = {
        'IBOV': { tipo: 'indice', dados: [], acumulado: 1, iniciado: false, base: 0, ultimoValorValido: 0 },
        'IFIX': { tipo: 'indice', dados: [], acumulado: 1, iniciado: false, base: 0, ultimoValorValido: 0 },
        'Carteira RV': { tipo: 'categoria', dados: [], acumulado: 1, iniciado: false, ultimoValorValido: 0 },
        'Ações': { tipo: 'categoria', dados: [], acumulado: 1, iniciado: false, ultimoValorValido: 0 },
        'FIIs': { tipo: 'categoria', dados: [], acumulado: 1, iniciado: false, ultimoValorValido: 0 }
    };

    // Adiciona uma série para cada ativo encontrado
    ativosNoPeriodo.forEach(ticker => {
        series[ticker] = { tipo: 'ativo', dados: [], acumulado: 1, iniciado: false, ultimoValorValido: 0 };
    });

    const memoriaAtivos = {}; 
    // memoriaRF foi removida pois não é mais usada neste gráfico

    // 4. Loop Principal: Processa dia a dia
    for (let i = 0; i < historicoFiltrado.length; i++) {
        const snapAtual = historicoFiltrado[i];
        const snapAnterior = i > 0 ? historicoFiltrado[i - 1] : null;

        // --- A. RECONSTRUÇÃO DOS VALORES DO DIA ---
        
        // 1. Índices
        let valIBOV = snapAtual.ibov || 0;
        if (valIBOV <= 0 && series['IBOV'].ultimoValorValido > 0) valIBOV = series['IBOV'].ultimoValorValido;
        if (valIBOV > 0) series['IBOV'].ultimoValorValido = valIBOV;

        let valIFIX = snapAtual.ifix || 0;
        if (valIFIX <= 0 && series['IFIX'].ultimoValorValido > 0) valIFIX = series['IFIX'].ultimoValorValido;
        if (valIFIX > 0) series['IFIX'].ultimoValorValido = valIFIX;

        // 2. Ativos e Categorias
        const valoresCorrigidosHoje = {};
        // Inicializa os totais de categorias, incluindo a nova Carteira RV
        const totaisCategoriaHoje = { 'Ações': 0, 'FIIs': 0, 'Carteira RV': 0 };

        // Renda Variável (Ativo por Ativo)
        const ativosNoSnap = snapAtual.detalhesCarteira?.ativos || {};
        const todosTickersLoop = new Set([...Object.keys(ativosNoSnap), ...Object.keys(memoriaAtivos)]);

        todosTickersLoop.forEach(ticker => {
            const dadosSnap = ativosNoSnap[ticker];
            let valAtivo = 0;
            let quantidade = 0;

            if (dadosSnap) {
                valAtivo = dadosSnap.valorDeMercado || (dadosSnap.quantidade * dadosSnap.precoAtual);
                quantidade = dadosSnap.quantidade;
            }

            const valMemoria = memoriaAtivos[ticker] || 0;

            // Proteção contra zeros
            if (valAtivo <= 1 && valMemoria > 10) {
                if (!dadosSnap && snapAnterior) {
                    const houveVendaOuSaida = 
                        todasAsNotas.some(n => n.data > snapAnterior.data && n.data <= snapAtual.data && n.operacoes.some(op => op.ativo === ticker && op.tipo === 'venda')) ||
                        posicaoInicial.some(p => p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.ticker === ticker && p.transacao.toLowerCase() === 'venda' && p.data > snapAnterior.data && p.data <= snapAtual.data) ||
                        todosOsAjustes.some(a => a.tipoAjuste === 'evento_ativo' && a.tipoEvento === 'saida' && a.ticker === ticker && a.data > snapAnterior.data && a.data <= snapAtual.data);

                    if (!houveVendaOuSaida) {
                        valAtivo = valMemoria;
                    } else {
                        delete memoriaAtivos[ticker];
                    }
                } else if (quantidade > 0) {
                    valAtivo = valMemoria;
                }
            }

            if (valAtivo > 0) {
                memoriaAtivos[ticker] = valAtivo;
                valoresCorrigidosHoje[ticker] = valAtivo;

                // Soma na categoria específica e na Carteira RV Consolidada
                const cadastro = todosOsAtivos.find(a => a.ticker === ticker);
                if (cadastro) {
                    // Adiciona ao total consolidado
                    totaisCategoriaHoje['Carteira RV'] += valAtivo;

                    // Adiciona à categoria específica (se aplicável)
                    const cat = cadastro.tipo === 'Ação' ? 'Ações' : (cadastro.tipo === 'FII' ? 'FIIs' : null);
                    if (cat && totaisCategoriaHoje[cat] !== undefined) {
                        totaisCategoriaHoje[cat] += valAtivo;
                    }
                }
            } else {
                if ((dadosSnap && dadosSnap.quantidade === 0) || (!dadosSnap && !memoriaAtivos[ticker])) {
                     delete memoriaAtivos[ticker];
                }
            }
        });

        // --- B. CÁLCULO DA RENTABILIDADE (Séries) ---
        
        Object.keys(series).forEach(nomeSerie => {
            const serie = series[nomeSerie];
            let valorAtual = 0;

            if (serie.tipo === 'indice') {
                valorAtual = nomeSerie === 'IBOV' ? valIBOV : valIFIX;
            } else if (serie.tipo === 'categoria') {
                valorAtual = totaisCategoriaHoje[nomeSerie];
            } else {
                valorAtual = valoresCorrigidosHoje[nomeSerie] || 0;
            }

            // Lógica de Início da Série
            if (!serie.iniciado) {
                if (valorAtual > 0) {
                    serie.iniciado = true;
                    serie.base = valorAtual;
                    serie.dados.push(0);
                    serie.ultimoValorValido = valorAtual;
                } else {
                    serie.dados.push(null);
                }
                return;
            }

            const valorAnterior = serie.ultimoValorValido;

            if (valorAtual <= 0.01) {
                serie.dados.push(null);
                serie.ultimoValorValido = 0; 
                return;
            }

            if (serie.tipo === 'indice') {
                const rentabilidadeTotal = (valorAtual / serie.base) - 1;
                serie.dados.push(rentabilidadeTotal);
                serie.ultimoValorValido = valorAtual;
                return;
            }

            const fluxoLiquido = calcularFluxoLiquidoPeriodo(nomeSerie, serie.tipo, snapAnterior.data, snapAtual.data);
            const proventosRecebidos = calcularProventosRecebidosPeriodo(nomeSerie, serie.tipo, snapAnterior.data, snapAtual.data);

            const lucroPeriodo = valorAtual - valorAnterior - fluxoLiquido + proventosRecebidos;
            const denominador = valorAnterior > 1 ? valorAnterior : (fluxoLiquido > 0 ? fluxoLiquido : 1);
            const rentabilidadeDia = lucroPeriodo / denominador;

            serie.acumulado = serie.acumulado * (1 + rentabilidadeDia);
            serie.dados.push(serie.acumulado - 1);
            
            serie.ultimoValorValido = valorAtual;
        });
    }

    // 5. Prepara dados para o Chart.js
    const labels = historicoFiltrado.map(s => new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR'));
    const datasets = [];
    let colorIndex = 0;
    // Atualizada a lista de prioridade para o novo padrão
    const prioridade = ['Carteira RV', 'IBOV', 'IFIX', 'Ações', 'FIIs'];

    const chavesOrdenadas = Object.keys(series).sort((a, b) => {
        const idxA = prioridade.indexOf(a); const idxB = prioridade.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1; if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    chavesOrdenadas.forEach(nome => {
        const serie = series[nome];
        if (serie.dados.some(v => v !== null)) {
            const cor = obterCor(colorIndex++);
            datasets.push({
                label: nome,
                data: serie.dados,
                borderColor: cor,
                backgroundColor: cor,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: prioridade.includes(nome) ? 3 : 1.5
            });
        }
    });

    return { labels, datasets };
}
// --- FUNÇÕES AUXILIARES DO MOTOR DE CÁLCULO ---

/**
 * Calcula o Valor de Mercado de um alvo (Categoria ou Ativo) dentro de um Snapshot.
 */
function calcularValorMercadoSnapshot(snapshot, alvo, tipo) {
    let total = 0;

    if (tipo === 'categoria') {
        if (alvo === 'Renda Fixa') {
            if (snapshot.detalhesCarteira && snapshot.detalhesCarteira.rendaFixa) {
                snapshot.detalhesCarteira.rendaFixa.forEach(rf => total += (rf.saldoLiquido || 0));
            } else {
                // Compatibilidade com snapshots antigos
                total = snapshot.detalhesCarteira?.valorPorClasse?.['Renda Fixa'] || 0;
            }
        } else {
            // Categorias de RV
            if (snapshot.detalhesCarteira && snapshot.detalhesCarteira.ativos) {
                for (const ticker in snapshot.detalhesCarteira.ativos) {
                    const ativoSnap = snapshot.detalhesCarteira.ativos[ticker];
                    const ativoCadastro = todosOsAtivos.find(a => a.ticker === ticker);
                    const tipoMapeado = ativoCadastro ? (ativoCadastro.tipo === 'Ação' ? 'Ações' : ativoCadastro.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;

                    if (tipoMapeado === alvo) {
                        total += (ativoSnap.valorDeMercado || (ativoSnap.quantidade * ativoSnap.precoAtual));
                    }
                }
            }
        }
    } else if (tipo === 'ativo') {
        // Ativo Individual
        if (snapshot.detalhesCarteira && snapshot.detalhesCarteira.ativos && snapshot.detalhesCarteira.ativos[alvo]) {
            const ativoSnap = snapshot.detalhesCarteira.ativos[alvo];
            total = (ativoSnap.valorDeMercado || (ativoSnap.quantidade * ativoSnap.precoAtual));
        }
    }
    return total;
}

/**
 * Calcula o fluxo líquido de dinheiro (Aportes - Retiradas) para um alvo entre duas datas.
 */
function calcularFluxoLiquidoPeriodo(alvo, tipo, dataInicio, dataFim) {
    let fluxoLiquido = 0;

    // Se fosse Renda Fixa, retornaria aqui. Como foi removida do gráfico, mantemos a lógica 
    // apenas para compatibilidade se chamada de outros lugares, ou removemos se for exclusivo do gráfico.
    // Vou manter a lógica de RF caso seja usada em outro contexto, mas o foco é RV.
    if (alvo === 'Renda Fixa') {
        todasAsMovimentacoes.forEach(mov => {
            if (mov.data > dataInicio && mov.data <= dataFim) {
                if (mov.source === 'aporte_rf') fluxoLiquido += Math.abs(mov.valor);
                else if (mov.source === 'resgate_rf') fluxoLiquido -= Math.abs(mov.valor);
            }
        });
        return fluxoLiquido;
    }

    // Para RV (Varre Notas, Histórico e Eventos)
    const processarTransacao = (ticker, valorTransacao, tipoOp, custosOp) => {
        let pertence = false;
        const ativoCadastro = todosOsAtivos.find(a => a.ticker === ticker);
        
        if (alvo === 'Carteira RV') {
            // Se o alvo é a carteira consolidada, aceita qualquer ativo de RV
            pertence = ativoCadastro && ['Ação', 'FII', 'ETF'].includes(ativoCadastro.tipo);
        } else if (tipo === 'ativo') {
            pertence = (ticker === alvo);
        } else {
            // Se é categoria específica (Ações, FIIs)
            const tipoMapeado = ativoCadastro ? (ativoCadastro.tipo === 'Ação' ? 'Ações' : ativoCadastro.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
            pertence = (tipoMapeado === alvo);
        }

        if (pertence) {
            if (tipoOp === 'compra') {
                // Compra = Aporte = Fluxo Positivo
                fluxoLiquido += (valorTransacao + custosOp);
            } else if (tipoOp === 'venda') {
                // Venda = Retirada = Fluxo Negativo
                fluxoLiquido -= (valorTransacao - custosOp);
            }
        }
    };

    // 1. Notas de Negociação
    todasAsNotas.forEach(nota => {
        if (nota.data > dataInicio && nota.data <= dataFim) {
            const totalNota = nota.operacoes.reduce((sum, o) => sum + o.valor, 0);
            nota.operacoes.forEach(op => {
                const custosOp = totalNota > 0 ? (op.valor / totalNota) * (nota.custos + nota.irrf) : 0;
                processarTransacao(op.ativo, op.valor, op.tipo, custosOp);
            });
        }
    });

    // 2. Posição Inicial (apenas se data cair no intervalo)
    posicaoInicial.forEach(p => {
        if (p.tipoRegistro === 'TRANSACAO_HISTORICA' && p.data > dataInicio && p.data <= dataFim) {
            const val = p.transacao.toLowerCase() === 'compra' ? (p.quantidade * p.precoMedio) : (p.valorVenda || (p.quantidade * p.precoMedio));
            processarTransacao(p.ticker, val, p.transacao.toLowerCase(), 0);
        }
    });

    // 3. Eventos de Ativo (Entrada/Saída não financeira com custo)
    todosOsAjustes.forEach(a => {
        if (a.tipoAjuste === 'evento_ativo' && a.data > dataInicio && a.data <= dataFim) {
            const qtd = a.detalhes.reduce((sum, d) => sum + d.quantidade, 0);
            const valorEstimado = qtd * (a.precoMedio || 0); 
            
            if (a.tipoEvento === 'entrada') {
                processarTransacao(a.ticker, valorEstimado, 'compra', 0);
            } else {
                processarTransacao(a.ticker, valorEstimado, 'venda', 0);
            }
        }
    });

    return fluxoLiquido;
}

/**
 * Calcula o total de proventos considerados no desempenho entre duas datas.
 * ATUALIZAÇÃO: Utiliza a Data-Ex (dia útil após Data-Com) para alinhar com o ajuste de preço do ativo (Total Return).
 */
function calcularProventosRecebidosPeriodo(alvo, tipo, dataInicio, dataFim) {
    let totalProventos = 0;

    if (alvo === 'Renda Fixa') return 0; 

    todosOsProventos.forEach(p => {
        // Define qual data usar para o cálculo de performance:
        // Prioridade: Data-Ex (Dia útil após Data-Com) para casar com o ajuste de preço.
        // Fallback: Data de Pagamento (se não houver Data-Com).
        let dataConsiderada = null;
        
        if (p.dataCom) {
            dataConsiderada = getProximaDataUtil(p.dataCom);
        } else {
            dataConsiderada = p.dataPagamento;
        }

        if (dataConsiderada && dataConsiderada > dataInicio && dataConsiderada <= dataFim) {
            let pertence = false;
            const ativoCadastro = todosOsAtivos.find(a => a.ticker === p.ticker);

            if (alvo === 'Carteira RV') {
                // Soma proventos de qualquer ativo de RV
                pertence = ativoCadastro && ['Ação', 'FII', 'ETF'].includes(ativoCadastro.tipo);
            } else if (tipo === 'ativo') {
                pertence = (p.ticker === alvo);
            } else {
                const tipoMapeado = ativoCadastro ? (ativoCadastro.tipo === 'Ação' ? 'Ações' : ativoCadastro.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
                pertence = (tipoMapeado === alvo);
            }

            if (pertence) {
                totalProventos += p.valorTotalRecebido;
            }
        }
    });

    return totalProventos;
}

function renderizarGraficoDesempenho() {
    const canvasElement = document.getElementById('grafico-desempenho-canvas');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    
    // 1. Recupera ou define o período padrão (Persistência)
    if (!configuracoesGraficos.desempenho) configuracoesGraficos.desempenho = {};
    
    // Se não houver período salvo, define padrão '1M'
    if (!configuracoesGraficos.desempenho.periodo) {
        configuracoesGraficos.desempenho.periodo = '1M';
    }
    const periodoSelecionado = configuracoesGraficos.desempenho.periodo;

    // 2. Atualiza a interface (marca o botão correto visualmente)
    const radioParaMarcar = document.querySelector(`input[name="periodo-desempenho-dash"][value="${periodoSelecionado}"]`);
    if (radioParaMarcar) {
        radioParaMarcar.checked = true;
    }

    // 3. Calcula a data de início com base no período
    const hoje = new Date();
    let dataInicioObj = new Date();
    
    switch (periodoSelecionado) {
        case '1M':
            dataInicioObj.setMonth(hoje.getMonth() - 1);
            break;
        case 'YTD':
            dataInicioObj = new Date(hoje.getFullYear(), 0, 1);
            break;
        case '1A':
            dataInicioObj.setFullYear(hoje.getFullYear() - 1);
            break;
        case '5A':
            dataInicioObj.setFullYear(hoje.getFullYear() - 5);
            break;
        default:
            dataInicioObj.setMonth(hoje.getMonth() - 1);
    }
    
    const dataInicioStr = dataInicioObj.toISOString().split('T')[0];

    if (graficoDesempenhoInstance) {
        graficoDesempenhoInstance.destroy();
    }

    // 4. Gera os dados usando a data calculada
    let dadosGrafico = gerarDadosGraficoDesempenho(dataInicioStr);

    if (!dadosGrafico) {
        ctx.font = "16px 'Segoe UI'";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("Não há dados suficientes para a comparação no período selecionado.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // --- PERSISTÊNCIA DA VISIBILIDADE (Mantida) ---
    const prioridade = ['Carteira RV', 'IBOV', 'IFIX', 'Ações', 'FIIs'];
    const hiddenLabelsSaved = configuracoesGraficos.desempenho?.hidden || [];
    const hiddenSet = new Set(hiddenLabelsSaved);

    const userHasInteracted = configuracoesGraficos.desempenho && 'hidden' in configuracoesGraficos.desempenho;

    dadosGrafico.datasets.forEach(ds => {
        if (userHasInteracted) {
            ds.hidden = hiddenSet.has(ds.label);
        } else {
            ds.hidden = !prioridade.includes(ds.label);
        }
    });
    
    graficoDesempenhoInstance = new Chart(ctx, {
        type: 'line',
        data: dadosGrafico,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false,
                axis: 'x'
            },
            plugins: {
                legend: { 
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        boxWidth: 15,
                        padding: 15
                    },
                    onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                            legendItem.hidden = true;
                        } else {
                            ci.show(index);
                            legendItem.hidden = false;
                        }

                        const label = legendItem.text;
                        if (!configuracoesGraficos.desempenho) configuracoesGraficos.desempenho = { hidden: [] };
                        
                        const currentHiddenSet = new Set(configuracoesGraficos.desempenho.hidden || []);

                        if (legendItem.hidden) {
                            currentHiddenSet.add(label);
                        } else {
                            currentHiddenSet.delete(label);
                        }
                        
                        configuracoesGraficos.desempenho.hidden = Array.from(currentHiddenSet);
                        salvarConfiguracoesGraficos();
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const valor = context.parsed.y;
                            if (valor === null) return null;
                            return `${label}: ${formatarPercentual(valor)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return (value * 100).toFixed(0) + '%';
                        }
                    },
                    grid: {
                        color: (context) => context.tick.value === 0 ? '#666' : '#e5e5e5',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    }
                }
            }
        }
    });
}

/**
 * Prepara os dados para o calendário de recorrências, agrupando por conta/ativo.
 * @param {'conta'|'moeda'} tipo - O tipo de recorrência a ser processado.
 * @returns {Map<string, object>} - Um Map onde a chave é o ID da conta/ativo e o valor contém as informações e os lançamentos.
 */
function gerarDadosCalendarioRecorrentes(tipo) {
    const dadosAgrupados = new Map();
    const filhos = gerarTransacoesFilhas().filter(f => f.targetType === tipo);
    const items = (tipo === 'conta') ? todasAsContas : todosOsAtivosMoedas;

    filhos.forEach(filho => {
        const itemId = String(filho.targetId);
        const itemInfo = items.find(i => String(i.id) === itemId);
        if (!itemInfo) return; 

        if (!dadosAgrupados.has(itemId)) {
            dadosAgrupados.set(itemId, {
                itemInfo: {
                    nome: tipo === 'conta' ? `${itemInfo.banco} - ${itemInfo.tipo}` : itemInfo.nomeAtivo,
                    moeda: tipo === 'conta' ? 'BRL' : itemInfo.moeda
                },
                regras: new Map() 
            });
        }
        
        const grupoItem = dadosAgrupados.get(itemId);
        const mae = todasAsTransacoesRecorrentes.find(m => String(m.id) === String(filho.sourceId));
        if (!mae) return;

        if (!grupoItem.regras.has(mae.id)) {
            grupoItem.regras.set(mae.id, {
                descricao: mae.descricao,
                datas: new Map()
            });
        }
        
        const grupoRegra = grupoItem.regras.get(mae.id);
        grupoRegra.datas.set(filho.data, filho.valor);
    });

    return dadosAgrupados;
}

/**
 * Abre o modal com os detalhes dos rendimentos de um mês/tipo específico.
 * @param {string} ano - O ano selecionado.
 * @param {string} mes - O mês selecionado (0-11).
 * @param {string} tipo - A classe de ativo (ex: 'FIIs').
 * @param {object} dadosCalendario - O objeto de dados completo usado para renderizar o calendário.
 */
function abrirModalDetalhesRendimentoMensal(ano, mes, tipo, dadosCalendario) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const titulo = `Detalhes de ${tipo} - ${meses[mes]} de ${ano}`;
    document.getElementById('modal-detalhes-rendimento-titulo').textContent = titulo;

    const container = document.getElementById('container-detalhes-rendimento');
    const dadosDetalhados = dadosCalendario[ano]?.[mes]?.[tipo] || [];

    if (dadosDetalhados.length === 0) {
        container.innerHTML = '<p>Nenhum detalhe encontrado.</p>';
        abrirModal('modal-detalhes-rendimento');
        return;
    }

    let tableHtml = '';
    // Caso especial para Renda Fixa, que tem uma estrutura de dados diferente
    if (tipo === 'Renda Fixa') {
        tableHtml = `<table class="dashboard-table">
            <thead><tr>
                <th>Descrição do Ativo</th>
                <th class="numero">Rendimento no Mês</th>
            </tr></thead><tbody>`;
        dadosDetalhados.forEach(item => {
            tableHtml += `<tr>
                <td>${item.descricao}</td>
                <td class="numero">${formatarMoeda(item.valor)}</td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
    } else { // Caso para Ações, FIIs, ETFs
        tableHtml = `<table class="dashboard-table">
            <thead><tr>
                <th>Ativo</th>
                <th>Data Com</th>
                <th>Data Pag.</th>
                <th class="numero">Valor Unitário</th>
                <th class="numero">Valor Total</th>
            </tr></thead><tbody>`;
        // Ordena para mostrar os maiores valores primeiro
        dadosDetalhados.sort((a, b) => b.valor - a.valor).forEach(item => {
            tableHtml += `<tr>
                <td>${item.ticker}</td>
                <td>${new Date(item.dataCom + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${new Date(item.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="numero">${formatarPrecoMedio(item.valorIndividual)}</td>
                <td class="numero"><strong>${formatarMoeda(item.valor)}</strong></td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
    }

    container.innerHTML = tableHtml;
    abrirModal('modal-detalhes-rendimento');
}

function renderizarModalCalendarioRecorrentes() {
    const dadosContas = gerarDadosCalendarioRecorrentes('conta');
    const dadosMoedas = gerarDadosCalendarioRecorrentes('moeda');
    const container = document.getElementById('calendario-recorrentes-container');
    const tituloModal = document.getElementById('modal-calendario-recorrentes-titulo');

    tituloModal.textContent = 'Calendário de Lançamentos Recorrentes';

    if (dadosContas.size === 0 && dadosMoedas.size === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum lançamento recorrente futuro encontrado.</p>';
        abrirModal('modal-calendario-recorrentes');
        return;
    }

    let htmlFinal = '';
    const formatarValor = (valor, moeda) => moeda === 'BRL' ? formatarMoeda(valor) : formatarMoedaEstrangeira(valor, moeda);

    // Função auxiliar para renderizar um grupo de dados (seja de contas ou moedas)
    const renderizarGrupo = (dadosAgrupados) => {
        let htmlGrupo = '';
        dadosAgrupados.forEach((dadosItem) => {
            const { itemInfo, regras } = dadosItem;
            let todasAsDatas = new Set();
            regras.forEach(regra => {
                regra.datas.forEach((_, data) => todasAsDatas.add(data));
            });

            if (todasAsDatas.size === 0) return;

            const datasOrdenadas = Array.from(todasAsDatas).sort();
            
            const meses = new Map();
            datasOrdenadas.forEach(data => {
                const mesChave = data.substring(0, 7);
                if (!meses.has(mesChave)) meses.set(mesChave, []);
                meses.get(mesChave).push(data);
            });

            htmlGrupo += `
                <div class="bloco-corretora">
                    <div class="bloco-corretora-header">
                        <h3>${itemInfo.nome} (${itemInfo.moeda})</h3>
                    </div>
                    <div class="tabela-projecao-wrapper">
                        <table class="calendario-recorrentes-table">
                            <thead>
                                <tr><th rowspan="2" class="regra-header">Lançamento Recorrente</th>`;

            let mesIndex = 0;
            meses.forEach((diasDoMes, mesChave) => {
                const dataMes = new Date(mesChave + '-02T12:00:00');
                const nomeMes = dataMes.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                const classeMes = (mesIndex % 2 === 0) ? 'mes-par' : 'mes-impar';
                htmlGrupo += `<th colspan="${diasDoMes.length}" class="mes-header ${classeMes}">${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</th>`;
                mesIndex++;
            });
            htmlGrupo += `</tr><tr>`;

            mesIndex = 0;
            meses.forEach((diasDoMes) => {
                const classeMes = (mesIndex % 2 === 0) ? 'mes-par' : 'mes-impar';
                diasDoMes.forEach(data => {
                    htmlGrupo += `<th class="dia-header ${classeMes}">${new Date(data + 'T12:00:00').getDate()}</th>`;
                });
                mesIndex++;
            });
            htmlGrupo += `</tr></thead><tbody>`;

            regras.forEach(regra => {
                htmlGrupo += `<tr><td>${regra.descricao}</td>`;
                mesIndex = 0;
                meses.forEach((diasDoMes) => {
                    const classeMes = (mesIndex % 2 === 0) ? 'mes-par' : 'mes-impar';
                    diasDoMes.forEach(data => {
                        const valor = regra.datas.get(data) || 0;
                        const classeValor = valor < 0 ? 'valor-negativo' : 'valor-positivo';
                        htmlGrupo += `<td class="numero ${classeMes} ${valor !== 0 ? classeValor : ''}">${valor !== 0 ? formatarValor(valor, itemInfo.moeda) : '-'}</td>`;
                    });
                    mesIndex++;
                });
                htmlGrupo += `</tr>`;
            });

            htmlGrupo += `</tbody><tfoot><tr class="total-row"><td><strong>Total do Mês</strong></td>`;
            mesIndex = 0;
            meses.forEach((diasDoMes) => {
                let totalMes = 0;
                regras.forEach(regra => {
                    diasDoMes.forEach(data => {
                        totalMes += regra.datas.get(data) || 0;
                    });
                });
                const classeMes = (mesIndex % 2 === 0) ? 'mes-par' : 'mes-impar';
                const classeTotal = totalMes < 0 ? 'valor-negativo' : 'valor-positivo';
                htmlGrupo += `<td colspan="${diasDoMes.length}" class="numero total-mes ${classeMes} ${classeTotal}"><strong>${formatarValor(totalMes, itemInfo.moeda)}</strong></td>`;
                mesIndex++;
            });
            htmlGrupo += `</tr></tfoot></table></div></div>`;
        });
        return htmlGrupo;
    };

    // Renderiza primeiro as contas BRL, depois as outras moedas
    htmlFinal += renderizarGrupo(dadosContas);
    htmlFinal += renderizarGrupo(dadosMoedas);

    container.innerHTML = htmlFinal;
    abrirModal('modal-calendario-recorrentes');
}
function gerarDadosProjecaoFutura() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split('T')[0];
    const hojeMeiaNoite = new Date(hojeStr + 'T00:00:00');

    const todosOsEventos = obterTodosOsEventosDeCaixa();
    const items = [...getTodasContasAtivas(), ...todosOsAtivosMoedas]; // Combina todas as contas e ativos

    // 1. Coleta corretamente as transações a partir de hoje (inclusive) para a projeção
    const transacoesFuturas = todosOsEventos.filter(e => 
        new Date(e.data + 'T12:00:00') >= hojeMeiaNoite
    );
    
    if (transacoesFuturas.length === 0) {
        return null;
    }

    const dataInicioProjecao = hoje;
    const dataFinalProjecao = new Date(Math.max(...transacoesFuturas.map(t => new Date(t.data + 'T12:00:00'))));
    
    const datas = [];
    for (let d = new Date(dataInicioProjecao); d <= dataFinalProjecao; d.setDate(d.getDate() + 1)) {
        datas.push(new Date(d));
    }
    
    if (datas.length === 0 && transacoesFuturas.length > 0) {
        datas.push(hoje);
    }

    const dataMatrix = new Map();
    
    datas.forEach(data => {
        const dataStr = data.toISOString().split('T')[0];
        const transacoesDoDia = transacoesFuturas.filter(t => t.data === dataStr);
        
        transacoesDoDia.forEach(t => {
            const itemIdStr = String(t.idAlvo);
            if (!dataMatrix.has(itemIdStr)) {
                dataMatrix.set(itemIdStr, new Map());
            }
            const eventosAtuais = dataMatrix.get(itemIdStr).get(dataStr) || [];
            eventosAtuais.push(t);
            dataMatrix.get(itemIdStr).set(dataStr, eventosAtuais);
        });
    });

    const saldosIniciais = new Map();

    items.forEach(item => {
        const itemIdStr = String(item.id);
        const tipoAlvo = (!item.moeda || item.moeda === 'BRL') ? 'conta' : 'moeda';
        
        const eventosPassados = todosOsEventos.filter(e =>
            String(e.idAlvo) === itemIdStr &&
            e.tipo === tipoAlvo &&
            e.source !== 'recorrente_futura' &&
            new Date(e.data + 'T12:00:00') < hojeMeiaNoite &&
            new Date(e.data + 'T12:00:00') >= new Date(item.dataSaldoInicial + 'T12:00:00')
        );
        
        const saldoInicialProjecao = eventosPassados.reduce((soma, e) => soma + e.valor, item.saldoInicial);
        saldosIniciais.set(itemIdStr, saldoInicialProjecao);
    });

    return {
        datas: datas.map(d => d.toISOString().split('T')[0]),
        items,
        saldosIniciais,
        dataMatrix
    };
}

function renderizarModalProjecaoFutura() {
    const dados = gerarDadosProjecaoFutura();
    const container = document.getElementById('container-projecao-futura');
    const tituloModal = document.getElementById('modal-projecao-titulo');

    tituloModal.textContent = 'Projeção de Saldos Futuros';

    if (!dados) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum lançamento futuro encontrado para gerar a projeção.</p>';
        abrirModal('modal-projecao-futura');
        return;
    }

    const formatarValor = (valor, moeda = 'BRL') => {
        if (valor === 0) return '-';
        return (moeda === 'BRL') ? formatarMoeda(valor) : formatarMoedaEstrangeira(valor, moeda);
    };

    const construirTabela = (titulo, items, moeda = 'BRL') => {
        let tabelaHtml = `<h2>${titulo}</h2><div class="tabela-projecao-wrapper"><table><thead><tr><th>${!moeda || moeda === 'BRL' ? 'Conta' : 'Ativo'}</th>`;
        dados.datas.forEach(data => {
            const d = new Date(data + 'T12:00:00');
            tabelaHtml += `<th class="numero">${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</th>`;
        });
        tabelaHtml += `</tr></thead><tbody>`;

        items.forEach(item => {
            const itemIdStr = String(item.id);
            const nomeItem = !item.moeda || item.moeda === 'BRL' ? `${item.banco} - ${item.tipo}` : item.nomeAtivo;
            tabelaHtml += `<tr><td>${nomeItem}</td>`;
            
            let saldoCorrenteItem = dados.saldosIniciais.get(itemIdStr) || 0;

            dados.datas.forEach(dataStr => {
                const eventosDoDia = dados.dataMatrix.get(itemIdStr)?.get(dataStr) || [];
                let valorTotalDia = 0;
                let dataAttributes = '';

                if (eventosDoDia.length > 0) {
                    valorTotalDia = eventosDoDia.reduce((soma, ev) => soma + ev.valor, 0);
                    if (eventosDoDia.length === 1) {
                        const evento = eventosDoDia[0];
                        dataAttributes = `
                            data-lancamento-id="${evento.id}"
                            data-lancamento-source="${evento.source}"
                            data-lancamento-mae-id="${evento.maeId || ''}"
                            data-lancamento-data="${evento.data}"
                            data-lancamento-tipo="${evento.tipo}"
                            class="lancamento-projetado-clicavel"
                            title="Clique para editar este lançamento."
                        `;
                    } else if (eventosDoDia.length > 1) {
                        const tooltipText = `Este valor é a soma de ${eventosDoDia.length} transações. Não é possível editar por aqui.`;
                        dataAttributes = `
                            class="lancamento-projetado-multiplo"
                            title="${tooltipText}"
                        `;
                    }
                }
                
                saldoCorrenteItem += valorTotalDia;
                const classe = valorTotalDia < 0 ? 'valor-negativo' : valorTotalDia > 0 ? 'valor-positivo' : '';
                
                const valorLancamentoHtml = `<div ${dataAttributes}>${formatarValor(valorTotalDia, moeda)}</div>`;
                const saldoCelulaHtml = `<div class="saldo-diario-celula">${formatarValor(saldoCorrenteItem, moeda)}</div>`;
                
                tabelaHtml += `<td class="numero ${classe}">${valorLancamentoHtml}${saldoCelulaHtml}</td>`;
            });
            tabelaHtml += `</tr>`;
        });

        tabelaHtml += `</tbody><tfoot><tr class="total-row"><td><strong>Saldo Projetado</strong></td>`;
        let saldoAcumulado = items.reduce((soma, item) => soma + (dados.saldosIniciais.get(String(item.id)) || 0), 0);
        
        dados.datas.forEach(dataStr => {
            const movimentacaoDia = items.reduce((soma, item) => {
                const eventosDoDia = dados.dataMatrix.get(String(item.id))?.get(dataStr) || [];
                return soma + eventosDoDia.reduce((s, ev) => s + ev.valor, 0);
            }, 0);
            saldoAcumulado += movimentacaoDia;
            const classeSaldo = saldoAcumulado < 0 ? 'valor-negativo' : '';
            tabelaHtml += `<td class="numero ${classeSaldo}"><strong>${formatarValor(saldoAcumulado, moeda)}</strong></td>`;
        });
        tabelaHtml += `</tr></tfoot></table></div>`;
        return tabelaHtml;
    };

    let htmlFinal = '';
    const contasBRL = dados.items.filter(item => !item.moeda || item.moeda === 'BRL');
    const itemsMoedasAgrupados = dados.items
        .filter(item => item.moeda && item.moeda !== 'BRL')
        .reduce((acc, item) => {
            if (!acc[item.moeda]) acc[item.moeda] = [];
            acc[item.moeda].push(item);
            return acc;
        }, {});

    if (contasBRL.length > 0) {
        htmlFinal += construirTabela('Projeção Consolidada (BRL)', contasBRL, 'BRL');
    }
    
    Object.keys(itemsMoedasAgrupados).sort().forEach(moeda => {
        htmlFinal += construirTabela(`Projeção para ${moeda}`, itemsMoedasAgrupados[moeda], moeda);
    });

    container.innerHTML = htmlFinal;
    abrirModal('modal-projecao-futura');
}
function renderizarTelaMetas() {
    const container = document.getElementById('container-metas');
    if (todasAsMetas.length === 0) {
        container.innerHTML = '<p class="info-vazio">Nenhuma meta cadastrada ainda. Clique em "Adicionar Nova Meta" para começar.</p>';
        return;
    }

    const metasPendentes = [];
    const metasAtingidas = [];
    const projecao = calcularProjecaoProventosNegociacao();
    const projecaoRF = gerarDadosGraficoAportesProventos()?.datasets[0]?.data.slice(-12).reduce((a, b) => a + b, 0) / 12 || 0;

    todasAsMetas.forEach(meta => {
        let valorAtual = 0;
        let progresso = 0;
        const tipoMeta = meta.tipo;

        // --- INÍCIO DA ALTERAÇÃO ---
        // Lógica de cálculo foi reorganizada para evitar que um cálculo sobrescreva o outro.
        if (tipoMeta.startsWith('patrimonio')) {
            const patrimonioBRL = calcularValorTotalInvestimentosAtual();
            const moeda = meta.moedaAlvo || 'BRL';
            valorAtual = moeda === 'BRL' ? patrimonioBRL : (dadosMoedas.cotacoes[moeda] > 0 ? patrimonioBRL / dadosMoedas.cotacoes[moeda] : 0);
            progresso = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) : 0;
        } else if (tipoMeta.startsWith('renda_passiva')) {
            let proventosBRL = 0;
            const fonte = meta.fonteProventos || 'total_rv';
            
            switch (fonte) {
                case 'total_rv': proventosBRL = projecao.acoes + projecao.fiis; break;
                case 'total_geral': proventosBRL = projecao.acoes + projecao.fiis + projecaoRF; break;
                case 'fiis': proventosBRL = projecao.fiis; break;
                case 'acoes': proventosBRL = projecao.acoes; break;
            }
            
            if (tipoMeta === 'renda_passiva_sm') {
                const valorAlvoMonetario = meta.valorAlvo * salarioMinimo;
                valorAtual = proventosBRL;
                progresso = valorAlvoMonetario > 0 ? (valorAtual / valorAlvoMonetario) : 0;
            } else { // renda_passiva_moeda
                const moeda = meta.moedaAlvo || 'BRL';
                valorAtual = moeda === 'BRL' ? proventosBRL : (dadosMoedas.cotacoes[moeda] > 0 ? proventosBRL / dadosMoedas.cotacoes[moeda] : 0);
                progresso = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) : 0;
            }
        } else if (tipoMeta === 'posicao_ativo') {
            const posicoes = gerarPosicaoDetalhada();
            valorAtual = posicoes[meta.ativoAlvo] ? posicoes[meta.ativoAlvo].quantidade : 0;
            progresso = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) : 0;
        }
        // --- FIM DA ALTERAÇÃO ---

        const metaComProgresso = { ...meta, valorAtual, progresso };

        if (progresso >= 1) {
            metasAtingidas.push(metaComProgresso);
        } else {
            metasPendentes.push(metaComProgresso);
        }
    });

    let htmlMetas = '';

    if (metasPendentes.length > 0) {
        htmlMetas += '<h2 class="metas-secao-titulo">Metas em Andamento</h2>';
        metasPendentes.sort((a, b) => b.progresso - a.progresso).forEach(meta => {
            htmlMetas += gerarHtmlMetaCard(meta);
        });
    }

    if (metasAtingidas.length > 0) {
        htmlMetas += '<h2 class="metas-secao-titulo">Metas Concluídas</h2>';
        metasAtingidas.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(meta => {
            htmlMetas += gerarHtmlMetaCard(meta, true);
        });
    }
    
    container.innerHTML = htmlMetas;

    function gerarHtmlMetaCard(meta, isAtingida = false) {
        let htmlValorAtual = '', htmlValorAlvo = '', htmlPrevisao = '', historico = [];
        const moeda = meta.moedaAlvo || 'BRL';
        
        // --- INÍCIO DA ALTERAÇÃO ---
        // Lógica de exibição e previsão também foi reorganizada e corrigida.
        if (meta.tipo.startsWith('renda_passiva')) {
            const fonte = meta.fonteProventos || 'total_rv';
            if (fonte === 'fiis') historico = historicoCarteira.map(s => ({ data: s.data, valor: s.detalhesCarteira && s.detalhesCarteira.ativos ? calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).fiis : 0 }));
            else if (fonte === 'acoes') historico = historicoCarteira.map(s => ({ data: s.data, valor: s.detalhesCarteira && s.detalhesCarteira.ativos ? calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).acoes : 0 }));
            else historico = historicoCarteira.map(s => ({ data: s.data, valor: s.detalhesCarteira && s.detalhesCarteira.ativos ? calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).fiis + calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).acoes : 0 }));

            if (meta.tipo === 'renda_passiva_sm') {
                const valorAlvoMonetario = meta.valorAlvo * salarioMinimo;
                const valorAtualEmSM = salarioMinimo > 0 ? meta.valorAtual / salarioMinimo : 0;
                htmlValorAlvo = `${meta.valorAlvo} SM (${formatarMoeda(valorAlvoMonetario)})`;
                htmlValorAtual = `${formatarDecimal(valorAtualEmSM, 2)} SM (${formatarMoeda(meta.valorAtual)})`;
                previsao = calcularPrevisaoMeta(historico, meta.valorAtual, valorAlvoMonetario);
            } else {
                htmlValorAlvo = formatarValor(meta.valorAlvo, moeda);
                htmlValorAtual = formatarValor(meta.valorAtual, moeda);
                previsao = calcularPrevisaoMeta(historico, meta.valorAtual, meta.valorAlvo);
            }
        } 
        else if (meta.tipo.startsWith('patrimonio')) {
            const historicoFormatado = historicoCarteira.map(s => ({ data: s.data, valor: s.valorTotalInvestimentos || s.valor }));
            previsao = calcularPrevisaoMeta(historicoFormatado, meta.valorAtual, meta.valorAlvo);
            htmlValorAlvo = formatarValor(meta.valorAlvo, moeda);
            htmlValorAtual = formatarValor(meta.valorAtual, moeda);
        } else if (meta.tipo === 'posicao_ativo') {
            htmlValorAlvo = `${meta.valorAlvo} cotas`;
            htmlValorAtual = `${Math.round(meta.valorAtual)} cotas`;
        }
        // --- FIM DA ALTERAÇÃO ---
        
        if (previsao && !isAtingida) {
            htmlPrevisao = `<div class="meta-previsao">Previsão de Conclusão: <strong>${previsao}</strong></div>`;
        }

        const classeAtingida = isAtingida ? 'meta-atingida' : '';
        const progressoPercentual = meta.progresso * 100;

        return `
            <div class="meta-card ${classeAtingida}">
                <div class="meta-card-header">
                    <h3>${meta.nome}</h3>
                    <div class="meta-card-controles">
                        <i class="fas fa-edit acao-btn edit" title="Editar Meta" data-meta-id="${meta.id}"></i>
                        <i class="fas fa-trash acao-btn delete" title="Excluir Meta" data-meta-id="${meta.id}"></i>
                    </div>
                </div>
                <div class="meta-card-body">
                    <div class="meta-progresso-info">
                        <span>Progresso: <strong>${progressoPercentual.toFixed(2)}%</strong></span>
                    </div>
                    <div class="meta-progresso-barra-container">
                        <div class="meta-progresso-barra" style="width: ${Math.min(progressoPercentual, 100)}%;"></div>
                    </div>
                    <div class="meta-valores">
                        <div class="meta-valor-item">
                            <label>Alcançado</label>
                            <span>${htmlValorAtual}</span>
                        </div>
                        <div class="meta-valor-item">
                            <label>Alvo</label>
                            <span>${htmlValorAlvo}</span>
                        </div>
                    </div>
                    ${htmlPrevisao}
                </div>
            </div>
        `;
    }
}
function abrirModalCadastroMeta(metaParaEditar = null) {
    const form = document.getElementById('form-cadastro-meta');
    form.reset();
    document.getElementById('meta-ativo-alvo-group').style.display = 'none';
    document.getElementById('meta-moeda-group').style.display = 'none';
    document.getElementById('meta-fonte-proventos-group').style.display = 'none';

    if (metaParaEditar) {
        document.getElementById('modal-meta-titulo').textContent = 'Editar Meta';
        document.getElementById('meta-id').value = metaParaEditar.id;
        document.getElementById('meta-nome').value = metaParaEditar.nome;
        document.getElementById('meta-valor-alvo').value = formatarDecimalParaInput(metaParaEditar.valorAlvo);
        
        const tipoAntigo = metaParaEditar.tipo;
        const tipoSelect = document.getElementById('meta-tipo');

        // Lógica de compatibilidade com o novo tipo de meta
        if (tipoAntigo === 'posicao_ativo') {
            tipoSelect.value = 'posicao_ativo';
            document.getElementById('meta-ativo-alvo').value = metaParaEditar.ativoAlvo;
        } else if (tipoAntigo.startsWith('patrimonio')) {
            tipoSelect.value = 'patrimonio_moeda';
            document.getElementById('meta-moeda-alvo').value = metaParaEditar.moedaAlvo || 'BRL';
        } else if (tipoAntigo === 'renda_passiva_sm') {
            tipoSelect.value = 'renda_passiva_sm';
            document.getElementById('meta-fonte-proventos').value = metaParaEditar.fonteProventos || 'total_rv';
        } else if (tipoAntigo.startsWith('renda_passiva')) {
            tipoSelect.value = 'renda_passiva_moeda';
            document.getElementById('meta-moeda-alvo').value = metaParaEditar.moedaAlvo || 'BRL';
            let fonte = metaParaEditar.fonteProventos;
            if (!fonte) {
                if (tipoAntigo === 'renda_passiva_fiis') fonte = 'fiis';
                else if (tipoAntigo === 'renda_passiva_acoes') fonte = 'acoes';
                else fonte = 'total_rv';
            }
            document.getElementById('meta-fonte-proventos').value = fonte;
        }

    } else {
        document.getElementById('modal-meta-titulo').textContent = 'Adicionar Nova Meta';
        document.getElementById('meta-id').value = '';
    }
    
    document.getElementById('meta-tipo').dispatchEvent(new Event('change'));
    abrirModal('modal-cadastro-meta');
    document.getElementById('meta-nome').focus();
}

function salvarMeta(event) {
    event.preventDefault();
    const id = document.getElementById('meta-id').value;
    const tipo = document.getElementById('meta-tipo').value;
    let valorAlvo = parseDecimal(document.getElementById('meta-valor-alvo').value);
    
    if (tipo === 'posicao_ativo' || tipo === 'renda_passiva_sm') {
        valorAlvo = parseInt(valorAlvo, 10);
    }

    const meta = {
        id: id ? parseFloat(id) : Date.now(),
        nome: document.getElementById('meta-nome').value,
        tipo: tipo,
        valorAlvo: valorAlvo,
        ativoAlvo: tipo === 'posicao_ativo' ? document.getElementById('meta-ativo-alvo').value.toUpperCase() : null,
        moedaAlvo: (tipo === 'patrimonio_moeda' || tipo === 'renda_passiva_moeda') ? document.getElementById('meta-moeda-alvo').value : null,
        fonteProventos: (tipo === 'renda_passiva_moeda' || tipo === 'renda_passiva_sm') ? document.getElementById('meta-fonte-proventos').value : null
    };

    const index = todasAsMetas.findIndex(m => m.id === meta.id);
    if (index > -1) {
        todasAsMetas[index] = meta;
    } else {
        todasAsMetas.push(meta);
    }
    
    salvarMetas();
    renderizarTelaMetas();
    if(telas.dashboard.style.display === 'block'){
        renderizarPainelResumoMetasDashboard();
    }
    fecharModal('modal-cadastro-meta');
}
function deletarMeta(metaId) {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
        todasAsMetas = todasAsMetas.filter(m => m.id !== metaId);
        salvarMetas();
        renderizarTelaMetas();
    }
}

/**
 * NOVA FUNÇÃO: Calcula a taxa de crescimento mensal composta a partir de um histórico de valores.
 * @param {Array<{data: string, valor: number}>} historico - Array de objetos com data e valor.
 * @returns {number|null} - A taxa de crescimento mensal (ex: 0.01 para 1%) ou null se o cálculo for impossível.
 */
function calcularCrescimentoCompostoMensal(historico) {
    if (!historico || historico.length < 2) return null;

    // Filtra o histórico para começar a partir do primeiro valor positivo.
    const primeiroIndiceValido = historico.findIndex(p => p.valor > 0);
    if (primeiroIndiceValido === -1) return null;
    const historicoValido = historico.slice(primeiroIndiceValido);
    if (historicoValido.length < 2) return null;

    const pontoInicial = historicoValido[0];
    const pontoFinal = historicoValido[historicoValido.length - 1];

    const valorInicial = pontoInicial.valor;
    const valorFinal = pontoFinal.valor;
    const dataInicial = new Date(pontoInicial.data);
    const dataFinal = new Date(pontoFinal.data);

    // Calcula o número de meses entre as datas.
    const diffAnos = dataFinal.getFullYear() - dataInicial.getFullYear();
    const nMeses = diffAnos * 12 + (dataFinal.getMonth() - dataInicial.getMonth());

    if (nMeses <= 0) return null; // Precisa de pelo menos um mês de intervalo.

    // Fórmula do CAGR, adaptada para meses: (VF/VI)^(1/n) - 1
    const taxaMensal = Math.pow(valorFinal / valorInicial, 1 / nMeses) - 1;

    // Retorna a taxa apenas se for um número válido e positivo.
    return (isNaN(taxaMensal) || !isFinite(taxaMensal) || taxaMensal <= 0) ? null : taxaMensal;
}

/**
 * VERSÃO REVISADA: Calcula a data prevista usando a taxa de crescimento mensal composta.
 * @param {Array<{data: string, valor: number}>} historico - Um array de objetos com data e valor.
 * @param {number} valorAtual - O valor atual da métrica.
 * @param {number} valorAlvo - O valor alvo da meta.
 * @returns {string|null} - A data formatada da previsão ou uma mensagem de status.
 */
function calcularPrevisaoMeta(historico, valorAtual, valorAlvo) {
    if (valorAtual >= valorAlvo) return "Meta Atingida!";
    
    const taxaMensal = calcularCrescimentoCompostoMensal(historico);

    if (taxaMensal === null) {
        // Se o histórico for curto, tenta uma média linear como fallback
        if (historico.length >= 2) {
             return "Crescimento negativo ou estagnado.";
        }
        return "Dados insuficientes para previsão.";
    }

    // Fórmula de juros compostos para encontrar o número de meses: n = log(VF / VP) / log(1 + i)
    const mesesParaAtingir = Math.log(valorAlvo / valorAtual) / Math.log(1 + taxaMensal);

    if (isNaN(mesesParaAtingir) || !isFinite(mesesParaAtingir)) {
        return "Não foi possível projetar a data.";
    }
    
    if (mesesParaAtingir > 1200) { // Limite de 100 anos
        return "Mais de 100 anos.";
    }

    const dataPrevista = new Date();
    dataPrevista.setMonth(dataPrevista.getMonth() + Math.ceil(mesesParaAtingir));

    return dataPrevista.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

async function carregarTodosOsDados() {
    console.log("Inicializando sistema...");

    // Função auxiliar para verificar se o localStorage está vazio (usuário novo/visitante)
    const isLocalStorageEmpty = () => {
        return !localStorage.getItem('carteira_ativos_offline');
    };

    // Função interna para carregar do Storage
    const carregarDoStorage = () => {
        console.log("Carregando dados do Armazenamento Local...");
        const carregarItem = (chave, valorPadrao = []) => {
            const dados = localStorage.getItem(`carteira_${chave}_offline`);
            try { return dados ? JSON.parse(dados) : valorPadrao; } 
            catch (e) { console.warn(`Erro ao ler ${chave}`, e); return valorPadrao; }
        };
        const carregarString = (chave, valorPadrao = '') => {
            const dados = localStorage.getItem(`carteira_${chave}_offline`);
            try { return JSON.parse(dados); } catch (e) { return dados || valorPadrao; }
        };

        // Carregamento das Variáveis Globais
        todosOsAtivos = carregarItem('ativos');
        todasAsContas = carregarItem('contas');
        todosOsFeriados = carregarItem('feriados');
        todosOsAjustes = carregarItem('ajustes');
        posicaoInicial = carregarItem('posicoes');
        todasAsNotas = carregarItem('notas');
        todosOsProventos = carregarItem('proventos');
        todasAsMovimentacoes = carregarItem('movimentacoes');
        todosOsAtivosRF = carregarItem('todos_os_ativos_r_f');
        todosOsRendimentosRealizadosRF = carregarItem('todos_os_rendimentos_realizados_r_f');
        todosOsRendimentosRFNaoRealizados = carregarItem('todos_os_rendimentos_r_f_nao_realizados');
        dadosMoedas = carregarItem('dados_moedas', { cotacoes: {} });
        todosOsAtivosMoedas = carregarItem('todos_os_ativos_moedas');
        todasAsTransacoesRecorrentes = carregarItem('todas_as_transacoes_recorrentes');
        todasAsMetas = carregarItem('metas');
        todosOsAjustesIR = carregarItem('ajustes_ir');
        dadosAlocacao = carregarItem('dados_alocacao', { categorias: {}, ativos: {} });
        historicoCarteira = carregarItem('historico_carteira');
        
        urlCotacoesCSV = carregarString('url_cotacoes_csv', '');
        configuracoesFiscais = carregarItem('configuracoes_fiscais', { 
            aliquotaAcoes: 0.15, aliquotaFiisDt: 0.20, limiteIsencaoAcoes: 20000, 
            tabelaRegressivaIR: { 180: 0.225, 360: 0.200, 720: 0.175, 9999: 0.150 } 
        });
        linksExternos = carregarItem('links_externos', { acoes: '', fiis: '', etfs: '' });
        dadosSimulacaoNegociar = carregarItem('dados_simulacao_negociar', { fiis: {}, acoes: {}, aporteTotal: '' });
        userName = localStorage.getItem('carteira_user_name_offline') || 'Visitante Demo';
        dadosComparacao = carregarItem('dados_comparacao', null);
        configuracoesGraficos = carregarItem('configuracoes_graficos', { evolucao: { hidden: [] }, desempenho: { hidden: [] } });
        salarioMinimo = parseFloat(localStorage.getItem('carteira_salario_minimo_offline')) || 1518.00;
        timestampUltimoBackup = localStorage.getItem('carteira_timestamp_ultimo_backup_offline') || null;
        
        // Normalização de Datas
        todasAsContas.forEach(r => r.dataSaldoInicial = normalizarDataParaInput(r.dataSaldoInicial));
        todosOsFeriados.forEach(r => r.data = normalizarDataParaInput(r.data));
        todosOsAjustes.forEach(r => r.data = normalizarDataParaInput(r.data));
        posicaoInicial.forEach(r => r.data = normalizarDataParaInput(r.data));
        todasAsNotas.forEach(r => r.data = normalizarDataParaInput(r.data));
        todosOsProventos.forEach(r => {
            r.dataCom = normalizarDataParaInput(r.dataCom);
            r.dataPagamento = normalizarDataParaInput(r.dataPagamento);
        });
        todasAsMovimentacoes.forEach(r => r.data = normalizarDataParaInput(r.data));

        if (!dadosAlocacao.modoRebalanceamento) dadosAlocacao.modoRebalanceamento = 'categoria';
        
        carregarDadosDeMercado();
        verificarEMigrarDadosNaInicializacao();
    };

    // Lógica Principal de Carga
    if (isLocalStorageEmpty()) {
        console.log("LocalStorage vazio. Tentando carregar dados de demonstração (default_data.json)...");
        try {
            const response = await fetch('./default_data.json');
            if (!response.ok) throw new Error("Arquivo default_data.json não encontrado.");
            
            const backupData = await response.json();
            console.log("Dados de demonstração carregados. Migrando e salvando...");
            
            // Processa os dados como se fosse uma restauração de backup
            const dadosMigrados = migrarDadosDoBackup(backupData);
            
            // Preenche as variáveis globais
            todosOsAtivos = dadosMigrados.ativos || [];
            todasAsNotas = dadosMigrados.notas || [];
            posicaoInicial = dadosMigrados.posicoes || [];
            todosOsAjustes = dadosMigrados.ajustes || [];
            todosOsProventos = dadosMigrados.proventos || [];
            todasAsContas = dadosMigrados.contas || [];
            todosOsFeriados = dadosMigrados.feriados || [];
            todasAsMovimentacoes = dadosMigrados.movimentacoes || [];
            todosOsAtivosRF = dadosMigrados.todosOsAtivosRF || [];
            todosOsRendimentosRealizadosRF = dadosMigrados.todosOsRendimentosRealizadosRF || [];
            todosOsRendimentosRFNaoRealizados = dadosMigrados.todosOsRendimentosRFNaoRealizados || [];
            dadosMoedas = dadosMigrados.dadosMoedas || { cotacoes: {} };
            todosOsAtivosMoedas = dadosMigrados.todosOsAtivosMoedas || [];
            dadosAlocacao = dadosMigrados.dadosAlocacao || { categorias: {}, ativos: {} };
            todosOsAjustesIR = dadosMigrados.ajustesIR || [];
            historicoCarteira = dadosMigrados.historicoCarteira || [];
            todasAsTransacoesRecorrentes = dadosMigrados.todasAsTransacoesRecorrentes || [];
            todasAsMetas = dadosMigrados.metas || [];
            userName = "Recrutador (Demo)";
            dadosComparacao = dadosMigrados.dadosComparacao || null;
            configuracoesGraficos = dadosMigrados.configuracoesGraficos || { evolucao: { hidden: [] }, desempenho: { hidden: [] } };
            salarioMinimo = dadosMigrados.salarioMinimo || 1518.00;
            dadosSimulacaoNegociar = dadosMigrados.dadosSimulacaoNegociar || { fiis: {}, acoes: {}, aporteTotal: '' };
            timestampUltimoBackup = dadosMigrados.timestampUltimoBackup || null;
            dadosDeMercado = dadosMigrados.mercado || { timestamp: null, cotacoes: {}, ifix: 0, ibov: 0 };
            
            // Salva no LocalStorage para persistir durante a navegação do recrutador
            const dadosParaSalvar = {
                ativos: todosOsAtivos, notas: todasAsNotas, posicoes: posicaoInicial, ajustes: todosOsAjustes,
                proventos: todosOsProventos, contas: todasAsContas, feriados: todosOsFeriados,
                movimentacoes: todasAsMovimentacoes, todos_os_ativos_r_f: todosOsAtivosRF,
                todos_os_rendimentos_realizados_r_f: todosOsRendimentosRealizadosRF,
                todos_os_rendimentos_r_f_nao_realizados: todosOsRendimentosRFNaoRealizados,
                dados_moedas: dadosMoedas, todos_os_ativos_moedas: todosOsAtivosMoedas,
                dados_alocacao: dadosAlocacao, ajustes_ir: todosOsAjustesIR, historico_carteira: historicoCarteira,
                todas_as_transacoes_recorrentes: todasAsTransacoesRecorrentes, metas: todasAsMetas,
                user_name: userName, dados_comparacao: dadosComparacao, configuracoes_graficos: configuracoesGraficos,
                salario_minimo: salarioMinimo, dados_simulacao_negociar: dadosSimulacaoNegociar,
                timestamp_ultimo_backup: timestampUltimoBackup
            };
            
            await salvarDadosNaFonte(dadosParaSalvar);
            // Salva configurações avulsas
            localStorage.setItem('carteira_dados_mercado', JSON.stringify(dadosDeMercado));
            
        } catch (error) {
            console.error("Erro ao carregar dados padrão:", error);
            // Se falhar, carrega vazio do storage mesmo
            carregarDoStorage();
        }
    } else {
        // Se já tem dados (usuário retornando), carrega do storage
        carregarDoStorage();
    }
}

function carregarDadosDoLocalStorage() {
    const carregarItem = (chave, valorPadrao = []) => {
        const dados = localStorage.getItem(`carteira_${chave}_offline`);
        try {
            return dados ? JSON.parse(dados) : valorPadrao;
        } catch (e) {
            console.warn(`Erro ao fazer parse de ${chave}:`, e);
            return valorPadrao;
        }
    };

    todosOsAtivos = carregarItem('ativos');
    todasAsContas = carregarItem('contas');
    todosOsFeriados = carregarItem('feriados');
    todosOsAjustes = carregarItem('ajustes');
    posicaoInicial = carregarItem('posicoes');
    todasAsNotas = carregarItem('notas');
    todosOsProventos = carregarItem('proventos');
    todasAsMovimentacoes = carregarItem('movimentacoes');
    todosOsAtivosRF = carregarItem('todos_os_ativos_r_f');
    todosOsRendimentosRealizadosRF = carregarItem('todos_os_rendimentos_realizados_r_f');
    todosOsRendimentosRFNaoRealizados = carregarItem('todos_os_rendimentos_r_f_nao_realizados');
    dadosMoedas = carregarItem('dados_moedas', { cotacoes: {} });
    todosOsAtivosMoedas = carregarItem('todos_os_ativos_moedas');
    todasAsTransacoesRecorrentes = carregarItem('todas_as_transacoes_recorrentes');
    todasAsMetas = carregarItem('metas');
    todosOsAjustesIR = carregarItem('ajustes_ir');
    dadosAlocacao = carregarItem('dados_alocacao', { categorias: {}, ativos: {} });
    historicoCarteira = carregarItem('historico_carteira');
    
    // CORREÇÃO: Lê a chave 'url_cotacoes_csv' usando carregarItem (com JSON.parse)
    // Isso garante que as aspas extras salvas pelo JSON.stringify sejam removidas.
    urlCotacoesCSV = carregarItem('url_cotacoes_csv', '');

    // CORREÇÃO: Lê a chave 'configuracoes_fiscais'
    configuracoesFiscais = carregarItem('configuracoes_fiscais', { aliquotaAcoes: 0.15, aliquotaFiisDt: 0.20, limiteIsencaoAcoes: 20000, tabelaRegressivaIR: { 180: 0.225, 360: 0.200, 720: 0.175, 9999: 0.150 } });
    
    dadosSimulacaoNegociar = carregarItem('dados_simulacao_negociar', { fiis: {}, acoes: {}, aporteTotal: '' });
    userName = localStorage.getItem('carteira_user_name_offline') || 'Visitante Demo'; // Nome simples sem JSON
    dadosComparacao = carregarItem('dados_comparacao', null);
    configuracoesGraficos = carregarItem('configuracoes_graficos', { evolucao: { hidden: [] }, desempenho: { hidden: [] } });
    linksExternos = carregarItem('links_externos', { acoes: '', fiis: '', etfs: '' });
    salarioMinimo = parseFloat(localStorage.getItem('carteira_salario_minimo_offline')) || 1518.00;
    autoUpdateEnabled = localStorage.getItem('carteira_auto_update_enabled_offline') === 'true';
    timestampUltimoBackup = localStorage.getItem('carteira_timestamp_ultimo_backup_offline') || null;
    
    dataInicioIntegracaoFinancas = null;

    // Normalizações de data
    todasAsContas.forEach(r => r.dataSaldoInicial = normalizarDataParaInput(r.dataSaldoInicial));
    todosOsFeriados.forEach(r => r.data = normalizarDataParaInput(r.data));
    todosOsAjustes.forEach(r => r.data = normalizarDataParaInput(r.data));
    posicaoInicial.forEach(r => r.data = normalizarDataParaInput(r.data));
    todasAsNotas.forEach(r => r.data = normalizarDataParaInput(r.data));
    todosOsProventos.forEach(r => {
        r.dataCom = normalizarDataParaInput(r.dataCom);
        r.dataPagamento = normalizarDataParaInput(r.dataPagamento);
    });
    todasAsMovimentacoes.forEach(r => r.data = normalizarDataParaInput(r.data));
    
    if (!dadosAlocacao.modoRebalanceamento) {
        dadosAlocacao.modoRebalanceamento = 'categoria';
    }

    carregarDadosDeMercado(); 
}
const setupUniversalTransactionModal = () => {
    const debitoSelect = document.getElementById('transacao-moeda-conta-debito');
    const creditoSelect = document.getElementById('transacao-moeda-conta-credito');
    const valorCreditoContainer = document.getElementById('container-valor-credito');
    const simboloDebito = document.getElementById('transacao-moeda-simbolo-debito');
    const simboloCredito = document.getElementById('transacao-moeda-simbolo-credito');
    const infoCambio = document.getElementById('info-cambio');
    const valorCreditoInput = document.getElementById('transacao-moeda-valor-credito');
    const valorDebitoInput = document.getElementById('transacao-moeda-valor-debito');
    const labelValor = document.querySelector('#form-nova-transacao-moeda label[for="transacao-moeda-valor-debito"]');

    const getMoedaInfo = (value) => {
        if (!value) return { tipo: null, moeda: 'BRL' };
        const [tipo, id] = value.split('_');
        if (tipo === 'brl') return { tipo: 'brl', moeda: 'BRL' };
        const ativo = todosOsAtivosMoedas.find(a => a.id == id);
        return { tipo: 'moeda', moeda: ativo ? ativo.moeda : '???' };
    };

    const getSimbolo = (moeda) => {
        switch(moeda) {
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'GBP': return '£';
            default: return 'R$';
        }
    };

    const updateUI = () => {
        const isEditing = document.getElementById('transacao-moeda-transferencia-id').value !== '';
        const infoDebito = getMoedaInfo(debitoSelect.value);
        const infoCredito = getMoedaInfo(creditoSelect.value);

        labelValor.textContent = 'Valor do Lançamento';
        if (debitoSelect.value) {
            simboloDebito.textContent = getSimbolo(infoDebito.moeda);
            simboloDebito.style.display = 'inline';
        } else if (creditoSelect.value) {
            simboloDebito.textContent = getSimbolo(infoCredito.moeda);
            simboloDebito.style.display = 'inline';
        } else {
            simboloDebito.textContent = '';
            simboloDebito.style.display = 'none';
        }
        if (debitoSelect.value && creditoSelect.value) {
            labelValor.textContent = 'Valor do Débito';
        }
        
        simboloCredito.textContent = getSimbolo(infoCredito.moeda);

        if (infoDebito.moeda !== infoCredito.moeda && debitoSelect.value && creditoSelect.value) {
            valorCreditoContainer.style.display = 'block';
            const cotacaoDebito = infoDebito.moeda === 'BRL' ? 1 : (dadosMoedas.cotacoes[infoDebito.moeda] || 0);
            const cotacaoCredito = infoCredito.moeda === 'BRL' ? 1 : (dadosMoedas.cotacoes[infoCredito.moeda] || 0);
            
            if (cotacaoCredito > 0 && cotacaoDebito > 0) {
                const valorDebitoEmBRL = parseDecimal(valorDebitoInput.value) * cotacaoDebito;
                
                if (!isEditing) {
                    const valorCreditoSugerido = parseFloat((valorDebitoEmBRL / cotacaoCredito).toFixed(2));
                    if(document.activeElement !== valorCreditoInput) {
                        valorCreditoInput.value = formatarDecimalParaInput(valorCreditoSugerido);
                    }
                }

                infoCambio.textContent = `Cotação Sugerida: 1 ${infoDebito.moeda} ≈ ${formatarMoedaEstrangeira(cotacaoDebito / cotacaoCredito, infoCredito.moeda)}`;
            } else {
                 infoCambio.textContent = `Cotação para ${infoCredito.moeda} ou ${infoDebito.moeda} não encontrada.`;
            }

        } else {
            valorCreditoContainer.style.display = 'none';
            valorCreditoInput.value = '';
            infoCambio.textContent = '';
        }
    };

    debitoSelect.addEventListener('change', updateUI);
    creditoSelect.addEventListener('change', updateUI);
    valorDebitoInput.addEventListener('input', updateUI);
};
// ********** FIM DA PARTE 5.2









// ********** PARTE 6 - Inicialização e Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    mainContent = document.querySelector('.main-content');
    sidebar = document.querySelector('.sidebar');
    carregarTodosOsDados();
    carregarContadorAlteracoes();
    verificarStatusBackup();
    renderizarInfoBackup();
    setupCalculator();
    // Gerenciador de Tooltips...
    const tooltipEl = document.getElementById('custom-tooltip');
    if (tooltipEl) {
        document.body.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                tooltipEl.innerHTML = target.dataset.tooltip.replace(/\n/g, '<br>');
                tooltipEl.style.display = 'block';
            }
        });
        document.body.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                tooltipEl.style.display = 'none';
            }
        });
        document.body.addEventListener('mousemove', (e) => {
            if (tooltipEl.style.display === 'block') {
                const tooltipWidth = tooltipEl.offsetWidth;
                const windowWidth = window.innerWidth;
                const margin = 15;
                let leftPos = e.pageX + margin;
                if ((leftPos + tooltipWidth + margin) > windowWidth) {
                    leftPos = e.pageX - tooltipWidth - margin;
                }
                tooltipEl.style.left = leftPos + 'px';
                tooltipEl.style.top = e.pageY + margin + 'px';
            }
        });
    }

    telas = {
        dashboard: document.getElementById('tela-dashboard'),
        rendaVariavel: document.getElementById('tela-renda-variavel'), // ADICIONADO
        listaNotas: document.getElementById('tela-lista-notas'),
        lancamentoNota: document.getElementById('tela-lancamento-nota'),
        cadastroAtivos: document.getElementById('tela-cadastro-ativos'),
        posicaoInicial: document.getElementById('tela-posicao-inicial'),
        posicaoInicialMassa: document.getElementById('tela-posicao-inicial-massa'),
        configuracoes: document.getElementById('tela-configuracoes'),
        ajustesTransferencia: document.getElementById('tela-ajustes-transferencia'),
        eventosCorporativos: document.getElementById('tela-eventos-corporativos'),
        eventosAtivos: document.getElementById('tela-eventos-ativos'),
        ajustePM: document.getElementById('tela-ajuste-pm'),
        proventos: document.getElementById('tela-proventos'),
        proventosMassa: document.getElementById('tela-proventos-massa'),
        calendarioGeral: document.getElementById('tela-calendario-geral'),
        cadastroContas: document.getElementById('tela-cadastro-contas'),
        feriados: document.getElementById('tela-feriados'),
        caixaGlobal: document.getElementById('tela-caixa-global'),
        calculadoraIR: document.getElementById('tela-calculadora-ir'),
        importacaoNotas: document.getElementById('tela-importacao-notas'),
        importacaoHistorico: document.getElementById('tela-importacao-historico'),
        posicoesZeradas: document.getElementById('tela-posicoes-zeradas'),
        historicoMovimentacao: document.getElementById('tela-historico-movimentacao'),
        consultaBalanceamento: document.getElementById('tela-consulta-balanceamento'),
        posicaoCorretora: document.getElementById('tela-posicao-corretora'),
        cadastroRF: document.getElementById('tela-cadastro-rf'),
        rendaFixa: document.getElementById('tela-renda-fixa'),
        calendarioAcoes: document.getElementById('tela-calendario-acoes'),
        negociar: document.getElementById('tela-negociar'),
        metas: document.getElementById('tela-metas'),
        historicoSnapshots: document.getElementById('tela-historico-snapshots'),
        performanceRV: document.getElementById('tela-performanceRV'),
        crescimentoPatrimonial: document.getElementById('tela-crescimento-patrimonial')
    };
    modalDashboardAlertas = document.getElementById('modal-dashboard-alertas');
    modalResumoNegociacao = document.getElementById('modal-resumo-negociacao');
    modalDetalhesIRMes = document.getElementById('modal-detalhes-ir-mes');
    modalDetalhesRendimento = document.getElementById('modal-detalhes-rendimento');
    modalCadastroAtivo = document.getElementById('modal-cadastro-ativo');
    modalEdicaoOperacao = document.getElementById('modal-edicao-operacao');
    modalPosicaoInicial = document.getElementById('modal-posicao-inicial');
    modalLancamentoProvento = document.getElementById('modal-lancamento-provento');
    modalCadastroConta = document.getElementById('modal-cadastro-conta');
    modalCadastroFeriado = document.getElementById('modal-cadastro-feriado');
    modalEdicaoTransacaoProvento = document.getElementById('modal-edicao-transacao-provento');
    modalCorrigirData = document.getElementById('modal-corrigir-data');
    modalResumoDividendosAtivo = document.getElementById('modal-resumo-dividendos-ativo');
    modalInformarValoresVenda = document.getElementById('modal-informar-valores-venda');
    modalPerformanceDetalhes = document.getElementById('modal-performance-detalhes');
    modalProventosCalendario = document.getElementById('modal-proventos-calendario');
    modalProventosAnuais = document.getElementById('modal-proventos-anuais');
    modalProventosCalendarioAcoes = document.getElementById('modal-proventos-calendario-acoes');
    modalEventoCorporativo = document.getElementById('modal-evento-corporativo');
    modalEventoAtivo = document.getElementById('modal-evento-ativo');
    modalCorrigirProventosOrfaos = document.getElementById('modal-corrigir-proventos-orfaos');
    modalCalendarioRecorrentes = document.getElementById('modal-calendario-recorrentes');
    modalBalanceamentoDetalhes = document.getElementById('modal-balanceamento-detalhes');
    modalCadastroAtivoRF = document.getElementById('modal-cadastro-ativo-rf');
    modalAporteRF = document.getElementById('modal-aporte-rf');
    modalResgateRF = document.getElementById('modal-resgate-rf');
    modalNovaTransacaoMoeda = document.getElementById('modal-nova-transacao-moeda');
    modalProjecaoFutura = document.getElementById('modal-projecao-futura');
    modalCadastroMeta = document.getElementById('modal-cadastro-meta');
    modalCorrigirContasSemMoeda = document.getElementById('modal-corrigir-contas-sem-moeda');
    containerListaPosicoes = document.getElementById('lista-de-posicoes-iniciais');
    containerAdicionarHistorico = document.getElementById('container-adicionar-historico');
    containerTabelaHistorico = document.getElementById('container-tabela-historico');
    
    setupUniversalTransactionModal();
    document.querySelector('.sidebar').addEventListener('click', (e) => {
        // Intercepta o clique no ícone de alerta ANTES de processar a navegação
        const alertIconClicado = e.target.closest('#dashboard-alert-icon-container');
        if (alertIconClicado) {
            e.preventDefault(); // Impede a navegação do link <a> pai
            abrirModalAlertasDashboard();
            return;
        }
        
        const linkClicado = e.target.closest('a');
        const menuPaiClicado = e.target.closest('.menu-parent');

        if (linkClicado && linkClicado.dataset.tela) {
            const telaId = linkClicado.dataset.tela;
            mostrarTela(telaId);
            const submenuPaiDoLink = linkClicado.closest('.submenu');
            document.querySelectorAll('.submenu').forEach(s => { if (s !== submenuPaiDoLink) s.style.display = 'none'; });

            // --- INÍCIO DA ALTERAÇÃO ---
            // Adiciona a chamada da função global no final de CADA case
            switch (telaId) {
                case 'dashboard': window.scrollTo(0, 0); renderizarDashboard(); break; // O dashboard já chama a função no final
                case 'rendaVariavel': renderizarTelaRendaVariavel(); atualizarIconeDeAlertasGlobal(); break;
                case 'rendaFixa': renderizarPosicaoRF(); atualizarIconeDeAlertasGlobal(); break;
                case 'caixaGlobal': renderizarTelaCaixaGlobal(); atualizarIconeDeAlertasGlobal(); break;
                case 'historicoSnapshots': renderizarTelaHistoricoSnapshots(); atualizarIconeDeAlertasGlobal(); break;
                case 'proventos':
                    isProventosEditMode = false;
                    document.getElementById('botoes-proventos-padrao').style.display = 'flex';
                    document.getElementById('botoes-proventos-edicao').style.display = 'none';
                    document.getElementById('provento-filtro-tipo').value = 'todos';
                    document.getElementById('provento-filtro-status').value = 'todos';
                    document.getElementById('provento-filtro-posicao').value = 'todos';
                    renderizarTabelaProventos();
                    atualizarIconeDeAlertasGlobal();
                    break;
                case 'calendarioGeral': popularFiltrosCorretora(); renderizarCalendarioGeral(); atualizarIconeDeAlertasGlobal(); break;
                case 'calendarioAcoes': renderizarCalendarioAcoes(); atualizarIconeDeAlertasGlobal(); break;
                case 'calculadoraIR': {
                    const anoAtual = new Date().getFullYear();
                    const anos = new Set();
                    todasAsNotas.forEach(n => { if(n.data) anos.add(n.data.substring(0, 4)); });
                    posicaoInicial.forEach(p => { if(p.data) anos.add(p.data.substring(0, 4)); });
                    anos.add(String(anoAtual));
                    const anoSelect = document.getElementById('ir-filtro-ano');
                    anoSelect.innerHTML = [...anos].sort((a,b) => b-a).map(ano => `<option value="${ano}" ${ano == anoAtual ? 'selected' : ''}>${ano}</option>`).join('');
                    if(anoSelect.value) {
                        renderizarCalculadoraIR();
                    }
                    atualizarStatusBotaoIR();
                    atualizarIconeDeAlertasGlobal();
                    break;
                }
                case 'listaNotas': renderizarListaNotas(); atualizarIconeDeAlertasGlobal(); break;
                case 'cadastroRF': renderizarTabelaAtivosRF(); atualizarIconeDeAlertasGlobal(); break;
                case 'cadastroContas': renderizarTabelaContas(); atualizarIconeDeAlertasGlobal(); break;
                case 'cadastroAtivos': isAtivosEditMode = false; document.getElementById('botoes-ativos-padrao').style.display = 'flex'; document.getElementById('botoes-ativos-edicao').style.display = 'none'; renderizarTabelaAtivos(); atualizarIconeDeAlertasGlobal(); break;
                case 'feriados': renderizarTabelaFeriados(); atualizarIconeDeAlertasGlobal(); break;
                case 'posicaoInicialMassa': renderizarTelaPosicaoMassa(); atualizarIconeDeAlertasGlobal(); break;
                case 'posicaoInicial': renderizarTabelaPosicaoInicial(); cancelarAdicaoHistorico(); atualizarIconeDeAlertasGlobal(); break;
                case 'posicoesZeradas': renderizarPosicoesZeradas(); atualizarIconeDeAlertasGlobal(); break;
                case 'consultaBalanceamento': renderizarTelaConsultaBalanceamento(); atualizarIconeDeAlertasGlobal(); break;
                case 'posicaoCorretora': renderizarTelaPosicaoPorCorretora(); atualizarIconeDeAlertasGlobal(); break;
                case 'historicoMovimentacao': renderizarTelaHistoricoMovimentacao(); atualizarIconeDeAlertasGlobal(); break;
                case 'negociar': renderizarTelaNegociar(); atualizarIconeDeAlertasGlobal(); break;
                case 'metas': renderizarTelaMetas(); atualizarIconeDeAlertasGlobal(); break;
                case 'ajustesTransferencia': {
                    const corretorasAtivas = getCorretorasAtivasParaNotas();
                    const corretorasHtml = corretorasAtivas.map(c => `<option value="${c}">${c}</option>`).join('');
                    document.getElementById('transferencia-corretora-origem').innerHTML = '<option value="">Selecione...</option>' + corretorasHtml;
                    document.getElementById('transferencia-corretora-destino').innerHTML = '<option value="">Selecione...</option>' + corretorasHtml;
                    document.getElementById('form-transferencia-custodia').reset();
                    document.getElementById('transferencia-id').value = '';
                    document.getElementById('transferencia-form-titulo').textContent = 'Registrar Nova Transferência de Custódia';
                    document.getElementById('transferencia-ativos-container').style.display = 'none';
                    renderizarTabelaTransferencias();
                    atualizarIconeDeAlertasGlobal();
                    break;
                }
                case 'eventosCorporativos': renderizarTabelaEventosCorporativos(); atualizarIconeDeAlertasGlobal(); break;
                case 'eventosAtivos': renderizarTelaEventosAtivos(); atualizarIconeDeAlertasGlobal(); break;
                case 'ajustePM': document.getElementById('container-ajuste-pm-lista').style.display = 'none'; document.getElementById('form-buscar-posicao-pm').reset(); atualizarIconeDeAlertasGlobal(); break;
                case 'configuracoes':
                    // --- LEITURA FORÇADA DIRETO DO STORAGE (Correção do Bug) ---
                    // Isso garante que o campo mostre o que está salvo, mesmo se a variável global falhar
                    
                    // 1. URL Cotações
                    let urlSalva = localStorage.getItem('carteira_url_cotacoes_csv_offline');
                    if (urlSalva) { 
                        try { urlSalva = JSON.parse(urlSalva); } catch(e){} // Remove aspas se houver
                        urlCotacoesCSV = urlSalva; // Atualiza global
                    }
                    document.getElementById('config-cotacoes-url').value = urlSalva || '';

                    // 2. Configurações Fiscais
                    let fiscalSalvo = localStorage.getItem('carteira_configuracoes_fiscais_offline');
                    let fiscalObj = { aliquotaAcoes: 0.15, aliquotaFiisDt: 0.20, limiteIsencaoAcoes: 20000, tabelaRegressivaIR: { 180: 0.225, 360: 0.20, 720: 0.175, 9999: 0.15 } };
                    if (fiscalSalvo) {
                        try { fiscalObj = { ...fiscalObj, ...JSON.parse(fiscalSalvo) }; configuracoesFiscais = fiscalObj; } catch(e){}
                    }
                    
                    document.getElementById('config-aliquota-swing').value = formatarDecimal(fiscalObj.aliquotaAcoes * 100);
                    document.getElementById('config-aliquota-daytrade').value = formatarDecimal(fiscalObj.aliquotaFiisDt * 100);
                    document.getElementById('config-limite-isencao').value = formatarMoeda(fiscalObj.limiteIsencaoAcoes).replace('R$ ', '');
                    
                    const tabIR = fiscalObj.tabelaRegressivaIR || {};
                    document.querySelector('.config-ir-fixa-faixa[data-faixa="180"]').value = formatarDecimal((tabIR[180] || 0.225) * 100);
                    document.querySelector('.config-ir-fixa-faixa[data-faixa="360"]').value = formatarDecimal((tabIR[360] || 0.20) * 100);
                    document.querySelector('.config-ir-fixa-faixa[data-faixa="720"]').value = formatarDecimal((tabIR[720] || 0.175) * 100);
                    document.querySelector('.config-ir-fixa-faixa[data-faixa="9999"]').value = formatarDecimal((tabIR[9999] || 0.15) * 100);

                    // 3. Links Externos
                    let linksSalvos = localStorage.getItem('carteira_links_externos_offline');
                    let linksObj = { acoes: '', fiis: '', etfs: '' };
                    if (linksSalvos) {
                         try { linksObj = { ...linksObj, ...JSON.parse(linksSalvos) }; linksExternos = linksObj; } catch(e){}
                    }
                    document.getElementById('config-link-acoes').value = linksObj.acoes || '';
                    document.getElementById('config-link-fiis').value = linksObj.fiis || '';
                    document.getElementById('config-link-etfs').value = linksObj.etfs || '';

                    // 4. Auto Update e Outros
                    const autoUpdateRaw = localStorage.getItem('carteira_auto_update_enabled_offline');
                    let autoUpdateVal = false;
                    try { autoUpdateVal = JSON.parse(autoUpdateRaw) === true; } catch(e) { autoUpdateVal = autoUpdateRaw === 'true'; }
                    document.getElementById('config-auto-update-toggle').checked = autoUpdateVal;
                    autoUpdateEnabled = autoUpdateVal;

                    document.getElementById('config-user-name').value = userName || '';
                    document.getElementById('config-salario-minimo').value = formatarDecimalParaInput(salarioMinimo);
                    document.getElementById('resultados-inconsistencias').innerHTML = '';
                    
                    atualizarIconeDeAlertasGlobal();
                    break;
                case 'crescimentoPatrimonial':
                    document.getElementById('container-resultado-crescimento').style.display = 'none';
                    atualizarIconeDeAlertasGlobal();
                    break;
                case 'performanceRV': renderizarTelaPerformanceRV(); atualizarIconeDeAlertasGlobal(); break;
            }
            // --- FIM DA ALTERAÇÃO ---
        } else if (menuPaiClicado) {
            const itemPai = menuPaiClicado.closest('.menu-item');
            if (itemPai) {
                const submenu = itemPai.querySelector('.submenu');
                if (submenu) {
                    const estaAberto = submenu.style.display === 'block';
                    document.querySelectorAll('.sidebar .submenu').forEach(s => { if (s !== submenu) s.style.display = 'none'; });
                    submenu.style.display = estaAberto ? 'none' : 'block';
                }
            }
        }
    });
    document.getElementById('modal-snapshot-detalhes-conteudo').addEventListener('click', (e) => {
        const linhaAtivoSnapshot = e.target.closest('.row-clickable');
        if (linhaAtivoSnapshot) {
            const ticker = linhaAtivoSnapshot.dataset.ticker;
            if (ticker) {
                abrirModalHistoricoAtivoSnapshot(ticker);
            }
        }
    });
    document.getElementById('btn-levar-plano-para-negociar').addEventListener('click', aplicarPlanoDeAcaoParaSimulacao);
    document.getElementById('input-arquivo-proventos').addEventListener('change', importarProventosCSV);
    document.getElementById('input-arquivo-cotacoes').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target.result;
            processarArquivoCotacoes(csvText);
        };
        reader.onerror = (error) => {
            alert('Erro ao ler o arquivo.');
            console.error(error);
        };
        reader.readAsText(file);
        e.target.value = ''; // Limpa para permitir reimportar o mesmo arquivo
    });
    
    document.getElementById('restore-file-input').addEventListener('change', restaurarBackup);
    document.getElementById('input-arquivo-historico').addEventListener('change', processarArquivoHistorico);
    document.getElementById('input-cadastros-csv').addEventListener('change', (e) => importarCadastrosCSV(e));
    document.getElementById('card-investimentos').addEventListener('click', abrirModalInvestimentosDetalhes);
    document.getElementById('btn-imprimir-investimentos').addEventListener('click', () => {
        const body = document.body;
        const modal = document.getElementById('modal-investimentos-detalhes');
        body.classList.add('imprimindo-investimentos');
        modal.classList.add('imprimindo');
    
        window.print();
    
        // Usa setTimeout para garantir que a classe seja removida após a janela de impressão ser processada
        setTimeout(() => {
            body.classList.remove('imprimindo-investimentos');
            modal.classList.remove('imprimindo');
        }, 500);
    });
    document.getElementById('container-historico-snapshots').addEventListener('click', (e) => {
        const target = e.target.closest('.btn-detalhes-snapshot');
        if (target) {
            abrirModalDetalhesSnapshot(target.dataset.data);
        }
    });
    document.getElementById('card-contas').addEventListener('click', abrirModalDetalhesContas);
    document.getElementById('card-moedas').addEventListener('click', abrirModalDetalhesMoedas);
    document.getElementById('card-proventos').addEventListener('click', abrirModalDetalhesProventos);
    document.getElementById('btn-abrir-calendario-recorrentes-caixa').addEventListener('click', () => renderizarModalCalendarioRecorrentes());
    document.getElementById('btn-abrir-projecao-caixa').addEventListener('click', () => renderizarModalProjecaoFutura());    document.getElementById('btn-adicionar-conta-universal').addEventListener('click', () => abrirModalCadastroConta(null));
    document.getElementById('btn-nova-transacao-universal').addEventListener('click', () => abrirModalNovaTransacaoMoeda(null));
    document.getElementById('btn-backup-caixa').addEventListener('click', fazerBackup);
    document.getElementById('import-backup-comparacao-input').addEventListener('change', importarResumoCarteira);
    document.querySelectorAll('input[name="tipo-transacao-moeda"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const containerRecorrencia = document.getElementById('recorrencia-moeda-options');
            const containerTransferencia = document.getElementById('container-contas-transferencia-moeda');
            const containerRecorrente = document.getElementById('container-contas-recorrente-moeda');
            const labelValor = document.querySelector('label[for="transacao-moeda-valor-debito"]');
            
            if (e.target.value === 'recorrente') {
                containerRecorrencia.style.display = 'block';
                containerTransferencia.style.display = 'none';
                containerRecorrente.style.display = 'flex';
                document.getElementById('transacao-moeda-data').previousElementSibling.textContent = 'Data do Primeiro Lançamento';
                labelValor.textContent = 'Valor';
                popularDropdownAtivoRecorrente(); 
            } else {
                containerRecorrencia.style.display = 'none';
                containerTransferencia.style.display = 'flex';
                containerRecorrente.style.display = 'none';
                document.getElementById('transacao-moeda-data').previousElementSibling.textContent = 'Data';
                labelValor.textContent = 'Valor do Débito';
            }
        });
    });
    document.getElementById('config-auto-update-toggle').addEventListener('change', (e) => {
        autoUpdateEnabled = e.target.checked;
        salvarConfiguracaoAutoUpdate();
        if (autoUpdateEnabled) {
            iniciarAutoUpdate();
            alert('Atualização automática de cotações ATIVADA.');
        } else {
            pararAutoUpdate();
            alert('Atualização automática de cotações DESATIVADA.');
        }
    });
    document.getElementById('input-arquivo-cotacoes').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target.result;
            processarArquivoCotacoes(csvText);
        };
        reader.onerror = (error) => {
            alert('Erro ao ler o arquivo.');
            console.error(error);
        };
        reader.readAsText(file);
        e.target.value = ''; // Limpa para permitir reimportar o mesmo arquivo
    });
    document.getElementById('import-backup-comparacao-input').addEventListener('change', importarResumoCarteira);
    document.getElementById('seletor-vista-calendario-acoes').addEventListener('click', (e) => {
        const target = e.target.closest('.subtitulo-calendario');
        if (target && target.dataset.vista) {
            tipoVistaCalendarioAcoes = target.dataset.vista;
            renderizarCalendarioAcoes();
        }
    });

    document.getElementById('recorrencia-moeda-frequencia').addEventListener('change', (e) => {
        const diaMesGroup = document.getElementById('recorrencia-moeda-dia-mes-group');
        const diaSemanaGroup = document.getElementById('recorrencia-moeda-dia-semana-group');
        if (e.target.value === 'mensal') { diaMesGroup.style.display = 'block'; diaSemanaGroup.style.display = 'none'; } 
        else { diaMesGroup.style.display = 'none'; diaSemanaGroup.style.display = 'block'; }
    });

    document.querySelectorAll('input[name="tipo-termino-moeda"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const ocorrenciasGroup = document.getElementById('termino-moeda-ocorrencias-valor-group');
            const dataGroup = document.getElementById('termino-moeda-data-valor-group');
            if (e.target.value === 'ocorrencias') { ocorrenciasGroup.style.display = 'block'; dataGroup.style.display = 'none'; } 
            else { ocorrenciasGroup.style.display = 'none'; dataGroup.style.display = 'block'; }
        });
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('#backup-alert-footer')) {
            fazerBackup();
            return;
        }
        if (target.id === 'btn-iniciar-correcao-contas-sem-moeda') {
            abrirModalCorrecaoContasSemMoeda();
            return;
        }
        const btnAddProventoTicker = e.target.closest('.btn-adicionar-provento-ticker');
        if (btnAddProventoTicker) {
            const ticker = btnAddProventoTicker.dataset.ticker;
            const ativo = todosOsAtivos.find(a => a.ticker === ticker);
            const tipoAtivo = ativo ? ativo.tipo : 'FII';

            // CORREÇÃO: Verifica se o modal unificado está aberto
            const modalUnificadoAberto = document.getElementById('modal-proventos-calendario').style.display === 'block' && document.getElementById('seletor-vista-calendario-unificado');

            if (modalUnificadoAberto) {
                // Se veio do modal unificado, define um retorno específico
                retornoModalProvento = `unificado-${tipoAtivo === 'FII' ? 'fiis' : 'acoes'}`;
            } else {
                // Lógica antiga para outros locais do sistema
                retornoModalProvento = (tipoAtivo === 'FII') ? 'calendario-fiis' : 'calendario-acoes';
            }
            
            abrirModalLancamentoProvento(null, ticker);
            return;
        }
        const proventoContainer = target.closest('.provento-item-container');
        if (proventoContainer) {
            document.querySelectorAll('.provento-acoes').forEach(el => {
                if (el.parentElement !== proventoContainer) {
                    el.style.display = 'none';
                }
            });
            const acoesDiv = proventoContainer.querySelector('.provento-acoes');
            if (acoesDiv) {
                const isVisible = acoesDiv.style.display === 'flex';
                acoesDiv.style.display = isVisible ? 'none' : 'flex';
            }
            e.stopPropagation();
            return;
        }
        const acaoProventoBtn = target.closest('.provento-acoes .acao-btn');
        if (acaoProventoBtn) {
            const container = acaoProventoBtn.closest('.provento-item-container');
            const proventoId = parseFloat(container.dataset.proventoId);
            const provento = todosOsProventos.find(p => p.id === proventoId);
            if (provento) {
                const ativo = todosOsAtivos.find(a => a.ticker === provento.ticker);
                const tipoAtivo = ativo ? ativo.tipo : 'FII';
                if (acaoProventoBtn.classList.contains('edit')) {
                    retornoModalProvento = (tipoAtivo === 'FII') ? 'calendario-fiis' : 'calendario-acoes';
                    abrirModalLancamentoProvento(provento);
                } else if (acaoProventoBtn.classList.contains('delete')) {
                    deletarProvento(provento.id);
                }
            }
            return;
        }
        if (!target.closest('.provento-item-container')) {
            document.querySelectorAll('.provento-acoes').forEach(el => el.style.display = 'none');
        }
        const salvarParametroFiscalIndividualmente = (e) => {
            const input = e.target;
            const valor = parseDecimal(input.value);
            if (input.id.startsWith('config-')) {
                switch (input.id) {
                    case 'config-aliquota-swing': configuracoesFiscais.aliquotaAcoes = valor / 100; break;
                    case 'config-aliquota-daytrade': configuracoesFiscais.aliquotaFiisDt = valor / 100; break;
                    case 'config-limite-isencao': configuracoesFiscais.limiteIsencaoAcoes = valor; break;
                }
            } else if (input.classList.contains('config-ir-fixa-faixa')) {
                const faixa = input.dataset.faixa;
                if (faixa && configuracoesFiscais.tabelaRegressivaIR.hasOwnProperty(faixa)) {
                    configuracoesFiscais.tabelaRegressivaIR[faixa] = valor / 100;
                }
            }
            salvarConfiguracoesFiscais();
        };
        document.querySelectorAll('#config-aliquota-swing, #config-aliquota-daytrade, #config-limite-isencao, .config-ir-fixa-faixa').forEach(input => {
            input.addEventListener('change', salvarParametroFiscalIndividualmente);
        });
        const navLink = target.closest('a[data-tela]');
        if (navLink && !navLink.closest('.sidebar')) {
            const telaId = navLink.dataset.tela;
            mostrarTela(telaId);
            if (telaId === 'consultaBalanceamento') {
                renderizarTelaConsultaBalanceamento();
            }
            e.preventDefault();
            return;
        }
        const tickerReb = target.closest('.ticker-rebalanceamento');
        if (tickerReb) {
            abrirModalDetalhesAtivo(tickerReb.dataset.ticker);
            return;
        }
        const cnpjClicavel = target.closest('.cnpj-clicavel');
        if (cnpjClicavel && cnpjClicavel.dataset.cnpj) {
            abrirModalAtivosPorCNPJ(cnpjClicavel.dataset.cnpj);
            return;
        }
        const acaoBtn = target.closest('button, i[id], i.acao-btn');
        if (acaoBtn) {
            const id = acaoBtn.id;
            const data = acaoBtn.dataset;
            const classList = acaoBtn.classList;
            if (id) {
                switch(id) {
                    case 'btn-cadastrar-novo-ativo': abrirModalCadastroAtivo(null); break;
                    case 'btn-novo-lancamento': iniciarNovaNota(); break;
                    case 'btn-criar-nota-simulacao': criarNotaAPartirDaSimulacao(); break;
                    case 'btn-nova-conta': abrirModalCadastroConta(null); break;
                    case 'btn-novo-feriado': abrirModalFeriado(null); break;
                    case 'btn-novo-provento': abrirModalLancamentoProvento(null); break;
                    case 'btn-adicionar-posicao-massa': mostrarTela('posicaoInicialMassa'); renderizarTelaPosicaoMassa(); break;
                    case 'btn-add-historico-ativo': iniciarAdicaoHistorico(); break;
                    case 'btn-novo-evento-corporativo': abrirModalEventoCorporativo(null); break;
                    case 'btn-novo-evento-ativo': abrirModalEventoAtivo(null); break;
                    case 'btn-buscar-ativos-nao-cadastrados': buscarEcadastrarAtivosAusentes(); break;
                    case 'btn-salvar-correcao-proventos': salvarCorrecaoProventosOrfaos(e); break;
                    case 'btn-salvar-nota': {
                        const btnSalvar = acaoBtn; // O botão que foi clicado
                        const originalText = btnSalvar.innerHTML;
                        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguarde...';
                        btnSalvar.disabled = true;

                        notaAtual.corretora = document.getElementById('nota-corretora').value;
                        notaAtual.numero = document.getElementById('nota-numero').value;
                        notaAtual.data = document.getElementById('nota-data').value;
                        notaAtual.custos = parseDecimal(document.getElementById('nota-custos').value);
                        notaAtual.irrf = parseDecimal(document.getElementById('nota-irrf').value);

                        if (!notaAtual.corretora || !notaAtual.numero || !notaAtual.data) {
                            alert('Corretora, Número e Data da Nota são obrigatórios.');
                            btnSalvar.innerHTML = originalText;
                            btnSalvar.disabled = false;
                            return; // Retorna para sair do case
                        }
                        if (notaAtual.operacoes.length === 0) {
                            alert('Adicione pelo menos uma operação à nota.');
                            btnSalvar.innerHTML = originalText;
                            btnSalvar.disabled = false;
                            return; // Retorna para sair do case
                        }

                        if (!notaAtual.id) {
                            notaAtual.id = Date.now();
                            todasAsNotas.push(notaAtual);
                        } else {
                            const index = todasAsNotas.findIndex(n => n.id === notaAtual.id);
                            if (index > -1) todasAsNotas[index] = notaAtual;
                        }

                        sincronizarNotaComTransacao(notaAtual.id);

                        const dadosParaSalvar = {
                            notas: todasAsNotas,
                            movimentacoes: todasAsMovimentacoes
                        };

                        salvarDadosNaFonte(dadosParaSalvar).then(() => {
                            alert('Nota salva com sucesso!');
                            sincronizarTodosOsRegistros(null, true);
                            mostrarTela('listaNotas');
                            renderizarListaNotas();
                        }).catch(error => {
                            console.error("Erro ao salvar a nota:", error);
                            alert("Ocorreu um erro ao salvar a nota. Verifique o console para mais detalhes.");
                        }).finally(() => {
                            // Este bloco garante que o botão seja restaurado, não importa o que aconteça.
                            btnSalvar.innerHTML = originalText;
                            btnSalvar.disabled = false;
                        });
                        break; // Mantém o break do switch case
                    }
                    case 'btn-cancelar-nota': notaAtual = null; mostrarTela('listaNotas'); renderizarListaNotas(); break;
                    case 'btn-sync-needed-alert': sincronizarTodosOsRegistros(renderizarDashboard); break;
                    case 'btn-salvar-snapshot-carteira': salvarSnapshotCarteira(); registrarAlteracao(); break;
                    case 'btn-baixar-cotacoes-link': if(urlCotacoesCSV) window.open(urlCotacoesCSV, '_blank'); else alert('Nenhuma URL de cotações configurada.'); break;
                    case 'btn-restaurar': document.getElementById('restore-file-input').click(); break;
                    case 'btn-exportar-cadastros': exportarCadastrosCSV(); break;
                    case 'btn-importar-cadastros': document.getElementById('input-cadastros-csv').click(); break;
                    case 'btn-importar-notas-csv': document.getElementById('input-arquivo-notas').click(); break;
                    case 'btn-importar-historico-csv': document.getElementById('input-arquivo-historico').click(); break;
                    case 'btn-sincronizar-registros': sincronizarTodosOsRegistros(); break;
                    case 'btn-verificar-inconsistencias': verificarInconsistencias(); break;
                    case 'btn-apagar-tudo': apagarTodosOsDados(); break;
                    case 'btn-corrigir-vendas-historicas': abrirModalValoresVenda(); break;
                    case 'btn-corrigir-proventos-orfaos': {
                        const proventosOrfaos = todosOsProventos.filter(p => !p.quantidadeNaDataCom || p.quantidadeNaDataCom <= 0);
                        if(proventosOrfaos.length > 0) abrirModalCorrecaoProventosOrfaos(proventosOrfaos); else alert('Nenhum provento órfão encontrado.');
                        break;
                    }
                    case 'btn-importar-resumo-painel':
                        if (confirm('Isto irá substituir os dados de comparação atuais por um novo backup. Deseja continuar?')) {
                            document.getElementById('import-backup-comparacao-input').click();
                        }
                        break;
                    case 'btn-atualizar-cotacoes-api': atualizarCotacoesComAPI(); break;
                    case 'btn-testar-salvar-url-cotacoes': 
                        urlCotacoesCSV = document.getElementById('config-cotacoes-url').value.trim();
                        salvarUrlCotacoes();
                        atualizarCotacoesComAPI();
                        break;
                    case 'btn-imprimir-proventos': {
                        const proventosFiltrados = obterProventosFiltrados();
                        if (proventosFiltrados.length === 0) {
                            alert("Não há proventos para imprimir com os filtros selecionados.");
                            break;
                        }

                        const sortedProventos = [...proventosFiltrados].sort((a, b) => {
                            const key = sortConfigProventos.key;
                            const direction = sortConfigProventos.direction === 'ascending' ? 1 : -1;
                            const valA = key.includes('data') ? new Date(a[key]) : (a[key] || '');
                            const valB = key.includes('data') ? new Date(b[key]) : (b[key] || '');
                            if (valA < valB) return -1 * direction;
                            if (valA > valB) return 1 * direction;
                            return 0;
                        });

                        const agora = new Date();
                        const dataFormatada = agora.toLocaleDateString('pt-BR');
                        const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        document.getElementById('impressao-timestamp').textContent = `Gerado em ${dataFormatada} às ${horaFormatada}`;

                        const filtroAtivo = document.getElementById('provento-filtro-ativo').value;
                        const filtroTipo = document.getElementById('provento-filtro-tipo').value;
                        const filtroStatus = document.getElementById('provento-filtro-status').value;
                        const filtroPosicao = document.getElementById('provento-filtro-posicao').value;
                        let filtrosTexto = 'Filtros aplicados: ';
                        const filtrosAtivos = [];
                        if (filtroAtivo) filtrosAtivos.push(`Ativo: ${filtroAtivo.toUpperCase()}`);
                        if (filtroTipo !== 'todos') filtrosAtivos.push(`Tipo: ${filtroTipo}`);
                        if (filtroStatus !== 'todos') filtrosAtivos.push(`Status: ${filtroStatus === 'receber' ? 'A Receber' : 'Recebidos'}`);
                        if (filtroPosicao !== 'todos') filtrosAtivos.push(`Posição: ${filtroPosicao === 'em_carteira' ? 'Em Carteira' : 'Zerados'}`);
                        document.getElementById('impressao-filtros').textContent = filtrosAtivos.length > 0 ? filtrosTexto + filtrosAtivos.join('; ') : 'Filtros aplicados: Nenhum';

                        const resumoContainer = document.getElementById('proventos-summary-container');
                        const resumoTitulo = resumoContainer.querySelector('#proventos-summary-titulo').textContent;
                        const dividendoTotal = resumoContainer.querySelector('#summary-dividendo-total').textContent;
                        const projecaoAnual = resumoContainer.querySelector('#summary-projecao-anual').textContent;
                        const mediaMensal = resumoContainer.querySelector('#summary-media-mensal').textContent;

                        const resumoHtml = `
                            <div class="impressao-resumo-container">
                                <h3>${resumoTitulo}</h3>
                                <div class="impressao-resumo-grid">
                                    <div><strong>Dividendo Total no Período:</strong> ${dividendoTotal}</div>
                                    <div><strong>Projeção Anual:</strong> ${projecaoAnual}</div>
                                    <div><strong>Média Mensal:</strong> ${mediaMensal}</div>
                                </div>
                            </div>
                        `;
                        document.getElementById('impressao-resumo').innerHTML = resumoHtml;

                        let tabelaHtml = `<table>
                            <thead>
                                <tr>
                                    <th>Ativo</th><th>Tipo</th><th>Data Com</th><th>Data Pag.</th>
                                    <th class="numero">Valor/Un.</th><th class="numero">Qtd.</th>
                                    <th class="numero">Total Recebido</th><th class="percentual">YOC</th>
                                </tr>
                            </thead>
                            <tbody>`;
                        sortedProventos.forEach(p => {
                            tabelaHtml += `
                                <tr>
                                    <td>${p.ticker}</td>
                                    <td>${p.tipo}</td>
                                    <td>${new Date(p.dataCom + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td>${new Date(p.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td class="numero">${formatarPrecoMedio(p.valorIndividual)}</td>
                                    <td class="numero">${Math.round(p.quantidadeNaDataCom)}</td>
                                    <td class="numero">${formatarMoeda(p.valorTotalRecebido)}</td>
                                    <td class="percentual">${formatarPercentual(p.yieldOnCost)}</td>
                                </tr>`;
                        });
                        tabelaHtml += `</tbody></table>`;
                        document.getElementById('impressao-tabela').innerHTML = tabelaHtml;

                        const body = document.body;
                        const container = document.getElementById('container-impressao-proventos');
                        body.classList.add('imprimindo-proventos');
                        container.classList.add('imprimindo');

                        window.print();

                        setTimeout(() => {
                            body.classList.remove('imprimindo-proventos');
                            container.classList.remove('imprimindo');
                        }, 500);
                        break;
                    }
                    case 'btn-importar-cotacoes-manual-config': document.getElementById('input-arquivo-cotacoes').click(); break;
                    case 'btn-exportar-proventos': exportarProventosCSV(); break;
                    case 'btn-importar-proventos': document.getElementById('input-arquivo-proventos').click(); break;
                    case 'btn-imprimir-balanceamento': {
                        const body = document.body;
                        const container = document.getElementById('tela-consulta-balanceamento');
                        body.classList.add('imprimindo-balanceamento');
                        container.classList.add('imprimindo');
                    
                        window.print();
                    
                        setTimeout(() => {
                            body.classList.remove('imprimindo-balanceamento');
                            container.classList.remove('imprimindo');
                        }, 500);
                        break;
                    }
                    case 'btn-importar-cotacoes-dashboard': document.getElementById('input-arquivo-cotacoes').click(); break;
                    case 'btn-reset-simulacao': resetarSimulacaoNegociacao(); break;
                    case 'btn-visualizar-simulacao': abrirModalResumoNegociacao(); break;
                }
            }
            if (classList.contains('btn-atualizar-cotacoes-api')) {
                acaoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
                acaoBtn.disabled = true;
                atualizarCotacoesComAPI().finally(() => {
                    document.querySelectorAll('.btn-atualizar-cotacoes-api').forEach(b => {
                        b.innerHTML = 'Atualizar Cotações (API)'; b.disabled = false;
                    });
                });
            } else if (classList.contains('btn-importar-cotacoes-csv')) {
                document.getElementById('input-arquivo-cotacoes').click();
            } else if (classList.contains('btn-abrir-modal-performance')) {
                abrirModalPerformance(data.tipoAtivo);
            } else if (classList.contains('btn-abrir-modal-rf')) {
                abrirModalCadastroAtivoRF(null);
            } else if (classList.contains('btn-abrir-calendario-proventos')) {
                abrirModalCalendarioProventos();
            } else if (classList.contains('btn-abrir-calendario-proventos-acoes')) {
                abrirModalCalendarioProventosAcoes();
            } else if (classList.contains('btn-abrir-modal-balanceamento')) {
                abrirModalBalanceamento(data.tipoAtivo);
            } else if (classList.contains('btn-aportar-rf')) {
                abrirModalAporteRF(parseFloat(data.rfId));
            } else if (classList.contains('btn-resgatar-rf')) {
                abrirModalResgateRF(parseFloat(data.rfId));
            } else if (classList.contains('btn-historico-rf')) {
                abrirModalHistoricoRF(parseFloat(data.rfId));
            } else if (classList.contains('btn-corrigir-data')) {
                abrirModalCorrecaoData(data.recordType, data.recordId);
            } else if (classList.contains('toggle-sync')) {
                const id = parseFloat(data.id);
                if (!isNaN(id)) {
                    toggleSincronizacaoFinancas(id);
                }
            }
            const isEdit = classList.contains('edit');
            const isDelete = classList.contains('delete');
            const idAcao = data.id || data.noteId || data.movRfId || data.ativoId || data.ativoRfId || data.ativoMoedaId || data.posicaoId || data.editPosicaoId || data.opId || data.proventoId || data.contaId || data.feriadoId || data.transferenciaId || data.eventoCorpId || data.eventoAtivoId || data.transacaoProventoId || data.transacaoId;
            if (idAcao) {
                const parsedId = !isNaN(parseFloat(idAcao)) && isFinite(idAcao) ? parseFloat(idAcao) : idAcao;
                if (data.ativoId) { 
                    if (isEdit) abrirModalCadastroAtivo(todosOsAtivos.find(x=>x.id===parsedId)); 
                    else if (isDelete) deletarAtivo(parsedId); 
                } else if (data.noteId) { 
                    if (isEdit) carregarNotaParaEdicao(parsedId); 
                    else if (isDelete) deletarNota(parsedId); 
                } else if (data.opId) { 
                    if (isEdit) iniciarEdicaoOperacao(parsedId); 
                    else if (isDelete) deletarOperacao(parsedId); 
                } else if (data.proventoId) { 
                    if (isEdit) { retornoModalProvento = 'lista-proventos'; abrirModalLancamentoProvento(todosOsProventos.find(x=>x.id===parsedId)); }
                    else if (isDelete) { deletarProvento(parsedId); }
                } else if (data.contaId) { 
                    if (isEdit) abrirModalCadastroConta(todasAsContas.find(x=>x.id===parsedId), 'conta'); 
                } else if (data.feriadoId) { 
                    if (isEdit) abrirModalFeriado(todosOsFeriados.find(x=>x.id===parsedId)); 
                    else if (isDelete) deletarFeriado(parsedId); 
                } else if (data.id && (data.type === 'conta' || data.type === 'moeda')) {
                    if (isEdit) {
                        const movimentacaoParaEditar = todasAsMovimentacoes.find(m => String(m.id) === String(parsedId));
                        if (movimentacaoParaEditar) abrirModalNovaTransacaoMoeda(movimentacaoParaEditar);
                    } else if (isDelete) {
                        deletarMovimentacao(parsedId, data.type); // Chama a nova função unificada
                    }
                } else if (data.transferenciaId) { 
                    if (isEdit) abrirModalEdicaoTransferencia(parsedId); 
                    else if (isDelete) deletarTransferencia(parsedId); 
                } else if (data.eventoCorpId) { 
                    if (isEdit) abrirModalEventoCorporativo(todosOsAjustes.find(x=>x.id===parsedId)); 
                    else if (isDelete) deletarEventoCorporativo(parsedId); 
                } else if (data.eventoAtivoId) { 
                    if(isEdit) abrirModalEventoAtivo(todosOsAjustes.find(x => x.id === parsedId)); 
                    else if(isDelete) deletarEventoAtivo(parsedId); 
                } else if (data.transacaoProventoId) { 
                    if(isEdit) abrirModalEdicaoTransacaoProvento(parsedId); 
                } else if (data.movRfId) { 
                    if (isEdit) abrirModalEdicaoMovimentacaoRF(parsedId); 
                    else if(isDelete) deletarMovimentacaoRF(parsedId); 
                } else if (data.ativoRfId) { 
                    if (isEdit) abrirModalCadastroAtivoRF(todosOsAtivosRF.find(x => x.id === parsedId));
                    else if (isDelete) deletarAtivoRF(parsedId);
                } else if (data.ativoMoedaId) {
                    if (isEdit) abrirModalCadastroConta(todosOsAtivosMoedas.find(x => String(x.id) === String(parsedId)), 'moeda');
                    else if (isDelete) deletarAtivoMoeda(parsedId);
                } else if (data.posicaoId) { 
                    if (isDelete) deletarPosicao(parsedId); 
                } else if (data.editPosicaoId) { 
                    if(isEdit) abrirModalPosicaoInicial(posicaoInicial.find(x=>x.id===parsedId)); 
                }
            }
        }
        const btnAddCorretoraProvento = target.closest('.btn-add-corretora-provento');
        if (btnAddCorretoraProvento) {
            adicionarLinhaCorrecaoProvento(btnAddCorretoraProvento);
            return;
        }
        const revertBtn = target.closest('.reverter-btn');
        if (revertBtn) {
            const proventoId = revertBtn.dataset.proventoId;
            const checkbox = document.getElementById(`transfer-provento-${proventoId}`);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.disabled = false;
            }
            const itemInfo = revertBtn.closest('.transferencia-item').querySelector('.transferencia-item-info');
            if (itemInfo) itemInfo.style.display = 'none';
            revertBtn.style.display = 'none';
            return; 
        }
        if (target.classList.contains('modal')) { fecharModal(target.id); return; }
        const closeBtn = target.closest('.close-btn');
        if (closeBtn) { fecharModal(closeBtn.closest('.modal').id); return; }
        const iconePausa = target.closest('.icone-pausa-aporte');
        if (iconePausa) {
            const ticker = iconePausa.dataset.ticker;
            if (ticker) {
                const ativo = todosOsAtivos.find(a => a.ticker === ticker);
                if (ativo) {
                    ativo.statusAporte = ativo.statusAporte === 'Pausado' ? 'Ativo' : 'Pausado';
                    salvarAtivos();
                }
            } else if (iconePausa.id === 'icone-pausa-rf') {
                dadosAlocacao.statusAporteRendaFixa = dadosAlocacao.statusAporteRendaFixa === 'Pausado' ? 'Ativo' : 'Pausado';
                salvarDadosAlocacao();
            }
            renderizarTelaConsultaBalanceamento();
            return;
        }
        const btnAddAtivoAlocacao = target.closest('#btn-adicionar-ativo-alocacao');
        if (btnAddAtivoAlocacao) {
            const ticker = prompt('Digite o ticker do ativo que você deseja adicionar à sua estratégia de alocação (Ex: ITSA4):');
            if (!ticker) return;

            const tickerUpper = ticker.toUpperCase();
            
            // Validação 1: Verificar se o ativo está cadastrado
            const ativoInfo = todosOsAtivos.find(a => a.ticker === tickerUpper);
            if (!ativoInfo) {
                alert(`O ativo "${tickerUpper}" não foi encontrado no seu cadastro. Por favor, cadastre-o primeiro na tela de "Cadastro de Ativos".`);
                return;
            }

            // Validação 2: Verificar se o ativo já tem posição em carteira
            const posicoes = gerarPosicaoDetalhada();
            if (posicoes[tickerUpper] && posicoes[tickerUpper].quantidade > 0.000001) {
                alert(`O ativo "${tickerUpper}" já está na sua carteira e não pode ser adicionado novamente.`);
                return;
            }

            // Validação 3: Verificar se já não está na alocação
            if (dadosAlocacao.ativos[tickerUpper] !== undefined) {
                 alert(`O ativo "${tickerUpper}" já foi adicionado à sua alocação planejada.`);
                 return;
            }

            // Adiciona o ativo à alocação com 0%
            dadosAlocacao.ativos[tickerUpper] = 0;
            salvarDadosAlocacao();
            renderizarTelaRendaVariavel(); // Redesenha a tela para mostrar a nova linha
            alert(`Ativo "${tickerUpper}" adicionado à sua estratégia! Agora você pode definir um percentual de alocação ideal para ele.`);
            return;
        }
        const btnAbrirProvento = target.closest('.btn-abrir-modal-provento');
        if (btnAbrirProvento) {
            retornoModalProvento = btnAbrirProvento.dataset.origem;
            abrirModalLancamentoProvento();
            return;
        }
        const iconeRecorrente = target.closest('i.acao-btn-recorrente');
        if (iconeRecorrente) {
            const data = iconeRecorrente.dataset;
            const maeId = data.maeId;
            const ocorrenciaData = data.ocorrenciaData;
            const acaoEspecifica = data.action;
            const mae = todasAsTransacoesRecorrentes.find(r => String(r.id) === maeId);
            if (!mae) { alert('Erro: Regra de recorrência não encontrada.'); return; }
            switch (acaoEspecifica) {
                case 'CONFIRMAR_OCORRENCIA': executarAcaoRecorrente(mae.id, ocorrenciaData, 'CONFIRMAR_OCORRENCIA'); return;
                case 'PULAR_OCORRENCIA': executarAcaoRecorrente(mae.id, ocorrenciaData, 'PULAR_OCORRENCIA'); return;
                case 'ABRIR_MODAL_ACOES_RECORRENTE':
                    document.getElementById('recorrente-info-descricao').textContent = mae.descricao;
                    document.getElementById('recorrente-info-data').textContent = new Date(ocorrenciaData + 'T12:00:00').toLocaleDateString('pt-BR');
                    const tipoMovimentacao = mae.valor > 0 ? 'Entrada' : 'Saída';
                    const valorFormatado = (mae.targetType === 'moeda') ? formatarMoedaEstrangeira(Math.abs(mae.valor), todosOsAtivosMoedas.find(a => String(a.id) === mae.targetId)?.moeda || '') : formatarMoeda(Math.abs(mae.valor));
                    document.getElementById('recorrente-info-valor').textContent = `${tipoMovimentacao} de ${valorFormatado}`;
                    const containerBotoes = document.getElementById('recorrente-botoes-acao');
                    containerBotoes.innerHTML = `<div class="acao-recorrente-grid"><button class="btn acao-recorrente-btn btn-primario" onclick="executarAcaoRecorrente('${mae.id}', '${ocorrenciaData}', 'EDITAR_OCORRENCIA'); fecharModal('modal-acao-recorrente');"><i class="fas fa-pencil-alt"></i><span>Editar Apenas Esta Ocorrência</span><small>Cria uma transação permanente para esta data e abre o formulário para alteração. A regra original não será alterada.</small></button><button class="btn acao-recorrente-btn btn-secundario" onclick="executarAcaoRecorrente('${mae.id}', '${ocorrenciaData}', 'EDITAR_SERIE'); fecharModal('modal-acao-recorrente');"><i class="fas fa-cogs"></i><span>Editar Toda a Série</span><small>Abre o formulário para alterar a regra de recorrência (valor, frequência, etc.) para esta e todas as futuras ocorrências.</small></button><button class="btn acao-recorrente-btn btn-perigo" onclick="executarAcaoRecorrente('${mae.id}', '${ocorrenciaData}', 'EXCLUIR_SERIE'); fecharModal('modal-acao-recorrente');"><i class="fas fa-trash-alt"></i><span>Excluir Toda a Série</span><small>Apaga permanentemente a regra de recorrência para esta e todas as futuras ocorrências.</small></button></div>`;
                    abrirModal('modal-acao-recorrente');
                    return;
            }
        }
        const lancamentoProjetado = target.closest('.lancamento-projetado-clicavel');
        if (lancamentoProjetado) {
            const data = lancamentoProjetado.dataset;
            const source = data.lancamentoSource;
            const id = data.lancamentoId;
            const maeId = data.lancamentoMaeId;
            const ocorrenciaData = data.lancamentoData;
            switch (source) {
                case 'manual':
                case 'recorrente_confirmada':
                case 'provento_editado': // Unificado aqui
                case 'aporte_rf':
                case 'resgate_rf': {
                    const movimentacaoParaEditar = todasAsMovimentacoes.find(t => String(t.id) === id);
                    if (movimentacaoParaEditar) {
                        if(source === 'provento_editado') {
                            abrirModalEdicaoTransacaoProvento(movimentacaoParaEditar.id);
                        } else {
                            abrirModalNovaTransacaoMoeda(movimentacaoParaEditar);
                        }
                    }
                    break;
                }
                case 'recorrente_futura':
                    const acaoRecorrenteBtn = document.querySelector(`.acao-btn-recorrente[data-mae-id="${maeId}"][data-ocorrencia-data="${ocorrenciaData}"][data-action="ABRIR_MODAL_ACOES_RECORRENTE"]`);
                    if(acaoRecorrenteBtn) acaoRecorrenteBtn.click();
                    break;
                case 'nota': alert("Esta transação foi gerada por uma Nota de Negociação e não pode ser editada diretamente. Por favor, edite a nota original na tela 'Notas de Negociação'."); break;
                case 'provento':
                    // Para proventos originais, a edição do valor ainda é feita através de um modal específico
                    abrirModalEdicaoTransacaoProvento(null, id); // Passa o ID do evento para a função encontrar a transação
                    break;
                default: alert("Esta é uma transação automática e não pode ser editada diretamente."); break;
            }
            return;
        }
        const lancamentoMultiplo = target.closest('.lancamento-projetado-multiplo');
        if (lancamentoMultiplo) {
            alert('Este valor representa a soma de múltiplas transações no mesmo dia. Para editar ou excluir, por favor, acesse os lançamentos individualmente na tela de Extrato de Contas.');
            return;
        }
        if (e.target.closest('.btn-restaurar-backup')) {
            document.getElementById('restore-file-input').click();
        }

        // Lógica para os ícones da calculadora
        const icon = e.target.closest('.calculator-icon');
        if (icon) {
            const targetInputId = icon.dataset.targetInput;
            if (targetInputId) {
                openCalculator(targetInputId);
            }
        }
    });

    document.querySelector('.main-content').addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('alocacao-categoria-input')) {
            const categoria = target.dataset.categoria;
            const novoValor = parseDecimal(target.value) / 100;
            if (!dadosAlocacao.categorias) { dadosAlocacao.categorias = {}; }
            dadosAlocacao.categorias[categoria] = isNaN(novoValor) ? 0 : novoValor;
            salvarDadosAlocacao();
            renderizarDashboard();
        }
        if (target.classList.contains('alocacao-ativo-input')) {
            const ticker = target.dataset.ativoTicker;
            const novoValor = parseDecimal(target.value) / 100;
            if (!dadosAlocacao.ativos) { dadosAlocacao.ativos = {}; }
            dadosAlocacao.ativos[ticker] = isNaN(novoValor) ? 0 : novoValor;
            salvarDadosAlocacao();
            
            const telaAtiva = target.closest('.main-content > div[style*="display: block"]');
            if (telaAtiva && telaAtiva.id === 'tela-renda-variavel') {
                renderizarTelaRendaVariavel();
            }
        }
        const btnAbrirProvento = target.closest('.btn-abrir-modal-provento');
        if (btnAbrirProvento) {
            retornoModalProvento = btnAbrirProvento.dataset.origem;
            abrirModalLancamentoProvento();
            return;
        }
    });
    document.getElementById('btn-dashboard-backup').addEventListener('click', fazerBackup);
    document.getElementById('btn-backup').addEventListener('click', fazerBackup);
    document.getElementById('config-link-acoes').addEventListener('change', (e) => { linksExternos.acoes = e.target.value.trim(); salvarLinksExternos(); });
    document.getElementById('config-link-fiis').addEventListener('change', (e) => { linksExternos.fiis = e.target.value.trim(); salvarLinksExternos(); });
    document.getElementById('config-link-etfs').addEventListener('change', (e) => { linksExternos.etfs = e.target.value.trim(); salvarLinksExternos(); });
    document.getElementById('filtro-caixa-data-inicio').addEventListener('change', () => renderizarTelaCaixaGlobal(true));
    document.getElementById('filtro-caixa-data-fim').addEventListener('change', () => renderizarTelaCaixaGlobal(true));
    document.getElementById('config-cotacoes-url').addEventListener('change', (e) => { urlCotacoesCSV = e.target.value.trim(); salvarUrlCotacoes(); });
    document.getElementById('form-nova-transacao-moeda').addEventListener('submit', (e) => { 
        e.preventDefault(); 
        salvarMovimentacaoUniversal(e); // <-- CORREÇÃO: Passa o evento (e)
    });
    document.getElementById('titulo-tela-rv').addEventListener('click', () => {
        abrirModalGraficoCotacoesHistoricas('todos');
    });
    document.getElementById('form-add-operacao').addEventListener('submit', adicionarOperacao);
    document.getElementById('form-edicao-operacao').addEventListener('submit', salvarEdicaoOperacao);
    document.getElementById('form-cadastro-ativo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('ativo-id').value;
        const cnpjInput = document.getElementById('ativo-cnpj').value.replace(/[^\d]+/g,'');
        const adminCnpjInput = document.getElementById('ativo-admin-cnpj').value.replace(/[^\d]+/g,'');

        if (cnpjInput && !validarCNPJ(cnpjInput)) { alert('O CNPJ do Ativo informado é inválido.'); document.getElementById('ativo-cnpj').classList.add('is-invalid'); return; }
        document.getElementById('ativo-cnpj').classList.remove('is-invalid');
        if (document.getElementById('ativo-tipo').value === 'FII' && adminCnpjInput && !validarCNPJ(adminCnpjInput)) { alert('O CNPJ da Administradora informado é inválido.'); document.getElementById('ativo-admin-cnpj').classList.add('is-invalid'); return; }
        document.getElementById('ativo-admin-cnpj').classList.remove('is-invalid');

        const novoTicker = document.getElementById('ativo-ticker').value.toUpperCase();
        const tipoAtivo = document.getElementById('ativo-tipo').value;
        const metaYield = tipoAtivo === 'Ação' ? parseDecimal(document.getElementById('ativo-meta-yield-bazin').value) / 100 : 0;
        
        if (id) { // --- MODO EDIÇÃO ---
            const ativoOriginal = todosOsAtivos.find(a => a.id === parseFloat(id));
            if (!ativoOriginal) {
                alert("Erro: Ativo original não encontrado para edição.");
                return;
            }
            const tickerAntigo = ativoOriginal.ticker;

            if (tickerAntigo !== novoTicker) {
                // --- INÍCIO DA NOVA LÓGICA DE RENOMEAÇÃO ---
                if (!confirm(`Você alterou o ticker de "${tickerAntigo}" para "${novoTicker}".\n\nATENÇÃO: Esta ação irá atualizar TODOS os registros históricos (notas, proventos, posição inicial, etc.) associados a este ativo.\n\nDeseja continuar com a renomeação completa?`)) {
                    return; // Aborta a operação se o usuário cancelar
                }

                // 1. Atualizar todas as Notas
                todasAsNotas.forEach(nota => {
                    nota.operacoes.forEach(op => {
                        if (op.ativo === tickerAntigo) op.ativo = novoTicker;
                    });
                });

                // 2. Atualizar todos os Proventos
                todosOsProventos.forEach(provento => {
                    if (provento.ticker === tickerAntigo) provento.ticker = novoTicker;
                });

                // 3. Atualizar Posição Inicial e Histórico
                posicaoInicial.forEach(pos => {
                    if (pos.ticker === tickerAntigo) pos.ticker = novoTicker;
                });

                // 4. Atualizar Ajustes (Transferências, etc.)
                todosOsAjustes.forEach(ajuste => {
                    if (ajuste.ticker === tickerAntigo) ajuste.ticker = novoTicker;
                    if (ajuste.tipoAjuste === 'transferencia') {
                        ajuste.ativosTransferidos.forEach(at => {
                            if (at.ticker === tickerAntigo) at.ticker = novoTicker;
                        });
                    }
                });

                // 5. Atualizar Metas
                todasAsMetas.forEach(meta => {
                    if (meta.tipo === 'posicao_ativo' && meta.ativoAlvo === tickerAntigo) {
                        meta.ativoAlvo = novoTicker;
                    }
                });
                
                // 6. Atualizar estruturas que usam ticker como chave
                const renomearChaveObjeto = (obj) => {
                    if (obj && obj[tickerAntigo]) {
                        obj[novoTicker] = obj[tickerAntigo];
                        delete obj[tickerAntigo];
                    }
                };
                renomearChaveObjeto(dadosAlocacao.ativos);
                renomearChaveObjeto(dadosDeMercado.cotacoes);
                renomearChaveObjeto(dadosSimulacaoNegociar.acoes);
                renomearChaveObjeto(dadosSimulacaoNegociar.fiis);

                // 7. Atualizar Histórico de Snapshots
                historicoCarteira.forEach(snapshot => {
                    renomearChaveObjeto(snapshot.detalhesCarteira?.ativos);
                });

                // Salvar todas as estruturas de dados modificadas
                await Promise.all([
                    salvarNotas(),
                    salvarProventos(),
                    salvarPosicaoInicial(),
                    salvarAjustes(),
                    salvarMetas(),
                    salvarDadosAlocacao(),
                    salvarDadosDeMercado(),
                    salvarDadosSimulacaoNegociar(),
                    salvarHistoricoCarteira()
                ]);
                 // --- FIM DA NOVA LÓGICA DE RENOMEAÇÃO ---
            }

            // Atualiza os dados do ativo em si (seja o ticker novo ou o antigo)
            const index = todosOsAtivos.findIndex(a => a.id === parseFloat(id));
            if (index > -1) {
                todosOsAtivos[index].ticker = novoTicker;
                todosOsAtivos[index].tipo = tipoAtivo;
                todosOsAtivos[index].nomePregao = document.getElementById('ativo-nome-pregao').value;
                todosOsAtivos[index].nome = document.getElementById('ativo-nome').value;
                todosOsAtivos[index].cnpj = cnpjInput;
                todosOsAtivos[index].tipoAcao = document.getElementById('ativo-tipo-acao').value;
                todosOsAtivos[index].adminNome = document.getElementById('ativo-admin-nome').value;
                todosOsAtivos[index].adminCnpj = adminCnpjInput;
                todosOsAtivos[index].metaYieldBazin = metaYield;
            }

        } else { // --- MODO CRIAÇÃO ---
            const ativo = {
                id: Date.now(), ticker: novoTicker, tipo: tipoAtivo,
                nomePregao: document.getElementById('ativo-nome-pregao').value, nome: document.getElementById('ativo-nome').value,
                cnpj: cnpjInput, tipoAcao: document.getElementById('ativo-tipo-acao').value, adminNome: document.getElementById('ativo-admin-nome').value,
                adminCnpj: adminCnpjInput, metaYieldBazin: metaYield, statusAporte: 'Ativo'
            };
            todosOsAtivos.push(ativo);
        }
        
        salvarAtivos().then(() => {
            renderizarTabelaAtivos(); 
            fecharModal('modal-cadastro-ativo');
        });
    });
    document.getElementById('crescimento-tipo-analise').addEventListener('change', (e) => {
        const tipoAnalise = e.target.value;
        document.getElementById('container-analise-valor').style.display = tipoAnalise === 'valor' ? 'block' : 'none';
        document.getElementById('container-analise-periodo').style.display = tipoAnalise === 'periodo' ? 'flex' : 'none';
        document.getElementById('container-resultado-crescimento').style.display = 'none';
        document.getElementById('container-resultado-crescimento').innerHTML = '';
    });
    
    document.getElementById('form-crescimento-patrimonial').addEventListener('submit', (e) => {
        e.preventDefault();
        const tipoSaldo = document.getElementById('crescimento-tipo-saldo').value;
        const tipoAnalise = document.getElementById('crescimento-tipo-analise').value;
    
        if (tipoAnalise === 'valor') {
            const intervaloValor = parseDecimal(document.getElementById('crescimento-intervalo-valor').value);
            if (intervaloValor <= 0) {
                alert("O intervalo de valor deve ser maior que zero.");
                return;
            }
            const resultados = calcularCrescimentoPatrimonial(tipoSaldo, intervaloValor);
            renderizarResultadoCrescimento(resultados, intervaloValor);
        } else {
            const periodo = document.getElementById('crescimento-periodo').value;
            let dataInicioUsuario = document.getElementById('crescimento-data-inicio').value;
    
            if (!dataInicioUsuario && historicoCarteira.length > 0) {
                dataInicioUsuario = historicoCarteira[0].data;
                document.getElementById('crescimento-data-inicio').value = dataInicioUsuario;
            } else if (!dataInicioUsuario) {
                alert("Não há histórico de snapshots para analisar.");
                return;
            }
            
            const resultados = calcularCrescimentoPorPeriodo(tipoSaldo, periodo, dataInicioUsuario);
            renderizarResultadoCrescimentoPorPeriodo(resultados);
        }
    });
    document.getElementById('ativo-tipo').addEventListener('change', (e) => {
        const tipo = e.target.value;
        document.getElementById('fii-admin-fields').style.display = tipo === 'FII' ? 'block' : 'none';
        document.getElementById('acao-tipo-fields').style.display = tipo === 'Ação' ? 'block' : 'none';
    });
    document.getElementById('ativo-tipo').dispatchEvent(new Event('change'));
    document.getElementById('form-posicao-inicial').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('posicao-id').value;
        const ticker = document.getElementById('posicao-ativo').value.toUpperCase();
        if (!todosOsAtivos.some(a => a.ticker === ticker)) { alert(`O ativo "${ticker}" não está cadastrado. Por favor, cadastre-o primeiro.`); abrirModalCadastroAtivo(null, ticker); return; }
        const precoMedio = parseDecimal(document.getElementById('posicao-preco-medio').value);
        const posicoesPorCorretora = []; let quantidadeTotal = 0;
        document.querySelectorAll('.corretora-row').forEach(row => {
            const corretora = row.querySelector('.posicao-corretora').value;
            const quantidade = parseInt(row.querySelector('.posicao-quantidade').value);
            if (corretora && quantidade > 0) { posicoesPorCorretora.push({ corretora, quantidade }); quantidadeTotal += quantidade; }
        });
        if (posicoesPorCorretora.length === 0) { alert('Adicione pelo menos uma corretora e quantidade.'); return; }
        const novaPosicao = { id: id ? parseFloat(id) : Date.now(), tipoRegistro: 'SUMARIO_MANUAL', ticker: ticker, data: document.getElementById('posicao-data').value, precoMedio: precoMedio, posicoesPorCorretora: posicoesPorCorretora };
        if (id) { const index = posicaoInicial.findIndex(p => p.id === novaPosicao.id); if (index > -1) { posicaoInicial[index] = novaPosicao; } }
        else { posicaoInicial.push(novaPosicao); }
        
        salvarPosicaoInicial().then(() => {
            renderizarTabelaPosicaoInicial(); 
            fecharModal('modal-posicao-inicial');
        });
    });
    document.getElementById('btn-add-corretora-row').addEventListener('click', () => { adicionarLinhaCorretora(); });
    document.getElementById('form-lancamento-provento').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveButton.disabled = true;
        
        try {
            const id = document.getElementById('provento-id').value;
            const ticker = document.getElementById('provento-ativo').value.toUpperCase();
            const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
            if (!ativoInfo) { alert(`O ativo "${ticker}" não está cadastrado. Por favor, cadastre-o primeiro.`); abrirModalCadastroAtivo(null, ticker); return; }
            const valorIndividualBruto = parseDecimal(document.getElementById('provento-valor-individual').value);
            const aliquotaIRPercent = parseDecimal(document.getElementById('provento-ir').value) || 0;
            const aliquotaIR = aliquotaIRPercent / 100;
            const valorIndividualLiquido = valorIndividualBruto * (1 - aliquotaIR);

            const provento = { 
                id: id ? parseFloat(id) : Date.now(), ticker: ticker, tipo: document.getElementById('provento-tipo').value, 
                dataCom: document.getElementById('provento-data-com').value, dataPagamento: document.getElementById('provento-data-pagamento').value, 
                valorIndividual: valorIndividualLiquido, valorBrutoIndividual: valorIndividualBruto, percentualIR: aliquotaIRPercent
            };
            const dadosCalculados = calcularDadosProvento(provento.ticker, provento.dataCom, provento.valorIndividual);
            Object.assign(provento, dadosCalculados);
            const index = todosOsProventos.findIndex(p => p.id === provento.id);
            if (index > -1) { todosOsProventos[index] = provento; } else { todosOsProventos.push(provento); }
            const alertas = sincronizarProventoComTransacao(provento.id);
            
            await Promise.all([salvarProventos(), salvarMovimentacoes()]);
            
            // DISPARA A SINCRONIZAÇÃO SILENCIOSA
            sincronizarTodosOsRegistros(null, true);
            
            fecharModal('modal-lancamento-provento');

            if (retornoModalProvento && retornoModalProvento.startsWith('unificado-')) {
                const vista = retornoModalProvento.split('-')[1];
                abrirModalCalendariosUnificados(vista);
            } else if (retornoModalProvento === 'lista-proventos') {
                renderizarTabelaProventos();
            }
            retornoModalProvento = null; 
            if (alertas.length > 0) alert('Atenção:\n' + alertas.join('\n'));

        } finally {
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
    });
    document.getElementById('form-cadastro-conta').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('conta-id').value;
        const tipoOriginal = document.getElementById('conta-tipo-original').value;
        const moeda = document.getElementById('conta-moeda').value;
        let savePromise;
        
        if (moeda === 'BRL') {
            let bancoNome = document.getElementById('conta-banco').value;
            if (bancoNome === 'Outro') { bancoNome = document.getElementById('conta-outro-banco').value; }
            if (!bancoNome) { alert('O nome do banco é obrigatório.'); return; }

            const conta = {
                id: id ? parseFloat(id) : Date.now(),
                banco: bancoNome,
                tipo: document.getElementById('conta-tipo').value,
                moeda: 'BRL',
                numeroBanco: document.getElementById('conta-numero-banco').value,
                agencia: document.getElementById('conta-agencia').value,
                numero: document.getElementById('conta-numero').value,
                pix: document.getElementById('conta-pix').value,
                saldoInicial: parseDecimal(document.getElementById('conta-saldo-inicial').value),
                dataSaldoInicial: document.getElementById('conta-data-saldo-inicial').value,
                notas: document.getElementById('conta-notas').value
            };

            let index = -1;
            if(id) index = todasAsContas.findIndex(c => String(c.id) === String(id));
            
            if (index > -1) {
                todasAsContas[index] = conta;
            } else {
                todasAsContas.push(conta);
            }
            savePromise = salvarContas();

        } else { // Moeda estrangeira
            const nomeAtivo = document.getElementById('conta-nome-ativo').value;
            if (!nomeAtivo) { alert('O nome da conta/ativo é obrigatório.'); return; }
            
            const ativoMoeda = {
                id: id ? parseFloat(id) : Date.now(),
                nomeAtivo: nomeAtivo,
                moeda: moeda,
                descricao: '',
                saldoInicial: parseDecimal(document.getElementById('conta-saldo-inicial').value),
                dataSaldoInicial: document.getElementById('conta-data-saldo-inicial').value,
                notas: document.getElementById('conta-notas').value
            };

            let index = -1;
            if(id) index = todosOsAtivosMoedas.findIndex(a => String(a.id) === String(id));

            if (index > -1) {
                todosOsAtivosMoedas[index] = ativoMoeda;
            } else {
                todosOsAtivosMoedas.push(ativoMoeda);
            }
            
            if (tipoOriginal === 'conta' && id) {
                todasAsContas = todasAsContas.filter(c => String(c.id) !== String(id));
                salvarContas(); // Salva a remoção da conta antiga
            }
            
            savePromise = salvarAtivosMoedas();
        }
        
        savePromise.then(() => {
            renderizarTabelaContas();
            if(telas.caixaGlobal.style.display === 'block'){ renderizarTelaCaixaGlobal(true); }
            fecharModal('modal-cadastro-conta');
        });
    });
    document.getElementById('conta-banco').addEventListener('change', (e) => { document.getElementById('container-outro-banco').style.display = e.target.value === 'Outro' ? 'block' : 'none'; });
    document.getElementById('conta-banco').dispatchEvent(new Event('change'));
    document.getElementById('conta-tipo').addEventListener('change', (e) => { document.getElementById('conta-pix').disabled = (e.target.value !== 'Conta Corrente'); });
    document.getElementById('conta-tipo').dispatchEvent(new Event('change'));
    document.getElementById('form-cadastro-feriado').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('feriado-id').value;
        const feriado = { id: id ? parseFloat(id) : Date.now(), data: document.getElementById('feriado-data').value, descricao: document.getElementById('feriado-descricao').value };
        const index = todosOsFeriados.findIndex(f => f.id === feriado.id);
        if (index > -1) { todosOsFeriados[index] = feriado; } else { todosOsFeriados.push(feriado); }
        salvarFeriados().then(() => {
            renderizarTabelaFeriados(); 
            fecharModal('modal-cadastro-feriado');
        });
    });

    document.getElementById('form-evento-ativo').addEventListener('submit', (e) => {
        salvarEventoAtivo(e); // A função salvarEventoAtivo já foi corrigida para usar .then()
    });

    document.getElementById('form-edicao-transacao-provento').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- INÍCIO DA LÓGICA DO BOTÃO ---
        const saveButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveButton.disabled = true;

        try {
            // Espera a função (corrigida no passo 2) terminar
            await salvarEdicaoTransacaoProvento(); 
        
        } catch (error) {
            console.error("Erro ao salvar provento editado:", error);
            alert("Ocorreu um erro ao salvar a alteração.");
        
        } finally {
            // Restaura o botão
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
        // --- FIM DA LÓGICA DO BOTÃO ---
    });
    document.getElementById('form-valores-venda').addEventListener('submit', salvarValoresVenda);
    document.getElementById('form-evento-corporativo').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('evento-id').value;
        const ticker = document.getElementById('evento-ticker').value.toUpperCase();
        if (!todosOsAtivos.some(a => a.ticker === ticker)) { alert(`O ativo "${ticker}" não está cadastrado. Por favor, cadastre-o primeiro.`); abrirModalCadastroAtivo(null, ticker); return; }
        const novoEvento = {
            id: id ? parseFloat(id) : Date.now(), tipoAjuste: 'split_grupamento', ticker: ticker, data: document.getElementById('evento-data').value,
            tipoEvento: document.getElementById('evento-tipo').value, proporcaoDe: parseFloat(document.getElementById('evento-proporcao-de').value),
            proporcaoPara: parseFloat(document.getElementById('evento-proporcao-para').value)
        };
        if (isNaN(novoEvento.proporcaoDe) || isNaN(novoEvento.proporcaoPara) || novoEvento.proporcaoDe <= 0 || novoEvento.proporcaoPara <= 0) { alert('As proporções devem ser números positivos.'); return; }
        const index = todosOsAjustes.findIndex(a => a.id === novoEvento.id);
        if (index > -1) { todosOsAjustes[index] = novoEvento; } else { todosOsAjustes.push(novoEvento); }
        
        salvarAjustes().then(() => {
            renderizarTabelaEventosCorporativos(); 
            fecharModal('modal-evento-corporativo'); 
            alert('Evento corporativo salvo com sucesso!');
        });
    });
    document.getElementById('form-corrigir-data').addEventListener('submit', salvarCorrecaoData);
    document.getElementById('form-cadastro-ativo-rf').addEventListener('submit', (e) => {
        salvarAtivoRF(e); // A função salvarAtivoRF já foi corrigida
    });

    document.getElementById('form-aporte-rf').addEventListener('submit', (e) => {
        salvarAporteRF(e); // A função salvarAporteRF já foi corrigida
    });

    document.getElementById('form-resgate-rf').addEventListener('submit', (e) => {
        salvarResgateRF(e); // A função salvarResgateRF já foi corrigida
    });
    document.getElementById('evento-ativo-tipo').addEventListener('change', (e) => {
        const tipo = e.target.value;
        const saveButton = document.querySelector('#form-evento-ativo button[type="submit"]');
        const precoMedioInput = document.getElementById('evento-ativo-pm');
        precoMedioInput.required = (tipo === 'entrada');
        document.getElementById('container-evento-entrada-fields').style.display = tipo === 'entrada' ? 'block' : 'none';
        document.getElementById('container-evento-saida-fields').style.display = tipo === 'saida' ? 'block' : 'none';
    
        saveButton.style.display = tipo ? 'block' : 'none';
    
        document.getElementById('evento-ativo-ticker').dispatchEvent(new Event('change'));
    });
    document.getElementById('evento-ativo-tipo').dispatchEvent(new Event('change'));
    document.getElementById('evento-ativo-ticker').addEventListener('change', (e) => {
        const ticker = e.target.value.toUpperCase();
        const tipoEvento = document.getElementById('evento-ativo-tipo').value;
        const dataEvento = document.getElementById('evento-ativo-data').value;
        
        // Pega a referência do botão de salvar
        const saveButton = document.querySelector('#form-evento-ativo button[type="submit"]');
        
        const containerEntrada = document.getElementById('evento-entrada-corretoras-container');
        const containerSaida = document.getElementById('evento-saida-posicao-container');

        containerEntrada.innerHTML = '';
        containerSaida.innerHTML = '';
        
        // CORREÇÃO: Esconde o botão novamente se o ticker for apagado ou inválido
        saveButton.style.display = 'none';

        if (!ticker || !dataEvento) {
            containerEntrada.innerHTML = '<p>Informe o ticker e a data do evento para carregar as corretoras.</p>';
            containerSaida.innerHTML = '<p>Informe o ticker e a data do evento para carregar a posição.</p>';
            return;
        }
        
        const posicoesNaData = gerarPosicaoDetalhada(dataEvento);
        const posDoAtivo = posicoesNaData[ticker];

        // CORREÇÃO: Mostra o botão de salvar somente APÓS a lógica de exibição de quantidades ser concluída
        saveButton.style.display = 'block';

        if (!posDoAtivo || posDoAtivo.quantidade === 0) {
            if (tipoEvento === 'saida') {
                containerSaida.innerHTML = '<p>Nenhuma posição encontrada para este ativo na data selecionada.</p>';
                saveButton.style.display = 'none'; // Esconde se não há o que retirar
                return;
            } else if (tipoEvento === 'entrada') {
                const corretoras = getTodasCorretoras();
                if (corretoras.length === 0) {
                    containerEntrada.innerHTML = '<p>Nenhuma corretora cadastrada. Cadastre suas corretoras primeiro.</p>';
                    saveButton.style.display = 'none'; // Esconde se não há onde entrar
                } else {
                    containerEntrada.innerHTML = corretoras.map(c => `
                        <div class="form-row">
                            <div class="form-group"><label>${c}</label></div>
                            <div class="form-group"><input type="number" class="evento-entrada-qtd" data-corretora="${c}" min="1" placeholder="Qtd."></div>
                        </div>
                    `).join('');
                }
                return;
            }
        }
        
        if (tipoEvento === 'entrada') {
            const corretorasDisponiveis = new Set(getTodasCorretoras());
            for (const corretora in posDoAtivo.porCorretora) {
                if (posDoAtivo.porCorretora[corretora] > 0) {
                    corretorasDisponiveis.add(corretora);
                }
            }
            containerEntrada.innerHTML = [...corretorasDisponiveis].sort().map(c => `
                <div class="form-row">
                    <div class="form-group"><label>${c}</label></div>
                    <div class="form-group"><input type="number" class="evento-entrada-qtd" data-corretora="${c}" min="1" placeholder="Qtd."></div>
                </div>
            `).join('');
        } else if (tipoEvento === 'saida') {
            let tableHtml = `<table><thead><tr><th>Corretora</th><th>Qtd. Atual</th><th>Qtd. a Retirar</th></tr></thead><tbody>`;
            let hasPositions = false;
            for (const corretora in posDoAtivo.porCorretora) {
                const qtd = posDoAtivo.porCorretora[corretora];
                if (qtd > 0) {
                    hasPositions = true;
                    tableHtml += `<tr>
                        <td>${corretora}</td>
                        <td class="numero">${Math.round(qtd)}</td>
                        <td><input type="number" class="qtd-saida-input" data-corretora="${corretora}" min="0" max="${Math.round(qtd)}" value="0"></td>
                    </tr>`;
                }
            }
            tableHtml += `</tbody></table>`;
            if (hasPositions) {
                containerSaida.innerHTML = tableHtml;
            } else {
                containerSaida.innerHTML = '<p>Nenhuma posição encontrada para este ativo na data selecionada para retirada.</p>';
                saveButton.style.display = 'none'; // Esconde se não há posições para retirar
            }
        }
    });
    document.getElementById('posicao-rf-container').addEventListener('blur', (e) => {
        const target = e.target;
        if (target.classList.contains('editable-saldo-rf')) {
            const ativoRFId = parseFloat(target.dataset.rfId);
            const novoSaldoStr = target.textContent;
            salvarEdicaoSaldoLiquidoRF(ativoRFId, novoSaldoStr);
        }
    }, true);
    
    document.getElementById('posicao-rf-container').addEventListener('keydown', (e) => {
        const target = e.target;
        if (e.key === 'Enter' && target.classList.contains('editable-saldo-rf')) {
            e.preventDefault(); 
            target.blur();      
        }
    });
    document.getElementById('evento-ativo-ticker').dispatchEvent(new Event('change'));
    document.getElementById('evento-ativo-data').addEventListener('change', (e) => { document.getElementById('evento-ativo-ticker').dispatchEvent(new Event('change')); });
    document.getElementById('select-ativo-historico').addEventListener('change', (e) => { const ticker = e.target.value; renderizarTabelaHistoricoParaAtivo(ticker); });
    document.getElementById('ir-filtro-ano').addEventListener('change', () => {
        renderizarCalculadoraIR();
        atualizarStatusBotaoIR(); // <-- ADICIONADO AQUI
    });
    document.getElementById('btn-imprimir-ir').addEventListener('click', () => {
        const anoSelecionado = document.getElementById('ir-filtro-ano').value;
        const anoAtual = new Date().getFullYear();
        
        if (parseInt(anoSelecionado, 10) === anoAtual) {
            alert("Não é possível emitir o relatório para Imposto de Renda do ano corrente. Por favor, selecione um ano anterior.");
            return;
        }
        
        gerarRelatorioIR(anoSelecionado);
    });
    document.getElementById('lista-de-proventos').addEventListener('click', (e) => {
        const header = e.target.closest('th.sortable');
        if (header) {
            const key = header.dataset.key;
            if (sortConfigProventos.key === key) {
                sortConfigProventos.direction = sortConfigProventos.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfigProventos.key = key;
                sortConfigProventos.direction = 'ascending';
            }
            renderizarTabelaProventos();
        }
    });
    document.getElementById('lista-de-ativos-cadastrados').addEventListener('click', (e) => {
        const header = e.target.closest('th.sortable');
        if (header) {
            const key = header.dataset.key;
            if (sortConfigAtivos.key === key) {
                sortConfigAtivos.direction = sortConfigAtivos.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfigAtivos.key = key;
                sortConfigAtivos.direction = 'ascending'; // Padrão para nova coluna é ascendente
            }
            renderizarTabelaAtivos();
        }
    });
    document.getElementById('container-caixa-global').addEventListener('click', (e) => {
        const header = e.target.closest('.conta-header');
        if (header) {
            header.closest('.conta-coluna').classList.toggle('minimized');
        }
    });
    document.getElementById('rv-filtro-corretora').addEventListener('change', renderizarTelaRendaVariavel);
    document.getElementById('rv-filtro-data').addEventListener('change', renderizarTelaRendaVariavel);
    document.getElementById('info-buttons-rv').addEventListener('click', (e) => {
        const targetButton = e.target.closest('.info-button'); // ALTERAÇÃO AQUI
        if (!targetButton) return; // Se o clique não foi em um botão, sai da função

        const action = targetButton.dataset.action; // ALTERAÇÃO AQUI
        if (action === 'performance') {
            abrirModalPerformance('Renda Variável');
        } else if (action === 'proventos') {
            abrirModalCalendariosUnificados();
        } else if (action === 'alocacao') {
            abrirModalBalanceamento('Renda Variável');
        }
    });
    document.getElementById('calendario-geral-filtro-corretora').addEventListener('change', renderizarCalendarioGeral);
    document.getElementById('titulo-calendario-geral').addEventListener('click', abrirModalProventosAnuais);
    document.querySelectorAll('.cotacao-moeda-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const moeda = e.target.dataset.moeda;
            const valor = parseDecimal(e.target.value);
            if (moeda) {
                dadosMoedas.cotacoes[moeda] = valor;
                salvarDadosMoedas();
                if (telas.caixaGlobal.style.display === 'block') {
                    renderizarTelaCaixaGlobal(true);
                }
            }
        });
    });
    document.getElementById('negociar-aporte-valor').addEventListener('input', (e) => { dadosSimulacaoNegociar.aporteTotal = e.target.value; atualizarResumoAporte(); });
    document.getElementById('negociar-aporte-valor').addEventListener('change', (e) => { salvarDadosSimulacaoNegociar(); });
    document.getElementById('posicao-rv-container').addEventListener('click', (e) => {
        const h2Header = e.target.closest('h2.titulo-clicavel-grafico');
        if (h2Header) {
            const tipoAtivo = h2Header.dataset.tipoAtivo;
            if (tipoAtivo) {
                abrirModalGraficoCotacoesHistoricas(tipoAtivo);
            }
            return;
        }
        
        const header = e.target.closest('th.sortable');
        if (header) {
            const table = header.closest('table');
            if (!table) return;
            
            const tipoAtivo = table.dataset.tipoAtivo;
            const key = header.dataset.key;
            if (!tipoAtivo || !key) return;

            if (sortConfigRendaVariavel[tipoAtivo].key === key) {
                sortConfigRendaVariavel[tipoAtivo].direction = sortConfigRendaVariavel[tipoAtivo].direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfigRendaVariavel[tipoAtivo].key = key;
                sortConfigRendaVariavel[tipoAtivo].direction = 'ascending';
            }
            renderizarTelaRendaVariavel();
            return;
        }

        const btnExcluirAtivoPlanejado = e.target.closest('.excluir-ativo-planejado');
        if (btnExcluirAtivoPlanejado) {
            e.stopPropagation(); 
            const ticker = btnExcluirAtivoPlanejado.dataset.ticker;
            
            if (confirm(`Tem certeza de que deseja remover o ativo "${ticker}" da sua alocação planejada?`)) {
                delete dadosAlocacao.ativos[ticker]; 

                if (currentUser) {
                    const { doc, updateDoc, deleteField } = window.dbFunctions;
                    const userDocRef = doc(window.db, 'carteiras', currentUser.uid);
                    const campoParaDeletar = `dadosAlocacao.ativos.${ticker}`;
                    
                    updateDoc(userDocRef, { [campoParaDeletar]: deleteField() })
                        .then(() => {
                            console.log(`Ativo planejado ${ticker} removido com sucesso do Firestore.`);
                            renderizarTelaRendaVariavel();
                        })
                        .catch(error => {
                            console.error("Erro ao remover ativo planejado do Firestore:", error);
                            dadosAlocacao.ativos[ticker] = 0; 
                            alert("Ocorreu um erro ao sincronizar a remoção com a nuvem.");
                        });
                } else {
                    salvarDadosAlocacao();
                    renderizarTelaRendaVariavel();
                }
            }
            return;
        }

        const ativoRow = e.target.closest('.ativo-row-clickable');
        if (ativoRow) {
            const tr = ativoRow.closest('tr');
            const ticker = tr.dataset.ticker;
            if (ticker) {
                const precoMedio = parseDecimal(tr.cells[2].textContent);
                const precoAtual = parseDecimal(tr.cells[3].textContent);
                abrirModalResumoDividendos(ticker, precoMedio, precoAtual);
            }
            return;
        }
    });
    document.querySelectorAll('#ir-tabela-fiis, #ir-tabela-acoes, #ir-tabela-etfs, #ir-tabela-daytrade').forEach(tableContainer => {
        tableContainer.addEventListener('blur', (e) => {
            const target = e.target;
            if (target.classList.contains('editable-result')) {
                const chaveAjuste = target.dataset.chaveAjuste;
                const resultadoCalculado = parseFloat(target.dataset.resultadoCalculado);
                const novoValorExibido = parseDecimal(target.textContent);

                const ajusteNecessario = novoValorExibido - resultadoCalculado;

                const index = todosOsAjustesIR.findIndex(a => a.chave === chaveAjuste);
                if (ajusteNecessario !== 0) {
                    if (index > -1) {
                        todosOsAjustesIR[index].valor = ajusteNecessario;
                    } else {
                        todosOsAjustesIR.push({ chave: chaveAjuste, valor: ajusteNecessario });
                    }
                } else {
                    if (index > -1) {
                        todosOsAjustesIR.splice(index, 1);
                    }
                }
                salvarAjustesIR();
                renderizarCalculadoraIR();
            }
        }, true);
    });
    
    document.getElementById('btn-add-5-linhas-posicao').addEventListener('click', () => {
        const tbody = document.getElementById('tabela-posicao-massa-body');
        for (let i = 0; i < 5; i++) {
            tbody.appendChild(gerarLinhaPosicaoMassaHTML());
        }
    });

    document.getElementById('btn-salvar-posicao-massa').addEventListener('click', salvarPosicoesEmMassa);

    document.getElementById('btn-voltar-lista-posicao').addEventListener('click', () => {
        mostrarTela('posicaoInicial');
        renderizarTabelaPosicaoInicial();
    });

    document.getElementById('btn-edicao-rapida-ativos').addEventListener('click', () => {
        isAtivosEditMode = true;
        document.getElementById('botoes-ativos-padrao').style.display = 'none';
        document.getElementById('botoes-ativos-edicao').style.display = 'flex';
        renderizarTabelaAtivos();
    });

    document.getElementById('btn-cancelar-edicao-rapida-ativos').addEventListener('click', () => {
        isAtivosEditMode = false;
        document.getElementById('botoes-ativos-padrao').style.display = 'flex';
        document.getElementById('botoes-ativos-edicao').style.display = 'none';
        renderizarTabelaAtivos();
    });

    document.getElementById('btn-salvar-edicao-rapida-ativos').addEventListener('click', () => {
        const rows = document.querySelectorAll('#tabela-ativos-body tr');
        rows.forEach(row => {
            const id = parseFloat(row.dataset.id);
            const ativo = todosOsAtivos.find(a => a.id === id);
            if (ativo) {
                row.querySelectorAll('.edit-field').forEach(input => {
                    const field = input.dataset.field;
                    let value = input.value;
                    if (field === 'ticker') value = value.toUpperCase();
                    if (field === 'cnpj') value = value.replace(/\D/g, '');
                    if (field === 'metaYieldBazin') {
                        value = parseDecimal(value) / 100;
                        if(ativo.tipo !== 'Ação') return;
                    }
                    ativo[field] = value;
                });
            }
        });
        salvarAtivos();
        isAtivosEditMode = false;
        document.getElementById('botoes-ativos-padrao').style.display = 'flex';
        document.getElementById('botoes-ativos-edicao').style.display = 'none';
        renderizarTabelaAtivos();
        alert('Alterações salvas com sucesso!');
    });
    document.getElementById('btn-edicao-rapida-proventos').addEventListener('click', () => {
        isProventosEditMode = true;
        document.getElementById('botoes-proventos-padrao').style.display = 'none';
        document.getElementById('botoes-proventos-edicao').style.display = 'flex';
        renderizarTabelaProventos();
    });

    document.getElementById('btn-cancelar-edicao-rapida-proventos').addEventListener('click', () => {
        isProventosEditMode = false;
        document.getElementById('botoes-proventos-padrao').style.display = 'flex';
        document.getElementById('botoes-proventos-edicao').style.display = 'none';
        renderizarTabelaProventos();
    });

    document.getElementById('btn-salvar-edicao-rapida-proventos').addEventListener('click', () => {
        const rows = document.querySelectorAll('#lista-de-proventos tbody tr');
        rows.forEach(row => {
            const id = parseFloat(row.dataset.id);
            const provento = todosOsProventos.find(p => p.id === id);
            if (provento) {
                row.querySelectorAll('.edit-field').forEach(input => {
                    const field = input.dataset.field;
                    let value = input.value;
                    if (field === 'ticker') value = value.toUpperCase();
                    if (field === 'valorIndividual') value = parseDecimal(value);
                    
                    // --- INÍCIO DA ALTERAÇÃO ---
                    // Garante que a edição rápida atualize o valor líquido, mas também recalcule o bruto
                    if (field === 'valorIndividual') {
                        const aliquotaIR = (provento.percentualIR || 0) / 100;
                        const valorLiquido = parseDecimal(value);
                        provento.valorIndividual = valorLiquido;
                        provento.valorBrutoIndividual = (aliquotaIR > 0) ? valorLiquido / (1 - aliquotaIR) : valorLiquido;
                    } else {
                        provento[field] = value;
                    }
                    // --- FIM DA ALTERAÇÃO ---
                });
                const dadosCalculados = calcularDadosProvento(provento.ticker, provento.dataCom, provento.valorIndividual);
                Object.assign(provento, dadosCalculados);
                sincronizarProventoComTransacao(provento.id);
            }
        });
        salvarProventos();
        salvarMovimentacoes();
        
        // DISPARA A SINCRONIZAÇÃO SILENCIOSA
        sincronizarTodosOsRegistros(null, true);

        isProventosEditMode = false;
        document.getElementById('botoes-proventos-padrao').style.display = 'flex';
        document.getElementById('botoes-proventos-edicao').style.display = 'none';
        renderizarTabelaProventos();
        alert('Alterações salvas com sucesso!');
    });

    document.getElementById('provento-filtro-data-de').addEventListener('change', renderizarTabelaProventos);
    document.getElementById('provento-filtro-data-ate').addEventListener('change', renderizarTabelaProventos);
    document.getElementById('provento-filtro-ativo').addEventListener('input', renderizarTabelaProventos);
    document.getElementById('provento-filtro-tipo').addEventListener('change', renderizarTabelaProventos);
    document.getElementById('provento-filtro-status').addEventListener('change', renderizarTabelaProventos);
    document.getElementById('provento-filtro-posicao').addEventListener('change', renderizarTabelaProventos);
    document.getElementById('btn-adicionar-proventos-massa').addEventListener('click', () => { mostrarTela('proventosMassa'); renderizarTelaProventosMassa(); });
    const btnAddLinhasProvento = document.getElementById('btn-add-5-linhas-provento');
    if (btnAddLinhasProvento) {
        btnAddLinhasProvento.addEventListener('click', () => {
            const tbody = document.getElementById('tabela-proventos-massa-body');
            for (let i = 0; i < 5; i++) {
                tbody.appendChild(gerarLinhaProventoMassaHTML());
            }
        });
    }
    document.getElementById('btn-salvar-proventos-massa').addEventListener('click', salvarProventosEmMassa);
    document.getElementById('btn-voltar-lista-proventos').addEventListener('click', () => { mostrarTela('proventos'); renderizarTabelaProventos(); });
    document.getElementById('form-buscar-ativo-historico').addEventListener('submit', buscarAtivoParaHistorico);
    document.getElementById('btn-add-linha-historico').addEventListener('click', () => { adicionarLinhaHistorico(document.getElementById('tabela-historico-body')); });
    document.getElementById('form-salvar-historico').addEventListener('submit', salvarHistoricoAtivo);
    document.getElementById('btn-cancelar-historico').addEventListener('click', cancelarAdicaoHistorico);
    document.getElementById('transferencia-corretora-origem').addEventListener('change', (e) => {
        const corretoraOrigem = e.target.value;
        const dataTransferencia = document.getElementById('transferencia-data').value;
        if (corretoraOrigem && dataTransferencia) {
            popularAtivosParaTransferencia(corretoraOrigem, dataTransferencia);
        } else {
            document.getElementById('transferencia-ativos-container').style.display = 'none';
        }
    });
    document.getElementById('transferencia-data').addEventListener('change', (e) => {
        const corretoraOrigem = document.getElementById('transferencia-corretora-origem').value;
        const dataTransferencia = e.target.value;
        if (corretoraOrigem && dataTransferencia) {
            popularAtivosParaTransferencia(corretoraOrigem, dataTransferencia);
        } else {
            document.getElementById('transferencia-ativos-container').style.display = 'none';
        }
    });
    document.getElementById('form-transferencia-custodia').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveButton.disabled = true;

        try {
            const id = document.getElementById('transferencia-id').value;
            const corretoraOrigem = document.getElementById('transferencia-corretora-origem').value;
            const corretoraDestino = document.getElementById('transferencia-corretora-destino').value;
            const dataTransferencia = document.getElementById('transferencia-data').value;
            
            const transferenciaOriginal = id ? todosOsAjustes.find(a => a.id === parseFloat(id)) : null;
            const proventosOriginaisIds = new Set(transferenciaOriginal?.proventosTransferidos || []);

            const proventosSelecionadosAtualIds = new Set();
            document.querySelectorAll('#transferencia-proventos-disponiveis input[name="transfer-provento"]').forEach(checkbox => {
                if (checkbox.checked) {
                    proventosSelecionadosAtualIds.add(parseFloat(checkbox.value));
                }
            });

            const proventosParaAdicionar = [...proventosSelecionadosAtualIds].filter(id => !proventosOriginaisIds.has(id));
            const proventosParaReverter = [...proventosOriginaisIds].filter(id => !proventosSelecionadosAtualIds.has(id));
            
            let proventosModificados = false;

            for (const provId of proventosParaReverter) {
                const provento = todosOsProventos.find(p => p.id === provId);
                if (provento && provento.posicaoPorCorretora[corretoraDestino]) {
                    provento.posicaoPorCorretora[corretoraOrigem] = provento.posicaoPorCorretora[corretoraDestino];
                    delete provento.posicaoPorCorretora[corretoraDestino];
                    delete provento.pagamentoRedirecionadoManualmente;
                    proventosModificados = true;
                }
            }
            
            for (const provId of proventosParaAdicionar) {
                const provento = todosOsProventos.find(p => p.id === provId);
                if (provento && provento.posicaoPorCorretora[corretoraOrigem]) {
                    const dadosOrigem = provento.posicaoPorCorretora[corretoraOrigem];
                    if (provento.posicaoPorCorretora[corretoraDestino]) {
                        provento.posicaoPorCorretora[corretoraDestino].quantidade += dadosOrigem.quantidade;
                        provento.posicaoPorCorretora[corretoraDestino].valorRecebido += dadosOrigem.valorRecebido;
                    } else {
                        provento.posicaoPorCorretora[corretoraDestino] = dadosOrigem;
                    }
                    delete provento.posicaoPorCorretora[corretoraOrigem];
                    provento.pagamentoRedirecionadoManualmente = true;
                    proventosModificados = true;
                }
            }

            if (proventosModificados) {
                await salvarProventos();
                proventosParaAdicionar.forEach(sincronizarProventoComTransacao);
                proventosParaReverter.forEach(sincronizarProventoComTransacao);
            }

            const ativosTransferir = [];
            document.querySelectorAll('#transferencia-ativos-disponiveis input[name="transfer-ativo"]:checked').forEach(checkbox => {
                const ticker = checkbox.value;
                const quantidade = parseInt(checkbox.parentElement.querySelector('.transfer-quantidade').value, 10);
                if (quantidade > 0) ativosTransferir.push({ ticker, quantidade });
            });

            if (ativosTransferir.length === 0 && proventosSelecionadosAtualIds.size === 0) {
                alert('Selecione pelo menos um ativo ou um provento para transferir.');
                return;
            }

            const novaTransferencia = {
                id: id ? parseFloat(id) : Date.now(), tipoAjuste: 'transferencia',
                corretoraOrigem, corretoraDestino, data: dataTransferencia,
                ativosTransferidos: ativosTransferir,
                proventosTransferidos: Array.from(proventosSelecionadosAtualIds)
            };

            if (id) {
                const index = todosOsAjustes.findIndex(a => a.id === novaTransferencia.id);
                if (index > -1) todosOsAjustes[index] = novaTransferencia;
            } else {
                todosOsAjustes.push(novaTransferencia);
            }

            await salvarAjustes();
            if (proventosModificados) {
                await salvarMovimentacoes();
            }

            renderizarTabelaTransferencias();
            document.getElementById('form-transferencia-custodia').reset();
            document.getElementById('transferencia-id').value = '';
            document.getElementById('transferencia-form-titulo').textContent = 'Registrar Nova Transferência de Custódia';
            document.getElementById('transferencia-ativos-container').style.display = 'none';
            alert('Transferência registrada com sucesso!');

        } finally {
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
    });

    document.getElementById('form-buscar-posicao-pm').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = document.getElementById('ajuste-pm-data').value;
        if (!data) return;

        const posicoesNaData = gerarPosicaoDetalhada(data);
        const ativosEmPosicao = Object.entries(posicoesNaData).filter(([_, p]) => p.quantidade > 0.000001);

        const containerAjustePM = document.getElementById('container-ajuste-pm-lista');
        const tabelaAjustePMBody = document.getElementById('tabela-ajuste-pm');
        document.getElementById('ajuste-pm-data-selecionada').textContent = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
        tabelaAjustePMBody.innerHTML = '';

        if (ativosEmPosicao.length === 0) {
            tabelaAjustePMBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma posição encontrada nesta data.</td></tr>';
            containerAjustePM.style.display = 'block';
            return;
        }

        ativosEmPosicao.sort((a,b) => a[0].localeCompare(b[0])).forEach(([ticker, dados]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ticker}</td>
                <td class="numero">${Math.round(dados.quantidade)}</td>
                <td class="numero">${formatarPrecoMedio(dados.precoMedio)}</td>
                <td><input type="text" class="ajuste-pm-input" data-ticker="${ticker}" data-data="${data}" value="${formatarDecimalParaInput(dados.precoMedio)}"></td>
            `;
            tabelaAjustePMBody.appendChild(tr);
        });
        containerAjustePM.style.display = 'block';
    });

    document.getElementById('form-salvar-ajuste-pm').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputsAjuste = document.querySelectorAll('.ajuste-pm-input');
        let ajustesSalvos = 0;

        inputsAjuste.forEach(input => {
            const ticker = input.dataset.ticker;
            const data = input.dataset.data;
            const novoPrecoMedio = parseDecimal(input.value);

            const ajusteExistenteIndex = todosOsAjustes.findIndex(a => 
                a.tipoAjuste === 'ajuste_pm' && a.ticker === ticker && a.data === data
            );

            if (novoPrecoMedio > 0) {
                if (ajusteExistenteIndex > -1) {
                    todosOsAjustes[ajusteExistenteIndex].novoPrecoMedio = novoPrecoMedio;
                } else {
                    todosOsAjustes.push({
                        id: Date.now() + Math.random(),
                        tipoAjuste: 'ajuste_pm',
                        ticker: ticker,
                        data: data,
                        novoPrecoMedio: novoPrecoMedio
                    });
                }
                ajustesSalvos++;
            } else {
                if (ajusteExistenteIndex > -1) {
                    todosOsAjustes.splice(indexExistente, 1);
                }
            }
        });
        salvarAjustes();
        alert(`${ajustesSalvos} ajuste(s) de preço médio salvo(s) com sucesso!`);
        document.getElementById('container-ajuste-pm-lista').style.display = 'none';
        document.getElementById('form-buscar-posicao-pm').reset();
    });

    document.getElementById('btn-excluir-todos-ativos').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja EXCLUIR TODOS OS ATIVOS? Esta ação é irreversível.')) {
            todosOsAtivos = [];
            salvarAtivos();
            renderizarTabelaAtivos();
            alert('Todos os ativos foram excluídos.');
        }
    });
    document.getElementById('toggle-aportes-grafico').addEventListener('click', (e) => {
        const btn = e.target.closest('.chart-toggle-btn');
        if (btn && !btn.classList.contains('ativo')) {
            tipoGraficoAportes = btn.dataset.tipo;
            renderizarGraficoAportesProventos();
        }
    });
    document.getElementById('btn-excluir-todos-feriados').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja EXCLUIR TODOS OS FERIADOS? Esta ação é irreversível.')) {
            todosOsFeriados = [];
            salvarFeriados();
            renderizarTabelaFeriados();
            alert('Todos os feriados foram excluídos.');
        }
    });

    document.getElementById('btn-excluir-todas-posicoes').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja EXCLUIR TODAS AS POSIÇÕES INICIAIS E HISTÓRICAS? Esta ação é irreversível.')) {
            posicaoInicial = [];
            salvarPosicaoInicial();
            renderizarTabelaPosicaoInicial();
            alert('Todas as posições iniciais foram excluídas.');
        }
    });
    
    document.getElementById('btn-excluir-todos-ativos-rf').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja EXCLUIR TODAS AS APLICAÇÕES DE RENDA FIXA? Esta ação é irreversível.')) {
            todosOsAtivosRF = [];
            todosOsRendimentosRealizadosRF = [];
            todosOsRendimentosRFNaoRealizados = [];
            salvarAtivosRF();
            salvarRendimentosRealizadosRF();
            salvarRendimentosRFNaoRealizados();
            renderizarTabelaAtivosRF();
            alert('Todas as aplicações de Renda Fixa foram excluídas.');
        }
    });

    document.getElementById('btn-excluir-todas-notas').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja EXCLUIR TODAS AS NOTAS DE NEGOCIAÇÃO? Esta ação é irreversível.')) {
            todasAsNotas = [];
            salvarNotas();
            renderizarListaNotas();
            alert('Todas as notas de negociação foram excluídas.');
        }
    });
    document.getElementById('btn-cancelar-importacao-notas').addEventListener('click', () => {
        if (confirm('Deseja cancelar a importação de notas? Os dados não serão salvos.')) {
            mostrarTela('listaNotas');
            renderizarListaNotas();
        }
    });
    document.getElementById('btn-salvar-notas-importadas').addEventListener('click', salvarNotasImportadas);

    document.getElementById('btn-cancelar-importacao-historico').addEventListener('click', () => {
        if (confirm('Deseja cancelar a importação do histórico? Os dados não serão salvos.')) {
            mostrarTela('posicaoInicial');
            renderizarTabelaPosicaoInicial();
        }
    });
    document.getElementById('btn-salvar-historico-importado').addEventListener('click', salvarHistoricoImportado);
    document.getElementById('form-cadastro-meta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveButton.disabled = true;

        try {
            const id = document.getElementById('meta-id').value;
            const tipo = document.getElementById('meta-tipo').value;
            let valorAlvo = parseDecimal(document.getElementById('meta-valor-alvo').value);
            
            if (tipo === 'posicao_ativo' || tipo === 'renda_passiva_sm') {
                valorAlvo = parseInt(valorAlvo, 10);
            }

            const meta = {
                id: id ? parseFloat(id) : Date.now(), nome: document.getElementById('meta-nome').value,
                tipo: tipo, valorAlvo: valorAlvo,
                ativoAlvo: tipo === 'posicao_ativo' ? document.getElementById('meta-ativo-alvo').value.toUpperCase() : null,
                moedaAlvo: (tipo === 'patrimonio_moeda' || tipo === 'renda_passiva_moeda') ? document.getElementById('meta-moeda-alvo').value : null,
                fonteProventos: (tipo === 'renda_passiva_moeda' || tipo === 'renda_passiva_sm') ? document.getElementById('meta-fonte-proventos').value : null
            };

            const index = todasAsMetas.findIndex(m => m.id === meta.id);
            if (index > -1) {
                todasAsMetas[index] = meta;
            } else {
                todasAsMetas.push(meta);
            }
            
            await salvarMetas();
            renderizarTelaMetas();
            if(telas.dashboard.style.display === 'block'){
                renderizarPainelResumoMetasDashboard();
            }
            fecharModal('modal-cadastro-meta');

        } finally {
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
    });
    document.getElementById('meta-tipo').addEventListener('change', e => {
        const tipo = e.target.value;
        const isPosicaoAtivo = tipo === 'posicao_ativo';
        const isPatrimonioMoeda = tipo === 'patrimonio_moeda';
        const isRendaPassivaMoeda = tipo === 'renda_passiva_moeda';
        const isRendaPassivaSM = tipo === 'renda_passiva_sm';

        // Controla a visibilidade dos campos extras
        document.getElementById('meta-ativo-alvo-group').style.display = isPosicaoAtivo ? 'block' : 'none';
        document.getElementById('meta-moeda-group').style.display = (isPatrimonioMoeda || isRendaPassivaMoeda) ? 'block' : 'none';
        document.getElementById('meta-fonte-proventos-group').style.display = (isRendaPassivaMoeda || isRendaPassivaSM) ? 'block' : 'none';

        // Controla o texto da etiqueta (label) e o placeholder do valor alvo
        const labelPadrao = document.getElementById('meta-label-alvo-padrao');
        const labelSM = document.getElementById('meta-label-alvo-sm');
        const valorAlvoInput = document.getElementById('meta-valor-alvo');

        if (isRendaPassivaSM) {
            labelPadrao.style.display = 'none';
            labelSM.style.display = 'block';
            valorAlvoInput.placeholder = 'Ex: 2';
        } else {
            labelPadrao.style.display = 'block';
            labelSM.style.display = 'none';
            valorAlvoInput.placeholder = isPosicaoAtivo ? 'Ex: 100' : 'Ex: 10000,00';
            labelPadrao.textContent = isPosicaoAtivo ? 'Quantidade Alvo' : 'Valor Alvo';
        }
    });
    document.getElementById('container-metas').addEventListener('click', e => {
        const editBtn = e.target.closest('.acao-btn.edit');
        const deleteBtn = e.target.closest('.acao-btn.delete');
        if (editBtn) {
            const metaId = parseFloat(editBtn.dataset.metaId);
            const meta = todasAsMetas.find(m => m.id === metaId);
            if (meta) abrirModalCadastroMeta(meta);
        }
        if (deleteBtn) {
            const metaId = parseFloat(deleteBtn.dataset.metaId);
            deletarMeta(metaId);
        }
    });
    document.getElementById('form-correcao-contas-sem-moeda').addEventListener('submit', salvarCorrecaoContasSemMoeda);
    document.body.addEventListener('change', e => {
        if (e.target.classList.contains('conta-correcao-moeda')) {
            const contaId = e.target.dataset.contaId;
            const detalhesContainer = document.getElementById(`detalhes-brl-${contaId}`);
            if (detalhesContainer) {
                detalhesContainer.style.display = e.target.value === 'BRL' ? 'block' : 'none';
            }
        }
    });
    document.getElementById('conta-moeda').addEventListener('change', (e) => {
        const moeda = e.target.value;
        const isBRL = moeda === 'BRL';
        document.getElementById('container-detalhes-brl').style.display = isBRL ? 'block' : 'none';
        document.getElementById('container-nome-ativo-moeda').style.display = isBRL ? 'none' : 'block';
        document.getElementById('label-saldo-inicial').textContent = `Saldo Inicial (${moeda})`;
        document.getElementById('conta-banco').required = isBRL;
        document.getElementById('conta-tipo').required = isBRL;
        document.getElementById('conta-nome-ativo').required = !isBRL;
    });
    document.getElementById('btn-baixar-cotacoes-link').addEventListener('click', () => {
        if (urlCotacoesCSV && urlCotacoesCSV.startsWith('http')) {
            window.open(urlCotacoesCSV, '_blank');
        } else {
            alert('A URL da planilha de cotações não está configurada. Por favor, configure na caixa de texto acima e salve antes de baixar.');
        }
    });
    renderizarInfoAtualizacaoMercado();
    popularFiltrosCorretora();
    const hojeISO = new Date().toISOString().split('T')[0];
    document.querySelectorAll('.date-filter').forEach(input => input.value = hojeISO);
    document.getElementById('config-link-acoes').value = linksExternos.acoes;
    document.getElementById('config-link-fiis').value = linksExternos.fiis;
    document.getElementById('config-link-etfs').value = linksExternos.etfs;
    renderizarDashboard();
    mostrarTela('dashboard');

    document.getElementById('config-salario-minimo').addEventListener('change', (e) => {
        salarioMinimo = parseDecimal(e.target.value);
        salvarSalarioMinimo();
        // Se a tela de metas estiver visível, atualiza-a para refletir o novo valor
        if (telas.metas.style.display === 'block') {
            renderizarTelaMetas();
        }
    });
    document.getElementById('config-user-name').addEventListener('change', (e) => {
        userName = e.target.value.trim();
        salvarUserName();
    });
    document.getElementById('snapshot-currency-filter').addEventListener('change', renderizarTelaHistoricoSnapshots);
    document.getElementById('config-link-acoes').addEventListener('change', (e) => { linksExternos.acoes = e.target.value.trim(); salvarLinksExternos(); });
    document.getElementById('config-link-fiis').addEventListener('change', (e) => { linksExternos.fiis = e.target.value.trim(); salvarLinksExternos(); });
    document.getElementById('config-link-etfs').addEventListener('change', (e) => { linksExternos.etfs = e.target.value.trim(); salvarLinksExternos(); });
    if(document.getElementById('filtro-nota-ativo')) {
        document.getElementById('filtro-nota-ativo').addEventListener('input', renderizarListaNotas);
    }
    document.getElementById('performance-filtro-tipo').addEventListener('change', renderizarTelaPerformanceRV);
    document.getElementById('performance-filtro-periodo').addEventListener('change', renderizarTelaPerformanceRV); // ADICIONE ESTA LINHA
    
    document.getElementById('container-tabela-performance').addEventListener('click', (e) => {
        const header = e.target.closest('th.sortable');
        const row = e.target.closest('tr.row-clickable');

        if (header) {
            // Lógica de Ordenação
            const key = header.dataset.key;
            if (sortConfigPerformanceRV.key === key) {
                sortConfigPerformanceRV.direction = sortConfigPerformanceRV.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfigPerformanceRV.key = key;
                sortConfigPerformanceRV.direction = 'descending';
            }
            renderizarTelaPerformanceRV();

        } else if (row) {
            // Lógica de Abrir Modal
            const ticker = row.dataset.ticker;
            const custoTotal = parseFloat(row.dataset.custoTotal);
            const proventos = parseFloat(row.dataset.proventos);
            const realizado = parseFloat(row.dataset.realizado);
            abrirModalGraficoBreakEven(ticker, custoTotal, proventos, realizado);
        }
    });
    document.getElementById('modal-resumo-dividendos-ativo').addEventListener('click', (e) => {
        const header = e.target.closest('th.sortable');
        if (header) {
            const key = header.dataset.key;
            const modal = header.closest('.modal');
            const ticker = modal.dataset.ticker;

            if (sortConfigModalProventos.key === key) {
                sortConfigModalProventos.direction = sortConfigModalProventos.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfigModalProventos.key = key;
                sortConfigModalProventos.direction = 'descending';
            }
            
            if (ticker) {
                abrirModalResumoDividendos(ticker); // Redesenha o modal com os dados ordenados
            }
        }
    });
    document.getElementById('container-posicao-por-corretora').addEventListener('click', (e) => {
        const header = e.target.closest('.acordeao-header');
        if (header) {
            const conteudo = header.nextElementSibling;
            if (!conteudo) return;

            const alturaConteudo = conteudo.scrollHeight;

            // Lógica para recalcular a altura dos pais
            const reajustarPais = (elemento, alturaDelta) => {
                let paiConteudo = elemento.closest('.acordeao-conteudo');
                while (paiConteudo) {
                    // Garante que o maxHeight tenha um valor numérico para o cálculo
                    const alturaAtualPai = paiConteudo.style.maxHeight ? parseInt(paiConteudo.style.maxHeight, 10) : 0;
                    paiConteudo.style.maxHeight = (alturaAtualPai + alturaDelta) + 'px';
                    paiConteudo = paiConteudo.parentElement.closest('.acordeao-conteudo');
                }
            };

            // Verifica se o acordeão está aberto para decidir se vai abrir ou fechar
            const estaAberto = header.classList.contains('ativo');

            if (estaAberto) {
                // Fechando
                reajustarPais(conteudo, -alturaConteudo);
                conteudo.style.maxHeight = null;
            } else {
                // Abrindo
                conteudo.style.maxHeight = alturaConteudo + 'px';
                reajustarPais(conteudo, alturaConteudo);
            }
            
            header.classList.toggle('ativo');
        }
    });
    // --- INICIALIZAÇÃO OFFLINE (Substitui a lógica de autenticação) ---
    
    // Carrega os dados imediatamente ao iniciar
    carregarTodosOsDados().then(() => {
        renderizarInfoBackup();
        
        if (autoUpdateEnabled) {
            iniciarAutoUpdate();
        }

        // Configura a interface para modo logado/ativo
        mainContent.style.display = 'block';
        sidebar.style.display = 'flex';
        
        // Esconde elementos de login que não serão usados
        const loginForm = document.getElementById('sidebar-login-form');
        const userInfo = document.getElementById('user-info');
        if (loginForm) loginForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';

        // Remove o overlay de carregamento
        const loading = document.getElementById('loading-overlay');
        if (loading) loading.style.display = 'none';

        renderizarDashboard();
        mostrarTela('dashboard');
    });

    // Remove listener de logout pois não há sessão
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.style.display = 'none';
    }
    
    // --- FIM DA INICIALIZAÇÃO OFFLINE ---
    // --- LISTENERS DOS GRÁFICOS (CORREÇÃO DEFINITIVA) ---

    // 1. Proteção Geral: Impede que cliques nos controles fechem qualquer modal
    document.querySelectorAll('.chart-period-controls').forEach(container => {
        container.addEventListener('click', (e) => {
            e.stopPropagation(); // A mágica acontece aqui: o clique morre aqui e não fecha o modal
        });
    });

    // 2. Lógica do Modal (Minha Posição)
    const radiosPeriodoModal = document.querySelectorAll('input[name="periodo-grafico-modal"]');
    radiosPeriodoModal.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const modal = document.getElementById('modal-grafico-cotacoes');
            const tipoAtual = modal.dataset.tipoAtual || 'todos';
            const novoPeriodo = e.target.value;
            
            // Salva a preferência
            configuracoesGraficos.modalHistoricoPeriodo = novoPeriodo;
            salvarConfiguracoesGraficos();
            
            atualizarGraficoModal(tipoAtual, novoPeriodo);
        });
    });

    // 3. Lógica do Dashboard (Isso estava faltando no seu arquivo)
    const radiosPeriodoDash = document.querySelectorAll('input[name="periodo-desempenho-dash"]');
    radiosPeriodoDash.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const novoPeriodo = e.target.value;
            
            if (!configuracoesGraficos.desempenho) configuracoesGraficos.desempenho = {};
            configuracoesGraficos.desempenho.periodo = novoPeriodo;
            salvarConfiguracoesGraficos();
            
            renderizarGraficoDesempenho();
        });
    });

    // --- INÍCIO: SINCRONIZAÇÃO AUTOMÁTICA ENTRE ABAS (VERSÃO COMPLETA) ---
    window.addEventListener('storage', (event) => {
        // Verifica se a alteração foi em uma das chaves do nosso sistema
        if (event.key && event.key.startsWith('carteira_')) {
            console.log(`Sincronização entre abas acionada pela chave: ${event.key}`);

            // 1. Recarrega todos os dados do localStorage para as variáveis da aba atual
            carregarTodosOsDados();

            // 2. Encontra a tela que está visível no momento
            const visibleScreen = Object.values(telas).find(tela => tela.style.display === 'block');

            // 3. Chama a função de renderização específica para a tela visível
            if (visibleScreen) {
                switch (visibleScreen.id) {
                    // Telas Principais e Dashboards
                    case 'tela-dashboard': renderizarDashboard(); break;
                    case 'tela-renda-variavel': renderizarTelaRendaVariavel(); break;
                    case 'tela-renda-fixa': renderizarPosicaoRF(); break;
                    case 'tela-caixa-global': renderizarTelaCaixaGlobal(true); break;
                    case 'tela-metas': renderizarTelaMetas(); break;

                    // Telas de Proventos
                    case 'tela-proventos': renderizarTabelaProventos(); break;
                    case 'tela-calendario-geral': renderizarCalendarioGeral(); break;
                    case 'tela-calendario-acoes': renderizarCalendarioAcoes(); break;

                    // Telas de Cadastros e Listas
                    case 'tela-lista-notas': renderizarListaNotas(); break;
                    case 'tela-cadastro-ativos': renderizarTabelaAtivos(); break;
                    case 'tela-cadastro-contas': renderizarTabelaContas(); break;
                    case 'tela-cadastro-rf': renderizarTabelaAtivosRF(); break;
                    case 'tela-feriados': renderizarTabelaFeriados(); break;
                    case 'tela-posicao-inicial': renderizarTabelaPosicaoInicial(); break;
                    
                    // Telas de Consultas
                    case 'tela-posicao-corretora': renderizarTelaPosicaoPorCorretora(); break;
                    case 'tela-posicoes-zeradas': renderizarPosicoesZeradas(); break;
                    case 'tela-historico-movimentacao': renderizarTelaHistoricoMovimentacao(); break;
                    case 'tela-performanceRV': renderizarTelaPerformanceRV(); break;
                    // A tela 'crescimentoPatrimonial' é reativa ao submit do formulário, então uma atualização automática da tela inteira não é ideal.

                    // Telas de Ajustes
                    case 'tela-ajustes-transferencia': renderizarTabelaTransferencias(); break;
                    case 'tela-eventos-corporativos': renderizarTabelaEventosCorporativos(); break;
                    case 'tela-eventos-ativos': renderizarTelaEventosAtivos(); break;

                    // Ferramentas
                    case 'tela-calculadora-ir': renderizarCalculadoraIR(); break;
                    case 'tela-negociar': renderizarTelaNegociar(); break;
                    case 'tela-consulta-balanceamento': renderizarTelaConsultaBalanceamento(); break;
                }
            }
        }
    });
    // --- FIM: SINCRONIZAÇÃO AUTOMÁTICA ENTRE ABAS (VERSÃO COMPLETA) ---

    // --- INÍCIO: LÓGICA PARA CÁLCULO INLINE EM CAMPOS DE VALOR ---
    const handleInlineCalculation = (event) => {
        if (event.key !== 'Enter') return;

        const input = event.target;
        const expression = input.value;

        // Verifica se há operadores matemáticos para justificar um cálculo
        if (!/[\+\-\*\/]/.test(expression)) return;

        event.preventDefault(); // Impede o envio do formulário

        try {
            const sanitizedExpression = expression.replace(/,/g, '.').replace(/[^\d\.\+\-\*\/]/g, '');
            const result = new Function('return ' + sanitizedExpression)();
            
            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Cálculo inválido');
            }

            input.value = formatarDecimalParaInput(result);
            // Dispara um evento de 'change' para que outras partes do sistema (como a atualização de totais da nota) sejam acionadas
            input.dispatchEvent(new Event('change', { bubbles: true }));

        } catch (error) {
            console.error("Erro no cálculo inline:", error);
            alert("A expressão matemática digitada é inválida.");
            input.focus(); // Deixa o foco no campo para correção
        }
    };

    ['nota-custos', 'op-valor', 'edit-op-valor'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('keydown', handleInlineCalculation);
        }
    });
    // --- FIM: LÓGICA PARA CÁLCULO INLINE ---
    // Ativa a formatação de moeda para os campos de valor das notas
});
// ********** FIM DA PARTE 6








//**************** PARTE 6.1

function exportarResumoCarteira() {
    const hoje = new Date().toISOString().split('T')[0];
    const posicoesRV = gerarPosicaoDetalhada(hoje);
    const todosOsEventosCaixa = obterTodosOsEventosDeCaixa();

    let saldoTotalContas = 0;
    todasAsContas.forEach(conta => {
        saldoTotalContas += calcularSaldoEmData(conta, hoje);
    });

    let valorTotalMoedas = 0;
    todosOsAtivosMoedas.forEach(ativo => {
        const transacoesDoAtivo = todosOsEventosCaixa.filter(e =>
            e.tipo === 'moeda' &&
            String(e.idAlvo) === String(ativo.id) &&
            e.source !== 'recorrente_futura' &&
            e.data <= hoje
        );
        const saldoAtivo = transacoesDoAtivo.reduce((soma, t) => soma + arredondarMoeda(t.valor), ativo.saldoInicial);
        valorTotalMoedas += saldoAtivo * (dadosMoedas.cotacoes[ativo.moeda] || 0);
    });

    const resumoClasses = { 'Ações': 0, 'FIIs': 0, 'ETFs': 0, 'Renda Fixa': 0 };
    for (const ticker in posicoesRV) {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        const tipoMapeado = ativoInfo ? (ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
        if (tipoMapeado && resumoClasses.hasOwnProperty(tipoMapeado)) {
            const posicao = posicoesRV[ticker];
            const cotacao = dadosDeMercado.cotacoes[ticker];
            if (posicao.quantidade > 0) {
                resumoClasses[tipoMapeado] += (cotacao && cotacao.valor > 0) ? (posicao.quantidade * cotacao.valor) : (posicao.quantidade * posicao.precoMedio);
            }
        }
    }

    todosOsAtivosRF.forEach(ativo => {
        if ((ativo.descricao || '').toLowerCase().includes('(inativa)')) {
            return;
        }
        resumoClasses['Renda Fixa'] += calcularSaldosRFEmData(ativo, hoje).saldoLiquido;
    });
    
    const projecaoProventos = calcularProjecaoProventosNegociacao();
    const proventosTotal = projecaoProventos.acoes + projecaoProventos.fiis;
    const valorCarteiraInvestimentos = Object.values(resumoClasses).reduce((s, v) => s + v, 0);
    const totalProventosProvisionados = calcularTotalProventosProvisionados();
    const patrimonioTotal = valorCarteiraInvestimentos + saldoTotalContas + valorTotalMoedas + totalProventosProvisionados;

    const linhasCsv = [
        ['Metrica', 'Valor'],
        ['nomeUsuario', userName],
        ['dataExportacao', hoje],
        ['patrimonioTotal', patrimonioTotal],
        ['carteiraInvestimentos', valorCarteiraInvestimentos],
        ['valorAcoes', resumoClasses['Ações']],
        ['valorFIIs', resumoClasses['FIIs']],
        ['valorETFs', resumoClasses['ETFs']],
        ['valorRendaFixa', resumoClasses['Renda Fixa']],
        ['proventosAcoes', projecaoProventos.acoes],
        ['proventosFIIs', projecaoProventos.fiis],
        ['proventosETFs', 0],
        ['proventosTotal', proventosTotal],
        ['saldoContas', saldoTotalContas],
        ['saldoMoedas', valorTotalMoedas],
        ['proventosProvisionados', totalProventosProvisionados]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
        + linhasCsv.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const nomeArquivo = `resumo_carteira_${userName.replace(/\s/g, '_') || 'export'}_${hoje}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Resumo da carteira exportado como CSV com sucesso!');
}
async function imprimirResumoAtivo(ticker, chartProventosAnuaisInstance, chartPrecoPmInstance) {
    const container = document.getElementById('container-impressao-ativo');
    if (!container || !ticker) return;

    const proventosDoAtivo = todosOsProventos.filter(p => p.ticker === ticker);
    const dataInicioInvestimento = getInicioIninterrupto(ticker);
    const dataFim = getFimInvestimento([ticker]);
    const resumoPessoal = calcularResumoProventosParaMultiplosAtivos(proventosDoAtivo, [ticker], dataInicioInvestimento, dataFim);
    const historicoMovimentacoes = gerarHistoricoCompletoParaAtivo(ticker);

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let graficoProventosImgHtml = '';
    if (chartProventosAnuaisInstance && chartProventosAnuaisInstance.canvas) {
        try {
            chartProventosAnuaisInstance.options.animation.duration = 0;
            chartProventosAnuaisInstance.update('none');
            const imgDataUrl = chartProventosAnuaisInstance.toBase64Image();
            graficoProventosImgHtml = `<div class="grafico-impressao-container">
                                <h2>Evolução Anual de Proventos Pagos</h2>
                                <img src="${imgDataUrl}" alt="Gráfico de Proventos Anuais" style="max-width: 90%; height: auto; margin-top: 15px;">
                            </div>`;
            chartProventosAnuaisInstance.options.animation.duration = 1000;
        } catch (e) {
            console.error("Erro ao gerar imagem do gráfico de proventos:", e);
            graficoProventosImgHtml = '<h2>Evolução Anual de Proventos Pagos</h2><p>Não foi possível gerar a imagem do gráfico.</p>';
        }
    }

    // --- INÍCIO DA LÓGICA ADICIONADA ---
    let graficoPrecoPmImgHtml = '';
    if (chartPrecoPmInstance && chartPrecoPmInstance.canvas) {
        try {
            chartPrecoPmInstance.options.animation.duration = 0;
            chartPrecoPmInstance.update('none');
            const imgDataUrl = chartPrecoPmInstance.toBase64Image();
            graficoPrecoPmImgHtml = `<div class="grafico-impressao-container">
                                <h2>Cotação vs. Preço Médio (Histórico de Snapshots)</h2>
                                <img src="${imgDataUrl}" alt="Gráfico de Cotação vs. PM" style="max-width: 90%; height: auto; margin-top: 15px;">
                            </div>`;
            chartPrecoPmInstance.options.animation.duration = 1000;
        } catch (e) {
            console.error("Erro ao gerar imagem do gráfico de Cotação vs. PM:", e);
            graficoPrecoPmImgHtml = '<h2>Cotação vs. Preço Médio</h2><p>Não foi possível gerar a imagem do gráfico.</p>';
        }
    }
    // --- FIM DA LÓGICA ADICIONADA ---

    let proventosTabelaHtml = '<h2>Histórico de Proventos</h2>';
    if (proventosDoAtivo.length > 0) {
        proventosTabelaHtml += '<table><thead><tr><th>Data Pgto</th><th>Tipo</th><th class="numero">Valor/Un.</th><th class="numero">Qtd.</th><th class="numero">Total</th><th class="percentual">YOC</th></tr></thead><tbody>';
        proventosDoAtivo.sort((a, b) => new Date(b.dataPagamento) - new Date(a.dataPagamento)).forEach(p => {
            proventosTabelaHtml += `<tr>
                <td>${new Date(p.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${p.tipo}</td>
                <td class="numero">${formatarDecimal(p.valorIndividual || 0, 5)}</td>
                <td class="numero">${Math.round(p.quantidadeNaDataCom || 0)}</td>
                <td class="numero">${formatarMoeda(p.valorTotalRecebido || 0)}</td>
                <td class="percentual">${formatarPercentual(p.yieldOnCost || 0)}</td>
            </tr>`;
        });
        proventosTabelaHtml += '</tbody></table>';
    } else {
        proventosTabelaHtml += '<p>Nenhum provento registrado.</p>';
    }

    let movimentacoesHtml = '<h2>Histórico de Movimentações</h2><table><thead><tr><th>Data</th><th>Transação</th><th class="numero">Qtd.</th><th class="numero">Preço Médio</th></tr></thead><tbody>';
    historicoMovimentacoes.slice().reverse().forEach(item => {
        movimentacoesHtml += `<tr>
            <td>${new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td>${item.descricaoTransacao}</td>
            <td class="numero">${Math.round(item.qtdConsolidada)}</td>
            <td class="numero">${formatarPrecoMedio(item.precoMedio)}</td>
        </tr>`;
    });
    movimentacoesHtml += '</tbody></table>';

    let frequenciaHtml = '';
    if (proventosDoAtivo.length > 0) {
        const frequenciaPorAno = {};
        proventosDoAtivo.forEach(p => {
            if (!p.dataPagamento || !p.dataCom) return;
            const anoPagamento = new Date(p.dataPagamento + 'T12:00:00').getUTCFullYear();
            if (!frequenciaPorAno[anoPagamento]) {
                frequenciaPorAno[anoPagamento] = { com: new Set(), pag: new Set() };
            }
            frequenciaPorAno[anoPagamento].com.add(new Date(p.dataCom + 'T12:00:00').getUTCMonth());
            frequenciaPorAno[anoPagamento].pag.add(new Date(p.dataPagamento + 'T12:00:00').getUTCMonth());
        });

        frequenciaHtml += '<div class="frequencia-impressao-container"><h2>Frequência de Proventos</h2>';
        const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const anos = Object.keys(frequenciaPorAno).sort((a, b) => b - a);

        anos.forEach(ano => {
            const dadosAno = frequenciaPorAno[ano];
            const mesesCom = [...dadosAno.com].sort((a,b) => a - b).map(m => mesesAbrev[m]).join(', ');
            const mesesPag = [...dadosAno.pag].sort((a,b) => a - b).map(m => mesesAbrev[m]).join(', ');
            frequenciaHtml += `<div class="frequencia-ano-bloco">
                                <strong>${ano}</strong>
                                <div class="frequencia-linha"><span>Data-Com:</span> ${mesesCom}</div>
                                <div class="frequencia-linha"><span>Pagamento:</span> ${mesesPag}</div>
                           </div>`;
        });
        frequenciaHtml += '</div>';
    }

    // --- HTML DE IMPRESSÃO ATUALIZADO ---
    container.innerHTML = `
        <h1>Relatório do Ativo: ${ticker}</h1>
        <p class="impressao-timestamp">Gerado em ${dataFormatada} às ${horaFormatada}</p>
        <h2>Performance Pessoal (Projetada)</h2>
        <table>
            <tr><td>Projeção Anual (Pos. Atual)</td><td class="numero">${formatarMoeda(resumoPessoal.projecaoAnualTotal)}</td></tr>
            <tr><td>Média Mensal (Pos. Atual)</td><td class="numero">${formatarMoeda(resumoPessoal.mediaMensalTotal)}</td></tr>
            <tr><td>Yield on Cost (Anualizado)</td><td class="percentual">${formatarPercentual(resumoPessoal.yocCustoAnual)}</td></tr>
        </table>
        ${movimentacoesHtml}
        ${graficoPrecoPmImgHtml} 
        ${proventosTabelaHtml}
        ${graficoProventosImgHtml}
        ${frequenciaHtml}
    `;
    // --- FIM DA ATUALIZAÇÃO DO HTML ---

    const body = document.body;
    body.classList.add('imprimindo-resumo-ativo');
    container.classList.add('imprimindo');

    setTimeout(() => {
        window.print();

        setTimeout(() => {
            body.classList.remove('imprimindo-resumo-ativo');
            container.classList.remove('imprimindo');
        }, 500);
    }, 250);
}
function importarResumoCarteira(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backupData = JSON.parse(e.target.result);

            if (!backupData.version || !backupData.ativos) {
                throw new Error('O arquivo selecionado não parece ser um backup válido.');
            }

            // A mágica acontece aqui: calculamos o resumo a partir dos dados brutos do backup
            const resumoCalculado = calcularResumoDeBackup(backupData);
            
            dadosComparacao = resumoCalculado;
            salvarDadosComparacao();
            renderizarDashboard();
            alert(`Resumo da carteira de "${resumoCalculado.nomeUsuario}" importado e calculado com sucesso!`);

        } catch (error) {
            alert('Erro ao ler o arquivo de backup. O arquivo pode estar corrompido ou em formato inválido.\nDetalhes: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Limpa o input para permitir a mesma seleção novamente
}
function getDataInicioCicloAtualRFDeBackup(ativo, dadosBackup) {
    const eventos = [];
    eventos.push({ data: ativo.dataAplicacao, valor: ativo.valorInvestido, tipo: 'aporte' });

    const movimentacoesDoAtivo = (dadosBackup.movimentacoes || []).filter(t =>
        t.sourceId === ativo.id && (t.source === 'aporte_rf' || t.source === 'resgate_rf')
    );

    movimentacoesDoAtivo.forEach(t => {
        eventos.push({
            data: t.data,
            valor: t.source === 'aporte_rf' ? Math.abs(t.valor) : -Math.abs(t.valor),
            tipo: t.source,
            movimentacaoOriginal: t 
        });
    });

    eventos.sort((a, b) => new Date(a.data) - new Date(b.data));

    let capitalAcumulado = 0;
    let dataUltimoEncerramento = '1970-01-01';

    eventos.forEach(evento => {
        if (evento.tipo === 'aporte' || evento.tipo === 'aporte_rf') {
            capitalAcumulado += evento.valor;
        } else if (evento.tipo === 'resgate_rf') {
            if (evento.movimentacaoOriginal) {
                capitalAcumulado -= (evento.movimentacaoOriginal.devolucaoCapital || 0);
            }
        }
        if (capitalAcumulado < 0.01) {
            dataUltimoEncerramento = evento.data;
        }
    });

    return dataUltimoEncerramento;
}
function getCapitalInvestidoNoCicloAtualDeBackup(ativo, dataLimite, dadosBackup) {
    const dataDeCorte = getDataInicioCicloAtualRFDeBackup(ativo, dadosBackup);
    let capitalTotalCiclo = 0;

    if (ativo.dataAplicacao <= dataLimite && ativo.dataAplicacao > dataDeCorte) {
        capitalTotalCiclo += ativo.valorInvestido;
    }

    (dadosBackup.movimentacoes || [])
        .filter(t =>
            t.source === 'aporte_rf' &&
            t.sourceId === ativo.id &&
            t.data <= dataLimite &&
            t.data > dataDeCorte
        )
        .forEach(aporte => {
            capitalTotalCiclo += Math.abs(aporte.valor);
        });

    return capitalTotalCiclo;
}
function calcularProjecaoAnualUnitariaDeBackup(ticker, options = {}, dadosBackup) {
    const hoje = new Date().toISOString().split('T')[0];
    const dataFim = options.dataFim || hoje;
    
    let dataInicio = options.dataInicio;
    if (!dataInicio) {
        // Simula getInicioInvestimento usando dados do backup
        const eventosDeCompra = [];
        (dadosBackup.notas || []).forEach(n => {
            n.operacoes.filter(op => op.ativo === ticker && op.tipo === 'compra')
                .forEach(op => eventosDeCompra.push({ data: n.data }));
        });
        (dadosBackup.posicoes || []).filter(p => p.ticker === ticker && (!p.transacao || p.transacao.toLowerCase() === 'compra'))
            .forEach(p => eventosDeCompra.push({ data: p.data }));
        if (eventosDeCompra.length > 0) {
            eventosDeCompra.sort((a, b) => new Date(a.data) - new Date(b.data));
            dataInicio = eventosDeCompra[0].data;
        }
    }
    
    if (!dataInicio) return 0;

    if (options.limiteAnos) {
        let dataLimite = new Date(dataFim);
        dataLimite.setFullYear(dataLimite.getFullYear() - options.limiteAnos);
        const dataLimiteStr = dataLimite.toISOString().split('T')[0];
        if (new Date(dataInicio) < new Date(dataLimiteStr)) {
            dataInicio = dataLimiteStr;
        }
    }

    const diasDeHistorico = calcularDiffDias(dataInicio, dataFim);
    if (diasDeHistorico <= 0) return 0;
    
    const proventosNoPeriodo = (dadosBackup.proventos || []).filter(p =>
        p.ticker === ticker && p.dataCom >= dataInicio && p.dataCom <= dataFim
    );

    const somaTotalPeriodo = proventosNoPeriodo.reduce((acc, p) => acc + p.valorIndividual, 0);

    return (somaTotalPeriodo / diasDeHistorico) * 365.25;
}
/**
 * NOVA FUNÇÃO AJUDANTE: Encontra o último snapshot salvo em uma data específica.
 * @param {string} dataStr - A data no formato 'AAAA-MM-DD'.
 * @returns {object|null} - O objeto do snapshot ou null.
 */
function getUltimoSnapshotPorData(dataStr) {
    // Filtra todos os snapshots daquele dia e pega o último (o mais recente)
    const snapshotsDoDia = historicoCarteira.filter(s => s.data === dataStr);
    if (snapshotsDoDia.length > 0) {
        return snapshotsDoDia[snapshotsDoDia.length - 1];
    }
    return null;
}
/**
 * Retorna a próxima data útil a partir de uma data fornecida.
 * Usada para calcular a Data-Ex (Dia útil seguinte à Data-Com).
 * @param {string} dataStr - Data inicial (AAAA-MM-DD).
 * @returns {string} - Próxima data útil (AAAA-MM-DD).
 */
function getProximaDataUtil(dataStr) {
    if (!dataStr) return null;
    
    // Cria o objeto data (forçando meio-dia para evitar problemas de fuso)
    let data = new Date(dataStr + 'T12:00:00');
    
    // Avança pelo menos um dia
    data.setDate(data.getDate() + 1);

    // Continua avançando enquanto não for dia útil
    while (!isDiaUtil(data)) {
        data.setDate(data.getDate() + 1);
    }

    return data.toISOString().split('T')[0];
}
/**
 * Verifica se uma data é um feriado.
 * @param {Date} data - O objeto Date a ser verificado.
 * @returns {boolean}
 */
function isFeriado(data) {
    // Formata a data para 'AAAA-MM-DD' para comparar com a lista de feriados
    const dataStr = data.toISOString().split('T')[0];
    return todosOsFeriados.some(f => f.data === dataStr);
}

/**
 * Verifica se uma data é sábado (6) ou domingo (0).
 * @param {Date} data - O objeto Date a ser verificado.
 * @returns {boolean}
 */
function isFimDeSemana(data) {
    const diaDaSemana = data.getDay();
    return diaDaSemana === 0 || diaDaSemana === 6;
}

/**
 * Verifica se uma data é um dia útil (não é fim de semana nem feriado).
 * @param {Date} data - O objeto Date a ser verificado.
 * @returns {boolean}
 */
function isDiaUtil(data) {
    return !isFimDeSemana(data) && !isFeriado(data);
}
/**
 * NOVA FUNÇÃO: Roda todas as verificações de alerta para o Dashboard.
 * Retorna um objeto com as listas de alertas para serem usadas no modal e no ícone.
 */
function verificarAlertasDashboard(posicoesRV = null, dadosBalanceamento = null) {
    // Garante que os dados existam (Fallbacks)
    if (!posicoesRV) posicoesRV = gerarPosicaoDetalhada(new Date().toISOString().split('T')[0]);
    if (!dadosBalanceamento) dadosBalanceamento = gerarDadosBalanceamento('todos');

    // Carrega o modo de alocação
    if (!dadosAlocacao) {
        const data = localStorage.getItem('carteira_dados_alocacao_offline');
        if (data) dadosAlocacao = JSON.parse(data);
        else dadosAlocacao = { categorias: {}, ativos: {} };
    }
    const modoAtual = dadosAlocacao.modoRebalanceamento || 'categoria';

    const resultado = {
        oportunidades: [],      // Prioridade Alta (Aciona o ícone)
        rebalanceamento: [],    // Informativo (Aparece no modal)
        mercado: []             // Informativo (Aparece no modal)
    };

    if (!historicoCarteira || historicoCarteira.length < 2) {
        return resultado;
    }

    // --- 1. Lógica de Mercado (3 Dias Úteis) ---
    const snapshotsUteis = [];
    let dataAtualBusca = new Date();
    let diasParaTras = 0;
    while (snapshotsUteis.length < 3 && diasParaTras < 15) { 
        if (isDiaUtil(dataAtualBusca)) {
            const dataStr = dataAtualBusca.toISOString().split('T')[0];
            const snap = getUltimoSnapshotPorData(dataStr);
            if (snap) snapshotsUteis.push(snap);
        }
        dataAtualBusca.setDate(dataAtualBusca.getDate() - 1);
        diasParaTras++;
    }

    const ativosEmAlta3Dias = [];
    const ativosEmBaixa3Dias = [];
    const tickersEmCarteira = new Set(Object.keys(posicoesRV).filter(t => posicoesRV[t]?.quantidade > 0.0001));
    const cotacoesAtuais = dadosDeMercado.cotacoes;

    for (const ticker in cotacoesAtuais) {
        if (!tickersEmCarteira.has(ticker)) continue;
        
        if (snapshotsUteis.length === 3) {
            const [snapRecente, snapIntermediario, snapAntigo] = snapshotsUteis;
            const dadosRecente = snapRecente.detalhesCarteira.ativos[ticker];
            const dadosIntermediario = snapIntermediario.detalhesCarteira.ativos[ticker];
            const dadosAntigo = snapAntigo.detalhesCarteira.ativos[ticker];

            if (dadosRecente && dadosIntermediario && dadosAntigo) {
                const p1 = dadosRecente.precoAtual;
                const p2 = dadosIntermediario.precoAtual;
                const p3 = dadosAntigo.precoAtual;

                if (p1 > 0 && p2 > 0 && p3 > 0) {
                    if (p1 > p2 && p2 > p3) ativosEmAlta3Dias.push(ticker);
                    else if (p1 < p2 && p2 < p3) ativosEmBaixa3Dias.push(ticker);
                }
            }
        }
    }

    if (ativosEmAlta3Dias.length > 0) {
        resultado.mercado.push({
            tipo: 'grupo-alta-3d',
            texto: `<strong>Tendência de Alta (3 pregões):</strong> ${ativosEmAlta3Dias.join(', ')}`
        });
    }
    if (ativosEmBaixa3Dias.length > 0) {
        resultado.mercado.push({
            tipo: 'grupo-baixa-3d',
            texto: `<strong>Tendência de Baixa (3 pregões):</strong> ${ativosEmBaixa3Dias.join(', ')}`
        });
    }

    // --- 2. Alertas de Desbalanceamento (> 2%) ---
    // (Apenas informativo no modal)
    for (const nomeCategoria in dadosBalanceamento.categorias) {
        if (dadosBalanceamento.categorias[nomeCategoria].ativos) {
            dadosBalanceamento.categorias[nomeCategoria].ativos.forEach(ativo => {
                // CORREÇÃO: Alterado para 0.02 (2%) conforme solicitado
                if (Math.abs(ativo.ajuste.percentual) > 0.02) {
                    const direcao = ativo.ajuste.percentual > 0 ? 'subalocado' : 'superalocado';
                    const classeDirecao = direcao === 'subalocado' ? 'valor-positivo' : 'valor-negativo';
                    resultado.rebalanceamento.push({ 
                        tipo: 'desbalanceamento', 
                        texto: `<strong>${ativo.ticker}</strong>: <span class="${classeDirecao}">${direcao}</span> (${formatarPercentual(ativo.atual.percentualGlobal)} vs Ideal ${formatarPercentual(ativo.ideal.percentualGlobal)})`
                    });
                }
            });
        }
    }

    // --- 3. Alerta de Oportunidade de Venda (O QUE ACIONA O ÍCONE) ---
    // Regra Ouro: Lucro >= 10% E Critério do Modo Selecionado
    
    // Reutilizamos a lógica centralizada de 'processarRebalanceamento' passando o modo
    const dadosVenda = processarRebalanceamento(dadosBalanceamento.categorias, modoAtual);
    
    dadosVenda.listaReduzir.forEach(item => {
        // Verifica se é "Actionable" (passou pelas travas de prejuízo e P/VP do modo selecionado)
        if (item.isActionable && item.ticker !== 'Renda Fixa') {
            
            // Regra Adicional do Alerta: Lucro >= 10%
            // (Na tela de rebalanceamento mostra tudo, aqui só mostra oportunidades excelentes)
            const ativoOriginal = dadosBalanceamento.categorias['Ações']?.ativos.find(a => a.ticker === item.ticker) || 
                                  dadosBalanceamento.categorias['FIIs']?.ativos.find(a => a.ticker === item.ticker) ||
                                  dadosBalanceamento.categorias['ETF']?.ativos.find(a => a.ticker === item.ticker);
            
            if (ativoOriginal && ativoOriginal.precoMedio > 0) {
                const lucroPercentual = (item.cotacao / ativoOriginal.precoMedio) - 1;
                
                if (lucroPercentual >= 0.10) { 
                    resultado.oportunidades.push({
                        tipo: 'oportunidade-venda',
                        texto: `<strong>${item.ticker}</strong>: Oportunidade de Venda com <strong>${formatarPercentual(lucroPercentual)}</strong> de lucro.`
                    });
                }
            }
        }
    });

    return resultado;
}

function abrirModalAlertasDashboard() {
    const hoje = new Date().toISOString().split('T')[0];
    const posicoesRV = gerarPosicaoDetalhada(hoje);
    const dadosBalanceamento = gerarDadosBalanceamento('todos');
    
    // Chama o motor para pegar os dados atualizados
    const alertas = verificarAlertasDashboard(posicoesRV, dadosBalanceamento);
    
    // Identifica o modo para exibir no título
    const modoAtual = dadosAlocacao.modoRebalanceamento || 'categoria';
    const textoModo = modoAtual === 'categoria' ? 'Por Categoria' : 'Por Ativo';
    
    const container = document.getElementById('modal-dashboard-alertas-conteudo');
    let html = '';

    // 1. Oportunidades de Venda
    if (alertas.oportunidades.length > 0) {
        html += `<h4 style="color: var(--success-color);"><i class="fas fa-star"></i> Oportunidades de Realização (Lucro > 10%)</h4>`;
        html += `<p style="font-size: 0.85em; color: #666; margin-bottom: 10px;">Critério atual: <strong>${textoModo}</strong></p>`;
        alertas.oportunidades.forEach(alerta => {
            html += `<div class="alerta-item tipo-oportunidade"><i class="fas fa-dollar-sign"></i> ${alerta.texto}</div>`;
        });
    } else {
         html += '<h4>Oportunidades de Realização</h4><p style="font-style: italic; color: #888;">Nenhuma oportunidade de venda com lucro acima de 10% no momento.</p>';
    }
    
    html += '<hr style="margin: 15px 0;">';

    // 2. Tendências de Mercado
    html += '<h4><i class="fas fa-chart-line"></i> Tendências de Mercado (3 Pregões)</h4>';
    if (alertas.mercado.length > 0) {
        alertas.mercado.forEach(alerta => {
            let icone = alerta.tipo.includes('alta') ? 'fa-arrow-circle-up' : 'fa-arrow-circle-down';
            let cor = alerta.tipo.includes('alta') ? 'var(--success-color)' : 'var(--danger-color)';
            html += `<div class="alerta-item" style="color: ${cor};"><i class="fas ${icone}"></i> ${alerta.texto}</div>`;
        });
    } else {
        html += '<p>Nenhuma sequência de alta ou baixa de 3 dias identificada.</p>';
    }

    html += '<hr style="margin: 15px 0;">';

    // 3. Atenção ao Rebalanceamento
    // CORREÇÃO AQUI: Título atualizado para > 2%
    html += '<h4><i class="fas fa-balance-scale"></i> Atenção ao Rebalanceamento (> 2%)</h4>';
    if (alertas.rebalanceamento.length > 0) {
        alertas.rebalanceamento.forEach(alerta => {
            html += `<div class="alerta-item"><i class="fas fa-exclamation-circle" style="color: var(--accent-color);"></i> ${alerta.texto}</div>`;
        });
    } else {
        // CORREÇÃO AQUI: Texto vazio atualizado
        html += '<p>Sua carteira está balanceada (nenhum desvio acima de 2%).</p>';
    }

    html += '<hr style="margin: 15px 0;">';

    // 4. Performance da Carteira (Top 3 / Bottom 3)
    html += '<h4>Lucros e Prejuízos (Não Realizados)</h4>';
    const variacoes = [];
    for (const ticker in posicoesRV) {
        const pos = posicoesRV[ticker];
        if (pos.quantidade > 0.0001) {
            const cotacao = dadosDeMercado.cotacoes[ticker]?.valor || 0;
            if (cotacao > 0 && pos.precoMedio > 0) {
                const variacao = (cotacao / pos.precoMedio) - 1;
                variacoes.push({ ticker, variacao });
            }
        }
    }

    if (variacoes.length > 0) {
        variacoes.sort((a, b) => b.variacao - a.variacao);
        const top3 = variacoes.slice(0, 3);
        const bottom3 = variacoes.slice(-3).reverse();

        html += '<div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 30px;"><div><h5>Maiores Lucros</h5>';
        top3.forEach(item => {
            html += `<div class="alerta-item tipo-preco-alta"><i class="fas fa-arrow-up"></i><strong>${item.ticker}:</strong> ${formatarPercentual(item.variacao)}</div>`;
        });
        html += '</div><div><h5>Maiores Prejuízos</h5>';
        bottom3.forEach(item => {
            html += `<div class="alerta-item tipo-preco-baixa"><i class="fas fa-arrow-down"></i><strong>${item.ticker}:</strong> ${formatarPercentual(item.variacao)}</div>`;
        });
        html += '</div></div>';
    } else {
        html += '<p>Não há dados de variação suficientes.</p>';
    }

    container.innerHTML = html;
    abrirModal('modal-dashboard-alertas');
}

function renderizarPainelComparativo(resumoCarteira) {
    const container = document.getElementById('painel-comparativo-container');
    container.style.display = 'block';

    // --- INÍCIO DA ALTERAÇÃO ---
    // A função interna gerarTabelaHtml agora aceita dados de YoC/DY
    const gerarTabelaHtml = (dados, titulo, isComparisonColumn = false, dadosYoCDY = null) => {
    // --- FIM DA ALTERAÇÃO ---
        if (!dados) return '';
        
        let headerHtml;
        if (isComparisonColumn) {
            headerHtml = `
                <h3>
                    <span>${titulo}</span>
                    <i class="fas fa-file-import card-icone" id="btn-importar-resumo-painel" title="Importar Outro Backup (.json)"></i>
                </h3>`;
        } else {
            headerHtml = `<h3>${titulo}</h3>`;
        }

        // --- INÍCIO DA ALTERAÇÃO ---
        // A função interna criarLinha agora aceita yoc e dy
        const criarLinha = (label, valorBrl, isTotal = false, yoc = null, dy = null) => {
        // --- FIM DA ALTERAÇÃO ---
            const valorUsd = dadosMoedas.cotacoes.USD ? valorBrl / dadosMoedas.cotacoes.USD : 0;
            const valorEur = dadosMoedas.cotacoes.EUR ? valorBrl / dadosMoedas.cotacoes.EUR : 0;
            const valorGbp = dadosMoedas.cotacoes.GBP ? valorBrl / dadosMoedas.cotacoes.GBP : 0;
            const totalClass = isTotal ? 'total' : '';

            // --- INÍCIO DA ALTERAÇÃO ---
            // Lógica para construir o sub-texto de YoC/DY
            let yieldHtml = '';
            const yocFmt = (yoc !== null && yoc > 0) ? `YoC: ${formatarPercentual(yoc)}` : null;
            const dyFmt = (dy !== null && dy > 0) ? `DY: ${formatarPercentual(dy)}` : null;
            
            if (yocFmt || dyFmt) {
                yieldHtml = `<small class="yield-info">${[yocFmt, dyFmt].filter(Boolean).join(' | ')}</small>`;
            }
            // --- FIM DA ALTERAÇÃO ---

            return `
                <tr class="item-comparativo ${totalClass}">
                    <td class="label">${label}${yieldHtml}</td>
                    <td class="col-moeda-comparativo">${formatarMoedaEstrangeira(valorGbp, 'GBP')}</td>
                    <td class="col-moeda-comparativo">${formatarMoedaEstrangeira(valorEur, 'EUR')}</td>
                    <td class="col-moeda-comparativo">${formatarMoedaEstrangeira(valorUsd, 'USD')}</td>
                    <td class="valor">${formatarMoeda(valorBrl)}</td>
                </tr>
            `;
        };
        
        return `
            <div class="coluna-comparativa">
                ${headerHtml}
                <table>
                    <thead>
                        <tr>
                            <th>Métrica</th>
                            <th class="col-moeda-comparativo">GBP</th>
                            <th class="col-moeda-comparativo">EUR</th>
                            <th class="col-moeda-comparativo">USD</th>
                            <th class="valor">BRL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${criarLinha("Patrimônio Total", dados.patrimonioTotal, true)}
                        ${criarLinha("Carteira de Invest.", dados.carteiraInvestimentos)}
                        ${criarLinha("Saldo em Contas", dados.saldoContas || 0)}
                        ${criarLinha("Moedas Estrangeiras", dados.saldoMoedas || 0)}
                        ${criarLinha("Proventos Provisionados", dados.proventosProvisionados || 0)}
                        ${criarLinha("Proventos Mensais (Projetados)", dados.proventosMensais.total, true, dadosYoCDY?.total?.yoc, dadosYoCDY?.total?.dy)}
                        ${criarLinha("Proventos (Ações)", dados.proventosMensais.acoes, false, dadosYoCDY?.acoes?.yoc, dadosYoCDY?.acoes?.dy)}
                        ${criarLinha("Proventos (FIIs)", dados.proventosMensais.fiis, false, dadosYoCDY?.fiis?.yoc, dadosYoCDY?.fiis?.dy)}
                    </tbody>
                </table>
            </div>
        `;
    };

    if (!dadosComparacao) {
        container.innerHTML = `
            <div class="painel-comparativo-header"><h2>Painel Comparativo</h2></div>
            <div class="painel-comparativo-grid">
                <div class="coluna-comparativa">
                    <h3>Minha Carteira</h3>
                     <p style="padding: 15px; text-align: center; font-style: italic; color: #888;">Seus dados aparecerão aqui.</p>
                </div>
                <div class="coluna-comparativa">
                    <h3>
                        <span>Importar Carteira</span>
                        <i class="fas fa-file-import card-icone" id="btn-importar-resumo-painel" title="Importar Backup (.json) para Comparação"></i>
                    </h3>
                    <p style="padding: 15px; text-align: center;">Clique no ícone para carregar um arquivo de backup.</p>
                </div>
            </div>`;
        return;
    }

    const dadosAtuais = {
        nomeUsuario: userName || "Minha Carteira",
        patrimonioTotal: parseDecimal(document.getElementById('db-patrimonio-total').textContent),
        carteiraInvestimentos: parseDecimal(document.getElementById('db-carteira-total').textContent),
        saldoContas: parseDecimal(document.getElementById('db-contas-total').textContent),
        saldoMoedas: parseDecimal(document.getElementById('db-moedas-total').textContent),
        proventosProvisionados: parseDecimal(document.getElementById('db-proventos-provisionados-total').textContent),
        proventosMensais: {
            acoes: calcularProjecaoProventosNegociacao().acoes,
            fiis: calcularProjecaoProventosNegociacao().fiis,
            total: 0
        }
    };
    dadosAtuais.proventosMensais.total = dadosAtuais.proventosMensais.acoes + dadosAtuais.proventosMensais.fiis;
    
    // --- INÍCIO DA ALTERAÇÃO ---
    // Calcula YoC e DY para a carteira ATUAL (usando resumoCarteira que foi passado)
    const dadosYoCDY_Atuais = { acoes: {}, fiis: {}, total: {} };
    if (resumoCarteira) {
        const custoAcoes = resumoCarteira['Ações']?.custo || 0;
        const mercadoAcoes = resumoCarteira['Ações']?.mercado || 0;
        const proventosAcoesAnual = dadosAtuais.proventosMensais.acoes * 12;
        dadosYoCDY_Atuais.acoes.yoc = custoAcoes > 0 ? proventosAcoesAnual / custoAcoes : 0;
        dadosYoCDY_Atuais.acoes.dy = mercadoAcoes > 0 ? proventosAcoesAnual / mercadoAcoes : 0;

        const custoFIIs = resumoCarteira['FIIs']?.custo || 0;
        const mercadoFIIs = resumoCarteira['FIIs']?.mercado || 0;
        const proventosFIIsAnual = dadosAtuais.proventosMensais.fiis * 12;
        dadosYoCDY_Atuais.fiis.yoc = custoFIIs > 0 ? proventosFIIsAnual / custoFIIs : 0;
        dadosYoCDY_Atuais.fiis.dy = mercadoFIIs > 0 ? proventosFIIsAnual / mercadoFIIs : 0;

        const custoTotalRV = custoAcoes + custoFIIs;
        const mercadoTotalRV = mercadoAcoes + mercadoFIIs;
        const proventosTotalRVAnual = proventosAcoesAnual + proventosFIIsAnual;
        dadosYoCDY_Atuais.total.yoc = custoTotalRV > 0 ? proventosTotalRVAnual / custoTotalRV : 0;
        dadosYoCDY_Atuais.total.dy = mercadoTotalRV > 0 ? proventosTotalRVAnual / mercadoTotalRV : 0;
    }

    // Calcula YoC e DY para a carteira COMPARADA (usando os novos dados do backup)
    const dadosYoCDY_Comparacao = { acoes: {}, fiis: {}, total: {} };
    if (dadosComparacao.valorCustoPorClasse) {
        const custoAcoesComp = dadosComparacao.valorCustoPorClasse['Ações'] || 0;
        const mercadoAcoesComp = dadosComparacao.valorPorClasse['Ações'] || 0;
        const proventosAcoesAnualComp = dadosComparacao.proventosMensais.acoes * 12;
        dadosYoCDY_Comparacao.acoes.yoc = custoAcoesComp > 0 ? proventosAcoesAnualComp / custoAcoesComp : 0;
        dadosYoCDY_Comparacao.acoes.dy = mercadoAcoesComp > 0 ? proventosAcoesAnualComp / mercadoAcoesComp : 0;

        const custoFIIsComp = dadosComparacao.valorCustoPorClasse['FIIs'] || 0;
        const mercadoFIIsComp = dadosComparacao.valorPorClasse['FIIs'] || 0;
        const proventosFIIsAnualComp = dadosComparacao.proventosMensais.fiis * 12;
        dadosYoCDY_Comparacao.fiis.yoc = custoFIIsComp > 0 ? proventosFIIsAnualComp / custoFIIsComp : 0;
        dadosYoCDY_Comparacao.fiis.dy = mercadoFIIsComp > 0 ? proventosFIIsAnualComp / mercadoFIIsComp : 0;
        
        const custoTotalRVComp = custoAcoesComp + custoFIIsComp;
        const mercadoTotalRVComp = mercadoAcoesComp + mercadoFIIsComp;
        const proventosTotalRVAnualComp = proventosAcoesAnualComp + proventosFIIsAnualComp;
        dadosYoCDY_Comparacao.total.yoc = custoTotalRVComp > 0 ? proventosTotalRVAnualComp / custoTotalRVComp : 0;
        dadosYoCDY_Comparacao.total.dy = mercadoTotalRVComp > 0 ? proventosTotalRVAnualComp / mercadoTotalRVComp : 0;
    }
    // --- FIM DA ALTERAÇÃO ---

    const patrimonioSomado = dadosAtuais.patrimonioTotal + dadosComparacao.patrimonioTotal;
    const cotacoes = dadosMoedas.cotacoes;
    const totalGbp = cotacoes.GBP ? patrimonioSomado / cotacoes.GBP : 0;
    const totalEur = cotacoes.EUR ? patrimonioSomado / cotacoes.EUR : 0;
    const totalUsd = cotacoes.USD ? patrimonioSomado / cotacoes.USD : 0;
    
    const dataObj = new Date(dadosComparacao.dataExportacao + 'T12:00:00');
    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
    const tituloDadosComparacao = `${dadosComparacao.nomeUsuario} <span class="data-comparacao">(${dataFormatada})</span>`;

    container.innerHTML = `
        <div class="painel-comparativo-header">
            <h2>Painel Comparativo</h2>
            <div class="total-somado-container" id="painel-comparativo-total-container">
                <span class="patrimonio-somado-brl">Total: ${formatarMoeda(patrimonioSomado)}</span>
                <div class="patrimonio-somado-moedas">
                    <span>${formatarMoedaEstrangeira(totalGbp, 'GBP')}</span>
                    <span>${formatarMoedaEstrangeira(totalEur, 'EUR')}</span>
                    <span>${formatarMoedaEstrangeira(totalUsd, 'USD')}</span>
                </div>
            </div>
        </div>
        <div class="painel-comparativo-grid" id="painel-comparativo-grid-container">
            ${gerarTabelaHtml(dadosAtuais, dadosAtuais.nomeUsuario, false, dadosYoCDY_Atuais)}
            ${gerarTabelaHtml(dadosComparacao, tituloDadosComparacao, true, dadosYoCDY_Comparacao)}
        </div>
    `;
}

// *********** FIM DA PARTE 6.1






// ********** PARTE 7 - MÓDULO DE MOEDAS ESTRANGEIRAS (REFORMULADO)
function deletarAtivoMoeda(id) {
    if (confirm('Tem certeza que deseja excluir este ativo e todas as suas movimentações? Esta ação é irreversível.')) {
        todosOsAtivosMoedas = todosOsAtivosMoedas.filter(a => String(a.id) !== String(id));
        // Agora filtra o array unificado
        todasAsMovimentacoes = todasAsMovimentacoes.filter(t => !(t.tipoAlvo === 'moeda' && String(t.idAlvo) === String(id)));
        
        salvarAtivosMoedas();
        salvarMovimentacoes();
        
        // --- INÍCIO DA ALTERAÇÃO ---
        // Substitui a chamada da função obsoleta pela correta
        if (telas.caixaGlobal.style.display === 'block') {
            renderizarTelaCaixaGlobal(true); // O 'true' mantém o estado minimizado das colunas
        }
        // Adiciona uma verificação para a tela de cadastros também
        if (telas.cadastroContas.style.display === 'block') {
            renderizarTabelaContas();
        }
        // --- FIM DA ALTERAÇÃO ---
    }
}

function abrirModalNovaTransacaoMoeda(transacaoOuRegra = null) {
    const form = document.getElementById('form-nova-transacao-moeda');
    form.reset();
    popularDropdownsUniversais('transacao-moeda-conta-debito', 'transacao-moeda-conta-credito');
    popularDropdownAtivoRecorrente(); 

    document.getElementById('modal-transacao-moeda-titulo').textContent = 'Nova Movimentação';
    document.getElementById('transacao-moeda-id').value = '';
    document.getElementById('transacao-moeda-transferencia-id').value = '';
    document.getElementById('transacao-moeda-source-mae-id').value = '';
    document.getElementById('transacao-moeda-source-ocorrencia-data').value = '';
    document.getElementById('transacao-moeda-data').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('tipo-transacao-moeda-unica').checked = true;
    document.getElementById('tipo-transacao-moeda-unica').dispatchEvent(new Event('change'));

    // LIMPEZA: Checkbox de integração removido da lógica (não precisa mais ser exibido/ocultado)

    if (transacaoOuRegra) {
        if (transacaoOuRegra.recorrencia) { 
            // Lógica para editar REGRAS RECORRENTES
            const regra = transacaoOuRegra;
            document.getElementById('modal-transacao-moeda-titulo').textContent = 'Editar Movimentação Recorrente';
            document.getElementById('transacao-moeda-id').value = regra.id;
            const tipoRecorrenteRadio = document.getElementById('tipo-transacao-moeda-recorrente');
            tipoRecorrenteRadio.checked = true;
            tipoRecorrenteRadio.dispatchEvent(new Event('change'));
            const proximaOcorrencia = gerarTransacoesFilhas().find(f => String(f.sourceId) === String(regra.id));
            document.getElementById('transacao-moeda-data').value = proximaOcorrencia ? proximaOcorrencia.data : regra.dataInicio;
            document.getElementById('transacao-moeda-data').previousElementSibling.textContent = 'Data do Próximo Lançamento';
            document.getElementById('transacao-moeda-descricao').value = regra.descricao;
            document.getElementById('transacao-moeda-valor-debito').value = formatarDecimalParaInput(Math.abs(regra.valor));
            document.getElementById('transacao-moeda-tipo-recorrente').value = regra.valor > 0 ? 'entrada' : 'saida';
            const targetPrefix = regra.targetType === 'conta' ? 'brl_' : 'moeda_';
            document.getElementById('transacao-moeda-ativo-recorrente').value = `${targetPrefix}${regra.targetId}`;
            document.getElementById('recorrencia-moeda-frequencia').value = regra.recorrencia.frequencia;
            document.getElementById('recorrencia-moeda-frequencia').dispatchEvent(new Event('change'));
            if (regra.recorrencia.frequencia === 'mensal') {
                document.getElementById('recorrencia-moeda-dia-mes').value = regra.recorrencia.dia;
            } else {
                document.getElementById('recorrencia-moeda-dia-semana').value = regra.recorrencia.dia;
            }
            const tipoTerminoRadio = document.querySelector(`input[name="tipo-termino-moeda"][value="${regra.termino.tipo}"]`);
            if(tipoTerminoRadio) {
                tipoTerminoRadio.checked = true;
                tipoTerminoRadio.dispatchEvent(new Event('change'));
            }
            if (regra.termino.tipo === 'ocorrencias') {
                document.getElementById('termino-moeda-ocorrencias-valor').value = regra.termino.valor;
            } else {
                document.getElementById('termino-moeda-data-valor').value = regra.termino.valor;
            }
        
        } else if (transacaoOuRegra.sourceMaeId) { 
            // Lógica para editar OCORRÊNCIA
            const ocorrencia = transacaoOuRegra;
            document.getElementById('modal-transacao-moeda-titulo').textContent = 'Editar Ocorrência de Transação';
            document.getElementById('tipo-transacao-moeda-unica').checked = true;
            document.getElementById('tipo-transacao-moeda-unica').dispatchEvent(new Event('change'));
            document.getElementById('transacao-moeda-data').value = ocorrencia.data;
            document.getElementById('transacao-moeda-descricao').value = ocorrencia.descricao;
            document.getElementById('transacao-moeda-valor-debito').value = formatarDecimalParaInput(Math.abs(ocorrencia.valor));
            const prefixo = ocorrencia.targetType === 'conta' ? 'brl_' : 'moeda_';
            const idAlvo = `${prefixo}${ocorrencia.targetId}`;
            if (ocorrencia.valor > 0) {
                document.getElementById('transacao-moeda-conta-credito').value = idAlvo;
            } else {
                document.getElementById('transacao-moeda-conta-debito').value = idAlvo;
            }
            document.getElementById('transacao-moeda-source-mae-id').value = ocorrencia.sourceMaeId;
            document.getElementById('transacao-moeda-source-ocorrencia-data').value = ocorrencia.sourceOcorrenciaData;

        } else if (transacaoOuRegra.transferenciaId) { 
            // Lógica para editar TRANSFERÊNCIA
            document.getElementById('modal-transacao-moeda-titulo').textContent = 'Editar Transferência';
            const movimentacaoClicada = transacaoOuRegra;
            const idPar = movimentacaoClicada.transferenciaId;
            const movimentacaoPar = todasAsMovimentacoes.find(m => m.id === idPar);
            if (!movimentacaoPar) { alert('Erro crítico: Par não encontrado.'); return; }
            const debito = movimentacaoClicada.valor < 0 ? movimentacaoClicada : movimentacaoPar;
            const credito = movimentacaoClicada.valor > 0 ? movimentacaoClicada : movimentacaoPar;
            document.getElementById('transacao-moeda-id').value = debito.id; 
            document.getElementById('transacao-moeda-transferencia-id').value = credito.id;
            document.getElementById('transacao-moeda-data').value = debito.data;
            document.getElementById('transacao-moeda-valor-debito').value = formatarDecimalParaInput(Math.abs(debito.valor));
            document.getElementById('transacao-moeda-valor-credito').value = formatarDecimalParaInput(Math.abs(credito.valor));
            const descBase = debito.descricao.replace(/Transf\. para .*?: /, '') || credito.descricao.replace(/Transf\. de .*?: /, '');
            document.getElementById('transacao-moeda-descricao').value = descBase;
            const tipoDebitoPrefix = debito.tipoAlvo === 'conta' ? 'brl' : 'moeda';
            const tipoCreditoPrefix = credito.tipoAlvo === 'conta' ? 'brl' : 'moeda';
            document.getElementById('transacao-moeda-conta-debito').value = `${tipoDebitoPrefix}_${debito.idAlvo}`;
            document.getElementById('transacao-moeda-conta-credito').value = `${tipoCreditoPrefix}_${credito.idAlvo}`;

        } else { 
            // Lógica manual simples
            document.getElementById('modal-transacao-moeda-titulo').textContent = 'Editar Movimentação';
            document.getElementById('transacao-moeda-id').value = transacaoOuRegra.id;
            document.getElementById('transacao-moeda-data').value = transacaoOuRegra.data;
            document.getElementById('transacao-moeda-descricao').value = transacaoOuRegra.descricao;
            document.getElementById('transacao-moeda-valor-debito').value = formatarDecimalParaInput(Math.abs(transacaoOuRegra.valor));
            const prefixo = transacaoOuRegra.tipoAlvo === 'conta' ? 'brl_' : 'moeda_';
            const idAlvoCompleto = `${prefixo}${transacaoOuRegra.idAlvo}`;
            if (transacaoOuRegra.valor < 0) {
                document.getElementById('transacao-moeda-conta-debito').value = idAlvoCompleto;
            } else {
                document.getElementById('transacao-moeda-conta-credito').value = idAlvoCompleto;
            }
        }
    }
    
    document.getElementById('transacao-moeda-conta-debito').dispatchEvent(new Event('change'));
    document.getElementById('transacao-moeda-conta-credito').dispatchEvent(new Event('change'));

    abrirModal('modal-nova-transacao-moeda');
}

function gerarHtmlExtratoParaAtivoMoeda(ativo, dataInicio, dataFim) {
    const todosOsEventos = obterTodosOsEventosDeCaixa();
    const hojeStr = new Date().toISOString().split('T')[0];

    const dataAnteriorAoInicio = new Date(dataInicio + 'T00:00:00');
    dataAnteriorAoInicio.setDate(dataAnteriorAoInicio.getDate() - 1);
    const dataAnteriorAoInicioStr = dataAnteriorAoInicio.toISOString().split('T')[0];

    const transacoesPassadas = todosOsEventos.filter(e =>
        e.tipo === 'moeda' &&
        String(e.idAlvo) === String(ativo.id) &&
        e.source !== 'recorrente_futura' &&
        e.data <= dataAnteriorAoInicioStr &&
        e.data >= ativo.dataSaldoInicial
    );
    const saldoInicialLinha = transacoesPassadas.reduce((acc, t) => acc + arredondarMoeda(t.valor), ativo.saldoInicial);
    const labelSaldoInicialDaLinha = `Saldo em ${new Date(dataAnteriorAoInicioStr + 'T12:00:00').toLocaleDateString('pt-BR')}`;

    const transacoesParaExibicao = todosOsEventos.filter(e =>
        e.tipo === 'moeda' &&
        String(e.idAlvo) === String(ativo.id) &&
        e.data >= dataInicio &&
        e.data <= dataFim &&
        e.data >= ativo.dataSaldoInicial
    ).sort((a, b) => new Date(a.data + 'T12:00:00') - new Date(b.data + 'T12:00:00'));

    let saldoCorrente = arredondarMoeda(saldoInicialLinha);

    let corpoTabela = `<tr>
        <td>${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
        <td>${labelSaldoInicialDaLinha}</td>
        <td class="numero"></td>
        <td class="numero ${saldoCorrente < 0 ? 'valor-negativo' : ''}">${formatarMoedaEstrangeira(saldoCorrente, ativo.moeda)}</td>
        <td class="controles-col"></td>
    </tr>`;

    transacoesParaExibicao.forEach(evento => {
        const valorArredondado = arredondarMoeda(evento.valor);
        saldoCorrente += valorArredondado;
        saldoCorrente = arredondarMoeda(saldoCorrente);

        const valorFmt = formatarMoedaEstrangeira(valorArredondado, ativo.moeda);
        const valorClasse = valorArredondado < 0 ? 'valor-negativo' : 'valor-positivo';
        const saldoClasse = saldoCorrente < 0 ? 'valor-negativo' : '';

        // LIMPEZA: Ícone visual de sincronia removido
        let linhaClasse = '';
        let controles = '';

        if (evento.data === hojeStr) {
            linhaClasse = 'data-hoje-bg';
        }

        if (evento.source === 'recorrente_futura') {
            linhaClasse += ' transacao-futura';
            controles = `
                <i class="fas fa-check-circle acao-btn-recorrente" title="Confirmar esta ocorrência" data-mae-id="${evento.maeId}" data-ocorrencia-data="${evento.data}" data-action="CONFIRMAR_OCORRENCIA"></i>
                <i class="fas fa-pencil-alt acao-btn-recorrente" title="Ações para esta ocorrência/série" data-mae-id="${evento.maeId}" data-ocorrencia-data="${evento.data}" data-action="ABRIR_MODAL_ACOES_RECORRENTE"></i>
                <i class="fas fa-times-circle acao-btn-recorrente" title="Pular esta ocorrência" data-mae-id="${evento.maeId}" data-ocorrencia-data="${evento.data}" data-action="PULAR_OCORRENCIA"></i>
            `;
        } else if (evento.source === 'manual' || evento.source === 'recorrente_confirmada' || evento.transferenciaId) { 
            // LIMPEZA: Toggle sync removido
            controles = `<i class="fas fa-edit acao-btn edit" title="Editar Movimentação" data-id="${evento.id}" data-type="moeda"></i>
                         <i class="fas fa-trash acao-btn delete" title="Excluir Movimentação" data-id="${evento.id}" data-type="moeda"></i>`;
        } else {
            controles = `<i class="fas fa-lock" title="Transação automática."></i>`;
        }

        corpoTabela += `<tr class="${linhaClasse.trim()}">
            <td>${new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td>${evento.descricao}</td>
            <td class="numero ${valorClasse}">${valorFmt}</td>
            <td class="numero coluna-saldo ${saldoClasse}">${formatarMoedaEstrangeira(saldoCorrente, ativo.moeda)}</td>
            <td class="controles-col">${controles}</td>
        </tr>`;
    });

    const transacoesHoje = todosOsEventos.filter(e =>
        e.tipo === 'moeda' &&
        String(e.idAlvo) === String(ativo.id) &&
        e.source !== 'recorrente_futura' &&
        e.data <= hojeStr &&
        e.data >= ativo.dataSaldoInicial
    );
    const saldoFinalHoje = transacoesHoje.reduce((soma, t) => soma + arredondarMoeda(t.valor), ativo.saldoInicial);
    const temMovimentoHoje = todosOsEventos.some(t => t.tipo === 'moeda' && String(t.idAlvo) === String(ativo.id) && t.source !== 'recorrente_futura' && t.data === hojeStr);

    return { html: corpoTabela, saldoFinal: saldoFinalHoje, temMovimentoHoje };
}

function exportarProventosCSV() {
    const proventosParaExportar = obterProventosFiltrados();

    if (proventosParaExportar.length === 0) {
        alert("Nenhum provento para exportar com os filtros atuais.");
        return;
    }

    const escapeCSV = (value) => {
        const str = String(value || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headers = [
        'Ativo', 'Tipo', 'DataCOM', 'DataPagamento', 'ValorBrutoUnitario', 'AliquotaIR'
    ];
    let csvRows = [headers.join(',')];

    proventosParaExportar.forEach(p => {
        let aliquota, valorBruto;

        if (p.valorBrutoIndividual !== undefined && p.percentualIR !== undefined) {
            valorBruto = p.valorBrutoIndividual;
            aliquota = p.percentualIR;
        } else {
            aliquota = 0;
            valorBruto = p.valorIndividual; 
            if (p.tipo === 'JCP') {
                 aliquota = 15;
                 valorBruto = p.valorIndividual / (1 - 0.15);
            }
        }
        
        const row = [
            p.ticker, p.tipo, p.dataCom, p.dataPagamento,
            valorBruto.toFixed(8),
            aliquota
        ];
        csvRows.push(row.map(escapeCSV).join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const nomeArquivo = `proventos_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function importarProventosCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    // --- INÍCIO DA ALTERAÇÃO (Feedback do Botão) ---
    const btnImportar = document.getElementById('btn-importar-proventos');
    const originalBtnHTML = btnImportar.innerHTML;
    btnImportar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
    btnImportar.disabled = true;
    
    // Força a UI a atualizar antes da tarefa pesada
    await new Promise(resolve => setTimeout(resolve, 0));
    // --- FIM DA ALTERAÇÃO ---

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const linhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
            if (linhas.length <= 1) throw new Error('Arquivo CSV vazio ou inválido.');

            const linhasDeDados = linhas.slice(1);
            let proventosImportados = 0;
            let proventosIgnorados = 0;

            linhasDeDados.forEach(linha => {
                const cols = linha.split(',').map(c => c.trim().replace(/"/g, ''));
                if (cols.length < 6) return;

                const [ticker, tipo, dataComRaw, dataPagamentoRaw, valorBrutoStr, aliquotaIRStr] = cols;
                const dataCom = normalizarDataParaInput(dataComRaw);
                const dataPagamento = normalizarDataParaInput(dataPagamentoRaw);

                if (!todosOsAtivos.some(a => a.ticker === ticker)) {
                    proventosIgnorados++;
                    console.warn(`Provento para ${ticker} ignorado: Ativo não cadastrado.`);
                    return;
                }

                const posicoesNaDataCom = gerarPosicaoDetalhada(dataCom);
                const posicaoDoAtivo = posicoesNaDataCom[ticker];
                if (!posicaoDoAtivo || posicaoDoAtivo.quantidade <= 0) {
                    proventosIgnorados++;
                    console.warn(`Provento para ${ticker} ignorado: Sem posição em carteira na data ${dataCom}.`);
                    return;
                }

                const valorBruto = parseDecimal(valorBrutoStr);
                const aliquotaIRPercent = parseDecimal(aliquotaIRStr) || 0;
                const aliquotaIR = aliquotaIRPercent / 100;
                const valorLiquido = valorBruto * (1 - aliquotaIR);

                const proventoJaExiste = todosOsProventos.some(p => 
                    p.ticker === ticker &&
                    p.tipo === tipo &&
                    p.dataCom === dataCom &&
                    p.dataPagamento === dataPagamento &&
                    Math.abs(p.valorIndividual - valorLiquido) < 0.005 
                );

                if (proventoJaExiste) {
                    proventosIgnorados++;
                    console.warn(`Provento para ${ticker} ignorado: Registro duplicado já existente.`);
                    return; 
                }

                const dadosCalculados = calcularDadosProvento(ticker, dataCom, valorLiquido);

                const novoProvento = {
                    id: Date.now() + Math.random(),
                    ticker, tipo, dataCom, dataPagamento,
                    valorIndividual: valorLiquido,
                    valorBrutoIndividual: valorBruto,
                    percentualIR: aliquotaIRPercent,
                    ...dadosCalculados
                };

                todosOsProventos.push(novoProvento);
                sincronizarProventoComTransacao(novoProvento.id);
                proventosImportados++;
            });

            if (proventosImportados > 0) {
                // --- INÍCIO DA CORREÇÃO (await) ---
                // Espera os salvamentos terminarem ANTES de sincronizar
                await salvarProventos();
                await salvarMovimentacoes();
                
                // DISPARA A SINCRONIZAÇÃO SILENCIOSA (agora com dados atualizados)
                await sincronizarTodosOsRegistros(null, true);
                // --- FIM DA CORREÇÃO (await) ---
            }

            alert(`Importação concluída!\n\n- ${proventosImportados} proventos foram importados com sucesso.\n- ${proventosIgnorados} proventos foram ignorados (por duplicidade, falta de posição ou ativo não cadastrado).`);

        } catch (error) {
            alert('Erro ao processar o arquivo CSV de proventos.\nDetalhes: ' + error.message);
        } finally {
            // --- INÍCIO DA ALTERAÇÃO (Feedback do Botão) ---
            // Reabilita o botão em todos os casos (sucesso ou falha)
            btnImportar.innerHTML = originalBtnHTML;
            btnImportar.disabled = false;
            event.target.value = ''; // Limpa o input
            // --- FIM DA ALTERAÇÃO ---
        }
    };
    reader.readAsText(file);
    // event.target.value = ''; // Movido para dentro do 'finally'
}
function resetarSimulacaoNegociacao() {
    if (!confirm('Tem certeza que deseja limpar toda a simulação? As quantidades serão zeradas e os preços serão atualizados para os valores de mercado.')) {
        return;
    }

    ['#negociar-fiis-tbody', '#negociar-acoes-tbody'].forEach(tbodyId => {
        const tbody = document.querySelector(tbodyId);
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(tr => {
                const inputQtd = tr.querySelector('.negociar-input-qtd');
                const inputPreco = tr.querySelector('.negociar-input-preco');
                // Pega o preço atual da célula (índice 2, pois 0 é nome, 1 é PM)
                const precoAtual = parseDecimal(tr.cells[2].textContent);

                if (inputQtd) inputQtd.value = '';
                if (inputPreco) inputPreco.value = formatarDecimalParaInput(precoAtual);
                
                // Dispara o evento para forçar o recálculo da linha e dos totais
                if (inputPreco) {
                     inputPreco.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    });

    // --- CORREÇÃO: Limpa também o valor do aporte ---
    dadosSimulacaoNegociar.aporteTotal = '';
    const inputAporte = document.getElementById('negociar-aporte-valor');
    if (inputAporte) {
        inputAporte.value = '';
    }
    
    // Reseta os dados internos de simulação
    dadosSimulacaoNegociar.fiis = {};
    dadosSimulacaoNegociar.acoes = {};

    atualizarResumoAporte();
    salvarDadosSimulacaoNegociar();
    alert('Simulação resetada!');
}

function abrirModalResumoNegociacao() {
    const compras = [];
    const vendas = [];

    for (const tipo in dadosSimulacaoNegociar) {
        if (tipo === 'fiis' || tipo === 'acoes') {
            for (const ticker in dadosSimulacaoNegociar[tipo]) {
                const sim = dadosSimulacaoNegociar[tipo][ticker];
                if (sim.qtd && sim.qtd > 0) {
                    compras.push({
                        ticker: ticker,
                        quantidade: sim.qtd,
                        preco: sim.preco || 0,
                        total: sim.qtd * (sim.preco || 0)
                    });
                } else if (sim.qtd && sim.qtd < 0) {
                    vendas.push({
                        ticker: ticker,
                        quantidade: Math.abs(sim.qtd),
                        preco: sim.preco || 0,
                        total: Math.abs(sim.qtd) * (sim.preco || 0)
                    });
                }
            }
        }
    }

    if (compras.length === 0 && vendas.length === 0) {
        alert('Nenhuma compra ou venda simulada para visualizar. Preencha a coluna "Qtd" de pelo menos um ativo.');
        return;
    }

    const container = document.getElementById('modal-resumo-negociacao-conteudo');
    let conteudoHtml = '';

    if (vendas.length > 0) {
        vendas.sort((a, b) => b.total - a.total);
        conteudoHtml += `<h4>Vendas Simuladas</h4><table><thead>
            <tr><th>Ativo</th><th class="numero">Quantidade</th><th class="numero">Preço de Venda</th><th class="numero">Valor Total</th></tr>
        </thead><tbody>`;
        vendas.forEach(venda => {
            conteudoHtml += `
                <tr>
                    <td>${venda.ticker}</td>
                    <td class="numero">${venda.quantidade}</td>
                    <td class="numero">${formatarMoeda(venda.preco)}</td>
                    <td class="numero">${formatarMoeda(venda.total)}</td>
                </tr>`;
        });
        conteudoHtml += '</tbody></table>';
    }

    if (compras.length > 0) {
        compras.sort((a, b) => b.total - a.total);
        conteudoHtml += `<h4 style="margin-top: 20px;">Compras Simuladas</h4><table><thead>
            <tr><th>Ativo</th><th class="numero">Quantidade</th><th class="numero">Preço de Compra</th><th class="numero">Valor Total</th></tr>
        </thead><tbody>`;
        compras.forEach(compra => {
            conteudoHtml += `
                <tr>
                    <td>${compra.ticker}</td>
                    <td class="numero">${compra.quantidade}</td>
                    <td class="numero">${formatarMoeda(compra.preco)}</td>
                    <td class="numero">${formatarMoeda(compra.total)}</td>
                </tr>`;
        });
        conteudoHtml += '</tbody></table>';
    }

    const totalCompra = compras.reduce((soma, item) => soma + item.total, 0);
    const totalVenda = vendas.reduce((soma, item) => soma + item.total, 0);
    const valorLiquido = totalVenda - totalCompra;
    const classeLiquido = valorLiquido >= 0 ? 'valor-positivo' : 'valor-negativo';

    const rendimentoAtualFiis = parseDecimal(document.getElementById('total-rend-atual-fiis').textContent);
    const rendimentoPosCompraFiis = parseDecimal(document.getElementById('total-rend-pos-compra-fiis').textContent);
    const rendimentoAtualAcoes = parseDecimal(document.getElementById('total-rend-atual-acoes').textContent);
    const rendimentoPosCompraAcoes = parseDecimal(document.getElementById('total-rend-pos-compra-acoes').textContent);
    
    const rendimentoTotalAtual = rendimentoAtualFiis + rendimentoAtualAcoes;
    const rendimentoTotalPosCompra = rendimentoPosCompraFiis + rendimentoPosCompraAcoes;
    const acrescimoRendimento = rendimentoTotalPosCompra - rendimentoTotalAtual;

    const percentualAcrescimo = (rendimentoTotalAtual > 0) ? (acrescimoRendimento / rendimentoTotalAtual) : (acrescimoRendimento > 0 ? Infinity : 0);
    const sinal = acrescimoRendimento > 0.005 ? '+' : '';
    
    const totaisHtml = `
        <div class="resumo-negociacao-totais">
            <div>
                <span>Total das Vendas:</span>
                <span>${formatarMoeda(totalVenda)}</span>
            </div>
            <div>
                <span>Total das Compras:</span>
                <span>${formatarMoeda(totalCompra)}</span>
            </div>
            <div class="total-compra">
                <strong>Líquido da Operação:</strong>
                <strong class="${classeLiquido}">${formatarMoeda(valorLiquido)}</strong>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 10px 0;">
            <div>
                <span>Rendimento Mensal (Antes):</span>
                <span>${formatarMoeda(rendimentoTotalAtual)}</span>
            </div>
            <div>
                <span>Rendimento Mensal (Depois):</span>
                <span>${formatarMoeda(rendimentoTotalPosCompra)}</span>
            </div>
            <div>
                <strong>Acréscimo no Rendimento:</strong>
                <div class="valor-agrupado-direita">
                    <strong>${formatarMoeda(acrescimoRendimento)}</strong>
                    <small>${sinal}${formatarPercentual(percentualAcrescimo)}</small>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = conteudoHtml + totaisHtml;
    abrirModal('modal-resumo-negociacao');
}
function criarNotaAPartirDaSimulacao() {
    const operacoesSimuladas = [];
    ['fiis', 'acoes'].forEach(tipo => {
        if (dadosSimulacaoNegociar[tipo]) {
            for (const ticker in dadosSimulacaoNegociar[tipo]) {
                const sim = dadosSimulacaoNegociar[tipo][ticker];
                if (sim.qtd && sim.qtd !== 0) {
                    const tipoOperacao = sim.qtd > 0 ? 'compra' : 'venda';
                    const quantidade = Math.abs(sim.qtd);
                    const preco = sim.preco || 0;
                    operacoesSimuladas.push({
                        id: Date.now() + Math.random(),
                        ativo: ticker,
                        tipo: tipoOperacao,
                        quantidade: quantidade,
                        valor: arredondarMoeda(quantidade * preco)
                    });
                }
            }
        }
    });

    if (operacoesSimuladas.length === 0) {
        alert("Não há negociações simuladas para criar uma nota. Preencha a coluna 'Qtd' de pelo menos um ativo.");
        return;
    }

    if (!confirm(`Você deseja criar uma nova nota de negociação com ${operacoesSimuladas.length} operação(ões) a partir da sua simulação atual?`)) {
        return;
    }

    iniciarNovaNota(); // Prepara a tela de lançamento com uma nota em branco (e com "Selecione...")

    // --- INÍCIO DAS NOVAS LINHAS ---
    const hoje = new Date().toISOString().split('T')[0];
    notaAtual.numero = '---';
    notaAtual.data = hoje;
    
    // Atualiza a interface
    document.getElementById('nota-numero').value = '---';
    document.getElementById('nota-data').value = hoje;
    // --- FIM DAS NOVAS LINHAS ---

    notaAtual.operacoes = operacoesSimuladas; // Substitui as operações vazias pelas simuladas

    // Atualiza a tabela de operações e os totais (incluindo data de liquidação)
    renderizarTabelaOperacoes();
    atualizarTotais();

    // Avisa ao usuário para completar o preenchimento
    setTimeout(() => {
        alert(`Operações carregadas! Por favor, selecione a Corretora, confirme a Data e o Número da Nota, e preencha os Custos antes de salvar.`);
    }, 100);
}
function renderizarTelaNegociar() {
    document.getElementById('negociar-aporte-valor').value = dadosSimulacaoNegociar.aporteTotal ? formatarDecimalParaInput(parseDecimal(dadosSimulacaoNegociar.aporteTotal)) : '';

    const posicoesAtuais = gerarPosicaoDetalhada();
    const dadosBalanceamento = gerarDadosBalanceamento('todos');
    
    const projecaoProventos = calcularProjecaoProventosNegociacao();

    const getTickersToDisplay = (tipoSimulacao) => {
        const tickers = new Set();
        const tipoAtivoCorreto = tipoSimulacao === 'acoes' ? 'Ação' : 'FII'; 

        // 1. Adiciona ativos da carteira atual (em posição)
        todosOsAtivos.forEach(a => {
            const tipoAtivo = a.tipo === 'Ação' ? 'acoes' : 'fiis';
            if (tipoAtivo === tipoSimulacao && posicoesAtuais[a.ticker] && posicoesAtuais[a.ticker].quantidade > 0) {
                tickers.add(a.ticker);
            }
        });

        // 2. Adiciona ativos da simulação salva
        if (dadosSimulacaoNegociar[tipoSimulacao]) {
            Object.keys(dadosSimulacaoNegociar[tipoSimulacao]).forEach(ticker => {
                if (dadosSimulacaoNegociar[tipoSimulacao][ticker].qtd !== 0) {
                    tickers.add(ticker);
                }
            });
        }

        // 3. Adiciona ativos do plano de alocação
        Object.keys(dadosAlocacao.ativos).forEach(ticker => {
            const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
            if (ativoInfo && ativoInfo.tipo === tipoAtivoCorreto) {
                tickers.add(ticker);
            }
        });

        return Array.from(tickers).sort();
    };

    // --- SEÇÃO DE FIIs ---
    const tbodyFiis = document.getElementById('negociar-fiis-tbody');
    const tfootFiis = document.getElementById('negociar-fiis-tfoot');
    tbodyFiis.innerHTML = '';
    const fiisParaExibir = getTickersToDisplay('fiis');

    if (fiisParaExibir.length === 0) {
        tbodyFiis.innerHTML = '<tr><td colspan="16" style="text-align: center;">Nenhum Fundo Imobiliário em carteira ou no plano de alocação.</td></tr>';
        tfootFiis.style.display = 'none';
    } else {
        tfootFiis.style.display = 'table-footer-group';
        let htmlFiis = '';
        fiisParaExibir.forEach(ticker => {
            const fii = todosOsAtivos.find(a => a.ticker === ticker);
            if (!fii) return;

            const posicao = posicoesAtuais[ticker], dadosMercado = dadosDeMercado.cotacoes[ticker] || {}, dadosSimulacao = dadosSimulacaoNegociar.fiis[ticker] || {}, dadosDoAtivoNoBalanceamento = dadosBalanceamento.categorias['FIIs']?.ativos.find(a => a.ticker === ticker);
            const qtdAtual = posicao ? posicao.quantidade : 0, precoMedio = posicao ? posicao.precoMedio : 0, precoAtual = dadosMercado.valor || 0;
            const vpa = dadosMercado.vpa || 0;
            const ultimoProvento = getUltimoProvento(ticker);
            const metaQtd = dadosDoAtivoNoBalanceamento ? Math.round(dadosDoAtivoNoBalanceamento.ideal.quantidade) : 0;
            const ajusteQtd = dadosDoAtivoNoBalanceamento ? Math.round(dadosDoAtivoNoBalanceamento.ajuste.quantidade) : 0;
            let ajusteQtdHtml = '0';
            if (ajusteQtd > 0) ajusteQtdHtml = `<span class="valor-positivo">+${ajusteQtd}</span>`;
            else if (ajusteQtd < 0) ajusteQtdHtml = `<span class="valor-negativo">${ajusteQtd}</span>`;
            const qtdSimulada = dadosSimulacao.qtd || 0, precoSimulado = dadosSimulacao.preco || precoAtual;
            const rendimentoAtual = ultimoProvento * qtdAtual;
            const yieldProjetado = (precoAtual > 0 && ultimoProvento > 0) ? (ultimoProvento * 12) / precoAtual : 0;
            const diff = precoAtual - precoMedio;
            const diffPercent = precoMedio > 0 ? (diff / precoMedio) : 0;
            let classePreco = '', desempenhoHtml = '-';
            if (diffPercent > 0.0001) { classePreco = 'preco-maior'; desempenhoHtml = `<span class="preco-maior">↑ ${formatarPercentual(diffPercent)}</span>`; } 
            else if (diffPercent < -0.0001) { classePreco = 'preco-menor'; desempenhoHtml = `<span class="preco-menor">↓ ${formatarPercentual(Math.abs(diffPercent))}</span>`; }
            
            const hoje = new Date().toISOString().split('T')[0];
            let proximaDataComHtml = '';
            const proximoProvento = todosOsProventos
                .filter(p => p.ticker === ticker && p.dataCom >= hoje)
                .sort((a, b) => new Date(a.dataCom) - new Date(a.dataCom))[0];

            if (proximoProvento) {
                const dataFmt = new Date(proximoProvento.dataCom + 'T12:00:00').toLocaleDateString('pt-BR');
                proximaDataComHtml = `<small class="next-ex-date"><i class="fas fa-calendar-day"></i> Próx. Data-Com: ${dataFmt}</small>`;
            }

            htmlFiis += `<tr data-ticker="${ticker}" data-qtd-atual="${qtdAtual}" data-ultimo-provento="${ultimoProvento}">
                <td><strong>${ticker}</strong>${proximaDataComHtml}</td>
                <td class="numero">${formatarPrecoMedio(precoMedio)}</td>
                <td class="numero ${classePreco}">${formatarMoeda(precoAtual)}</td>
                <td class="percentual col-variacao">${desempenhoHtml}</td>
                <td class="numero">${vpa > 0 ? formatarDecimal(precoMedio / vpa) : 'N/A'}</td>
                <td class="numero">${vpa > 0 ? formatarDecimal(precoAtual / vpa) : 'N/A'}</td>
                <td class="percentual">${yieldProjetado > 0 ? formatarPercentual(yieldProjetado) : 'N/A'}</td>
                <td class="numero col-qtd">${Math.round(qtdAtual)}</td>
                <td class="numero col-qtd">${metaQtd}</td>
                <td class="numero col-qtd">${ajusteQtdHtml}</td>
                <td class="numero col-qtd"><input type="number" class="input-in-table negociar-input-qtd" placeholder="0" value="${qtdSimulada || ''}"></td>
                <td class="numero"><input type="text" class="input-in-table negociar-input-preco" value="${formatarDecimalParaInput(precoSimulado)}"></td>
                <td class="numero" data-field="totalCompraSimulado">R$ 0,00</td>
                <td class="numero col-qtd" data-field="posicaoFinalSimulada">${Math.round(qtdAtual)}</td>
                <td class="numero" data-field="rendimentoAtual">${formatarMoeda(rendimentoAtual)}</td>
                <td class="numero" data-field="rendimentoPosCompra">${formatarMoeda(rendimentoAtual)}</td>
            </tr>`;
        });
        tbodyFiis.innerHTML = htmlFiis;
    }
    // Nota: O valor inicial aqui é apenas um placeholder, será atualizado pelo evento 'input' no final
    tfootFiis.querySelector('[id^="total-rend-atual-"]').textContent = formatarMoeda(projecaoProventos.fiis);
    
    const tbodyAcoes = document.getElementById('negociar-acoes-tbody');
    const tfootAcoes = document.getElementById('negociar-acoes-tfoot');
    tbodyAcoes.innerHTML = '';
    const acoesParaExibir = getTickersToDisplay('acoes');

    if (acoesParaExibir.length === 0) {
        tbodyAcoes.innerHTML = '<tr><td colspan="19" style="text-align: center;">Nenhuma Ação em carteira ou no plano de alocação.</td></tr>';
        tfootAcoes.style.display = 'none';
    } else {
        tfootAcoes.style.display = 'table-footer-group';
        let htmlAcoes = '';
        acoesParaExibir.forEach(ticker => {
            const acao = todosOsAtivos.find(a => a.ticker === ticker);
            if (!acao) return;

            const posicao = posicoesAtuais[ticker], dadosMercado = dadosDeMercado.cotacoes[ticker] || {}, dadosSimulacao = dadosSimulacaoNegociar.acoes[ticker] || {}, dadosDoAtivoNoBalanceamento = dadosBalanceamento.categorias['Ações']?.ativos.find(a => a.ticker === ticker);
            const qtdAtual = posicao ? posicao.quantidade : 0, precoMedio = posicao ? posicao.precoMedio : 0, precoAtual = dadosMercado.valor || 0, lpa = dadosMercado.lpa_acao || 0;
            const vpa = dadosMercado.vpa || 0;
            const min52 = dadosMercado.min52 || 0, max52 = dadosMercado.max52 || 0;
            const projecaoAnualUnitaria = calcularProjecaoAnualUnitaria(ticker, { limiteAnos: 5 });
            const yieldProjetado = (precoAtual > 0 && projecaoAnualUnitaria > 0) ? projecaoAnualUnitaria / precoAtual : 0;
            const metaYieldBazin = acao.metaYieldBazin || 0.06;
            const precoTetoBazin = calcularPrecoTetoBazin(projecaoAnualUnitaria, metaYieldBazin);
            const precoTetoGraham = calcularPrecoTetoGraham(lpa, vpa);
            const pl = lpa > 0 ? (precoAtual / lpa) : 0;
            const payout = (lpa > 0 && projecaoAnualUnitaria > 0) ? (projecaoAnualUnitaria / lpa) : 0;
            const metaQtd = dadosDoAtivoNoBalanceamento ? Math.round(dadosDoAtivoNoBalanceamento.ideal.quantidade) : 0;
            const ajusteQtd = dadosDoAtivoNoBalanceamento ? Math.round(dadosDoAtivoNoBalanceamento.ajuste.quantidade) : 0;
            let ajusteQtdHtml = '0';
            if (ajusteQtd > 0) ajusteQtdHtml = `<span class="valor-positivo">+${ajusteQtd}</span>`;
            else if (ajusteQtd < 0) ajusteQtdHtml = `<span class="valor-negativo">${ajusteQtd}</span>`;
            const qtdSimulada = dadosSimulacao.qtd || 0, precoSimulado = dadosSimulacao.preco || precoAtual;
            const rendimentoAtual = (projecaoAnualUnitaria * qtdAtual) / 12;
            const diff = precoAtual - precoMedio;
            const diffPercent = precoMedio > 0 ? (diff / precoMedio) : 0;
            let classePreco = '', desempenhoHtml = '-';
            if (diffPercent > 0.0001) { classePreco = 'preco-maior'; desempenhoHtml = `<span class="preco-maior">↑ ${formatarPercentual(diffPercent)}</span>`; } 
            else if (diffPercent < -0.0001) { classePreco = 'preco-menor'; desempenhoHtml = `<span class="preco-menor">↓ ${formatarPercentual(Math.abs(diffPercent))}</span>`; }
            
            const hoje = new Date().toISOString().split('T')[0];
            let proximaDataComHtml = '';
            const proximoProvento = todosOsProventos
                .filter(p => p.ticker === ticker && p.dataCom >= hoje)
                .sort((a, b) => new Date(a.dataCom) - new Date(a.dataCom))[0];

            if (proximoProvento) {
                const dataFmt = new Date(proximoProvento.dataCom + 'T12:00:00').toLocaleDateString('pt-BR');
                proximaDataComHtml = `<small class="next-ex-date"><i class="fas fa-calendar-day"></i> Próx. Data-Com: ${dataFmt}</small>`;
            }

            htmlAcoes += `<tr data-ticker="${ticker}" data-qtd-atual="${qtdAtual}" data-dividendo-anual="${projecaoAnualUnitaria}" data-meta-yield-bazin="${metaYieldBazin}">
                <td><strong>${ticker}</strong>${proximaDataComHtml}</td>
                <td class="numero">${formatarPrecoMedio(precoMedio)}</td>
                <td class="numero ${classePreco}">${formatarMoeda(precoAtual)}</td>
                <td class="numero">${desempenhoHtml}</td>
                <td class="numero col-price-range-vertical"><span>${formatarMoeda(min52)}</span><span>${formatarMoeda(max52)}</span></td>
                <td class="numero">
                    <div class="bazin-cell-container">
                        <span data-field="precoTetoBazin">${formatarMoeda(precoTetoBazin)}</span>
                        <span class="meta-yield-display" title="Meta de Yield (do Cadastro de Ativos)">${formatarPercentual(metaYieldBazin)}</span>
                    </div>
                </td>
                <td class="numero">${formatarMoeda(precoTetoGraham)}</td>
                <td class="numero">${lpa > 0 ? formatarDecimal(pl) : 'N/A'}</td>
                <td class="numero">${lpa > 0 ? formatarPercentual(payout) : 'N/A'}</td>
                <td class="percentual">${yieldProjetado > 0 ? formatarPercentual(yieldProjetado) : 'N/A'}</td>
                <td class="numero col-qtd">${Math.round(qtdAtual)}</td>
                <td class="numero col-qtd">${metaQtd}</td>
                <td class="numero col-qtd">${ajusteQtdHtml}</td>
                <td class="numero col-qtd"><input type="number" class="input-in-table negociar-input-qtd" placeholder="0" value="${qtdSimulada || ''}"></td>
                <td class="numero"><input type="text" class="input-in-table negociar-input-preco" value="${formatarDecimalParaInput(precoSimulado)}"></td>
                <td class="numero" data-field="totalCompraSimulado">R$ 0,00</td>
                <td class="numero col-qtd" data-field="posicaoFinalSimulada">${Math.round(qtdAtual)}</td>
                <td class="numero" data-field="rendimentoAtual">${formatarMoeda(rendimentoAtual)}</td>
                <td class="numero" data-field="rendimentoPosCompra">${formatarMoeda(rendimentoAtual)}</td>
            </tr>`;
        });
        tbodyAcoes.innerHTML = htmlAcoes;
    }
    // Nota: O valor inicial aqui é apenas um placeholder, será atualizado pelo evento 'input' no final
    tfootAcoes.querySelector('[id^="total-rend-atual-"]').textContent = formatarMoeda(projecaoProventos.acoes);

    const containerTela = document.getElementById('tela-negociar');
    if (containerTela._listener) {
        containerTela.removeEventListener('input', containerTela._listener);
        containerTela.removeEventListener('change', containerTela._listener);
    }
    if (containerTela._keydownListener) {
        containerTela.removeEventListener('keydown', containerTela._keydownListener);
    }
    
    const recalcularAoInteragir = (e) => {
        if (!e.target.classList.contains('input-in-table')) return;
        const tr = e.target.closest('tr'); if (!tr) return;
        const ticker = tr.dataset.ticker;
        const tipoAtivo = tr.closest('tbody').id.includes('fiis') ? 'fiis' : 'acoes';
        
        let qtdSimulada = parseInt(tr.querySelector('.negociar-input-qtd').value, 10) || 0;
        const precoSimulado = parseDecimal(tr.querySelector('.negociar-input-preco').value) || 0;
    
        if (qtdSimulada > 0) {
            const aporteTotal = parseDecimal(document.getElementById('negociar-aporte-valor').value);
            let custoOutrasOperacoes = 0;
    
            ['fiis', 'acoes'].forEach(tipo => {
                for (const t in dadosSimulacaoNegociar[tipo]) {
                    if (t !== ticker) { 
                        const sim = dadosSimulacaoNegociar[tipo][t];
                        custoOutrasOperacoes += (sim.qtd || 0) * (sim.preco || 0);
                    }
                }
            });
            
            const saldoDisponivelAntesDestaCompra = aporteTotal - custoOutrasOperacoes;
    
            if (precoSimulado > 0 && (qtdSimulada * precoSimulado > saldoDisponivelAntesDestaCompra + 0.01)) {
                const maxQtdPossivel = Math.floor(saldoDisponivelAntesDestaCompra / precoSimulado);
                alert(`Saldo de aporte insuficiente. Com o saldo restante de ${formatarMoeda(saldoDisponivelAntesDestaCompra)}, você pode comprar no máximo ${maxQtdPossivel} unidade(s) deste ativo.`);
                qtdSimulada = maxQtdPossivel; 
                tr.querySelector('.negociar-input-qtd').value = qtdSimulada > 0 ? qtdSimulada : ''; 
            }
        }
    
        if (!dadosSimulacaoNegociar[tipoAtivo][ticker]) dadosSimulacaoNegociar[tipoAtivo][ticker] = {};
        dadosSimulacaoNegociar[tipoAtivo][ticker].qtd = qtdSimulada;
        dadosSimulacaoNegociar[tipoAtivo][ticker].preco = precoSimulado;
    
        tr.classList.remove('simulacao-compra', 'simulacao-venda');
        if (qtdSimulada > 0) {
            tr.classList.add('simulacao-compra');
        } else if (qtdSimulada < 0) {
            tr.classList.add('simulacao-venda');
        }
    
        const qtdAtual = parseFloat(tr.dataset.qtdAtual);
        tr.querySelector('[data-field="totalCompraSimulado"]').textContent = formatarMoeda(qtdSimulada * precoSimulado);
        tr.querySelector('[data-field="posicaoFinalSimulada"]').textContent = Math.round(qtdAtual + qtdSimulada);
        let totalRendPosCompraGrupo = 0;
        const tbody = tr.closest('tbody');
        
        if (tipoAtivo === 'fiis') {
            const ultimoProvento = parseFloat(tr.dataset.ultimoProvento);
            tr.querySelector('[data-field="rendimentoPosCompra"]').textContent = formatarMoeda(ultimoProvento * (qtdAtual + qtdSimulada));
        } else {
            const metaYieldBazin = parseFloat(tr.dataset.metaYieldBazin);
            delete dadosSimulacaoNegociar.acoes[ticker].bazinYield;
            const dividendoAnual = parseFloat(tr.dataset.dividendoAnual);
            tr.querySelector('[data-field="rendimentoPosCompra"]').textContent = formatarMoeda((dividendoAnual * (qtdAtual + qtdSimulada)) / 12);
            tr.querySelector('[data-field="precoTetoBazin"]').textContent = formatarMoeda(calcularPrecoTetoBazin(dividendoAnual, metaYieldBazin));
        }        
        
        // --- CORREÇÃO PRINCIPAL DE ARREDONDAMENTO ---
        // Recalcula o Total Atual somando os valores JÁ ARREDONDADOS que estão na tabela,
        // para garantir consistência com o Total Pós-Compra.
        let totalRendAtualGrupoRecalculado = 0;
        
        tbody.querySelectorAll('tr').forEach(row => {
            const rendAtualEl = row.querySelector('[data-field="rendimentoAtual"]');
            if (rendAtualEl) totalRendAtualGrupoRecalculado += parseDecimal(rendAtualEl.textContent);
            
            const rendPosCompraEl = row.querySelector('[data-field="rendimentoPosCompra"]');
            if (rendPosCompraEl) totalRendPosCompraGrupo += parseDecimal(rendPosCompraEl.textContent);
        });

        const tfoot = tbody.nextElementSibling;
        
        // Atualiza o label do total atual com a soma visual (para ser consistente)
        tfoot.querySelector(`[id^="total-rend-atual-"]`).textContent = formatarMoeda(totalRendAtualGrupoRecalculado);
        
        const diffRaw = totalRendPosCompraGrupo - totalRendAtualGrupoRecalculado;
        // Aplica tolerância extra para garantir zero limpo
        const diff = Math.abs(diffRaw) < 0.005 ? 0 : diffRaw;
        
        tfoot.querySelector(`[id^="total-rend-pos-compra-"]`).textContent = formatarMoeda(totalRendPosCompraGrupo);
        const diffEl = tfoot.querySelector(`[id^="diff-rend-"]`);
        diffEl.textContent = formatarMoeda(diff);
        diffEl.className = `numero ${diff > 0.005 ? 'valor-positivo' : diff < -0.005 ? 'valor-negativo' : ''}`;
        
        atualizarResumoAporte();
        if (e.type === 'change') { 
            salvarDadosSimulacaoNegociar(); 
        }
    };
    containerTela._listener = recalcularAoInteragir;
    containerTela.addEventListener('input', containerTela._listener);
    containerTela.addEventListener('change', containerTela._listener);

    const handleEnterKey = (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
            e.target.blur();
        }
    };
    containerTela._keydownListener = handleEnterKey;
    containerTela.addEventListener('keydown', containerTela._keydownListener);
    
    // Dispara o evento inicial para calcular os totais corretos já na carga
    containerTela.querySelectorAll('tbody tr .input-in-table').forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    });
}
// ********** FIM DA PARTE 7







// ********** PARTE 8 - DASHBOARD
async function renderizarDashboard() {
    if (graficoAlocacaoInstance) { graficoAlocacaoInstance.destroy(); }
    if (graficoProventosInstance) { graficoProventosInstance.destroy(); }
    if (graficoCarteiraInstance) { graficoCarteiraInstance.destroy(); }
    if (graficoDesempenhoInstance) { graficoDesempenhoInstance.destroy(); }

    // --- INÍCIO DA CORREÇÃO ---
    // Declarações movidas para o topo para corrigir ReferenceError
    const hoje = new Date().toISOString().split('T')[0];
    const posicoesRV = gerarPosicaoDetalhada(hoje);
    const dadosBrutos = gerarDadosBalanceamento('todos'); // Linha reintroduzida
    // --- FIM DA CORREÇÃO ---

    // --- REMOVIDO: Bloco de atualização do ícone de alerta (movido para a função global) ---

    // Desativa o banner antigo
    const alertaContainer = document.getElementById('dashboard-alerta-rebalanceamento');
    alertaContainer.style.display = 'none'; // Desativado para dar lugar ao novo ícone

    const syncAlertButton = document.getElementById('btn-sync-needed-alert');
    if (syncAlertButton) {
        const syncNeeded = localStorage.getItem('carteira_sync_needed') === 'true';
        syncAlertButton.style.display = syncNeeded ? 'inline-block' : 'none';
    }
    document.getElementById('data-inicio-carteira').textContent = `(Resultados desde ${getPrimeiraData() || 'o início'})`;

    // As declarações de 'hoje' e 'posicoesRV' foram movidas para o topo
    let saldoTotalContas = 0;
    todasAsContas.forEach(conta => {
        saldoTotalContas += calcularSaldoEmData(conta, hoje);
    });

    let valorTotalMoedas = 0;
    const todosOsEventosCaixa = obterTodosOsEventosDeCaixa();
    todosOsAtivosMoedas.forEach(ativo => {
        const transacoesPassadasEPresentes = todosOsEventosCaixa.filter(e =>
            e.tipo === 'moeda' &&
            String(e.idAlvo) === String(ativo.id) &&
            e.source !== 'recorrente_futura' &&
            e.data <= hoje
        );
        const saldoAtivoAtual = transacoesPassadasEPresentes.reduce((soma, t) => soma + arredondarMoeda(t.valor), ativo.saldoInicial);
        const cotacao = dadosMoedas.cotacoes[ativo.moeda] || 0;
        valorTotalMoedas += saldoAtivoAtual * cotacao;
    });

    const resumoCarteira = {
        'Ações': { custo: 0, mercado: 0, tir: 0, proventos: 0, resultadosRealizados: 0 },
        'FIIs': { custo: 0, mercado: 0, tir: 0, proventos: 0, resultadosRealizados: 0 },
        'ETFs': { custo: 0, mercado: 0, tir: 0, proventos: 0, resultadosRealizados: 0 },
        'Renda Fixa': { custo: 0, mercado: 0, tir: NaN, proventos: 0, resultadosRealizados: 0 }
    };

    const todosOsTickersPorCategoria = { 'Ações': new Set(), 'FIIs': new Set(), 'ETFs': new Set() };
    todosOsAtivos.forEach(ativo => {
        const tipoMapeado = ativo.tipo === 'Ação' ? 'Ações' : ativo.tipo === 'FII' ? 'FIIs' : 'ETFs';
        if (todosOsTickersPorCategoria[tipoMapeado]) {
            todosOsTickersPorCategoria[tipoMapeado].add(ativo.ticker);
        }
    });

    const todosOsTickersHistoricosRV = Array.from(new Set([...todosOsTickersPorCategoria['Ações'], ...todosOsTickersPorCategoria['FIIs'], ...todosOsTickersPorCategoria['ETFs']]));
    const ganhosRealizadosMap = calcularResultadosRealizados(todosOsTickersHistoricosRV);

    for (const ticker in posicoesRV) {
        const ativoInfo = todosOsAtivos.find(a => a.ticker === ticker);
        const tipoAtivo = ativoInfo ? (ativoInfo.tipo === 'Ação' ? 'Ações' : ativoInfo.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
        if (tipoAtivo && resumoCarteira[tipoAtivo]) {
            const posicao = posicoesRV[ticker];
            if (posicao.quantidade > 0) {
                resumoCarteira[tipoAtivo].custo += posicao.quantidade * posicao.precoMedio;
                const cotacao = dadosDeMercado.cotacoes[ticker];
                resumoCarteira[tipoAtivo].mercado += (cotacao?.valor > 0) ? (posicao.quantidade * cotacao.valor) : (posicao.quantidade * posicao.precoMedio);
            }
        }
    }
    todosOsAtivosRF.forEach(ativo => {
        if ((ativo.descricao || '').toLowerCase().includes('(inativa)')) {
            return;
        }
        const saldosAtivoRF = calcularSaldosRFEmData(ativo, hoje);
        resumoCarteira['Renda Fixa'].custo += saldosAtivoRF.valorInvestido;
        resumoCarteira['Renda Fixa'].mercado += saldosAtivoRF.saldoLiquido;
    });

    for (const categoria in resumoCarteira) {
        const tickersHistoricosDaCategoria = todosOsTickersPorCategoria[categoria] || new Set();
        resumoCarteira[categoria].proventos = todosOsProventos
            .filter(p => tickersHistoricosDaCategoria.has(p.ticker))
            .reduce((soma, p) => soma + p.valorTotalRecebido, 0);
        let realizadosSoma = 0;
        tickersHistoricosDaCategoria.forEach(ticker => {
            realizadosSoma += (ganhosRealizadosMap.get(ticker) || 0);
        });
        resumoCarteira[categoria].resultadosRealizados = realizadosSoma;
        if (categoria !== 'Renda Fixa' && resumoCarteira[categoria].mercado > 0) {
            const tickersAtuaisDaCategoria = Object.keys(posicoesRV).filter(t => {
                const info = todosOsAtivos.find(a => a.ticker === t);
                const tipoMapeado = info ? (info.tipo === 'Ação' ? 'Ações' : info.tipo === 'FII' ? 'FIIs' : 'ETFs') : null;
                return tipoMapeado === categoria;
            });
            if (tickersAtuaisDaCategoria.length > 0) {
                let { fluxos, datas } = construirFluxoDeCaixa(tickersAtuaisDaCategoria, hoje);
                fluxos.push(resumoCarteira[categoria].mercado);
                datas.push(hoje);
                resumoCarteira[categoria].tir = calcularTIR(fluxos, datas);
            }
        }
    }

    const valorTotalCarteira = Object.values(resumoCarteira).reduce((soma, cat) => soma + cat.mercado, 0);
    const totalProventosProvisionados = calcularTotalProventosProvisionados();
    const patrimonioTotal = valorTotalCarteira + saldoTotalContas + valorTotalMoedas + totalProventosProvisionados;
    document.getElementById('db-patrimonio-total').textContent = formatarMoeda(patrimonioTotal);
    document.getElementById('db-carteira-total').textContent = formatarMoeda(valorTotalCarteira);
    document.getElementById('db-contas-total').textContent = formatarMoeda(saldoTotalContas);
    document.getElementById('db-moedas-total').textContent = formatarMoeda(valorTotalMoedas);
    document.getElementById('db-proventos-provisionados-total').textContent = formatarMoeda(totalProventosProvisionados);
    document.getElementById('config-user-name').value = userName;

    const cardPatrimonio = document.getElementById('db-patrimonio-total').closest('.summary-card');
    cardPatrimonio.dataset.tooltip = `Detalhes do Patrimônio:\n` +
                                     `- Investimentos: ${formatarMoeda(valorTotalCarteira)}\n` +
                                     `- Saldo em Contas: ${formatarMoeda(saldoTotalContas)}\n` +
                                     `- Moedas: ${formatarMoeda(valorTotalMoedas)}\n` +
                                     `- Proventos a Receber: ${formatarMoeda(totalProventosProvisionados)}`;
    const cardCarteira = document.getElementById('db-carteira-total').closest('.summary-card');
    cardCarteira.dataset.tooltip = `Composição da Carteira:\n` +
                                   `- Ações: ${formatarMoeda(resumoCarteira['Ações'].mercado)}\n` +
                                   `- FIIs: ${formatarMoeda(resumoCarteira['FIIs'].mercado)}\n` +
                                   `- ETFs: ${formatarMoeda(resumoCarteira['ETFs'].mercado)}\n` +
                                   `- Renda Fixa: ${formatarMoeda(resumoCarteira['Renda Fixa'].mercado)}`;

    const containerTabela = document.getElementById('dashboard-table-container');
    let tabelaHtml = `<table class="dashboard-table">
        <thead><tr>
            <th>Classe de Ativo</th>
            <th class="numero">Valor Mercado / Alocação</th>
            <th class="numero">G/P Capital (Não Realizado)</th>
            <th class="numero">Result. Realizados</th>
            <th class="numero">Proventos</th>
            <th class="numero">Retorno Total</th>
            <th class="percentual">TIR Anualizada</th>
        </tr></thead><tbody>`;

    let custoTotalGeral = 0, mercadoTotalGeral = 0, proventosTotalGeral = 0, realizadosTotalGeral = 0;
    const categoriasOrdenadas = Object.keys(resumoCarteira).sort((a, b) => resumoCarteira[b].mercado - resumoCarteira[a].mercado);

    const categoriasVisiveis = categoriasOrdenadas.filter(cat => {
        const dados = resumoCarteira[cat];
        return dados.mercado > 0.001 || dados.custo > 0.001;
    });

    const tickersVisiveisRV = [];
    categoriasVisiveis.forEach(categoria => {
        const dados = resumoCarteira[categoria];

        custoTotalGeral += dados.custo;
        mercadoTotalGeral += dados.mercado;
        proventosTotalGeral += dados.proventos;
        realizadosTotalGeral += dados.resultadosRealizados;

        const alocacao = valorTotalCarteira > 0 ? (dados.mercado / valorTotalCarteira) : 0;
        const varMercadoValor = dados.mercado - dados.custo;
        const varMercadoPercentual = dados.custo > 0 ? (varMercadoValor / dados.custo) : 0;
        const realizadosValor = dados.resultadosRealizados;
        const realizadosPercentual = dados.custo > 0 ? (realizadosValor / dados.custo) : 0;
        const proventosValor = dados.proventos;
        const proventosPercentual = dados.custo > 0 ? (proventosValor / dados.custo) : 0;
        const retornoTotalValor = varMercadoValor + realizadosValor + proventosValor;
        const retornoTotalPercentual = dados.custo > 0 ? (retornoTotalValor / dados.custo) : 0;
        const tirValida = !isNaN(dados.tir);

        const classeVarMercado = varMercadoValor >= 0 ? 'valor-positivo' : 'valor-negativo';
        const classeRealizados = realizadosValor >= 0 ? 'valor-positivo' : 'valor-negativo';
        const classeRetornoTotal = retornoTotalValor >= 0 ? 'valor-positivo' : 'valor-negativo';

        tabelaHtml += `<tr>
            <td>${categoria}</td>
            <td class="numero">
                <span class="valor-principal">${formatarMoeda(dados.mercado)}</span>
                <span class="valor-secundario">${formatarPercentual(alocacao)}</span>
            </td>
            <td class="numero ${classeVarMercado}">
                <span class="valor-principal">${formatarMoeda(varMercadoValor)}</span>
                <span class="valor-secundario ${classeVarMercado}">${formatarPercentual(varMercadoPercentual)}</span>
            </td>
            <td class="numero ${classeRealizados}">
                ${categoria !== 'Renda Fixa' ? `
                <span class="valor-principal">${formatarMoeda(realizadosValor)}</span>
                <span class="valor-secundario ${classeRealizados}">${formatarPercentual(realizadosPercentual)}</span>
                ` : '<span class="valor-secundario">N/A</span>'}
            </td>
            <td class="numero valor-positivo">
                 <span class="valor-principal">${formatarMoeda(proventosValor)}</span>
                <span class="valor-secundario valor-positivo">${formatarPercentual(proventosPercentual)}</span>
            </td>
            <td class="numero ${classeRetornoTotal}">
                <span class="valor-principal">${formatarMoeda(retornoTotalValor)}</span>
                <span class="valor-secundario ${classeRetornoTotal}">${formatarPercentual(retornoTotalPercentual)}</span>
            </td>
            <td class="percentual ${tirValida ? (dados.tir >= 0 ? 'valor-positivo' : 'valor-negativo') : ''}">${tirValida ? formatarPercentual(dados.tir) : 'N/A'}</td>
        </tr>`;

        if (categoria !== 'Renda Fixa') {
            todosOsAtivos.filter(a => (a.tipo === 'Ação' ? 'Ações' : a.tipo === 'FII' ? 'FIIs' : a.tipo) === categoria)
                         .forEach(a => tickersVisiveisRV.push(a.ticker));
        }
    });

    let { fluxos: fluxosTotais, datas: datasTotais } = construirFluxoDeCaixa([...new Set(tickersVisiveisRV)], hoje);
    const mercadoTotalRV = mercadoTotalGeral - resumoCarteira['Renda Fixa'].mercado;
    if (fluxosTotais.length > 0) {
        fluxosTotais.push(mercadoTotalRV);
        datasTotais.push(hoje);
    }
    const tirTotalRV = calcularTIR(fluxosTotais, datasTotais);

    const varMercadoTotalValor = mercadoTotalGeral - custoTotalGeral;
    const varMercadoTotalPercentual = custoTotalGeral > 0 ? (varMercadoTotalValor / custoTotalGeral) : 0;
    const realizadosTotalPercentual = custoTotalGeral > 0 ? (realizadosTotalGeral / custoTotalGeral) : 0;
    const proventosTotalPercentual = custoTotalGeral > 0 ? (proventosTotalGeral / custoTotalGeral) : 0;
    const retornoTotalGeralValor = varMercadoTotalValor + realizadosTotalGeral + proventosTotalGeral;
    const retornoTotalGeralPercentual = custoTotalGeral > 0 ? (retornoTotalGeralValor / custoTotalGeral) : 0;

    const classeVarMercadoTotal = varMercadoTotalValor >= 0 ? 'valor-positivo' : 'valor-negativo';
    const classeRealizadosTotal = realizadosTotalGeral >= 0 ? 'valor-positivo' : 'valor-negativo';
    const classeRetornoTotalGeral = retornoTotalGeralValor >= 0 ? 'valor-positivo' : 'valor-negativo';
    const tirTotalValida = !isNaN(tirTotalRV);

    tabelaHtml += `</tbody><tfoot>
        <tr style="border-top: 2px solid var(--accent-color); font-weight: bold;">
            <td>TOTAIS</td>
            <td class="numero">
                <span class="valor-principal">${formatarMoeda(mercadoTotalGeral)}</span>
                <span class="valor-secundario">${formatarPercentual(1)}</span>
            </td>
            <td class="numero ${classeVarMercadoTotal}">
                <span class="valor-principal">${formatarMoeda(varMercadoTotalValor)}</span>
                <span class="valor-secundario ${classeVarMercadoTotal}">${formatarPercentual(varMercadoTotalPercentual)}</span>
            </td>
            <td class="numero ${classeRealizadosTotal}">
                <span class="valor-principal">${formatarMoeda(realizadosTotalGeral)}</span>
                <span class="valor-secundario ${classeRealizadosTotal}">${formatarPercentual(realizadosTotalPercentual)}</span>
            </td>
            <td class="numero valor-positivo">
                <span class="valor-principal">${formatarMoeda(proventosTotalGeral)}</span>
                <span class="valor-secundario valor-positivo">${formatarPercentual(proventosTotalPercentual)}</span>
            </td>
            <td class="numero ${classeRetornoTotalGeral}">
                <span class="valor-principal">${formatarMoeda(retornoTotalGeralValor)}</span>
                <span class="valor-secundario ${classeRetornoTotalGeral}">${formatarPercentual(retornoTotalGeralPercentual)}</span>
            </td>
            <td class="percentual ${tirTotalValida ? (tirTotalRV >= 0 ? 'valor-positivo' : 'valor-negativo') : ''}">${tirTotalValida ? formatarPercentual(tirTotalRV) : 'N/A'}</td>
        </tr>
    </tfoot></table>`;

    containerTabela.innerHTML = tabelaHtml;

    setTimeout(() => {
        renderizarGraficoAlocacao(resumoCarteira, categoriasVisiveis);
        const dadosGraficoProventos = gerarDadosGraficoProventos();
        if (graficoProventosInstance) {
            graficoProventosInstance.destroy();
        }
        const ctxProventos = document.getElementById('grafico-proventos-canvas').getContext('2d');
        graficoProventosInstance = new Chart(ctxProventos, { type: 'bar', data: dadosGraficoProventos, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${formatarMoeda(context.raw)}`; } } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: function(value) { return formatarMoeda(value); } } } } } });
        renderizarGraficoCarteira();
        renderizarGraficoDesempenho();
        renderizarGraficoAportesProventos();
    }, 100); 

    renderizarPainelAlocacao(dadosBrutos);
    renderizarPainelComparativo(resumoCarteira);
    renderizarPainelResumoMetasDashboard();
    renderizarTickerTape();

    // --- INÍCIO DA ALTERAÇÃO ---
    // Chama a nova função global, passando os dados já calculados para otimização
    atualizarIconeDeAlertasGlobal(posicoesRV, dadosBrutos);
    // --- FIM DA ALTERAÇÃO ---
}
/**
 * NOVA FUNÇÃO GLOBAL: Verifica os alertas e atualiza o ícone na sidebar.
 * Atualizada para ler a estrutura correta retornada por verificarAlertasDashboard.
 */
function atualizarIconeDeAlertasGlobal(posicoesRV_opcional, dadosBrutos_opcional) {
    // Garante que os dados existam
    const hoje = new Date().toISOString().split('T')[0];
    const posicoesRV = posicoesRV_opcional || gerarPosicaoDetalhada(hoje);
    const dadosBrutos = dadosBrutos_opcional || gerarDadosBalanceamento('todos');
    
    // Chama o motor de cálculo
    const alertas = verificarAlertasDashboard(posicoesRV, dadosBrutos);
    
    // Conta apenas as oportunidades REAIS (Lucro > 10% + Critério do Modo)
    const count = alertas.oportunidades.length;
    
    // Atualiza o ícone e o contador na interface
    const icon = document.getElementById('dashboard-alert-icon');
    const badge = document.getElementById('dashboard-alert-badge');
    
    if (icon && badge) {
        if (count > 0) {
            icon.classList.add('alerta-ativo');
            badge.textContent = count;
            badge.style.display = 'flex';
            // Tooltip dinâmico
            icon.parentElement.setAttribute('title', `${count} Oportunidade(s) de Realização`);
        } else {
            icon.classList.remove('alerta-ativo');
            badge.style.display = 'none';
            icon.parentElement.setAttribute('title', 'Status da Carteira');
        }
    }
}

// FUNÇÕES AUXILIARES SEPARADAS PARA MAIOR CLAREZA
function renderizarTickerTape() {
    const container = document.getElementById('dashboard-ticker-tape');
    if (!container) return;
    const contentContainer = container.querySelector('.ticker-tape-content');
    contentContainer.innerHTML = '';

    if (historicoCarteira.length < 2) {
        contentContainer.innerHTML = '<div class="ticker-item"><span>Dados insuficientes para calcular a variação diária. Salve pelo menos 2 snapshots.</span></div>';
        return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    let snapshotAtual, snapshotAnterior;

    const ultimoSnapshot = historicoCarteira[historicoCarteira.length - 1];
    if (ultimoSnapshot.data === hoje) {
        snapshotAtual = ultimoSnapshot;
        snapshotAnterior = historicoCarteira[historicoCarteira.length - 2];
    } else {
        snapshotAnterior = ultimoSnapshot;
        const valorTotalInvestimentos = calcularValorTotalInvestimentosAtual();
        const saldoTotalContas = getTodasContasAtivas().reduce((soma, conta) => soma + calcularSaldoEmData(conta, hoje), 0);
        const valorTotalMoedas = todosOsAtivosMoedas.reduce((soma, ativo) => {
            const saldoAtivo = calcularSaldoProjetado(ativo, hoje, 'moeda');
            const cotacao = dadosMoedas.cotacoes[ativo.moeda] || 0;
            return soma + (saldoAtivo * cotacao);
        }, 0);
        const totalProventosProvisionados = calcularTotalProventosProvisionados();
        snapshotAtual = {
            patrimonioTotal: valorTotalInvestimentos + saldoTotalContas + valorTotalMoedas + totalProventosProvisionados,
            detalhesCarteira: { ativos: {} }
        };
        const posicoesAtuais = gerarPosicaoDetalhada(hoje);
        for (const ticker in posicoesAtuais) {
            const posicao = posicoesAtuais[ticker];
            const cotacao = dadosDeMercado.cotacoes[ticker];
            snapshotAtual.detalhesCarteira.ativos[ticker] = {
                precoAtual: cotacao ? cotacao.valor : 0,
                quantidade: posicao.quantidade
            };
        }
    }

    const itensTicker = [];

    itensTicker.push(`<div class="ticker-item"><strong>IBOV:</strong> <span>${formatarDecimal(dadosDeMercado.ibov, 2)}</span></div>`);
    itensTicker.push(`<div class="ticker-item"><strong>IFIX:</strong> <span>${formatarDecimal(dadosDeMercado.ifix, 2)}</span></div>`);
    itensTicker.push(`<div class="ticker-item"><strong>USD:</strong> <span>${formatarMoeda(dadosMoedas.cotacoes.USD)}</span></div>`);
    itensTicker.push(`<div class="ticker-item"><strong>EUR:</strong> <span>${formatarMoeda(dadosMoedas.cotacoes.EUR)}</span></div>`);
    itensTicker.push(`<div class="ticker-item"><strong>GBP:</strong> <span>${formatarMoeda(dadosMoedas.cotacoes.GBP)}</span></div>`);

    const variacaoPatrimonio = snapshotAtual.patrimonioTotal - snapshotAnterior.patrimonioTotal;
    const variacaoPercentual = snapshotAnterior.patrimonioTotal > 0 ? variacaoPatrimonio / snapshotAnterior.patrimonioTotal : 0;
    const classeVariacao = variacaoPatrimonio >= 0 ? 'ticker-positive' : 'ticker-negative';
    const iconeVariacao = variacaoPatrimonio >= 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
    itensTicker.push(`<div class="ticker-item"><strong>Variação Dia:</strong> <span class="${classeVariacao}">${iconeVariacao} ${formatarMoeda(variacaoPatrimonio)} (${formatarPercentual(variacaoPercentual)})</span></div>`);

    const variacoesAtivos = [];
    if (snapshotAtual.detalhesCarteira && snapshotAnterior.detalhesCarteira) {
        for (const ticker in snapshotAtual.detalhesCarteira.ativos) {
            const ativoAtual = snapshotAtual.detalhesCarteira.ativos[ticker];
            const ativoAnterior = snapshotAnterior.detalhesCarteira.ativos[ticker];
            if (ativoAtual && ativoAnterior && ativoAnterior.precoAtual > 0) {
                const variacao = (ativoAtual.precoAtual / ativoAnterior.precoAtual) - 1;
                variacoesAtivos.push({ ticker, variacao });
            }
        }
    }

    if (variacoesAtivos.length > 0) {
        variacoesAtivos.sort((a, b) => b.variacao - a.variacao);
        const maiorAlta = variacoesAtivos[0];
        const maiorBaixa = variacoesAtivos[variacoesAtivos.length - 1];
        itensTicker.push(`<div class="ticker-item"><strong>Maior Alta:</strong> <span class="ticker-positive">${maiorAlta.ticker} ${formatarPercentual(maiorAlta.variacao)}</span></div>`);
        itensTicker.push(`<div class="ticker-item"><strong>Maior Baixa:</strong> <span class="ticker-negative">${maiorBaixa.ticker} ${formatarPercentual(maiorBaixa.variacao)}</span></div>`);
    }

    let htmlContent = itensTicker.join('<span class="ticker-separator">◆</span>');
    contentContainer.innerHTML = htmlContent + htmlContent; // Duplica para o efeito de loop
}
function renderizarPainelAlocacao(dadosBalanc) {
    const alocacaoContainer = document.getElementById('dashboard-alocacao-container');
    const alocacaoTotalContainer = document.getElementById('dashboard-alocacao-total');
    let alocacaoHtml = '';
    let somaTotalIdeal = 0;
    for (const nomeCategoria in dadosBalanc.categorias) {
        const categoria = dadosBalanc.categorias[nomeCategoria];
        const valorIdeal = categoria.ideal.percentual || 0;
        somaTotalIdeal += valorIdeal;
        const isRF = nomeCategoria === 'Renda Fixa';
        alocacaoHtml += `<div class="form-group">
            <label for="alocacao-ideal-cat-${nomeCategoria.toLowerCase()}">Ideal ${nomeCategoria} (%)</label>
            <input type="text" 
                   id="alocacao-ideal-cat-${nomeCategoria.toLowerCase()}" 
                   class="alocacao-categoria-input" 
                   data-categoria="${nomeCategoria}" 
                   value="${formatarDecimal(valorIdeal * 100)}" 
                   ${isRF ? '' : 'disabled'}>
        </div>`;
    }
    alocacaoContainer.innerHTML = alocacaoHtml;
    const somaInvalida = somaTotalIdeal < 0.999 || somaTotalIdeal > 1.001;
    alocacaoTotalContainer.innerHTML = `<span>Total Ideal Definido:</span><span class="valor-total-alocacao ${somaInvalida ? 'valor-negativo' : 'valor-positivo'}">${formatarPercentual(somaTotalIdeal)}</span>`;
    const inputRF = document.getElementById('alocacao-ideal-cat-renda fixa');
    if(inputRF) {
        inputRF.addEventListener('change', (e) => {
            const novoValor = parseDecimal(e.target.value) / 100;
            dadosAlocacao.categorias['Renda Fixa'] = isNaN(novoValor) ? 0 : novoValor;
            salvarDadosAlocacao();
            renderizarDashboard();
        });
    }
}

function renderizarGraficoAlocacao(resumoCarteira, categoriasOrdenadas) {
    // Agora que a variável foi declarada, esta verificação funcionará corretamente.
    if (graficoAlocacaoInstance) {
        graficoAlocacaoInstance.destroy();
    }

    const valorTotalCarteira = Object.values(resumoCarteira).reduce((soma, cat) => soma + cat.mercado, 0);
    const chartLabels = [];
    const chartData = [];
    for (const categoria of categoriasOrdenadas) {
        if (resumoCarteira[categoria].mercado > 0) {
            chartLabels.push(categoria);
            chartData.push(resumoCarteira[categoria].mercado);
        }
    }
    if (chartData.length > 0) {
        const mapaDeCores = { 'FIIs': '#3498db', 'Ações': '#2ecc71', 'ETFs': '#f39c12', 'Renda Fixa': '#e74c3c' };
        const coresDoGrafico = chartLabels.map(label => mapaDeCores[label] || '#95a5a6'); 
        const ctx = document.getElementById('grafico-alocacao-canvas').getContext('2d');
        
        // A nova instância do gráfico é atribuída à variável que agora tem o escopo correto.
        graficoAlocacaoInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: chartLabels, datasets: [{ label: 'Patrimônio de Investimentos', data: chartData, backgroundColor: coresDoGrafico, borderColor: '#ffffff', borderWidth: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                const valor = context.parsed;
                                const percentual = (valor / valorTotalCarteira) * 100;
                                return `${label}: ${formatarMoeda(valor)} (${percentual.toFixed(2)}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements, chart) => {
                    if (elements.length > 0) {
                        const firstElement = elements[0];
                        const label = chart.data.labels[firstElement.index];

                        switch (label) {
                            case 'Ações':
                            case 'FIIs':
                            case 'ETFs':
                                mostrarTela('rendaVariavel');
                                renderizarTelaRendaVariavel();
                                setTimeout(() => {
                                    const container = document.getElementById('posicao-rv-container');
                                    let searchText = label;
                                    if (label === 'FIIs') searchText = 'Fundos Imobiliários';
                                    
                                    const h2Elements = container.querySelectorAll('h2');
                                    const targetHeader = Array.from(h2Elements).find(h2 => h2.textContent.includes(searchText));
                                    
                                    if (targetHeader) {
                                        targetHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }, 100);
                                break;
                            case 'Renda Fixa':
                                mostrarTela('rendaFixa');
                                renderizarPosicaoRF();
                                break;
                        }
                    }
                }
            }
        });
    }
}
function calcularProventosProvisionados(tipoAtivoFiltro) {
    const hojeStr = new Date().toISOString().split('T')[0];
    const tickersDaCategoria = new Set(todosOsAtivos.filter(a => a.tipo === tipoAtivoFiltro).map(a => a.ticker));

    const proventosFiltrados = todosOsProventos.filter(p => {
        return tickersDaCategoria.has(p.ticker) &&
               p.dataCom && p.dataPagamento &&
               p.dataCom < hojeStr &&
               p.dataPagamento > hojeStr;
    });

    const total = proventosFiltrados.reduce((soma, p) => soma + p.valorTotalRecebido, 0);

    proventosFiltrados.sort((a, b) => new Date(a.dataPagamento) - new Date(b.dataPagamento));
    
    return {
        total: total,
        detalhes: proventosFiltrados
    };
}
function renderizarPainelResumoMetasDashboard() {
    const container = document.getElementById('dashboard-metas-summary-container');
    
    // CORREÇÃO: Removemos a chamada para a antiga função carregarMetas()
    // A variável 'todasAsMetas' já é carregada corretamente pela função principal carregarTodosOsDados().

    if (!todasAsMetas || todasAsMetas.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    
    let metasPendentesHtml = [];
    let metasAtingidasHtml = [];
    const projecaoProventos = calcularProjecaoProventosNegociacao();
    const projecaoRF = gerarDadosGraficoAportesProventos()?.datasets[0]?.data.slice(-12).reduce((a, b) => a + b, 0) / 12 || 0;

    todasAsMetas.forEach(meta => {
        let valorAtual = 0, progresso = 0, textoAlvo = '', textoAlcancado = '', previsao = null, historico = [];
        const tipoMeta = meta.tipo;
        const moeda = meta.moedaAlvo || 'BRL';

        if (tipoMeta.startsWith('patrimonio')) {
            const patrimonioBRL = calcularValorTotalInvestimentosAtual();
            valorAtual = moeda === 'BRL' ? patrimonioBRL : (dadosMoedas.cotacoes[moeda] > 0 ? patrimonioBRL / dadosMoedas.cotacoes[moeda] : 0);
            progresso = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) * 100 : (valorAtual > 0 ? 100 : 0);
            textoAlvo = formatarValor(meta.valorAlvo, moeda);
            textoAlcancado = formatarValor(valorAtual, moeda);
            
            historico = historicoCarteira.map(s => ({ data: s.data, valor: s.valorTotalInvestimentos || s.valor }));
            previsao = calcularPrevisaoMeta(historico, valorAtual, meta.valorAlvo);
            
        } else if (tipoMeta.startsWith('renda_passiva')) {
            let proventosBRL = 0;
            const fonte = meta.fonteProventos || 'total_rv';
            switch (fonte) {
                case 'total_rv': proventosBRL = projecaoProventos.acoes + projecaoProventos.fiis; break;
                case 'total_geral': proventosBRL = projecaoProventos.acoes + projecaoProventos.fiis + projecaoRF; break;
                case 'fiis': proventosBRL = projecaoProventos.fiis; break;
                case 'acoes': proventosBRL = projecaoProventos.acoes; break;
            }

            let valorAlvoMonetario;
            if (tipoMeta === 'renda_passiva_sm') {
                valorAlvoMonetario = meta.valorAlvo * salarioMinimo;
                valorAtual = proventosBRL;
                textoAlvo = `${meta.valorAlvo} SM (${formatarMoeda(valorAlvoMonetario)})/mês`;
                textoAlcancado = formatarMoeda(valorAtual);
            } else { // renda_passiva_moeda
                valorAlvoMonetario = meta.valorAlvo;
                valorAtual = moeda === 'BRL' ? proventosBRL : (dadosMoedas.cotacoes[moeda] > 0 ? proventosBRL / dadosMoedas.cotacoes[moeda] : 0);
                textoAlvo = `${formatarValor(meta.valorAlvo, moeda)}/mês`;
                textoAlcancado = formatarValor(valorAtual, moeda);
            }

            progresso = valorAlvoMonetario > 0 ? (valorAtual / valorAlvoMonetario) * 100 : (valorAtual > 0 ? 100 : 0);

            if (fonte === 'fiis') historico = historicoCarteira.map(s => ({ data: s.data, valor: s.detalhesCarteira && s.detalhesCarteira.ativos ? calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).fiis : 0 }));
            else if (fonte === 'acoes') historico = historicoCarteira.map(s => ({ data: s.data, valor: s.detalhesCarteira && s.detalhesCarteira.ativos ? calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).acoes : 0 }));
            else historico = historicoCarteira.map(s => ({ data: s.data, valor: s.detalhesCarteira && s.detalhesCarteira.ativos ? calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).fiis + calcularProjecaoProventosNegociacao(s.detalhesCarteira.ativos).acoes : 0 }));
            
            previsao = calcularPrevisaoMeta(historico, valorAtual, valorAlvoMonetario);

        } else if (tipoMeta === 'posicao_ativo') {
            const posicoes = gerarPosicaoDetalhada();
            valorAtual = posicoes[meta.ativoAlvo]?.quantidade || 0;
            progresso = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) * 100 : (valorAtual > 0 ? 100 : 0);
            textoAlvo = `${meta.valorAlvo} cotas de ${meta.ativoAlvo}`;
            textoAlcancado = `${Math.round(valorAtual)} cotas`;
        }
        
        let isAtingida = progresso >= 100;
        let textoPrevisao = '';
        if (previsao && !isAtingida) {
            textoPrevisao = ` A previsão para o alcance do alvo é <strong>${previsao}</strong>.`;
        } else if (isAtingida) {
            textoPrevisao = ' Parabéns, meta alcançada!';
        }

        const icone = isAtingida ? 'fa-check-circle' : 'fa-bullseye';
        const classeAtingida = isAtingida ? 'meta-atingida' : '';

        const htmlItem = `
            <p class="meta-summary-item ${classeAtingida}">
                <i class="fas ${icone}"></i>
                <span>A meta "<strong>${meta.nome}</strong>" para <strong>${textoAlvo}</strong> já alcançou <strong>${textoAlcancado}</strong>, que equivale a <strong>${progresso.toFixed(1)}%</strong> do alvo.${textoPrevisao}</span>
            </p>
        `;

        if (isAtingida) {
            metasAtingidasHtml.push(htmlItem);
        } else {
            metasPendentesHtml.push(htmlItem);
        }
    });

    let htmlFinal = '<h3>Resumo das Metas</h3>';
    if (metasPendentesHtml.length > 0) {
        htmlFinal += metasPendentesHtml.join('');
    }
    
    if (metasAtingidasHtml.length > 0) {
        htmlFinal += `<hr><h4 style="margin-top: 20px; color: var(--success-color);"><i class="fas fa-check-circle"></i> Metas Concluídas</h4>`;
        htmlFinal += metasAtingidasHtml.join('');
    }

    container.innerHTML = htmlFinal;
}
/**
 * NOVA FUNÇÃO: Processa o histórico de proventos e prepara os dados para o gráfico de barras.
 * @param {number} mesesParaExibir - A quantidade de meses a serem exibidos no gráfico.
 * @returns {object} - Um objeto com 'labels' e 'datasets' para o Chart.js.
 */
/**
 * VERSÃO ATUALIZADA: Processa o histórico de proventos desde o início e prepara os dados.
 * @returns {object} - Um objeto com 'labels' e 'datasets' para o Chart.js.
 */
function gerarDadosGraficoProventos() {
    // 1. Agrupa todos os proventos por mês/ano
    const proventosPorMes = {};
    const todasAsDatasDePagamento = [];

    todosOsProventos.forEach(p => {
        const ativo = todosOsAtivos.find(a => a.ticker === p.ticker);
        const tipo = ativo ? (ativo.tipo === 'Ação' ? 'Ações' : 'FIIs') : null;

        if ((tipo === 'Ações' || tipo === 'FIIs') && p.dataPagamento) {
            todasAsDatasDePagamento.push(new Date(p.dataPagamento + 'T12:00:00'));
            const dataPag = new Date(p.dataPagamento + 'T12:00:00');
            const chaveMes = `${dataPag.getFullYear()}-${String(dataPag.getMonth()).padStart(2, '0')}`;
            
            if (!proventosPorMes[chaveMes]) {
                proventosPorMes[chaveMes] = { Ações: 0, FIIs: 0 };
            }
            proventosPorMes[chaveMes][tipo] += p.valorTotalRecebido;
        }
    });

    if (todasAsDatasDePagamento.length === 0) {
        return { labels: [], datasets: [] }; // Retorna vazio se não houver proventos
    }

    // 2. Encontra a data de início (o primeiro provento já pago)
    const primeiraDataPagamento = new Date(Math.min.apply(null, todasAsDatasDePagamento));
    const dataFinal = new Date();

    // 3. Prepara os arrays para o gráfico, iterando mês a mês desde o início
    const labels = [];
    const dadosAcoes = [];
    const dadosFIIs = [];
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    let dataCorrente = new Date(primeiraDataPagamento.getFullYear(), primeiraDataPagamento.getMonth(), 1);

    while (dataCorrente <= dataFinal) {
        const ano = dataCorrente.getFullYear();
        const mes = dataCorrente.getMonth();
        
        const chaveMes = `${ano}-${String(mes).padStart(2, '0')}`;
        labels.push(`${mesesAbrev[mes]}/${String(ano).slice(-2)}`);
        
        const dadosDoMes = proventosPorMes[chaveMes] || { Ações: 0, FIIs: 0 };
        dadosAcoes.push(dadosDoMes.Ações);
        dadosFIIs.push(dadosDoMes.FIIs);

        // Avança para o próximo mês
        dataCorrente.setMonth(dataCorrente.getMonth() + 1);
    }

    return {
        labels: labels,
        datasets: [
            {
                label: 'FIIs',
                data: dadosFIIs,
                backgroundColor: '#3498db', // Azul
            },
            {
                label: 'Ações',
                data: dadosAcoes,
                backgroundColor: '#2ecc71', // Verde
            }
        ]
    };
}
// ==================================================================
// == INÍCIO: NOVAS FUNÇÕES DE EXPORTAÇÃO/IMPORTAÇÃO DE CADASTROS ==
// ==================================================================

function exportarCadastrosCSV() {
    const escapeCSV = (value) => {
        if (value === null || typeof value === 'undefined') {
            return '';
        }
        let str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        }
        return str;
    };

    const headers = [
        'TipoCadastro', 'ID', 'Campo_A', 'Campo_B', 'Campo_C', 
        'Campo_D', 'Campo_E', 'Campo_F', 'Campo_G', 'Campo_H'
    ];
    let csvRows = [headers.join(',')];

    todosOsAtivos.forEach(a => {
        const row = [
            'ATIVO_RV', a.id, a.ticker, a.tipo, a.nomePregao,
            a.nome, a.cnpj, a.tipoAcao, a.adminNome, a.adminCnpj
        ];
        csvRows.push(row.map(escapeCSV).join(','));
    });

    todasAsContas.forEach(c => {
        // --- INÍCIO DA ALTERAÇÃO ---
        // Garantimos que o saldo inicial também seja formatado com ponto.
        const row = [
            'CONTA', c.id, c.banco, c.tipo, c.numeroBanco,
            c.agencia, c.numero, c.pix, (c.saldoInicial || 0).toFixed(2), c.dataSaldoInicial
        ];
        // --- FIM DA ALTERAÇÃO ---
        csvRows.push(row.map(escapeCSV).join(','));
    });

    todosOsFeriados.forEach(f => {
        const row = ['FERIADO', f.id, f.data, f.descricao];
        csvRows.push(row.map(escapeCSV).join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const hoje = new Date();
    const nomeArquivo = `cadastros_export_${hoje.toISOString().split('T')[0]}.csv`;

    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", nomeArquivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    alert('Exportação dos cadastros concluída!');
}

function importarCadastrosCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    // --- PERGUNTA AO USUÁRIO QUAL AÇÃO REALIZAR ---
    const escolha = prompt(
        "Qual tipo de importação você deseja fazer?\n\n" +
        "Digite '1' para ATUALIZAR ATIVOS:\n" +
        "   - Atualiza seus ativos existentes com os dados do arquivo.\n" +
        "   - Adiciona novos ativos que você não possui.\n" +
        "   - SUAS CONTAS E FERIADOS NÃO SERÃO ALTERADOS.\n\n" +
        "Digite '2' para SUBSTITUIÇÃO COMPLETA:\n" +
        "   - APAGA TUDO (Ativos, Contas e Feriados) e substitui pelos dados do arquivo. USE COM CUIDADO."
    );

    if (escolha !== '1' && escolha !== '2') {
        alert("Operação cancelada. Nenhuma opção válida foi selecionada.");
        event.target.value = ''; // Limpa o input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const linhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
            if (linhas.length <= 1) throw new Error('Arquivo CSV vazio ou inválido.');
            
            const linhasDeDados = linhas.slice(1);

            // --- LÓGICA BASEADA NA ESCOLHA ---

            if (escolha === '1') {
                // --- OPÇÃO 1: ATUALIZAR E ADICIONAR ATIVOS ---
                const ativosAtuaisMap = new Map(todosOsAtivos.map(a => [a.ticker, a]));
                let ativosAtualizados = 0;
                let ativosAdicionados = 0;

                linhasDeDados.forEach(linha => {
                    const cols = linha.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(c => c.trim().replace(/"/g, ''));
                    if (cols[0] === 'ATIVO_RV') {
                        const ticker = cols[2];
                        if (!ticker) return;

                        const ativoDoArquivo = {
                            id: parseFloat(cols[1]), ticker: ticker, tipo: cols[3], nomePregao: cols[4],
                            nome: cols[5], cnpj: cols[6], tipoAcao: cols[7], adminNome: cols[8], adminCnpj: cols[9]
                        };

                        if (ativosAtuaisMap.has(ticker)) {
                            const ativoExistente = ativosAtuaisMap.get(ticker);
                            Object.assign(ativoExistente, { tipo: ativoDoArquivo.tipo, nomePregao: ativoDoArquivo.nomePregao, nome: ativoDoArquivo.nome, cnpj: ativoDoArquivo.cnpj, tipoAcao: ativoDoArquivo.tipoAcao, adminNome: ativoDoArquivo.adminNome, adminCnpj: ativoDoArquivo.adminCnpj });
                            ativosAtualizados++;
                        } else {
                            todosOsAtivos.push(ativoDoArquivo);
                            ativosAdicionados++;
                        }
                    }
                });

                salvarAtivos();
                alert(`Atualização de ativos concluída!\n\n- ${ativosAtualizados} ativos existentes foram atualizados.\n- ${ativosAdicionados} novos ativos foram adicionados.\n\nSeus cadastros de Contas e Feriados foram mantidos.`);
                if(telas.cadastroAtivos.style.display === 'block') renderizarTabelaAtivos();

            } else if (escolha === '2') {
                // --- OPÇÃO 2: SUBSTITUIÇÃO COMPLETA ---
                const novosAtivos = [], novasContas = [], novosFeriados = [];

                linhasDeDados.forEach(linha => {
                    const cols = linha.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(c => c.trim().replace(/"/g, ''));
                    const tipo = cols[0];
                    if (!tipo) return;

                    switch (tipo) {
                        case 'ATIVO_RV':
                            novosAtivos.push({ id: parseFloat(cols[1]), ticker: cols[2], tipo: cols[3], nomePregao: cols[4], nome: cols[5], cnpj: cols[6], tipoAcao: cols[7], adminNome: cols[8], adminCnpj: cols[9] });
                            break;
                        case 'CONTA':
                            novasContas.push({ id: parseFloat(cols[1]), banco: cols[2], tipo: cols[3], numeroBanco: cols[4], agencia: cols[5], numero: cols[6], pix: cols[7], saldoInicial: parseDecimal(cols[8]), dataSaldoInicial: normalizarDataParaInput(cols[9]) });
                            break;
                        case 'FERIADO':
                            novosFeriados.push({ id: parseFloat(cols[1]), data: normalizarDataParaInput(cols[2]), descricao: cols[3] });
                            break;
                    }
                });

                todosOsAtivos = novosAtivos;
                todasAsContas = novasContas;
                todosOsFeriados = novosFeriados;

                salvarAtivos();
                salvarContas();
                salvarFeriados();

                alert('Substituição completa realizada com sucesso! A aplicação será recarregada.');
                location.reload();
            }

        } catch (error) {
            alert('Erro ao processar o arquivo CSV. Verifique se o formato está correto.\nDetalhes: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Limpa o input para permitir a mesma seleção de arquivo novamente
}
// ********** FIM DA PARTE 8
// --- INÍCIO: FERRAMENTA DE DIAGNÓSTICO DA TIR ---
function diagnosticarTIR(tipoAtivo) {
    console.log(`--- INÍCIO DO DIAGNÓSTICO DE TIR PARA: ${tipoAtivo} ---`);

    const hoje = new Date().toISOString().split('T')[0];
    const posicoesAtuais = gerarPosicaoDetalhada();
    
    // 1. Identificar os ativos a serem analisados
    const tickersParaAnalisar = todosOsAtivos
        .filter(a => a.tipo === tipoAtivo && posicoesAtuais[a.ticker]?.quantidade > 0.000001)
        .map(a => a.ticker);

    if (tickersParaAnalisar.length === 0) {
        console.log("Nenhum ativo em carteira encontrado para esta categoria.");
        console.log("--- FIM DO DIAGNÓSTICO ---");
        return;
    }
    console.log(`[ETAPA 1] Ativos em carteira encontrados para análise:`, tickersParaAnalisar);

    // 2. Construir o fluxo de caixa
    console.log("\n[ETAPA 2] Construindo o fluxo de caixa...");
    const tickerSet = new Set(tickersParaAnalisar);
    const fluxos = [];
    const datas = [];

    // --- CÓPIA DA LÓGICA DE construirFluxoDeCaixa COM LOGS ---
    console.log("  - Lendo 'Posição Inicial' (SUMARIO_MANUAL)...");
    posicaoInicial.filter(p => p.tipoRegistro === 'SUMARIO_MANUAL' && tickerSet.has(p.ticker)).forEach(p => {
        const qtd = p.posicoesPorCorretora.reduce((soma, pc) => soma + pc.quantidade, 0);
        const custo = qtd * p.precoMedio;
        if (custo > 0) {
            fluxos.push(-custo);
            datas.push(p.data);
            console.log(`    > Encontrado SUMARIO_MANUAL para ${p.ticker} em ${p.data}: Saída de ${formatarMoeda(custo)}`);
        }
    });

    console.log("  - Lendo 'Histórico de Ativo' (TRANSACAO_HISTORICA)...");
    posicaoInicial.filter(p => p.tipoRegistro === 'TRANSACAO_HISTORICA' && tickerSet.has(p.ticker)).forEach(p => {
        if (p.transacao.toLowerCase() === 'compra') {
            const custo = p.precoMedio * p.quantidade;
            fluxos.push(-custo);
            datas.push(p.data);
            console.log(`    > Encontrado Histórico (Compra) para ${p.ticker} em ${p.data}: Saída de ${formatarMoeda(custo)}`);
        } else { // Venda
            fluxos.push(p.valorVenda || 0);
            datas.push(p.data);
            console.log(`    > Encontrado Histórico (Venda) para ${p.ticker} em ${p.data}: Entrada de ${formatarMoeda(p.valorVenda || 0)}`);
        }
    });

    console.log("  - Lendo 'Notas de Negociação'...");
    todasAsNotas.forEach(n => {
        n.operacoes.filter(op => tickerSet.has(op.ativo)).forEach(op => {
            const custoRateado = (n.operacoes.reduce((s, o) => s + o.valor, 0) > 0) ? (op.valor / n.operacoes.reduce((s, o) => s + o.valor, 0)) * (n.custosNota + n.irrfNota) : 0;
            if (op.tipo === 'compra') {
                fluxos.push(-(op.valor + custoRateado));
                datas.push(n.data);
                console.log(`    > Encontrado Nota (Compra) para ${op.ativo} em ${n.data}: Saída de ${formatarMoeda(op.valor + custoRateado)}`);
            } else {
                fluxos.push(op.valor - custoRateado);
                datas.push(n.data);
                console.log(`    > Encontrado Nota (Venda) para ${op.ativo} em ${n.data}: Entrada de ${formatarMoeda(op.valor - custoRateado)}`);
            }
        });
    });

    console.log("  - Lendo 'Eventos de Ativos'...");
    todosOsAjustes.filter(a => a.tipoAjuste === 'evento_ativo' && tickerSet.has(a.ticker)).forEach(a => {
        if (a.tipoEvento === 'entrada') {
            const qtd = a.detalhes.reduce((soma, d) => soma + d.quantidade, 0);
            const custo = qtd * (a.precoMedio || 0);
            fluxos.push(-custo);
            datas.push(a.data);
            console.log(`    > Encontrado Evento (Entrada) para ${a.ticker} em ${a.data}: Saída de ${formatarMoeda(custo)}`);
        } else { // Saída
            const dataAnterior = new Date(a.data + 'T12:00:00');
            dataAnterior.setDate(dataAnterior.getDate() - 1);
            const posAnterior = gerarPosicaoDetalhada(dataAnterior.toISOString().split('T')[0]);
            const pmNaSaida = posAnterior[a.ticker]?.precoMedio || 0;
            const qtd = a.detalhes.reduce((soma, d) => soma + d.quantidade, 0);
            const valorSaida = qtd * pmNaSaida;
            fluxos.push(valorSaida);
            datas.push(a.data);
            console.log(`    > Encontrado Evento (Saída) para ${a.ticker} em ${a.data}: Entrada de ${formatarMoeda(valorSaida)} (baseado no PM)`);
        }
    });

    console.log("  - Lendo 'Proventos'...");
    todosOsProventos.filter(p => tickerSet.has(p.ticker) && p.dataPagamento).forEach(p => {
        fluxos.push(p.valorTotalRecebido);
        datas.push(p.dataPagamento);
        console.log(`    > Encontrado Provento para ${p.ticker} em ${p.dataPagamento}: Entrada de ${formatarMoeda(p.valorTotalRecebido)}`);
    });
    // --- FIM DA CÓPIA DA LÓGICA ---

    // 3. Adicionar o valor de mercado final
    console.log("\n[ETAPA 3] Adicionando o valor de mercado final ao fluxo...");
    const mercadoTotalCategoria = tickersParaAnalisar.reduce((soma, ticker) => {
        const posicao = posicoesAtuais[ticker];
        const cotacao = dadosDeMercado.cotacoes[ticker]?.valor || posicao.precoMedio;
        return soma + (posicao.quantidade * cotacao);
    }, 0);

    if (fluxos.length > 0) {
        fluxos.push(mercadoTotalCategoria);
        datas.push(hoje);
        console.log(`  - Valor de Mercado Final adicionado em ${hoje}: Entrada de ${formatarMoeda(mercadoTotalCategoria)}`);
    } else {
        console.log("  - Nenhum fluxo de caixa inicial encontrado. O valor de mercado não será adicionado.");
    }

    // 4. Exibir o fluxo final e tentar calcular a TIR
    console.log("\n[ETAPA 4] Tentando calcular a TIR com os dados finais...");
    const fluxosCombinados = fluxos.map((valor, i) => ({ valor, data: datas[i] }))
        .sort((a, b) => new Date(a.data) - new Date(b.data));
        
    const fluxosFinais = fluxosCombinados.map(f => f.valor);
    const datasFinais = fluxosCombinados.map(f => f.data);

    console.log("  - Array de Fluxos de Caixa Final:", fluxosFinais);
    console.log("  - Array de Datas Final:", datasFinais);
    
    const tir = calcularTIR(fluxosFinais, datasFinais);

    console.log("\n[ETAPA 5] Resultado Final:");
    if (isNaN(tir)) {
        console.error("  - O cálculo da TIR falhou. Resultado: N/A");
        if (!fluxosFinais.some(v => v > 0)) console.error("    > Motivo Provável: Nenhum fluxo de caixa POSITIVO (entradas) foi encontrado.");
        if (!fluxosFinais.some(v => v < 0)) console.error("    > Motivo Provável: Nenhum fluxo de caixa NEGATIVO (saídas/aportes) foi encontrado.");
    } else {
        console.log(`  - TIR Anualizada Calculada: ${formatarPercentual(tir)}`);
    }

    console.log("--- FIM DO DIAGNÓSTICO ---");
}
// --- FIM: FERRAMENTA DE DIAGNÓSTICO DA TIR ---











// ********** PARTE 9 - CALCULADORA FLUTUANTE

let calculatorTargetInput = null;
let calculatorDisplay;

function setupCalculator() {
    const calculator = document.getElementById('floating-calculator');
    calculatorDisplay = document.getElementById('calculator-display');
    const header = calculator.querySelector('.calculator-header');
    
    // Torna a calculadora arrastável
    makeDraggable(calculator, header);

    // Adiciona os listeners de eventos para cliques
    calculator.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.matches('.calc-btn')) return;

        const action = target.dataset.action;
        const value = target.dataset.value;

        switch (action) {
            case 'clear':
                clearCalculatorDisplay();
                break;
            case 'backspace':
                backspaceCalculator();
                break;
            case 'calculate':
                calculateResult();
                break;
            case 'insert':
                insertCalculatorResult();
                break;
            default:
                if (value !== undefined) {
                    appendToCalculatorDisplay(value);
                }
        }
    });
    
    calculator.querySelector('.close-calculator').addEventListener('click', closeCalculator);

    // --- INÍCIO DA ALTERAÇÃO ---
    // Adiciona listener para entrada via teclado
    document.addEventListener('keydown', (e) => {
        // Só executa a lógica se a calculadora estiver visível
        if (calculator.style.display !== 'block') return;

        const key = e.key;
        let buttonToClick = null;

        if (key >= '0' && key <= '9') {
            buttonToClick = calculator.querySelector(`.calc-btn[data-value="${key}"]`);
        } else if (['+', '-', '*', '/'].includes(key)) {
            buttonToClick = calculator.querySelector(`.calc-btn[data-value="${key}"]`);
        } else if (key === '.' || key === ',') {
            buttonToClick = calculator.querySelector(`.calc-btn[data-value="."`);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault(); // Impede o comportamento padrão do Enter em formulários
            buttonToClick = calculator.querySelector('.calc-btn.equals');
        } else if (key === 'Backspace') {
            buttonToClick = calculator.querySelector('.calc-btn[data-action="backspace"]');
        } else if (key === 'Escape') {
            closeCalculator();
        } else if (key.toLowerCase() === 'c') {
            buttonToClick = calculator.querySelector('.calc-btn[data-action="clear"]');
        }

        if (buttonToClick) {
            buttonToClick.click();
        }
    });
    // --- FIM DA ALTERAÇÃO ---
}

function openCalculator(targetInputId) {
    const target = document.getElementById(targetInputId);
    if (!target) return;
    
    calculatorTargetInput = target;
    const calculator = document.getElementById('floating-calculator');
    
    // Tenta posicionar a calculadora perto do input
    const inputRect = target.getBoundingClientRect();
    calculator.style.left = `${inputRect.left}px`;
    calculator.style.top = `${inputRect.bottom + 5}px`;

    calculator.style.display = 'block';
    clearCalculatorDisplay();
}

function closeCalculator() {
    document.getElementById('floating-calculator').style.display = 'none';
    calculatorTargetInput = null;
}

function appendToCalculatorDisplay(value) {
    if (calculatorDisplay.textContent === '0' || calculatorDisplay.textContent === 'Erro') {
        calculatorDisplay.textContent = value === '.' ? '0.' : value;
    } else {
        calculatorDisplay.textContent += value;
    }
}

function clearCalculatorDisplay() {
    calculatorDisplay.textContent = '0';
}

function backspaceCalculator() {
    let currentText = calculatorDisplay.textContent;
    if (currentText.length > 1 && currentText !== 'Erro') {
        calculatorDisplay.textContent = currentText.slice(0, -1);
    } else {
        calculatorDisplay.textContent = '0';
    }
}

function calculateResult() {
    let expression = calculatorDisplay.textContent.replace(/,/g, '.');
    const sanitizedExpression = expression.replace(/[^\d/*+.]/g, '');
    
    try {
        const result = new Function('return ' + sanitizedExpression)();
        if (isNaN(result) || !isFinite(result)) {
            throw new Error('Cálculo inválido');
        }
        const roundedResult = Number(result.toFixed(6));
        calculatorDisplay.textContent = String(roundedResult).replace(/\./g, ',');

    } catch (error) {
        calculatorDisplay.textContent = 'Erro';
    }
}

function insertCalculatorResult() {
    if (calculatorTargetInput && calculatorDisplay.textContent !== 'Erro') {
        const resultValue = calculatorDisplay.textContent;
        calculatorTargetInput.value = resultValue;
        
        // Dispara um evento de 'change' para que qualquer lógica associada ao campo seja ativada
        calculatorTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        closeCalculator();
    }
}

function makeDraggable(element, handle) {
    let isDragging = false;
    let offsetX, offsetY;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        element.style.left = `${e.clientX - offsetX}px`;
        element.style.top = `${e.clientY - offsetY}px`;
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}
