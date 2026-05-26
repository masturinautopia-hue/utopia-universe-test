document.addEventListener('DOMContentLoaded', () => {
    const businessGrid = document.getElementById('businessGrid');
    const modal = document.getElementById('businessModal');
    const closeModal = document.getElementById('closeModal');
    const resultCount = document.getElementById('resultCount');
    const emptyState = document.getElementById('emptyState');
    const businessCount = document.getElementById('businessCount');
    const linkCount = document.getElementById('linkCount');
    const heroVisual = document.querySelector('.hero-visual');

    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalId = document.getElementById('modalId');
    const modalCategory = document.getElementById('modalCategory');
    const modalDesc = document.getElementById('modalDesc');
    const modalLinks = document.getElementById('modalLinks');
    const whatsappBtn = document.getElementById('whatsappBtn');

    function getLinkCount(business) {
        return business.links ? business.links.length : 0;
    }

    // Count from 0 → target over `duration` ms using an easeOutCubic curve.
    // Falls back to setting the final value immediately if the user prefers
    // reduced motion, or if the element is missing.
    function animateCount(el, target, duration) {
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.textContent = target;
            return;
        }
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased);
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function updateStats() {
        const businessTotal = businessData.length;
        const linkTotal = businessData.reduce((total, business) => total + getLinkCount(business), 0);

        // Start at 0 visually so the count-up reads cleanly. Delay just past
        // the end of the hero rise animation (0.3s delay + 0.8s duration = 1.1s).
        businessCount.textContent = '0';
        linkCount.textContent = '0';
        setTimeout(() => {
            animateCount(businessCount, businessTotal, 1400);
            animateCount(linkCount, linkTotal, 1600);
        }, 1100);
    }

    function renderLogo(business, className) {
        if (business.logo) {
            return `<img src="${business.logo}" alt="${business.name} logo" loading="lazy">`;
        }

        return `<span class="${className}-fallback" aria-hidden="true">${business.icon}</span>`;
    }

    function setupHeroVisual() {
        if (!heroVisual || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        heroVisual.addEventListener('pointermove', (event) => {
            const rect = heroVisual.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
            const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;

            heroVisual.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
            heroVisual.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
        });

        heroVisual.addEventListener('pointerleave', () => {
            heroVisual.style.removeProperty('--tilt-x');
            heroVisual.style.removeProperty('--tilt-y');
        });
    }

    function renderBusinesses() {
        const businesses = businessData;
        businessGrid.innerHTML = '';

        businesses.forEach((business) => {
            const folder = buildFolder(business);
            businessGrid.appendChild(folder);
        });

        const noun = businesses.length === 1 ? 'company' : 'companies';
        resultCount.textContent = `${businesses.length} ${noun}`;
        emptyState.hidden = businesses.length > 0;
    }

    // Group sub-business links by category, preserving insertion order
    function getCategoryGroups(business) {
        const groups = [];
        const seen = new Map();
        (business.links || []).forEach((link) => {
            const cat = link.category || 'Websites';
            if (!seen.has(cat)) {
                const entry = { name: cat, links: [] };
                seen.set(cat, entry);
                groups.push(entry);
            }
            seen.get(cat).links.push(link);
        });
        return groups;
    }

    // Extract a hostname from a URL safely
    function domainFor(url) {
        try { return new URL(url).hostname.replace(/^www\./, ''); }
        catch { return null; }
    }

    // Favicon services. DuckDuckGo returns sharper icons for most domains;
    // Google's s2 service is a reliable fallback. The chain fails gracefully
    // to initials if both miss.
    function faviconUrl(domain) {
        return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    }
    function faviconFallbackUrl(domain) {
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    }

    function buildFolder(business) {
        const wrap = document.createElement('div');
        wrap.className = 'folder-wrap';

        const folder = document.createElement('button');
        folder.className = 'folder';
        folder.type = 'button';
        folder.dataset.id = business.id;
        folder.setAttribute('aria-label', `Open ${business.name}`);

        const groups = getCategoryGroups(business);
        const desktopVisibleCount = 3;
        const hiddenCount = Math.max(0, groups.length - desktopVisibleCount);

        // Papers (the photos peeking out behind the folder)
        const papers = document.createElement('div');
        papers.className = 'folder-papers';
        groups.forEach((group, i) => {
            const paper = buildPaper(group, business);
            if (i >= desktopVisibleCount) paper.classList.add('folder-paper--overflow');
            papers.appendChild(paper);
        });

        // Folder body (pearl/translucent panel)
        const body = document.createElement('div');
        body.className = 'folder-body';

        // Tab on top-left
        const tab = document.createElement('div');
        tab.className = 'folder-tab';

        // Sticker — parent company logo, slightly tilted on the front
        const sticker = document.createElement('div');
        sticker.className = 'folder-sticker';
        sticker.innerHTML = business.logo
            ? `<img src="${business.logo}" alt="${business.name} logo" loading="lazy"
                    onerror="this.parentNode.innerHTML='<span class=\\'folder-sticker-fallback\\' aria-hidden=\\'true\\'>${business.icon || '🏢'}</span>'">`
            : `<span class="folder-sticker-fallback" aria-hidden="true">${business.icon || '🏢'}</span>`;

        // "+N more" pill
        const moreMarkup = hiddenCount > 0
            ? `<div class="folder-more">+${hiddenCount}</div>`
            : '';

        // Compose: papers (back) → body → tab → sticker → more
        folder.appendChild(papers);
        folder.appendChild(body);
        folder.appendChild(tab);
        folder.appendChild(sticker);
        if (moreMarkup) folder.insertAdjacentHTML('beforeend', moreMarkup);

        folder.addEventListener('click', () => openModal(business));

        // Label below
        const label = document.createElement('div');
        label.className = 'folder-label';
        label.innerHTML = `
            <div class="folder-label-name">${business.name}</div>
            <div class="folder-label-meta">
                ${groups.length} ${groups.length === 1 ? 'brand' : 'brands'}
                <span class="sep">·</span>
                ${getLinkCount(business)} links
            </div>
        `;

        wrap.appendChild(folder);
        wrap.appendChild(label);
        wrap.addEventListener('click', () => openModal(business));
        return wrap;
    }

    // Convert a category name (e.g. "Cat Grooming & Hotel") into a filename slug
    // matching the extracted poster logo files in assets/sublogos/.
    function categorySlug(name) {
        return name.toLowerCase()
            .replace(/&/g, '')           // drop ampersands
            .replace(/\//g, '-')          // slashes -> hyphens
            .replace(/[^a-z0-9\s-]/g, '') // strip remaining punctuation
            .trim()
            .replace(/\s+/g, '-')         // spaces -> hyphens
            .replace(/-+/g, '-');         // collapse multiple hyphens
    }

    function buildPaper(group, business) {
        const paper = document.createElement('div');
        paper.className = 'folder-paper';

        const firstUrl = group.links[0]?.url;
        const domain = firstUrl ? domainFor(firstUrl) : null;
        const initials = group.name
            .split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

        const baseSlug = categorySlug(group.name);

        // Some businesses share category names (e.g., Rev Move and Rev Move Utara
        // both have "Motor Rental"). Try a business-scoped slug first.
        const businessId = business?.id || '';
        const scopedSlugs = {
            'UTOPIA-009': baseSlug + '-utara', // Rev Move Utara
        };
        const primarySlug = scopedSlugs[businessId] || baseSlug;

        // Build the fallback chain as an array of src URLs to try in order
        const sources = [];
        sources.push(`assets/sublogos/${primarySlug}.png`);
        if (primarySlug !== baseSlug) {
            sources.push(`assets/sublogos/${baseSlug}.png`);
        }
        if (domain) {
            sources.push(faviconUrl(domain));        // DuckDuckGo
            sources.push(faviconFallbackUrl(domain)); // Google
        }

        // Container for the favicon (img or fallback span)
        const faviconWrap = document.createElement('div');
        faviconWrap.className = 'folder-paper-favicon';

        const img = document.createElement('img');
        img.alt = group.name;
        img.loading = 'lazy';
        let sourceIndex = 0;
        const tryNext = () => {
            if (sourceIndex < sources.length) {
                img.src = sources[sourceIndex++];
            } else {
                // All sources exhausted — replace img with initials fallback
                const fallback = document.createElement('span');
                fallback.className = 'folder-paper-favicon-fallback';
                fallback.textContent = initials;
                faviconWrap.innerHTML = '';
                faviconWrap.appendChild(fallback);
            }
        };
        img.addEventListener('error', tryNext);
        tryNext();
        faviconWrap.appendChild(img);

        // Label and extra count
        const label = document.createElement('div');
        label.className = 'folder-paper-label';
        label.textContent = group.name;

        paper.appendChild(faviconWrap);
        paper.appendChild(label);

        if (group.links.length > 1) {
            const extra = document.createElement('div');
            extra.className = 'folder-paper-extra';
            extra.textContent = `${group.links.length} sites`;
            paper.appendChild(extra);
        }

        return paper;
    }

    function createLinkItem(link) {
        const linkEl = document.createElement('a');
        linkEl.href = encodeURI(link.url);
        linkEl.className = 'link-item';
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.innerHTML = `
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>${link.name}</span>
        `;
        return linkEl;
    }

    function renderModalLinks(business) {
        modalLinks.innerHTML = '';

        if (!business.links || business.links.length === 0) {
            modalLinks.innerHTML = '<p class="text-muted">No website available.</p>';
            return;
        }

        const categoriesByName = business.links.reduce((groups, link) => {
            const category = link.category || 'Websites';
            groups[category] = groups[category] || [];
            groups[category].push(link);
            return groups;
        }, {});

        Object.entries(categoriesByName).forEach(([catName, links]) => {
            const group = document.createElement('section');
            group.className = 'link-category-group';
            group.innerHTML = `
                <h4 class="link-category-title">${catName}</h4>
                <div class="link-list"></div>
            `;

            const linkList = group.querySelector('.link-list');
            links.forEach((link) => linkList.appendChild(createLinkItem(link)));
            modalLinks.appendChild(group);
        });
    }

    function openModal(business) {
        modalIcon.innerHTML = renderLogo(business, 'modal-icon');
        modalTitle.textContent = business.name;
        modalId.textContent = business.id;
        modalCategory.textContent = business.category;
        modalDesc.textContent = business.description;
        renderModalLinks(business);

        whatsappBtn.href = `https://wa.me/${business.whatsapp.replace(/\D/g, '')}`;

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeModal.focus();
    }

    function closeBusinessModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    closeModal.addEventListener('click', closeBusinessModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeBusinessModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeBusinessModal();
        }
    });

    modal.setAttribute('aria-hidden', 'true');
    setupHeroVisual();
    updateStats();
    renderBusinesses();
});