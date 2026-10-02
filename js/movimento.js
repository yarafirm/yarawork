/* ═══════════════════════════════════════════════════════════
   Movimento e interação — quatro comportamentos, e só quatro.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ingles = document.documentElement.lang === 'en';   /* en.html usa o mesmo script */
  var ponteiroFino = window.matchMedia('(pointer: fine)').matches;

  /* 1 ─ revelação ao rolar ------------------------------------------------ */
  var alvos = document.querySelectorAll('[data-revela]');

  if (reduzido || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('revelado'); });
  } else {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var atraso = Number(e.target.dataset.atraso || 0) * 90;
        setTimeout(function () { e.target.classList.add('revelado'); }, atraso);
        observador.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    alvos.forEach(function (el) { observador.observe(el); });
  }

  /* 2 ─ parallax leve nas peças soltas da capa ---------------------------- */
  var camadas = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (camadas.length && !reduzido) {
    var pendente = false;
    var desenhar = function () {
      var y = window.scrollY;
      camadas.forEach(function (el) {
        el.style.transform = 'translate3d(0,' + (y * Number(el.dataset.parallax)).toFixed(1) + 'px,0)';
      });
      pendente = false;
    };
    window.addEventListener('scroll', function () {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(desenhar);
    }, { passive: true });
    desenhar();
  }

  /* 3 ─ a capa: uma tira presa ao scroll ----------------------------------
     A diferença entre isto e "animação ao rolar" é que aqui NADA dispara.
     O progresso da seção vira uma posição, e cada palavra fica exatamente
     onde essa posição manda. Parou no meio, ela fica no meio; subiu, ela
     volta. O gesto comanda o quadro — é isso que dá a sensação física.

     A quarta moldura é a piada, e a piada leva para o contato: a chamada
     mais forte do site é a que não parece uma chamada.                    */
  var limite = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var percurso = document.querySelector('.percurso');
  var etapas = Array.prototype.slice.call(document.querySelectorAll('.etapa'));
  var legendas = Array.prototype.slice.call(document.querySelectorAll('.percurso-legenda li'));
  var role = document.querySelector('.percurso-role');
  /* o fantasma da próxima palavra: não é uma .etapa, é um elemento à
     parte posto exatamente onde a que vem vai estar. Ele só aparece na
     faixa em que a palavra de verdade ainda está com opacidade zero,
     então os dois nunca disputam o mesmo pixel.                     */
  var espia = document.querySelector('.espia');
  var fixo = percurso ? percurso.querySelector('.percurso-fixo') : null;

  /* No celular o scroll chega em saltos (o navegador avisa poucas vezes
     por segundo enquanto o dedo arrasta, e a barra de endereço muda a
     altura da tela no meio do caminho). Em vez de pular para a posição
     nova, a tira CORRE até ela: cada quadro anda uma fração do que falta.
     Ainda para onde o dedo parou, só que sem o degrau. No desktop, com
     roda e trackpad, o mapeamento continua direto.                     */
  var suave = window.matchMedia('(pointer:coarse)').matches;
  var pAtual = null;

  // as paradas do degradê vêm do CSS (--tom-1 a --tom-4): trocar de paleta
  // não exige tocar aqui.
  function lerTom(n) {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--tom-' + n).trim();
    var m = v.match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0,2),16), parseInt(m[1].slice(2,4),16), parseInt(m[1].slice(4,6),16)];
    var r = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    return r ? [+r[1], +r[2], +r[3]] : [23,26,32];
  }
  var TONS = [lerTom(1), lerTom(2), lerTom(3), lerTom(4)];
  function mistura(p) {
    var n = TONS.length - 1, i = Math.min(Math.floor(p * n), n - 1), f = p * n - i;
    var a = TONS[i], b = TONS[i + 1];
    return 'rgb(' + a.map(function (c, k) { return Math.round(c + (b[k] - c) * f); }).join(',') + ')';
  }

  function desenharPercurso() {
    if (!percurso || !etapas.length) return;
    var r = percurso.getBoundingClientRect();
    // a altura do quadro preso, não a da janela: no celular a janela
    // cresce e encolhe com a barra de endereço e as palavras pulavam.
    var janela = fixo ? fixo.offsetHeight : window.innerHeight;
    var alvo = limite(-r.top / ((r.height - janela) || 1));
    if (suave && pAtual !== null) {
      pAtual += (alvo - pAtual) * 0.22;
      if (Math.abs(alvo - pAtual) < 0.0015) pAtual = alvo;
    } else {
      pAtual = alvo;
    }
    var p = pAtual;

    // posição contínua na tira: 0 = primeira palavra centrada, 1 = segunda…
    var pos = p * (etapas.length - 1);
    var atual = Math.round(pos);
    var cor = mistura(p);

    etapas.forEach(function (el, i) {
      var d = i - pos;                        // distância desta palavra até o centro
      el.style.transform = 'translate3d(0,' + (d * 105).toFixed(2) + '%,0)';
      el.style.opacity = Math.max(0, 1 - Math.abs(d) * 1.15).toFixed(3);
      el.style.setProperty('--tom', cor);
    });

    legendas.forEach(function (el, i) { el.classList.toggle('ativa', i === atual); });

    // o grifo da piada se desenha conforme ela chega ao centro
    var piada = etapas[etapas.length - 1];
    if (piada) piada.style.setProperty('--p', limite(1 - Math.abs((etapas.length - 1) - pos)).toFixed(3));

    if (espia) {
      var prox = Math.min(etapas.length - 1, Math.floor(pos) + 1);
      var d = prox - pos;                   /* 1 = a palavra atual centrada */
      var texto = etapas[prox].textContent.trim();
      if (espia.textContent !== texto) {
        espia.textContent = texto;
        espia.classList.toggle('espia-piada', etapas[prox].classList.contains('etapa-piada'));
      }
      espia.style.transform = 'translate3d(0,' + (d * 105).toFixed(2) + '%,0)';
      espia.style.opacity = (0.36 * limite((d - 0.80) / 0.14)).toFixed(3);
    }

    /* a dica some assim que a pessoa começa. Em 0,55 ela ficava na tela
       metade do percurso, quando já não dizia mais nada.               */
    if (role) role.classList.toggle('some', p > 0.06);
    return pAtual !== alvo;            // ainda correndo atrás do dedo?
  }

  if (reduzido) {
    etapas.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    legendas.forEach(function (el) { el.classList.add('ativa'); });
  } else if (percurso) {
    var animando = false;
    var laco = function () {
      if (desenharPercurso()) { requestAnimationFrame(laco); }
      else { animando = false; }
    };
    var pedir = function () {
      if (animando) return;
      animando = true;
      requestAnimationFrame(laco);
    };
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir, { passive: true });
    pedir();
  }

  /* 4 ─ borda do cabeçalho ao sair do topo -------------------------------- */
  var cabecalho = document.getElementById('cabecalho');
  if (cabecalho) {
    var marcar = function () { cabecalho.classList.toggle('rolado', window.scrollY > 8); };
    window.addEventListener('scroll', marcar, { passive: true });
    marcar();

    /* menu do celular: o botão abre e fecha a lista; clicar num link,
       apertar Esc ou alargar a janela fecha de novo.                   */
    var botaoMenu = cabecalho.querySelector('.nav-botao');
    var menu = cabecalho.querySelector('.navegacao');
    if (botaoMenu && menu) {
      var abrirMenu = function (aberto) {
        cabecalho.classList.toggle('menu-aberto', aberto);
        botaoMenu.setAttribute('aria-expanded', String(aberto));
      };
      botaoMenu.addEventListener('click', function () {
        abrirMenu(botaoMenu.getAttribute('aria-expanded') !== 'true');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) abrirMenu(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') abrirMenu(false);
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 900) abrirMenu(false);
      }, { passive: true });
    }
  }

  /* 5 ─ filtro de projetos por frente ------------------------------------
     Um projeto pode pertencer às DUAS frentes: "Fluxos de automação" é CRM,
     que é justamente onde criação e dados se encontram. Por isso o atributo
     é uma lista (data-frente="marketing dados"), não um valor único.        */
  var botoes = Array.prototype.slice.call(document.querySelectorAll('.filtro'));
  var projetos = Array.prototype.slice.call(document.querySelectorAll('.projeto'));
  var aviso = document.querySelector('.filtro-aviso');
  var tira = document.querySelector('.grade-projetos');
  var drop = document.querySelector('.filtro-drop');
  var gatilho = document.querySelector('.filtro-gatilho');
  var fgRotulo = document.querySelector('.fg-rotulo');
  var fgN = document.querySelector('.fg-n');

  if (botoes.length && projetos.length) {
    // conta quantos há em cada frente e escreve no próprio botão
    botoes.forEach(function (b) {
      var f = b.dataset.filtro;
      var n = f === 'todos'
        ? projetos.length
        : projetos.filter(function (p) { return (p.dataset.frente || '').split(' ').indexOf(f) > -1; }).length;
      var marcador = b.querySelector('.filtro-n');
      if (marcador) marcador.textContent = n;
    });

    var aplicar = function (frente) {
      var visiveis = 0;
      projetos.forEach(function (p) {
        var frentes = (p.dataset.frente || '').split(' ');
        var mostra = frente === 'todos' || frentes.indexOf(frente) > -1;
        p.classList.toggle('oculto', !mostra);
        p.classList.remove('entrando');
        if (mostra) {
          visiveis++;
          if (!reduzido) {
            void p.offsetWidth;            // reinicia a animação de entrada
            p.classList.add('entrando');
            p.style.animationDelay = (visiveis - 1) * 55 + 'ms';
          }
        }
      });

      botoes.forEach(function (b) {
        var ativo = b.dataset.filtro === frente;
        b.classList.toggle('ativo', ativo);
        b.setAttribute('aria-selected', String(ativo));
        if (ativo) {
          if (fgRotulo) fgRotulo.textContent = b.textContent.replace(/\s*\d+\s*$/, '').trim();
          if (fgN) fgN.textContent = visiveis;
        }
      });

      if (aviso) {
        aviso.textContent = frente === 'todos'
          ? ''
          : ingles
            ? visiveis + (visiveis === 1 ? ' project' : ' projects') + ' in this area.'
            : visiveis + (visiveis === 1 ? ' projeto' : ' projetos') + ' nesta frente.';
      }
    };

    botoes.forEach(function (b) {
      b.addEventListener('click', function () {
        aplicar(b.dataset.filtro);
        if (drop) drop.dataset.aberto = 'false';
        if (gatilho) gatilho.setAttribute('aria-expanded', 'false');
      });
    });

    // abre e fecha a lista; clique fora ou Esc encerram
    if (drop && gatilho) {
      gatilho.addEventListener('click', function (e) {
        e.stopPropagation();
        var abrir = drop.dataset.aberto !== 'true';
        drop.dataset.aberto = String(abrir);
        gatilho.setAttribute('aria-expanded', String(abrir));
      });
      document.addEventListener('click', function (e) {
        if (!drop.contains(e.target)) {
          drop.dataset.aberto = 'false';
          gatilho.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          drop.dataset.aberto = 'false';
          gatilho.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // "Ver projetos" dentro de cada frente já chega com o filtro aplicado
    Array.prototype.forEach.call(document.querySelectorAll('[data-frente-atalho]'), function (a) {
      a.addEventListener('click', function () { aplicar(a.dataset.frenteAtalho); });
    });
  }

  /* 6 ─ cursor: asterisco + contexto --------------------------------------
     O ponteiro não carrega uma piada fixa. Ele responde ao lugar: em cada
     palavra da capa diz o verbo daquela etapa, no projeto diz o que você
     vai ver, no bloco de código entrega a piada de quem já depurou. É a
     mesma narrativa do site, dita no lugar onde a pessoa já está olhando.

     Quem quiser acrescentar um rótulo novo em qualquer elemento: basta
     escrever data-cursor="o texto" no HTML. Não precisa tocar aqui.      */
  var cursor = document.querySelector('.cursor');
  var marca = document.querySelector('.cursor-marca');
  var rotulo = document.querySelector('.cursor-rotulo');

  if (cursor && rotulo && ponteiroFino && !reduzido) {
    document.body.classList.add('cursor-proprio');

    // Sem interpolação: o asterisco fica exatamente sob o ponteiro. O rAF
    // existe só para não escrever no style a cada evento de mouse.
    var mx = 0, my = 0, agendado = false;
    function posicionar() {
      cursor.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(0,-50%)';
      agendado = false;
    }

    // primeiro convite: some no primeiro hover com rótulo, ou sozinho
    var convite = true;
    rotulo.textContent = ingles ? 'hover me' : 'passe o mouse';
    cursor.classList.add('com-rotulo');
    var tirarConvite = function () {
      if (!convite) return;
      convite = false;
      cursor.classList.remove('com-rotulo');
      rotulo.textContent = '';
    };
    setTimeout(tirarConvite, 3800);

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cursor.classList.remove('fora');
      if (!agendado) { agendado = true; requestAnimationFrame(posicionar); }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { cursor.classList.add('fora'); });

    var CLICAVEL = 'a, button, [role="button"], .projeto';

    document.addEventListener('mouseover', function (e) {
      if (!e.target.closest) return;
      var com = e.target.closest('[data-cursor]');
      if (com) {
        tirarConvite();
        rotulo.textContent = com.dataset.cursor;
        cursor.classList.add('com-rotulo');
      }
      if (e.target.closest(CLICAVEL)) cursor.classList.add('ativo');
      if (e.target.closest('[data-cursor-contraste]')) cursor.classList.add('contraste');
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      if (!e.target.closest) return;
      var com = e.target.closest('[data-cursor]');
      if (com && !(e.relatedTarget && com.contains(e.relatedTarget))) {
        cursor.classList.remove('com-rotulo');
      }
      if (e.target.closest(CLICAVEL)) cursor.classList.remove('ativo');
      if (e.target.closest('[data-cursor-contraste]')) cursor.classList.remove('contraste');
    }, { passive: true });
  }

  /* 6b ─ tiras horizontais (projetos e depoimentos) -----------------------
     O mesmo comportamento serve as duas seções: cada grupo de setas diz
     em data-tira qual tira ele comanda. A rolagem é nativa, com encaixe
     por CSS; as setas existem para quem usa mouse sem roda horizontal e
     se desabilitam nas pontas, para não prometer um movimento que não
     acontece.                                                           */
  var tiras = [];

  Array.prototype.forEach.call(document.querySelectorAll('.dep-setas'), function (grupo) {
    var tira = document.querySelector(grupo.dataset.tira);
    if (!tira) return;
    var setas = Array.prototype.slice.call(grupo.querySelectorAll('.dep-seta'));

    function passo() {
      var item = tira.querySelector(':scope > *:not(.oculto)');
      return item ? item.offsetWidth + 24 : tira.clientWidth * 0.8;
    }
    function atualizar() {
      var max = tira.scrollWidth - tira.clientWidth - 2;
      var temFolga = max > 2;
      setas.forEach(function (b) {
        b.disabled = !temFolga || (Number(b.dataset.dir) < 0 ? tira.scrollLeft <= 2 : tira.scrollLeft >= max);
      });
    }
    setas.forEach(function (b) {
      b.addEventListener('click', function () {
        tira.scrollBy({ left: Number(b.dataset.dir) * passo(), behavior: reduzido ? 'auto' : 'smooth' });
      });
    });
    tira.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar, { passive: true });
    tiras.push(atualizar);
    atualizar();
  });

  /* 7 ─ o acordeão dos certificados ---------------------------------------
     O título é o botão: clicou, a lista desce; clicou de novo, recolhe.
     O painel anima de grid-template-rows 0fr para 1fr, que anima a altura
     real — um max-height chutado cortaria a lista quando ela crescer.    */
  Array.prototype.forEach.call(document.querySelectorAll('.cert-topo'), function (topo) {
    topo.addEventListener('click', function () {
      var aberto = topo.getAttribute('aria-expanded') === 'true';
      topo.setAttribute('aria-expanded', String(!aberto));
      // uma tira dentro de painel fechado tem largura zero: as setas só
      // sabem se há folga depois que ele abre.
      if (!aberto) setTimeout(function () { tiras.forEach(function (f) { f(); }); }, 600);
    });
  });

  /* 8 ─ o botão de contato ------------------------------------------------
     Dois tempos: o convite e a resposta à dúvida que todo mundo tem antes
     de escrever para alguém — se vai ter resposta.                        */
  var botaoContato = document.querySelector('.botao-contato');
  if (botaoContato) {
    var bcTexto = botaoContato.querySelector('.bc-texto');
    var trocar = function (texto) {
      bcTexto.style.opacity = 0;
      setTimeout(function () { bcTexto.textContent = texto; bcTexto.style.opacity = 1; }, 170);
    };
    botaoContato.addEventListener('mouseenter', function () {
      if (!reduzido) trocar(ingles ? 'I reply fast' : 'Respondo rápido');
    });
    botaoContato.addEventListener('mouseleave', function () { trocar(ingles ? "Let's talk" : 'Vamos conversar'); });
  }

  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* 8 ─ o case abre na mesma página -------------------------------------
     Cada cartão carrega o case inteiro num <template>, que o navegador
     não renderiza. Abrir é clonar. Não existe página por case de
     propósito: sair da lista para ler um deles é perder o lugar onde
     se estava, e voltar joga a pessoa no topo.                        */
  var mcModal = document.getElementById('modal-case');
  var mcGrade = document.querySelector('.grade-projetos');
  if (mcModal && mcGrade) {
    var mcPainel = mcModal.querySelector('.mc-painel');
    var mcCorpo  = mcModal.querySelector('.mc-corpo');
    var mcTitulo = mcModal.querySelector('.mc-titulo');
    var mcSelo   = mcModal.querySelector('.mc-selo');
    var mcBotao  = mcModal.querySelector('.mc-fechar');
    var mcVolta  = null;

    /* As imagens do case vivem dentro do <template>, e o navegador não
       baixa nada que está num template. Então elas só começavam a
       carregar quando o case abria: o quadro da galeria aparecia vazio,
       pulava de altura quando a primeira chegava, e cada seta mostrava
       um branco até a próxima descer. Duas coisas resolvem:
       1. aquecer — ao passar o mouse (ou focar) no cartão, as imagens
          daquele case já vão para o cache, antes do clique;
       2. ao abrir, tirar o lazy de todas (as escondidas também) e só
          revelar cada uma quando estiver pronta, com um fade curto.  */
    var mcAquecidos = [];
    var mcAquecer = function (li) {
      if (mcAquecidos.indexOf(li) !== -1) return;
      var molde = li.querySelector('.case-conteudo');
      if (!molde) return;
      mcAquecidos.push(li);
      Array.prototype.forEach.call(molde.content.querySelectorAll('img[src]'), function (img) {
        var pre = new Image();
        pre.src = img.getAttribute('src');
      });
    };
    var mcPreparar = function (raiz) {
      Array.prototype.forEach.call(raiz.querySelectorAll('.cg-item img'), function (img) {
        img.removeAttribute('loading');
        var pronta = function () { img.classList.add('pronta'); };
        if (img.complete && img.naturalWidth) pronta();
        else { img.addEventListener('load', pronta); img.addEventListener('error', pronta); }
      });
    };

    var mcAbrir = function (li) {
      var molde = li.querySelector('.case-conteudo');
      if (!molde) return;
      mcVolta = document.activeElement;
      mcAquecer(li);

      var h = li.querySelector('h3'), cat = li.querySelector('.projeto-cat');
      mcTitulo.textContent = h ? h.textContent.trim() : '';
      mcSelo.textContent = cat ? cat.textContent.trim() : '';
      mcCorpo.innerHTML = '';
      mcCorpo.appendChild(molde.content.cloneNode(true));
      mcPreparar(mcCorpo);
      cgIniciar(mcCorpo);

      mcModal.hidden = false;
      mcPainel.scrollTop = 0;
      /* trava a rolagem de trás: sem isso a página corre atrás do modal
         e a pessoa perde o ponto em que estava na lista.              */
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(function () { mcModal.classList.add('aberto'); });
      mcBotao.focus();
    };

    var mcFechar = function () {
      if (mcModal.hidden) return;
      mcModal.classList.remove('aberto');
      document.documentElement.style.overflow = '';
      window.setTimeout(function () {
        mcModal.hidden = true;
        mcCorpo.innerHTML = '';
      }, reduzido ? 0 : 300);
      if (mcVolta && mcVolta.focus) mcVolta.focus();
      // limpa o #case-NN da barra, senão o mesmo link não reabre o case
      if (/^#case-\d\d$/.test(window.location.hash) && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    mcGrade.addEventListener('click', function (e) {
      var li = e.target.closest && e.target.closest('.projeto');
      if (!li || !li.querySelector('.case-conteudo')) return;
      e.preventDefault();
      mcAbrir(li);
    });
    // aquece no primeiro sinal de interesse: mouse em cima, foco ou toque
    var mcInteresse = function (e) {
      var li = e.target.closest && e.target.closest('.projeto');
      if (li) mcAquecer(li);
    };
    mcGrade.addEventListener('mouseover', mcInteresse);
    mcGrade.addEventListener('focusin', mcInteresse);
    mcGrade.addEventListener('touchstart', mcInteresse, { passive: true });

    /* galeria dentro do case: as setas trocam a LP visível e a legenda.
       O markup vem clonado do <template>, então nada é ligado de antemão —
       o clique é resolvido no modal, que já existe.                     */
    var cgMover = function (galeria, dir) {
      var itens = galeria.querySelectorAll('.cg-item');
      if (!itens.length) return;
      var atual = 0;
      Array.prototype.forEach.call(itens, function (it, i) { if (it.classList.contains('ativo')) atual = i; });
      var prox = (atual + dir + itens.length) % itens.length;
      itens[atual].classList.remove('ativo');
      itens[prox].classList.add('ativo');
      cgLegenda(galeria, itens[prox], prox + 1, itens.length);
      galeria.querySelector('.cg-tira').scrollTop = 0;
    };
    var cgLegenda = function (galeria, item, n, total) {
      var leg = galeria.querySelector('.cg-legenda'), pos = galeria.querySelector('.cg-pos');
      if (leg) {
        leg.querySelector('b').textContent = item.getAttribute('data-nome') || '';
        leg.querySelector('span').textContent = item.getAttribute('data-info') || '';
      }
      if (pos) pos.textContent = n + ' / ' + total;
    };
    var cgIniciar = function (raiz) {
      Array.prototype.forEach.call(raiz.querySelectorAll('.case-galeria'), function (g) {
        var itens = g.querySelectorAll('.cg-item');
        var ativo = g.querySelector('.cg-item.ativo') || itens[0];
        if (ativo) cgLegenda(g, ativo, Array.prototype.indexOf.call(itens, ativo) + 1, itens.length);
      });
    };

    mcModal.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-fechar]')) { mcFechar(); return; }
      var seta = e.target.closest && e.target.closest('.cg-seta');
      if (seta) cgMover(seta.closest('.case-galeria'), Number(seta.getAttribute('data-dir')) || 1);
    });

    document.addEventListener('keydown', function (e) {
      if (mcModal.hidden) return;
      if (e.key === 'Escape') { mcFechar(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        var g = mcCorpo.querySelector('.case-galeria');
        if (g) { e.preventDefault(); cgMover(g, e.key === 'ArrowLeft' ? -1 : 1); }
        return;
      }
      /* o Tab não pode sair do modal: atrás dele a página inteira
         continua focável e o foco sumia por baixo do overlay.     */
      if (e.key !== 'Tab') return;
      var focaveis = mcPainel.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])');
      if (!focaveis.length) return;
      var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    /* link direto para um case (#case-03): o currículo aponta para cada
       projeto. Rola até a grade e abre o case por cima dela, como o
       clique faria; o número é o mesmo que aparece no cartão.          */
    var mcPeloHash = function () {
      var m = /^#case-(\d\d)$/.exec(window.location.hash);
      if (!m) return;
      var alvo = null;
      Array.prototype.forEach.call(mcGrade.querySelectorAll('.projeto'), function (li) {
        var num = li.querySelector('.projeto-num');
        if (num && num.textContent.trim() === m[1]) alvo = li;
      });
      if (!alvo) return;
      var secao = document.getElementById('projetos');
      if (secao) secao.scrollIntoView();
      mcAbrir(alvo);
    };
    window.addEventListener('hashchange', mcPeloHash);
    window.setTimeout(mcPeloHash, 250);
  }

  /* ── certificado em pop-up ───────────────────────────────────
     O "ver" da lista abre a imagem por cima da página, sem sair
     dela. O href continua apontando para a imagem: sem JS, abre
     em outra aba; com JS, o clique é interceptado aqui.          */
  var ctModal = document.getElementById('modal-cert');
  if (ctModal) {
    var ctImagem = ctModal.querySelector('.cert-imagem');
    var ctTitulo = ctModal.querySelector('.cert-titulo');
    var ctBotao  = ctModal.querySelector('.cert-fechar');
    var ctVolta  = null;

    var ctAbrir = function (link) {
      ctVolta = document.activeElement;
      var nome = link.getAttribute('data-cert') || '';
      ctImagem.src = link.getAttribute('href');
      ctImagem.alt = (ingles ? 'Certificate: ' : 'Certificado: ') + nome;
      ctTitulo.textContent = nome;
      ctModal.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(function () { ctModal.classList.add('aberto'); });
      ctBotao.focus();
    };
    var ctFechar = function () {
      if (ctModal.hidden) return;
      ctModal.classList.remove('aberto');
      document.documentElement.style.overflow = '';
      window.setTimeout(function () { ctModal.hidden = true; ctImagem.src = ''; }, reduzido ? 0 : 300);
      if (ctVolta && ctVolta.focus) ctVolta.focus();
    };

    Array.prototype.forEach.call(document.querySelectorAll('.cert-link[data-cert]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); ctAbrir(a); });
    });
    ctModal.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-fechar]')) ctFechar();
    });
    document.addEventListener('keydown', function (e) {
      if (ctModal.hidden) return;
      if (e.key === 'Escape') { ctFechar(); return; }
      if (e.key === 'Tab') { e.preventDefault(); ctBotao.focus(); }  /* só há um focável: o X */
    });
  }

})();
