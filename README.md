# Personal Investment Manager (PIM)

Sistema de gestão de portfólio de investimentos "High-Fidelity" focado nas regras de negócio do mercado financeiro brasileiro (B3). Desenvolvido com arquitetura SPA (Single Page Application) em JavaScript Puro (Vanilla JS), operando em modo offline-first.

🔗 **[Acesse a Demonstração Online Aqui](https://g-martins-rocha.github.io/personal-investment-manager/)**
*(O sistema carregará automaticamente dados fictícios de demonstração ao abrir)*

## 🎯 Visão Geral

Este projeto nasceu da necessidade de superar as limitações das planilhas tradicionais e plataformas comerciais, que muitas vezes falham em tratar eventos corporativos complexos e cálculos tributários específicos do Brasil.

O objetivo não foi apenas "registrar ativos", mas criar um motor de decisão para o investidor, oferecendo ferramentas de **Business Intelligence** e **Controle de Risco** geralmente encontradas apenas em plataformas profissionais de Wealth Management.

## 🚀 Principais Funcionalidades

### 1. Algoritmo de Rebalanceamento Inteligente
O "coração" do sistema. Diferente de rebalanceamentos simples que apenas olham percentuais, este módulo atua como um consultor de alocação:
* **Alocação Híbrida:** Permite definir metas Macro (por Categoria: Ações, FIIs, RF) e Micro (Score individual do ativo).
* **Motor de Seleção de Compra:** Sugere aportes baseados em um **Score de Qualidade** que pondera:
    * *Valuation:* Preço Teto de Bazin (para ações) e P/VP (para FIIs).
    * *Dividend Yield:* Projeção de renda futura baseada no histórico.
    * *Payout:* Sustentabilidade dos dividendos.
* **Travas de Segurança na Venda:** O sistema bloqueia sugestões de venda que gerariam prejuízo financeiro (Preço Atual < Preço Médio) ou venda de patrimônio com deságio (P/VP < 1.0), forçando o investidor a seguir princípios de Value Investing.

### 2. Análise de Performance Avançada (Total Return)
Vai muito além da simples variação de cotação.
* **Gráfico Comparativo:** Permite cruzar o desempenho de Ativos individuais vs. Categorias vs. Índices de Referência (IBOV/IFIX).
* **Cálculo de TIR (Taxa Interna de Retorno):** Implementação do método numérico (similar ao Newton-Raphson) para calcular a rentabilidade real de fluxos de caixa irregulares.
* **Yield on Cost (YoC) vs. Yield de Mercado:** Visualização clara da eficiência dos dividendos sobre o custo de aquisição histórico versus o custo de oportunidade atual.

### 3. Motor Tributário (Compliance Fiscal)
Automatiza a apuração de resultados para fins de Imposto de Renda:
* Distinção automática entre Swing Trade e Day Trade.
* Aplicação da regra de isenção para vendas de ações até R$ 20.000,00.
* Compensação automática de prejuízos acumulados entre meses.
* Tratamento diferenciado para FIIs, ETFs e Ações (Units/ON/PN).

### 4. Gestão de Eventos Corporativos
Suporte nativo a eventos que alteram a base acionária sem fluxo financeiro direto, como **Desdobramentos (Splits)** e **Grupamentos (Inplits)**, ajustando o Preço Médio e o histórico retroativo para manter a consistência dos gráficos de performance.

## 🛠️ Tecnologia e Arquitetura

* **Stack:** HTML5, CSS3, JavaScript (ES6+). Sem frameworks, focado em performance e manipulação eficiente do DOM.
* **Persistência:** LocalStorage (Offline-First) com capacidade de exportação/importação de backup JSON.
* **Integração de Dados:** Sistema agnóstico preparado para consumir cotações via CSV ou APIs públicas.
* **Metodologia:** Desenvolvimento assistido por IA (AI-Assisted Engineering), atuando como Product Owner e Arquiteto de Solução na definição das regras de negócio e validação (QA) dos algoritmos gerados.

## 📦 Instalação e Uso Local

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/g-martins-rocha/personal-investment-manager.git](https://github.com/g-martins-rocha/personal-investment-manager.git)
    ```
2.  Abra o arquivo `index.html` em qualquer navegador moderno.
3.  O sistema carregará automaticamente o arquivo `default_data.json` para demonstração.

---
*Desenvolvido por GUSTAVO MARTINS ROCHA*
