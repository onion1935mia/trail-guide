/* 구간 강조와 연동. 글과 숫자는 모두 HTML에 들어 있고, 이 파일은 강조만 더한다.
   바깥으로 아무것도 보내지 않고, 아무것도 저장하지 않는다. */
(function () {
  'use strict';

  var root = document.documentElement;
  // 이 표시가 있어야 등장 효과와 띠가 켜진다.
  // 카드는 이 표시가 있든 없든 항상 보인다(숨겨 두는 상태가 없다).
  root.classList.add('js');

  function all(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }
  function bySeg(id) {
    return all('[data-seg="' + id + '"]');
  }
  function setMark(els, name, on) {
    els.forEach(function (el) {
      if (on) { el.classList.add(name); } else { el.classList.remove(name); }
    });
  }

  function start() {
    var cards = all('.card[data-seg]');

    // 등장: 카드는 처음부터 보인다. 화면에 막 들어오는 카드에만 짧은 움직임(.in)을 한 번 붙인다.
    // 알림이 늦게 와서 이미 절반 넘게 보이는 카드는 움직이지 않는다(보이던 것이 깜빡이지 않게).
    try {
      var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (!reduce && 'IntersectionObserver' in window) {
        var seen = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              if (en.intersectionRatio < 0.5) { en.target.classList.add('in'); }
              seen.unobserve(en.target);
            }
          });
        });
        all('.reveal').forEach(function (el) { seen.observe(el); });
      }
    } catch (e) { /* 움직임이 없을 뿐 카드는 그대로 보인다 */ }

    // 연동: 그림의 구간, 띠의 조각, 카드 가운데 하나에 마우스를 올리거나 초점을 주면 같은 구간이 함께 강조된다.
    try {
      var readout = document.getElementById('readout');
      var idleText = readout ? readout.textContent : '';
      var lines = {};
      cards.forEach(function (card) {
        lines[card.getAttribute('data-seg')] = card.getAttribute('data-readout') || card.getAttribute('data-label') || '';
      });
      // 그림 아래의 한 줄은 그림의 구간을 가리킬 때만 바꾼다.
      // 카드를 읽는 중에 위쪽 그림의 글이 바뀌면 줄 수가 달라져 읽던 화면이 밀린다.
      var setHot = function (id, on, fromFigure) {
        setMark(bySeg(id), 'is-hot', on);
        if (readout && fromFigure) { readout.textContent = on && lines[id] ? lines[id] : idleText; }
      };
      all('[data-seg]').forEach(function (el) {
        var id = el.getAttribute('data-seg');
        var fig = el.classList.contains('seg-hit');
        el.addEventListener('pointerenter', function () { setHot(id, true, fig); });
        el.addEventListener('pointerleave', function () { setHot(id, false, fig); });
        el.addEventListener('focusin', function () { setHot(id, true, fig); });
        el.addEventListener('focusout', function () { setHot(id, false, fig); });
      });
    } catch (e) { /* 강조가 안 될 뿐 내용은 그대로다 */ }

    // 누르기: 그림의 구간을 누르면 브라우저가 그 카드로 간다(href="#seg-…"). 도착한 카드에 표시를 남긴다.
    try {
      var pick = function (id) {
        setMark(all('.card.is-picked'), 'is-picked', false);
        var card = document.getElementById('seg-' + id);
        if (card) { card.classList.add('is-picked'); }
      };
      var pickFromAddress = function () {
        var m = /^#seg-(S\d+)$/.exec(window.location.hash);
        if (m) { pick(m[1]); }
      };
      all('.seg-hit').forEach(function (hit) {
        hit.addEventListener('click', function () { pick(hit.getAttribute('data-seg')); });
      });
      cards.forEach(function (card) {
        var link = card.querySelector('.card-title a');
        if (!link) { return; }
        link.addEventListener('click', function (ev) {
          var id = card.getAttribute('data-seg');
          ev.preventDefault();          // 읽던 자리에서 화면이 움직이지 않게 한다
          pick(id);
          var others = all('.seg-hit[data-seg="' + id + '"], .strip-seg[data-seg="' + id + '"]');
          setMark(others, 'is-hot', true);
          window.setTimeout(function () {
            var still = false;
            try { still = card.matches(':hover') || card.matches(':focus-within'); } catch (e) { still = false; }
            if (!still) { setMark(others, 'is-hot', false); }
          }, 1500);
        });
      });
      window.addEventListener('hashchange', pickFromAddress);
      pickFromAddress();
    } catch (e) { /* 누르면 카드로 가는 것은 스크립트 없이도 된다 */ }

    // 지금 읽는 구간: 화면 가운데에 걸친 카드를 띠에 표시하고 이름을 적는다.
    try {
      var label = document.querySelector('.strip-label');
      if ('IntersectionObserver' in window && cards.length) {
        var inBand = {};
        var setCurrent = function (card) {
          var id = card.getAttribute('data-seg');
          setMark(all('.strip-seg.is-current'), 'is-current', false);
          setMark(all('.strip-seg[data-seg="' + id + '"]'), 'is-current', true);
          if (label) { label.textContent = card.getAttribute('data-label') || ''; }
        };
        var band = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            inBand[en.target.getAttribute('data-seg')] = en.isIntersecting;
          });
          for (var i = 0; i < cards.length; i += 1) {
            if (inBand[cards[i].getAttribute('data-seg')]) {
              setCurrent(cards[i]);
              break;
            }
          }
        }, { rootMargin: '-45% 0px -45% 0px' });
        cards.forEach(function (card) { band.observe(card); });
        setCurrent(cards[0]);
      }
    } catch (e) { /* 띠에 표시가 안 될 뿐이다 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
