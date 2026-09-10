(function () {
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markVisible(el) {
    el.classList.add('is-visible');
  }

  if (prefersReduced) {
    // Show everything immediately, no observing needed.
    document.querySelectorAll('.reveal').forEach(markVisible);
    var mo0 = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('reveal')) markVisible(node);
          if (node.querySelectorAll) node.querySelectorAll('.reveal').forEach(markVisible);
        });
      });
    });
    mo0.observe(document.body, { childList: true, subtree: true });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          markVisible(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  function observeAll(root) {
    var scope = root || document;
    var nodes = scope.matches && scope.matches('.reveal') ? [scope] : [];
    if (scope.querySelectorAll) {
      nodes = nodes.concat(Array.prototype.slice.call(scope.querySelectorAll('.reveal')));
    }
    nodes.forEach(function (el) {
      if (el.classList.contains('is-visible') || el.dataset.revealObserved) return;
      el.dataset.revealObserved = '1';
      io.observe(el);
    });
  }

  // Initial pass for content already in the DOM.
  observeAll(document);

  // Sections like #groupsGrid / #coachesGrid / #rulesList are filled later
  // via fetch() in main.js (innerHTML swap) — watch the whole document for
  // newly inserted .reveal elements and start observing them too, so they
  // never end up stuck at opacity:0.
  var mo = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        observeAll(node);
      });
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
