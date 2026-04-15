// DMTechApp — PDF de Orçamento (pdfmake)
const PDF_ORC = {
  _logoBase64: null,

  // Carrega logo do localStorage (salva via Config)
  _carregarLogo() {
    const stored = localStorage.getItem('dmtech-logo');
    if (stored) this._logoBase64 = stored;
  },

  // Lê config da empresa do localStorage
  _config() {
    try { return JSON.parse(localStorage.getItem('dmtech-config') || '{}'); }
    catch { return {}; }
  },

  _fmt(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  _fmtData(d) {
    if (!d) return '—';
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
  },

  _montarHeader(cfg, numero, data, responsavel) {
    const empresa = cfg.empresa_nome || APP.company?.name || 'Empresa';

    // Endereço compacto
    const partes = [];
    if (cfg.empresa_endereco) partes.push(cfg.empresa_endereco);
    if (cfg.empresa_cidade)   partes.push(cfg.empresa_cidade);
    const endereco = partes.join(' — ');

    // Coluna esquerda: logo + nome
    const colEsq = [];
    if (this._logoBase64 && this._logoBase64.startsWith('data:image/')) {
      colEsq.push({ image: this._logoBase64, width: 72, margin: [0, 0, 0, 4] });
    }
    colEsq.push({ text: empresa, fontSize: 15, bold: true, color: '#1a1a1a' });
    if (cfg.empresa_cnpj)   colEsq.push({ text: 'CNPJ: ' + cfg.empresa_cnpj,       fontSize: 8, color: '#666' });
    if (cfg.empresa_tel)    colEsq.push({ text: 'Tel: ' + cfg.empresa_tel,          fontSize: 8, color: '#666' });
    if (cfg.empresa_wa)     colEsq.push({ text: 'WhatsApp: ' + cfg.empresa_wa,      fontSize: 8, color: '#666' });
    if (endereco)           colEsq.push({ text: endereco,                            fontSize: 8, color: '#666', margin: [0,1,0,0] });

    // Coluna direita: marca + nº + data + responsável
    const colDir = [
      { text: [
          { text: 'DM', bold: true, color: '#f97316', fontSize: 11 },
          { text: 'Tech', bold: true, color: '#555', fontSize: 11 }
        ], alignment: 'right', margin: [0, 0, 0, 6]
      },
      { text: `Orçamento nº ${numero}`, fontSize: 14, bold: true, alignment: 'right', color: '#1a1a1a' },
      { text: this._fmtData(data), fontSize: 9, alignment: 'right', color: '#555', margin: [0,2,0,0] },
    ];
    if (responsavel) colDir.push({ text: 'Responsável: ' + responsavel, fontSize: 8, alignment: 'right', color: '#888', margin: [0,2,0,0] });

    return [
      {
        columns: [
          { stack: colEsq, width: '*' },
          { stack: colDir, width: 'auto' }
        ],
        margin: [0, 0, 0, 8]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#f97316' }], margin: [0, 0, 0, 12] }
    ];
  },

  _montarCliente(cliente) {
    if (!cliente) return [];
    const linhas = [
      { text: 'Dados do Cliente', fontSize: 11, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 4] }
    ];
    const infoBody = [[
      { text: cliente.name || '—',   fontSize: 10, bold: true,  color: '#1a1a1a' },
      { text: cliente.phone || '—',  fontSize: 10,              color: '#444' },
      { text: cliente.email || '—',  fontSize: 10,              color: '#444' }
    ]];
    if (cliente.cpf_cnpj) infoBody[0].push({ text: cliente.cpf_cnpj, fontSize: 10, color: '#444' });

    linhas.push({
      table: {
        widths: ['*', 130, '*'],
        body: [
          [
            { text: 'Nome',     fontSize: 8, bold: true, color: '#888', fillColor: '#f5f5f5' },
            { text: 'WhatsApp', fontSize: 8, bold: true, color: '#888', fillColor: '#f5f5f5' },
            { text: 'E-mail',   fontSize: 8, bold: true, color: '#888', fillColor: '#f5f5f5' }
          ],
          [
            { text: cliente.name  || '—', fontSize: 10, color: '#1a1a1a' },
            { text: cliente.phone || '—', fontSize: 10, color: '#444' },
            { text: cliente.email || '—', fontSize: 10, color: '#444' }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 0.4, vLineWidth: () => 0.4,
        hLineColor: () => '#ddd', vLineColor: () => '#ddd',
        paddingLeft: () => 6, paddingRight: () => 6,
        paddingTop: () => 4, paddingBottom: () => 4
      },
      margin: [0, 0, 0, 14]
    });
    return linhas;
  },

  _montarItens(itens) {
    const servicos = itens.filter(i => i.tipo === 'servico');
    const pecas    = itens.filter(i => i.tipo === 'produto');

    const fmtN = v => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const buildRows = (lista, startIdx) => lista.map((it, idx) => [
      { text: String(startIdx + idx + 1), style: 'tcell', alignment: 'center' },
      { text: it.descricao || '—',        style: 'tcell' },
      { text: it.tipo === 'servico' ? 'S' : 'P', style: 'tcell', alignment: 'center', color: it.tipo === 'servico' ? '#60a5fa' : '#4ade80', bold: true },
      { text: fmtN(it.quantidade),        style: 'tcell', alignment: 'right' },
      { text: this._fmt(it.preco_unit),   style: 'tcell', alignment: 'right' },
      { text: this._fmt(it.subtotal),     style: 'tcell', alignment: 'right', bold: true }
    ]);

    const allRows = [
      ...buildRows(servicos, 0),
      ...buildRows(pecas,    servicos.length)
    ];

    const totalServicos = servicos.reduce((s, i) => s + (i.subtotal || 0), 0);
    const totalPecas    = pecas.reduce((s, i)    => s + (i.subtotal || 0), 0);
    const totalGeral    = totalServicos + totalPecas;

    const header = [
      { text: 'PRODUTOS E SERVIÇOS', fontSize: 10, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 6] }
    ];

    const tabela = {
      table: {
        headerRows: 1,
        widths: [22, '*', 18, 45, 70, 70],
        body: [
          [
            { text: 'Item',      fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'center' },
            { text: 'Descrição', fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5' },
            { text: 'T',         fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'center' },
            { text: 'Qtd.',      fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'right' },
            { text: 'Valor Un.', fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'right' },
            { text: 'Total',     fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'right' }
          ],
          ...(allRows.length ? allRows : [[
            { text: 'Nenhum item adicionado.', colSpan: 6, fontSize: 9, color: '#999', italics: true },
            {}, {}, {}, {}, {}
          ]]),
        ]
      },
      layout: {
        hLineWidth: (i, n) => (i === 0 || i === 1 || i === n.table.body.length) ? 0.5 : 0.25,
        vLineWidth: () => 0.4,
        hLineColor: () => '#ccc',
        vLineColor: () => '#ddd',
        paddingLeft:   () => 5,
        paddingRight:  () => 5,
        paddingTop:    () => 4,
        paddingBottom: () => 4
      },
      margin: [0, 0, 0, 6]
    };

    // Totais
    const totaisBody = [];
    if (servicos.length) totaisBody.push([
      { text: `Totais Serviços  (${servicos.length} item${servicos.length > 1 ? 'ns' : ''})`, fontSize: 9, color: '#555', colSpan: 2 },
      {},
      { text: this._fmt(totalServicos), fontSize: 9, bold: true, color: '#555', alignment: 'right' }
    ]);
    if (pecas.length) totaisBody.push([
      { text: `Totais Produtos  (${pecas.length} item${pecas.length > 1 ? 'ns' : ''})`, fontSize: 9, color: '#555', colSpan: 2 },
      {},
      { text: this._fmt(totalPecas), fontSize: 9, bold: true, color: '#555', alignment: 'right' }
    ]);
    totaisBody.push([
      { text: 'TOTAL GERAL', fontSize: 11, bold: true, color: '#1a1a1a', colSpan: 2 },
      {},
      { text: this._fmt(totalGeral), fontSize: 13, bold: true, color: '#f97316', alignment: 'right' }
    ]);

    const totais = {
      table: { widths: ['*', '*', 130], body: totaisBody },
      layout: {
        hLineWidth: (i, n) => (i === 0 || i === n.table.body.length) ? 0.5 : 0.25,
        vLineWidth: () => 0,
        hLineColor: () => '#ccc',
        paddingLeft: () => 6, paddingRight: () => 6,
        paddingTop: () => 4, paddingBottom: () => 4
      },
      margin: [0, 0, 0, 14]
    };

    return [...header, tabela, totais];
  },

  _montarPix(pixKey) {
    if (!pixKey) return [];
    return [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#ddd' }], margin: [0, 0, 0, 10] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Pagamento via PIX', fontSize: 10, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 4] },
              { text: 'Chave PIX:', fontSize: 8, color: '#888' },
              { text: pixKey, fontSize: 10, bold: true, color: '#333', margin: [0, 2, 0, 0] }
            ]
          },
          {
            width: 'auto',
            stack: [
              { qr: pixKey, fit: 80, margin: [0, 0, 0, 0] },
              { text: 'Escaneie para pagar', fontSize: 7, color: '#888', alignment: 'center', margin: [0, 3, 0, 0] }
            ]
          }
        ],
        margin: [0, 0, 0, 14]
      }
    ];
  },

  _footer() {
    return (currentPage, pageCount) => ({
      columns: [
        { text: `${currentPage}/${pageCount}`, fontSize: 8, color: '#aaa' },
        { text: `Gerado por DMTechApp — Impresso em ${new Date().toLocaleString('pt-BR')}`, fontSize: 8, color: '#aaa', alignment: 'right' }
      ],
      margin: [40, 8, 40, 0]
    });
  },

  _styles() {
    return {
      tcell: { fontSize: 10, color: '#333' }
    };
  },

  // ────────────────────────────────────────────────
  // PDF Orçamento — versão CLIENTE (com preços)
  // ────────────────────────────────────────────────
  async gerarCliente(orcId) {
    this._carregarLogo();
    const cfg = this._config();

    const [{ data: orc }, { data: itens }] = await Promise.all([
      sb.from('orcamentos')
        .select('*, clients(name, phone, email, cpf_cnpj)')
        .eq('id', orcId).eq('company_id', APP.company.id).single(),
      sb.from('orcamento_items').select('*').eq('orcamento_id', orcId).order('id')
    ]);
    if (!orc) { dmToast('Orçamento não encontrado', 'error'); return; }

    const responsavel = APP.profile?.name || APP.profile?.email || '';
    const pixKey = cfg.pix_key || '';

    const validadeBlock = orc.validade ? [
      { text: `Validade deste orçamento: ${this._fmtData(orc.validade)}`, fontSize: 9, color: '#888', margin: [0, 0, 0, 10] }
    ] : [];

    const obsBlock = orc.notes ? [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#ddd' }], margin: [0, 0, 0, 10] },
      { text: 'Observações', fontSize: 10, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 4] },
      { text: orc.notes, fontSize: 9, color: '#555', lineHeight: 1.5 }
    ] : [];

    const docDef = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      footer: this._footer(),
      styles: this._styles(),
      content: [
        ...this._montarHeader(cfg, orc.numero, orc.created_at, responsavel),
        ...this._montarCliente(orc.clients),
        ...this._montarItens(itens || []),
        ...validadeBlock,
        ...this._montarPix(pixKey),
        ...obsBlock
      ]
    };

    const nome = (orc.clients?.name || 'Cliente').replace(/\s+/g, '_');
    pdfMake.createPdf(docDef).download(`Orcamento_${orc.numero}_${nome}.pdf`);
  },

  // ────────────────────────────────────────────────
  // PDF OS — versão EQUIPE (sem preços)
  // ────────────────────────────────────────────────
  async gerarEquipe(orcId) {
    this._carregarLogo();
    const cfg = this._config();

    const [{ data: orc }, { data: itens }] = await Promise.all([
      sb.from('orcamentos')
        .select('*, clients(name, phone, email)')
        .eq('id', orcId).eq('company_id', APP.company.id).single(),
      sb.from('orcamento_items').select('*').eq('orcamento_id', orcId).order('id')
    ]);
    if (!orc) { dmToast('Orçamento não encontrado', 'error'); return; }

    const empresa = cfg.empresa_nome || APP.company?.name || 'Empresa';
    const responsavel = APP.profile?.name || APP.profile?.email || '';
    const fmtN = v => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

    const servicos = (itens || []).filter(i => i.tipo === 'servico');
    const pecas    = (itens || []).filter(i => i.tipo === 'produto');

    const buildRowsEquipe = (lista, startIdx) => lista.map((it, idx) => [
      { text: String(startIdx + idx + 1), fontSize: 9, alignment: 'center', color: '#333' },
      { text: it.descricao || '—',        fontSize: 10, color: '#1a1a1a' },
      { text: it.tipo === 'servico' ? 'S' : 'P', fontSize: 9, alignment: 'center', color: it.tipo === 'servico' ? '#60a5fa' : '#4ade80', bold: true },
      { text: fmtN(it.quantidade), fontSize: 9, alignment: 'right', color: '#333' }
    ]);

    const allRows = [
      ...buildRowsEquipe(servicos, 0),
      ...buildRowsEquipe(pecas, servicos.length)
    ];

    const tabela = {
      table: {
        headerRows: 1,
        widths: [22, '*', 18, 50],
        body: [
          [
            { text: 'Item',      fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'center' },
            { text: 'Descrição', fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5' },
            { text: 'T',         fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'center' },
            { text: 'Qtd.',      fontSize: 8, bold: true, color: '#666', fillColor: '#f5f5f5', alignment: 'right' }
          ],
          ...(allRows.length ? allRows : [[
            { text: 'Nenhum item.', colSpan: 4, fontSize: 9, color: '#999', italics: true }, {}, {}, {}
          ]])
        ]
      },
      layout: {
        hLineWidth: (i, n) => (i === 0 || i === 1 || i === n.table.body.length) ? 0.5 : 0.25,
        vLineWidth: () => 0.4,
        hLineColor: () => '#ccc', vLineColor: () => '#ddd',
        paddingLeft: () => 5, paddingRight: () => 5,
        paddingTop: () => 4, paddingBottom: () => 4
      },
      margin: [0, 0, 0, 14]
    };

    const obsBlock = orc.notes ? [
      { text: 'Observações', fontSize: 10, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 4] },
      { text: orc.notes, fontSize: 9, color: '#555', lineHeight: 1.5 }
    ] : [];

    const docDef = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      footer: this._footer(),
      content: [
        // Header simplificado p/ equipe
        {
          columns: [
            { stack: [{ text: empresa, fontSize: 14, bold: true, color: '#1a1a1a' }], width: '*' },
            { stack: [
              { text: `OS Interna — Orçamento #${orc.numero}`, fontSize: 12, bold: true, alignment: 'right', color: '#1a1a1a' },
              { text: this._fmtData(orc.created_at), fontSize: 9, alignment: 'right', color: '#888' },
              { text: 'Resp.: ' + responsavel, fontSize: 9, alignment: 'right', color: '#888' }
            ], width: 'auto' }
          ],
          margin: [0, 0, 0, 8]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#f97316' }], margin: [0, 0, 0, 12] },
        // Cliente
        { text: 'Cliente: ' + (orc.clients?.name || '—'), fontSize: 11, bold: false, color: '#333', margin: [0, 0, 0, 12] },
        // Itens sem preço
        { text: 'ITENS DO SERVIÇO', fontSize: 10, bold: true, color: '#1a1a1a', margin: [0, 0, 0, 6] },
        tabela,
        ...obsBlock
      ]
    };

    pdfMake.createPdf(docDef).download(`OS_Interna_${orc.numero}.pdf`);
  },

  // ────────────────────────────────────────────────
  // Recibo de pagamento
  // ────────────────────────────────────────────────
  async gerarRecibo(orcId) {
    this._carregarLogo();
    const cfg = this._config();

    const { data: orc } = await sb.from('orcamentos')
      .select('*, clients(name, phone, email, cpf_cnpj)')
      .eq('id', orcId).eq('company_id', APP.company.id).single();
    if (!orc) { dmToast('Orçamento não encontrado', 'error'); return; }

    const empresa = cfg.empresa_nome || APP.company?.name || 'Empresa';
    const total = orc.total || 0;
    const extenso = ''; // pode implementar por extenso depois
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    const docDef = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      footer: this._footer(),
      content: [
        ...this._montarHeader(cfg, orc.numero, orc.created_at, ''),
        { text: 'RECIBO DE PAGAMENTO', fontSize: 16, bold: true, alignment: 'center', color: '#1a1a1a', margin: [0, 8, 0, 16] },
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: [{ text: 'Recebi de ', fontSize: 11, color: '#555' }, { text: orc.clients?.name || '—', fontSize: 11, bold: true, color: '#1a1a1a' }] },
                { text: [{ text: 'a quantia de ', fontSize: 11, color: '#555' }, { text: this._fmt(total), fontSize: 13, bold: true, color: '#f97316' }], margin: [0, 6, 0, 0] },
                { text: [{ text: 'Referente ao: ', fontSize: 11, color: '#555' }, { text: `Orçamento nº ${orc.numero}`, fontSize: 11, bold: true, color: '#1a1a1a' }], margin: [0, 6, 0, 0] },
                ...(orc.notes ? [{ text: [{ text: 'Descrição: ', fontSize: 10, color: '#555' }, { text: orc.notes, fontSize: 10, color: '#333' }], margin: [0, 4, 0, 0] }] : [])
              ],
              margin: [12, 14, 12, 14]
            }]]
          },
          layout: {
            hLineWidth: () => 0.5, vLineWidth: () => 0.5,
            hLineColor: () => '#ccc', vLineColor: () => '#ccc'
          },
          margin: [0, 0, 0, 24]
        },
        {
          columns: [
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#333' }] },
                { text: empresa, fontSize: 9, color: '#555', margin: [0, 3, 0, 0] },
                { text: 'Assinatura', fontSize: 8, color: '#aaa' }
              ],
              alignment: 'center', width: '*'
            },
            {
              stack: [
                { text: dataHoje, fontSize: 10, color: '#333', margin: [0, 0, 0, 3] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#333' }] },
                { text: orc.clients?.name || '—', fontSize: 9, color: '#555', margin: [0, 3, 0, 0] },
                { text: 'Pagador', fontSize: 8, color: '#aaa' }
              ],
              alignment: 'center', width: '*'
            }
          ],
          margin: [0, 0, 0, 20]
        },
        // Canhoto
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#bbb', dash: { length: 4, space: 4 } }], margin: [0, 0, 0, 10] },
        { text: '↩ Canhoto', fontSize: 8, color: '#aaa', margin: [0, 0, 0, 6] },
        {
          columns: [
            { text: `Orçamento nº ${orc.numero}`, fontSize: 9, bold: true, color: '#1a1a1a', width: '*' },
            { text: `Cliente: ${orc.clients?.name || '—'}`, fontSize: 9, color: '#555', width: '*' },
            { text: `Valor: ${this._fmt(total)}`, fontSize: 9, bold: true, color: '#f97316', width: 'auto' }
          ]
        }
      ]
    };

    const nome = (orc.clients?.name || 'Cliente').replace(/\s+/g, '_');
    pdfMake.createPdf(docDef).download(`Recibo_${orc.numero}_${nome}.pdf`);
  }
};
