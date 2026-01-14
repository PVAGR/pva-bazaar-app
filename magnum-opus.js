/**
 * PVA BAZAAR - MAGNUM OPUS JAVASCRIPT
 * A Philosophical Marketplace & Digital Journal Platform
 * 
 * Features:
 * - Theme management (dark/light mode)
 * - Journal entry CRUD operations
 * - Dynamic filtering and search
 * - Local storage persistence
 * - Modal management
 * - Smooth animations
 * - Mobile navigation
 */

(function() {
    'use strict';

    // ==========================================================================
    // CONFIGURATION & DATA
    // ==========================================================================
    
    const CONFIG = {
        STORAGE_KEYS: {
            THEME: 'pva:theme',
            ENTRIES: 'pva:journal-entries',
            CUSTOM_ENTRIES: 'journal:customEntries'
        },
        ANIMATION_DURATION: 300,
        ENTRIES_PER_PAGE: 9
    };

    // Sample journal entries data - representing the philosophical depth of PVA
    const DEFAULT_ENTRIES = [
        {
            id: 1,
            title: "On the Nature of Verified Existence",
            content: "Today I contemplate the intersection of blockchain verification and conscious ownership. In a world where provenance is everything, what does it mean to truly 'own' something? The certificate of authenticity is not just a document—it's a statement of consciousness. When we verify an asset on the chain, we're not just creating a record; we're making a philosophical assertion about the nature of value itself.",
            type: "philosophy",
            date: "2025-12-28",
            tags: ["philosophy", "blockchain", "consciousness", "ownership"]
        },
        {
            id: 2,
            title: "Sacred Texts and Digital Verification",
            content: "The ancient texts speak of truth as something eternal, unchanging. Yet how often has 'sacred' knowledge been manipulated, edited, controlled by gatekeepers? The blockchain offers something revolutionary: immutable truth. Not truth as dictated by authority, but truth as consensus. This is the democratization of the sacred.",
            type: "philosophy",
            date: "2025-12-25",
            tags: ["sacred-texts", "truth", "blockchain", "spirituality"]
        },
        {
            id: 3,
            title: "Building PVA Nation: A Personal Reflection",
            content: "Three years ago, this was just an idea scribbled in a notebook at 3 AM. Today, we have collectors in 150 countries, over 500 original essays, and a community that understands something fundamental: value isn't just about money. It's about meaning. It's about connection. It's about leaving something real behind.",
            type: "personal",
            date: "2025-12-20",
            tags: ["personal", "pva-nation", "growth", "community"]
        },
        {
            id: 4,
            title: "Research Notes: Fractional Ownership Models",
            content: "Diving deep into fractional ownership structures today. The traditional model—one owner, one asset—is giving way to something more fluid. When 1000 people each own 0.1% of a Colombian emerald, what emerges is not dilution but multiplication. The value becomes shared consciousness. Need to explore more case studies.",
            type: "research",
            date: "2025-12-18",
            tags: ["research", "fractional-ownership", "pva-coin", "economics"]
        },
        {
            id: 5,
            title: "The Man from Taured: Chapter Notes",
            content: "Working on the trans-dimensional chapter. The protagonist discovers that ownership transcends not just physical boundaries but temporal ones. What if your verified asset exists simultaneously in multiple timelines? The blockchain becomes a map of parallel possibilities. Pure consciousness mathematics.",
            type: "creative",
            date: "2025-12-15",
            tags: ["novel", "taured", "creative-writing", "consciousness"]
        },
        {
            id: 6,
            title: "Morning Reflection: Balance as Revolution",
            content: "Pura Vida Ayurveda isn't just a name—it's a practice. Balance in all things. Today I'm reminded that building a global platform requires the same equilibrium we seek in personal life. Too much growth, you lose quality. Too much philosophy, you lose practicality. The middle path is where transformation happens.",
            type: "reflection",
            date: "2025-12-12",
            tags: ["pura-vida", "balance", "ayurveda", "reflection"]
        },
        {
            id: 7,
            title: "On Collectors and Philosophers",
            content: "Who collects things of value? The obvious answer: those with wealth. But dig deeper. The true collector is a philosopher in disguise. They don't just acquire—they curate meaning. Every piece in a collection tells a story. PVA Bazaar is built on this understanding: behind every transaction is a philosophy.",
            type: "philosophy",
            date: "2025-12-08",
            tags: ["collectors", "philosophy", "meaning", "curation"]
        },
        {
            id: 8,
            title: "Technical Deep Dive: Smart Contract Architecture",
            content: "Spent 12 hours on the verification smart contracts. The elegance of immutability continues to fascinate me. Each asset gets a unique fingerprint—not just metadata, but a philosophical statement encoded in mathematics. The contract doesn't just verify ownership; it creates a permanent record of consciousness.",
            type: "research",
            date: "2025-12-05",
            tags: ["technical", "smart-contracts", "blockchain", "development"]
        },
        {
            id: 9,
            title: "Personal Chronicle: The Costa Rica Years",
            content: "Before PVA, there were years in Costa Rica. The forests taught me about interconnection. The ocean taught me about depth. The people taught me about 'Pura Vida'—not just 'pure life' but a philosophy of acceptance and presence. Everything I build now carries those lessons.",
            type: "personal",
            date: "2025-12-01",
            tags: ["costa-rica", "origins", "pura-vida", "personal-history"]
        }
    ];

    // ==========================================================================
    // STATE MANAGEMENT
    // ==========================================================================
    
    const state = {
        theme: 'dark',
        entries: [],
        filteredEntries: [],
        currentFilter: 'all',
        currentTags: [],
        editingEntryId: null,
        mobileMenuOpen: false
    };

    // ==========================================================================
    // DOM ELEMENTS
    // ==========================================================================
    
    const DOM = {
        // Navigation
        mobileMenuBtn: () => document.getElementById('mobileMenuBtn'),
        navLinks: () => document.getElementById('navLinks'),
        themeToggle: () => document.getElementById('themeToggle'),
        
        // Journal
        entriesContainer: () => document.getElementById('entriesContainer'),
        filterBtns: () => document.querySelectorAll('.pva-filter-btn'),
        
        // Modal
        entryModal: () => document.getElementById('entryModal'),
        modalTitle: () => document.getElementById('modalTitle'),
        closeModal: () => document.getElementById('closeModal'),
        cancelBtn: () => document.getElementById('cancelBtn'),
        saveEntryBtn: () => document.getElementById('saveEntryBtn'),
        journalForm: () => document.getElementById('journalForm'),
        entryTitle: () => document.getElementById('entryTitle'),
        entryType: () => document.getElementById('entryType'),
        entryContent: () => document.getElementById('entryContent'),
        entryId: () => document.getElementById('entryId'),
        tagsContainer: () => document.getElementById('tagsContainer'),
        tagInput: () => document.getElementById('tagInput'),
        
        // Footer
        currentYear: () => document.getElementById('currentYear')
    };

    // ==========================================================================
    // UTILITY FUNCTIONS
    // ==========================================================================
    
    /**
     * Format date to readable string
     */
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Truncate text to specified length
     */
    function truncate(text, length = 150) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length).trim() + '...';
    }

    /**
     * Debounce function for performance
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // ==========================================================================
    // THEME MANAGEMENT
    // ==========================================================================
    
    function initTheme() {
        const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
        
        const toggleBtn = DOM.themeToggle();
        if (toggleBtn) {
            toggleBtn.innerHTML = theme === 'dark' 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        }
    }

    function toggleTheme() {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    // ==========================================================================
    // ENTRIES MANAGEMENT
    // ==========================================================================
    
    function loadEntries() {
        try {
            // Try to load custom entries from localStorage
            const savedEntries = localStorage.getItem(CONFIG.STORAGE_KEYS.ENTRIES);
            if (savedEntries) {
                state.entries = JSON.parse(savedEntries);
            } else {
                // Use default entries
                state.entries = [...DEFAULT_ENTRIES];
                saveEntries();
            }
            
            // Sort by date (newest first)
            state.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
            state.filteredEntries = [...state.entries];
            
        } catch (e) {
            console.error('Error loading entries:', e);
            state.entries = [...DEFAULT_ENTRIES];
            state.filteredEntries = [...state.entries];
        }
    }

    function saveEntries() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ENTRIES, JSON.stringify(state.entries));
        } catch (e) {
            console.error('Error saving entries:', e);
        }
    }

    function filterEntries(filter) {
        state.currentFilter = filter;
        
        if (filter === 'all') {
            state.filteredEntries = [...state.entries];
        } else {
            state.filteredEntries = state.entries.filter(entry => entry.type === filter);
        }
        
        renderEntries();
    }

    // ==========================================================================
    // RENDER FUNCTIONS
    // ==========================================================================
    
    function renderEntries() {
        const container = DOM.entriesContainer();
        if (!container) return;
        
        container.innerHTML = '';
        
        const entriesToShow = state.filteredEntries.slice(0, CONFIG.ENTRIES_PER_PAGE);
        
        if (entriesToShow.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl); color: var(--text-muted);">
                    <i class="fas fa-book-open" style="font-size: 4rem; margin-bottom: var(--space-lg); opacity: 0.3;"></i>
                    <h3 style="margin-bottom: var(--space-sm);">No entries found</h3>
                    <p>No journal entries match the selected filter.</p>
                </div>
            `;
            return;
        }
        
        entriesToShow.forEach((entry, index) => {
            const entryEl = createEntryElement(entry);
            entryEl.style.animation = `slideUp 0.5s ease ${index * 0.1}s both`;
            container.appendChild(entryEl);
        });
    }

    function createEntryElement(entry) {
        const typeLabels = {
            'philosophy': 'Philosophy',
            'personal': 'Personal',
            'research': 'Research',
            'reflection': 'Reflection',
            'creative': 'Creative'
        };
        
        const entryEl = document.createElement('div');
        entryEl.className = 'pva-entry-card';
        
        entryEl.innerHTML = `
            <div class="pva-entry-header">
                <h3 class="pva-entry-title">${escapeHtml(entry.title)}</h3>
                <div class="pva-entry-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(entry.date)}</span>
                    <span class="pva-entry-type ${entry.type}">${typeLabels[entry.type] || entry.type}</span>
                </div>
            </div>
            <div class="pva-entry-content">
                ${escapeHtml(truncate(entry.content))}
            </div>
            <div class="pva-entry-footer">
                <div class="pva-entry-tags">
                    ${(entry.tags || []).slice(0, 3).map(tag => `<span class="pva-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
                <div class="pva-entry-actions">
                    <button class="pva-action-btn edit-btn" data-id="${entry.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="pva-action-btn delete-btn" data-id="${entry.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        entryEl.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editEntry(entry.id);
        });
        
        entryEl.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEntry(entry.id);
        });
        
        // Click to view
        entryEl.addEventListener('click', () => viewEntry(entry.id));
        
        return entryEl;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================================================
    // MODAL MANAGEMENT
    // ==========================================================================
    
    function openModal() {
        const modal = DOM.entryModal();
        if (!modal) return;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            DOM.entryTitle()?.focus();
        }, 100);
    }

    function closeModal() {
        const modal = DOM.entryModal();
        if (!modal) return;
        
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        resetForm();
    }

    function resetForm() {
        state.editingEntryId = null;
        state.currentTags = [];
        
        const form = DOM.journalForm();
        if (form) form.reset();
        
        const modalTitle = DOM.modalTitle();
        if (modalTitle) modalTitle.textContent = 'New Journal Entry';
        
        renderTags();
    }

    // ==========================================================================
    // ENTRY CRUD OPERATIONS
    // ==========================================================================
    
    function viewEntry(id) {
        editEntry(id);
    }

    function editEntry(id) {
        const entry = state.entries.find(e => e.id === id);
        if (!entry) return;
        
        state.editingEntryId = id;
        state.currentTags = [...(entry.tags || [])];
        
        const modalTitle = DOM.modalTitle();
        if (modalTitle) modalTitle.textContent = 'Edit Journal Entry';
        
        const entryTitle = DOM.entryTitle();
        if (entryTitle) entryTitle.value = entry.title;
        
        const entryType = DOM.entryType();
        if (entryType) entryType.value = entry.type;
        
        const entryContent = DOM.entryContent();
        if (entryContent) entryContent.value = entry.content;
        
        const entryId = DOM.entryId();
        if (entryId) entryId.value = id;
        
        renderTags();
        openModal();
    }

    function deleteEntry(id) {
        if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
            return;
        }
        
        state.entries = state.entries.filter(entry => entry.id !== id);
        saveEntries();
        filterEntries(state.currentFilter);
    }

    function saveEntry() {
        const titleInput = DOM.entryTitle();
        const typeInput = DOM.entryType();
        const contentInput = DOM.entryContent();
        
        if (!titleInput?.value.trim() || !contentInput?.value.trim()) {
            alert('Please fill in both title and content fields.');
            return;
        }
        
        const entryData = {
            id: state.editingEntryId || generateId(),
            title: titleInput.value.trim(),
            content: contentInput.value.trim(),
            type: typeInput?.value || 'reflection',
            date: new Date().toISOString().split('T')[0],
            tags: [...state.currentTags]
        };
        
        if (state.editingEntryId) {
            // Update existing entry
            const index = state.entries.findIndex(e => e.id === state.editingEntryId);
            if (index !== -1) {
                state.entries[index] = entryData;
            }
        } else {
            // Add new entry
            state.entries.unshift(entryData);
        }
        
        saveEntries();
        filterEntries(state.currentFilter);
        closeModal();
    }

    // ==========================================================================
    // TAGS MANAGEMENT
    // ==========================================================================
    
    function addTag(tagText) {
        if (!tagText || tagText.trim() === '') return;
        
        const normalizedTag = tagText.trim().toLowerCase();
        
        if (!state.currentTags.includes(normalizedTag)) {
            state.currentTags.push(normalizedTag);
            renderTags();
        }
        
        const tagInput = DOM.tagInput();
        if (tagInput) tagInput.value = '';
    }

    function removeTag(index) {
        state.currentTags.splice(index, 1);
        renderTags();
    }

    function renderTags() {
        const container = DOM.tagsContainer();
        const input = DOM.tagInput();
        if (!container || !input) return;
        
        // Clear container except input
        container.innerHTML = '';
        
        // Add tag pills
        state.currentTags.forEach((tag, index) => {
            const pill = document.createElement('div');
            pill.className = 'pva-tag-pill';
            pill.innerHTML = `
                ${escapeHtml(tag)}
                <button type="button" class="pva-tag-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(pill);
            
            pill.querySelector('.pva-tag-remove').addEventListener('click', () => {
                removeTag(index);
            });
        });
        
        // Re-add input at the end
        container.appendChild(input);
    }

    // ==========================================================================
    // MOBILE NAVIGATION
    // ==========================================================================
    
    function toggleMobileMenu() {
        const navLinks = DOM.navLinks();
        const mobileBtn = DOM.mobileMenuBtn();
        
        if (!navLinks || !mobileBtn) return;
        
        state.mobileMenuOpen = !state.mobileMenuOpen;
        
        if (state.mobileMenuOpen) {
            navLinks.classList.add('active');
            mobileBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            navLinks.classList.remove('active');
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================
    
    function setupEventListeners() {
        // Theme toggle
        const themeToggle = DOM.themeToggle();
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Mobile menu
        const mobileMenuBtn = DOM.mobileMenuBtn();
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        }
        
        // Filter buttons
        const filterBtns = DOM.filterBtns();
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterEntries(btn.dataset.filter);
            });
        });
        
        // Modal controls
        const closeModalBtn = DOM.closeModal();
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }
        
        const cancelBtn = DOM.cancelBtn();
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        const saveEntryBtn = DOM.saveEntryBtn();
        if (saveEntryBtn) {
            saveEntryBtn.addEventListener('click', saveEntry);
        }
        
        // Modal overlay click to close
        const entryModal = DOM.entryModal();
        if (entryModal) {
            entryModal.addEventListener('click', (e) => {
                if (e.target === entryModal) {
                    closeModal();
                }
            });
        }
        
        // Tag input
        const tagInput = DOM.tagInput();
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput.value);
                }
            });
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && entryModal?.classList.contains('active')) {
                closeModal();
            }
        });
        
        // Set current year in footer
        const currentYear = DOM.currentYear();
        if (currentYear) {
            currentYear.textContent = new Date().getFullYear();
        }
    }

    // ==========================================================================
    // ANIMATIONS & EFFECTS
    // ==========================================================================
    
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slideUp');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        // Observe feature cards
        document.querySelectorAll('.pva-feature-card').forEach(card => {
            observer.observe(card);
        });
        
        // Observe category cards
        document.querySelectorAll('.pva-category-card').forEach(card => {
            observer.observe(card);
        });
    }

    // ==========================================================================
    // COUNTER ANIMATION
    // ==========================================================================
    
    function animateCounters() {
        const counters = document.querySelectorAll('.pva-hero-stat-number, .pva-stat-number');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element) {
        const text = element.textContent;
        const match = text.match(/^([\$]?)(\d+)([\+KMB]?)(.*)$/);
        
        if (!match) return;
        
        const prefix = match[1] || '';
        const target = parseInt(match[2], 10);
        const suffix = match[3] + (match[4] || '');
        const duration = 2000;
        const start = 0;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            element.textContent = `${prefix}${current}${suffix}`;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = text; // Restore original
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // ==========================================================================
    // SMOOTH SCROLL
    // ==========================================================================
    
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Skip hash routes (e.g., #/journal)
                if (href.includes('/')) return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    
    function init() {
        console.log('🌿 PVA Bazaar - Magnum Opus Initializing...');
        
        // Core initialization
        initTheme();
        loadEntries();
        renderEntries();
        setupEventListeners();
        
        // Enhancements
        initScrollAnimations();
        animateCounters();
        initSmoothScroll();
        
        console.log('✨ PVA Bazaar - Magnum Opus Ready!');
        console.log('   Ownership is consciousness. Value is verification. Community is transformation.');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==========================================================================
    // GLOBAL API (for external access if needed)
    // ==========================================================================
    
    window.PVABazaar = {
        openNewEntry: () => {
            resetForm();
            openModal();
        },
        getEntries: () => [...state.entries],
        getTheme: () => state.theme,
        setTheme,
        addEntry: (entry) => {
            state.entries.unshift({
                ...entry,
                id: generateId(),
                date: entry.date || new Date().toISOString().split('T')[0]
            });
            saveEntries();
            filterEntries(state.currentFilter);
        }
    };

})();
