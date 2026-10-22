/* Versão estática para Live Server. Sem dependência de Node, Next.js ou APIs externas. */
(function () {
  'use strict';
  const funnel = window.FUNNEL_DATA;
  const content = document.getElementById('content');
  const back = document.getElementById('back');
  const brand = document.getElementById('brand');
  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const steps = (funnel && funnel.steps) || [];
  const byId = new Map(steps.map((step, index) => [step.id, { step, index }]));
  const firstStep = steps[0];
  let stepId = firstStep && firstStep.id;
  let history = [];
  let answers = {};
  let timer = null;
  if (!firstStep) {
    content.innerHTML = '<h2>Questionário não encontrado</h2><p>Confira o arquivo js/dados.js.</p>';
    return;
  }

  const dom = (tag, className, html) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html != null) el.innerHTML = html;
    return el;
  };
  const safeLink = url => typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
  function imageUrl(media) {
    const url = media && media.src;
    if (!url) return '';
    if (url.includes('C17Uh-logo-protocolo-de-diabetes.webp')) return 'assets/images/logo.webp';
    return url;
  }
  function makeImage(media, css = 'content-image', alternate = 'Imagem do questionário') {
    const src = imageUrl(media);
    const isPanel = css === 'content-image' || css === 'choice-image';
    const img = dom('img', css);
    img.alt = alternate;
    img.loading = 'lazy';
    if (media && Number(media.width) > 0 && Number(media.height) > 0) {
      img.width = Number(media.width);
      img.height = Number(media.height);
    }
    if (!isPanel) {
      if (src) img.src = src;
      img.onerror = () => { img.style.display = 'none'; };
      return img;
    }
    const isHero = src.includes('bHp0d-urgente-truque');
    const isMan = src.includes('exvdi-homem');
    const isWoman = src.includes('A8Myu-mulher');
    const frame = dom('div', 'media-holder' + (isHero ? ' hero-media' : '') + (css === 'choice-image' ? ' choice-media' : ''));
    const ratio = media && Number(media.width) > 0 && Number(media.height) > 0 ? Number(media.width) / Number(media.height) : 1.2;
    frame.style.aspectRatio = ratio;
    const fallback = dom('div', 'media-fallback');
    if (isHero) {
      fallback.innerHTML = '<div class="hero-leaf">✚</div><div class="hero-heading">Protocolo de Diabetes</div><div class="hero-subtitle">Questionário de avaliação</div>';
    } else if (isMan || isWoman) {
      fallback.innerHTML = '<div class="gender-emoji">' + (isMan ? '👨' : '👩') + '</div>';
    } else {
      fallback.innerHTML = '<div class="media-icon">✚</div><small>Imagem do conteúdo</small>';
    }
    frame.appendChild(fallback);
    img.onload = () => { frame.classList.add('media-loaded'); };
    img.onerror = () => {
      frame.classList.add('media-unavailable');
      if (!isHero && !isMan && !isWoman) {
        fallback.innerHTML = '<div class="media-icon">✚</div><small>Imagem não disponível. Conecte-se à internet.</small>';
      }
    };
    if (src) img.src = src;
    frame.appendChild(img);
    return frame;
  }
  function currentStep() { return byId.get(stepId).step; }
  function choiceKey(layer) { return stepId + ':' + layer.id; }
  function findPrimaryDestination(layer) {
    const value = layer && layer.content && layer.content.destination;
    return value && value !== 'next' && byId.has(value) ? value : null;
  }
  function nextSequential() {
    const index = byId.get(stepId).index;
    return steps[index + 1] && steps[index + 1].id;
  }
  function goTo(id, save = true) {
    if (!byId.has(id) || id === stepId) return;
    if (timer != null) { window.clearInterval(timer); timer = null; }
    if (save) history.push(stepId);
    stepId = id;
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function previous() {
    if (!history.length) return;
    const id = history.pop();
    goTo(id, false);
  }
  back.addEventListener('click', previous);
  function showChoice(layer) {
    const data = layer.content || {};
    const multi = Boolean(data.multiple || data.awaitSubmit);
    const options = data.options || [];
    const isTwo = data.cols === 'grid-cols-2';
    const wrapper = dom('div', 'layer choice-grid' + (isTwo ? ' two-col' : ''));
    const key = choiceKey(layer);
    if (!answers[key]) answers[key] = [];
    options.forEach(option => {
      const button = dom('button', 'choice' + (isTwo ? ' two-col-choice' : ''));
      button.type = 'button';
      button.setAttribute('aria-pressed', answers[key].includes(option.id) ? 'true' : 'false');
      if (answers[key].includes(option.id)) button.classList.add('selected');
      const media = option.image;
      if (media && media.src) {
        if (media.type === 'emoji') {
          const emoji = dom('span', 'choice-emoji');
          emoji.textContent = media.src;
          button.appendChild(emoji);
        } else {
          const img = makeImage(media, 'choice-image', '');
          button.appendChild(img);
        }
      }
      const label = dom('div', 'choice-label', option.label || 'Selecionar');
      button.appendChild(label);
      if (multi) {
        const box = dom('span', 'choice-check', answers[key].includes(option.id) ? '✓' : '');
        box.setAttribute('aria-hidden', 'true');
        button.appendChild(box);
      }
      button.addEventListener('click', () => {
        if (multi) {
          const a = answers[key];
          answers[key] = a.includes(option.id) ? a.filter(v => v !== option.id) : [...a, option.id];
          wrapper.querySelectorAll('.choice').forEach((btn, idx) => {
            const selected = answers[key].includes(options[idx].id);
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', String(selected));
            const check = btn.querySelector('.choice-check');
            if (check) check.textContent = selected ? '✓' : '';
          });
          content.querySelectorAll('[data-requires-answer="' + layer.id + '"]').forEach(btn => {
            btn.disabled = !answers[key].length;
          });
          return;
        }
        answers[key] = [option.id];
        const destination = option.destination;
        goTo(byId.has(destination) ? destination : nextSequential());
      });
      wrapper.appendChild(button);
    });
    return wrapper;
  }
  function renderLayer(layer) {
    const type = layer.type;
    const data = layer.content || {};
    const design = layer.design || {};
    let el;
    if (type === 'text') return dom('div', 'layer text', data.text || '');
    if (type === 'image') {
      el = dom('div', 'layer image-wrap');
      el.appendChild(makeImage(data.image, 'content-image', 'Imagem do protocolo'));
      return el;
    }
    if (type === 'button') {
      const label = dom('span', '', data.label || 'Continuar');
      el = dom('button', 'layer action' + (design.style === 'success' ? ' success' : '') + (design.pulse ? ' pulse' : ''));
      el.type = 'button';
      el.appendChild(label);
      const destination = data.destination;
      if (data.type === 'redirect' && safeLink(destination)) {
        el.addEventListener('click', () => { window.location.href = destination; });
      } else {
        el.addEventListener('click', () => {
          const selection = currentStep().layers.find(l => l.type === 'options' && l.content && l.content.awaitSubmit);
          if (selection && selection.content.required && !(answers[choiceKey(selection)] || []).length) return;
          goTo(byId.has(destination) ? destination : nextSequential());
        });
      }
      const selection = currentStep().layers.find(l => l.type === 'options' && l.content && l.content.awaitSubmit);
      if (selection && selection.content.required) {
        el.dataset.requiresAnswer = selection.id;
        el.disabled = !(answers[choiceKey(selection)] || []).length;
      }
      return el;
    }
    if (type === 'options') return showChoice(layer);
    if (type === 'clear') {
      const matched = (data.clear || '').match(/h-\[([0-9.]+)(rem|px)\]/);
      el = dom('div', 'space');
      if (matched) el.style.height = matched[2] === 'rem' ? (Number(matched[1]) * 16) + 'px' : matched[1] + 'px';
      return el;
    }
    if (type === 'notification') return dom('div', 'layer notification', (data.title || '') + (data.text || ''));
    if (type === 'audio') {
      el = dom('div', 'layer audio-card');
      const who = dom('div', 'audio-user');
      if (data.image && data.image.src) who.appendChild(makeImage(data.image, 'audio-avatar', ''));
      const name = dom('span'); name.textContent = data.sender || 'Áudio'; who.appendChild(name);
      el.appendChild(who);
      const audio = dom('audio');
      audio.controls = true; audio.preload = 'none';
      if (data.audio && data.audio.src) audio.src = data.audio.src;
      el.appendChild(audio);
      return el;
    }
    if (type === 'quotes') {
      el = dom('div', 'layer quotes-list');
      (data.quotes || []).forEach(quote => {
        const card = dom('article', 'quote');
        const head = dom('div', 'quote-header');
        if (quote.image && quote.image.src) head.appendChild(makeImage(quote.image, 'quote-photo', ''));
        const name = dom('div');
        const strong = dom('div', 'quote-name'); strong.textContent = quote.name || '';
        const where = dom('div', 'quote-town'); where.textContent = quote.activity || '';
        name.append(strong, where); head.appendChild(name); card.appendChild(head);
        const message = dom('div', 'quote-message'); message.textContent = quote.text || '';
        card.appendChild(message); el.appendChild(card);
      });
      return el;
    }
    if (type === 'carousel') {
      el = dom('div', 'layer carousel-items');
      (data.items || []).forEach(item => {
        const card = dom('div', 'carousel-card');
        if (item.image && item.image.src) card.appendChild(makeImage(item.image, 'content-image', 'Exemplo'));
        if (item.text && !item.text.includes('Exemplo de descrição')) card.appendChild(dom('div', '', item.text));
        el.appendChild(card);
      });
      return el;
    }
    if (type === 'arguments') {
      el = dom('div', 'layer gallery');
      (data.arguments || []).forEach(arg => {
        const figure = dom('figure');
        if (arg.image && arg.image.src) figure.appendChild(makeImage(arg.image, 'content-image', 'Imagem comparativa'));
        figure.appendChild(dom('figcaption', '', arg.text || ''));
        el.appendChild(figure);
      });
      return el;
    }
    if (type === 'metric') {
      el = dom('div', 'layer');
      if (data.title) el.appendChild(dom('div', 'metric-title', data.title));
      const track = dom('div', 'metric-track');
      const fill = dom('div', 'metric-fill');
      fill.style.width = Math.max(0, Math.min(100, Number(data.percent) || 0)) + '%';
      track.appendChild(fill); el.appendChild(track);
      return el;
    }
    if (type === 'video') {
      el = dom('div', 'layer video-frame');
      const source = (data.video || '').match(/src=["']([^"']+)["']/i);
      if (source && safeLink(source[1])) {
        const iframe = dom('iframe');
        iframe.src = source[1]; iframe.title = data.title || 'Depoimento em vídeo';
        iframe.loading = 'lazy'; iframe.allowFullscreen = true;
        iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
        el.appendChild(iframe);
      }
      return el;
    }
    if (type === 'price') {
      el = dom('div', 'layer price-block');
      el.appendChild(dom('div', 'price-title', data.title || 'Oferta'));
      if (data.before) { const t = dom('div', 'price-before'); t.textContent = data.before; el.appendChild(t); }
      const price = dom('div', 'price'); price.textContent = data.value || ''; el.appendChild(price);
      if (data.after) el.appendChild(dom('div', '', data.after));
      return el;
    }
    if (type === 'loading') return null;
    return null;
  }
  function renderLoading(layers) {
    const loading = layers[0].content || {};
    const seconds = Math.max(1, Number(loading.seconds) || 8);
    const wrap = dom('div', 'layer loading-stage');
    wrap.appendChild(dom('div', 'loading-spinner'));
    if (loading.description) wrap.appendChild(dom('div', '', loading.description));
    const bar = dom('div', 'loading-bar');
    const fill = dom('div', 'loading-bar-fill'); bar.appendChild(fill); wrap.appendChild(bar);
    const counter = dom('div', 'loading-pct', '0%'); wrap.appendChild(counter);
    content.appendChild(wrap);
    const started = Date.now();
    const destination = findPrimaryDestination(layers[0]) || nextSequential();
    timer = window.setInterval(() => {
      const percent = Math.min(100, Math.round((Date.now() - started) / (seconds * 1000) * 100));
      fill.style.width = percent + '%'; counter.textContent = percent + '%';
      if (percent === 100) { window.clearInterval(timer); timer = null; if (destination) goTo(destination); }
    }, 120);
  }
  function render() {
    const step = currentStep();
    content.innerHTML = '';
    back.hidden = history.length === 0 || (step.options && step.options.show_back === false);
    const isIntro = step.id === firstStep.id;
    brand.hidden = isIntro || (step.options && step.options.show_logo === false);
    progressWrap.hidden = isIntro || (step.options && step.options.show_progress === false);
    const match = (step.title || '').match(/Etapa\s+(\d+)/i);
    const number = match ? Math.min(21, Number(match[1])) : 1;
    progressFill.style.width = Math.round(number / 21 * 100) + '%';
    const loadings = [];
    for (const layer of (step.layers || [])) {
      if (layer.type === 'loading') { loadings.push(layer); continue; }
      const item = renderLayer(layer);
      if (item) content.appendChild(item);
    }
    if (loadings.length) renderLoading(loadings);
    document.title = 'Protocolo de Diabetes';
  }
  render();
  window.QUIZ_TEST_API = {goTo, step: () => currentStep(), answers: () => answers};
})();
