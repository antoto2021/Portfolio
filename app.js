        // --- CONSTANTES & CONFIGURATION ---
        const DB_NAME = 'GreenCodexDB';
        const DB_VERSION = 1;
        const GITHUB_USERNAME = 'antoto2021'; 
        const GITHUB_REPO     = 'Appli-Portfolio';        
        const UPDATE_STORAGE_KEY = 'green_codex_last_hash';
        const UPDATE_TIME_KEY    = 'green_codex_update_timestamp';
        
		// --- UTILITAIRE DE SÉCURITÉ (ANTI-XSS) ---
		function escapeHTML(str) {
			if (!str) return '';
			return String(str)
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		}

		// Utilitaire pour afficher soit du Base64 (vieux), soit du Blob (nouveau)
		function getImageSrc(imgData) {
		    if (!imgData) return '';
		    // Si c'est déjà une chaine de caractères (Base64), on la retourne telle quelle
		    if (typeof imgData === 'string') return imgData;
		    // Sinon, c'est un Blob/File, on crée une URL virtuelle rapide
		    return URL.createObjectURL(imgData);
		}
		
        let firebaseInstance = null, myUid = null;
        let collection = [], contentMap = {}, customSections = [], friends = [], currentFriendItems = [];
        let isEditMode = false, currentPhotos = [], currentSectionImage = null;
        let activeUpdates = [{ icon: "🚀", title: "Mise à jour", desc: "Nouvelle version disponible." }];
        let currentSlide = 0;
        let comparatorChart = null; // Important pour détruire le chart existant
		let currentViewingFriendId = null; // AJOUT POUR LA SUPPRESSION

		// --- UTILITAIRE : Récupérer le nom d'un ami via son ID ---
		function getFriendName(uid) {
		    if (uid === myUid) return "Moi"; // Cas particulier pour soi-même
		    const friend = friends.find(f => f.id === uid);
		    if (friend) return friend.name; // Retourne le nom enregistré (ex: "Pascal")
		    return `Inconnu (${uid.substring(0, 4)}..)`; // Fallback si pas dans la liste d'amis
		}

        // --- DONNÉES MAÎTRESSE (REFONDU POUR LISIBILITÉ) ---
        const masterData = { 
            hash_dry: { 
                name: "Dry Sift", color: "amber", hex: "#D97706", badge: "Tradition", icon: "🏜️", 
                desc: "Tamisage mécanique ancestral.", 
                process: [{t:"Séchage",d:"Plante affinée"},{t:"Tamisage",d:"Frottement"},{t:"Collection",d:"Poudre"},{t:"Presse",d:"Chaleur"}], 
                radar: [30,90,70,50,60], metrics: [20,50,40,30], metricsLabels: ['Rendement','Puissance','Prix','Tech'], matrix: {x:45,y:9} 
            }, 
            hash_water: { 
                name: "Ice-O-Lator", color: "blue", hex: "#2563EB", badge: "Pureté", icon: "❄️", 
                desc: "Extraction eau glacée + Fresh Frozen.", 
                process: [{t:"Congélation",d:"-40°C"},{t:"Lavage",d:"Eau+Glace"},{t:"Filtre",d:"Sacs"},{t:"Séchage",d:"Lyophilisation"}], 
                radar: [90,30,60,95,85], metrics: [10,75,90,80], metricsLabels: ['Rendement','Puissance','Prix','Tech'], matrix: {x:70,y:6} 
            }, 
            hash_rosin: { 
                name: "Rosin", color: "purple", hex: "#9333EA", badge: "Excellence", icon: "🔥", 
                desc: "Pression et chaleur uniquement.", 
                process: [{t:"Matériel",d:"Hash 6*"},{t:"Sac",d:"25u Nylon"},{t:"Presse",d:"Hydraulique"},{t:"Cure",d:"Cold Cure"}], 
                radar: [85,50,80,90,95], metrics: [15,85,100,60], metricsLabels: ['Rendement','Puissance','Prix','Tech'], matrix: {x:85,y:3} 
            }, 
            weed_indica: { 
                name: "Indica (Kush)", color: "indigo", hex: "#4F46E5", badge: "Relax", icon: "🏔️", 
                desc: "Montagnes, effet lourd.", 
                process: [{t:"Origine",d:"Hindu Kush"},{t:"Structure",d:"Buisson"},{t:"Flo",d:"8 sem"},{t:"Effet",d:"Physique"}], 
                radar: [20,80,90,60,40], metrics: [80,22,50,90], metricsLabels: ['Rendement','THC','Taille','Facilité'], matrix: {x:20,y:10} 
            }, 
            weed_sativa: { 
                name: "Sativa (Haze)", color: "yellow", hex: "#D97706", badge: "Energie", icon: "☀️", 
                desc: "Tropiques, effet high.", 
                process: [{t:"Origine",d:"Equateur"},{t:"Structure",d:"Géante"},{t:"Flo",d:"12+ sem"},{t:"Effet",d:"Cérébral"}], 
                radar: [60,40,20,70,40], metrics: [90,18,100,60], metricsLabels: ['Rendement','THC','Taille','Facilité'], matrix: {x:18,y:10} 
            }, 
            weed_exotic: { 
                name: "Exotics", color: "pink", hex: "#DB2777", badge: "Hybride", icon: "🧬", 
                desc: "Breeding US moderne.", 
                process: [{t:"Origine",d:"Indoor"},{t:"Structure",d:"Optimisée"},{t:"Flo",d:"9 sem"},{t:"Effet",d:"Mixte"}], 
                radar: [80,50,60,80,50], metrics: [75,28,60,70], metricsLabels: ['Rendement','THC','Taille','Facilité'], matrix: {x:28,y:10} 
            } 
        };

		// --- LISTE DES JEUX MULTIJOUEURS ---
		const gamesList = [
		    { id: 'minigolf', name: 'Mini-Golf', icon: '⛳', color: 'emerald' },
		    { id: 'bowling', name: 'Bowling', icon: '🎳', color: 'blue' },
		    { id: 'bounce', name: 'Bounce', icon: '🏀', color: 'orange' },
		    { id: 'archery', name: 'Tir à l\'arc', icon: '🏹', color: 'stone' },
		    { id: 'fight', name: 'Combat', icon: '🥊', color: 'red' },
		    { id: 'racing', name: 'Course', icon: '🏎️', color: 'zinc' },
		    { id: 'pool', name: 'Billard', icon: '🎱', color: 'indigo' },
		    { id: 'darts', name: 'Fléchettes', icon: '🎯', color: 'rose' },
		    { id: 'pingpong', name: 'Tennis de Table', icon: '🏓', color: 'cyan' },
		    { id: 'poker', name: 'Poker', icon: '🃏', color: 'slate' },
		    { id: 'chess', name: 'Échecs', icon: '♟️', color: 'neutral' },
		    { id: 'battleship', name: 'Bataille Navale', icon: '🚢', color: 'sky' },
		    { id: 'snake', name: 'Snake', icon: '🐍', color: 'lime' },
		    { id: 'quiz', name: 'Quiz Culture', icon: '❓', color: 'yellow' },
		    { id: 'dice', name: 'Dés / Yam', icon: '🎲', color: 'purple' }
		];

        const tutorialSlides = [
            { icon: "👋", title: "Bienvenue !", desc: "Découvrez Green Codex, votre encyclopédie cannabique interactive et personnelle." },
            { icon: "📖", title: "Encyclopédie", desc: "Explorez les fiches techniques : Indica, Sativa, Dry Sift, Rosin... Tout le savoir à portée de main." },
            { icon: "📊", title: "Radars", desc: "Visualisez instantanément le profil aromatique et les effets grâce aux graphiques radars dynamiques." },
            { icon: "⚖️", title: "Comparateur", desc: "Hésitation entre deux variétés ? Superposez leurs graphiques pour voir leurs différences." },
            { icon: "📂", title: "Collection", desc: "Créez votre 'Pokedex' personnel ! Ajoutez chaque variété que vous goûtez." },
            { icon: "📝", title: "Détails", desc: "Indiquer la farm, la strain, la quantité et le pays d'origine pour chaque entrée." },
            { icon: "📸", title: "Photos", desc: "Immortalisez vos plus belles fleurs. Ajoutez jusqu'à 3 photos par fiche." },
            { icon: "✏️", title: "Mode Édition", desc: "C'est VOTRE appli. Activez le mode édition (en haut) pour réécrire les textes et titres." },
            { icon: "🤝", title: "Mode collaboratif", desc: "Ce mode vous permet de voir le portfolio de vos amis ! Ajouter leur ID dans l'onglet 'Info' et partager vos découvertes." },
            { icon: "🔒", title: "Sécurité", desc: "Seulement les textes sont visible dans l'onglet collaboratif (stocké dans le cloud), personne n'a accès a vos photos (stocké uniquement sur VOTRE téléphone)." }, 
            { icon: "🔄", title: "Mises à jour", desc: "Connectée à GitHub, l'appli évolue automatiquement. Vos données restent sécurisées sur votre téléphone." },
            { icon: "🚀", title: "C'est parti !", desc: "Vous êtes prêt. Commencez à explorer et à construire votre collection dès maintenant." }
        ];

        // --- GESTION BASE DE DONNÉES (IndexedDB) ---
        const db = {
            instance: null,
            init: function() { 
                return new Promise((resolve, reject) => { 
                    const request = indexedDB.open(DB_NAME, DB_VERSION); 
                    request.onupgradeneeded = (e) => { 
                        const d = e.target.result; 
                        if(!d.objectStoreNames.contains('collection')) d.createObjectStore('collection', { keyPath: 'id', autoIncrement: true }); 
                        if(!d.objectStoreNames.contains('config')) d.createObjectStore('config', { keyPath: 'key' }); 
                        if(!d.objectStoreNames.contains('friends')) d.createObjectStore('friends', { keyPath: 'id' }); 
                    }; 
                    request.onsuccess = (e) => { 
                        this.instance = e.target.result; 
                        resolve(this.instance); 
                    }; 
                    request.onerror = (e) => reject("DB Error"); 
                }); 
            },
            getAll: function(storeName) { 
                return new Promise((resolve) => { 
                    const tx = this.instance.transaction(storeName, 'readonly'); 
                    const store = tx.objectStore(storeName); 
                    const req = store.getAll(); 
                    req.onsuccess = () => resolve(req.result); 
                    req.onerror = () => resolve([]); 
                }); 
            },
            save: function(storeName, item) { 
                return new Promise((resolve, reject) => { 
                    const tx = this.instance.transaction(storeName, 'readwrite'); 
                    const store = tx.objectStore(storeName); 
                    const req = store.put(item); 
                    req.onsuccess = () => resolve(req.result); 
                    req.onerror = () => reject(req.error); 
                }); 
            },
            delete: function(storeName, key) { 
                return new Promise((resolve) => { 
                    const tx = this.instance.transaction(storeName, 'readwrite'); 
                    const store = tx.objectStore(storeName); 
                    store.delete(key); 
                    tx.oncomplete = () => resolve(); 
                }); 
            }
        };

		// MODIFICATION : showView avec triggers Cali Team
		function showView(viewId) {
		    // Masquer toutes les vues
		    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
		    
		    // Afficher la vue demandée
		    const target = document.getElementById(`view-${viewId}`);
		    if (target) target.classList.remove('hidden');
		    
		    // Gestion des boutons de navigation (Header)
		    const navBack = document.getElementById('navBackBtn');
		    const editBtn = document.getElementById('editModeBtn');
		    
		    if (viewId === 'home') {
		        navBack.classList.add('hidden');
		        editBtn.classList.remove('hidden');
		    } else {
		        navBack.classList.remove('hidden');
		        editBtn.classList.add('hidden');
		    }
		    
		    // Bouton Info
		    const infoBtn = document.querySelector('button[onclick="showView(\'info\')"]');
		    if(infoBtn) infoBtn.style.display = (viewId === 'home' || viewId === 'info') ? 'flex' : 'none';
		    
		    window.scrollTo(0,0);
		    
		    // --- TRIGGERS DE CHARGEMENT ---
		    if(viewId === 'collection') renderCollectionList();
		    if(viewId === 'info') renderInfoView();
		    
		    // Triggers Cali Team
		    if(viewId === 'cali-friends') loadCaliMembers();
		    if(viewId === 'cali-spots') loadCaliLocations('spot');
		    if(viewId === 'cali-wishlist') loadCaliLocations('wish');
		    if(viewId === 'cali-games') {
		        renderGamesGrid();
		        loadActivePlayers();
		    }
		}

        // --- FONCTIONS MODE ÉDITION ---
        function toggleEditMode() {
            isEditMode = !isEditMode;
            document.body.classList.toggle('edit-mode-active', isEditMode);
            document.getElementById('edit-banner').classList.toggle('hidden', !isEditMode);
            document.getElementById('editModeBtn').classList.toggle('bg-amber-500', isEditMode);
            document.getElementById('add-section-area').classList.toggle('hidden', !isEditMode);
            
            document.querySelectorAll('[data-editable]').forEach(e => {
                if(isEditMode) {
                    e.classList.add('editable-highlight');
                    e.onclick = ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        editContent(ev.target.closest('[data-editable]'));
                    };
                } else {
                    e.classList.remove('editable-highlight');
                    e.onclick = null;
                }
            });
            renderCustomSections();
        }

        async function editContent(e) {
            if(!isEditMode || !e) return;
            const k = e.getAttribute('data-editable');
            const t = prompt("Modifier:", e.innerText);
            if(t !== null && t !== e.innerText) {
                e.innerText = t;
                contentMap[k] = t;
                await db.save('config', {key: 'contentMap', value: contentMap});
            }
        }

        function loadSavedContent() {
            document.querySelectorAll('[data-editable]').forEach(e => {
                const k = e.getAttribute('data-editable');
                if(contentMap[k]) e.innerText = contentMap[k];
            });
            renderCustomSections();
        }

        // --- FONCTIONS COLLECTION & DONNÉES ---
        // MODIFICATION : Calcul précis des données utilisateur uniquement (Texte + Photos)
		async function calculateStorageUsage() {
		    const elSmall = document.getElementById('storage-used');
		    const elBig = document.getElementById('info-storage-size');
		    
		    let totalBytes = 0;
		
		    try {
		        // 1. Poids de la configuration et des amis (Texte JSON)
		        const config = await db.getAll('config');
		        const friends = await db.getAll('friends');
		        totalBytes += new Blob([JSON.stringify(config)]).size;
		        totalBytes += new Blob([JSON.stringify(friends)]).size;
		
		        // 2. Poids de la collection (Items + Photos)
		        if (collection && collection.length > 0) {
		            collection.forEach(item => {
		                // Poids des données textuelles de l'item
		                // On exclut les photos du stringify pour ne pas compter en double ou compter la structure
		                const { photos, ...textData } = item;
		                totalBytes += new Blob([JSON.stringify(textData)]).size;
		
		                // Poids des photos
		                if (item.photos && Array.isArray(item.photos)) {
		                    item.photos.forEach(photo => {
		                        if (photo instanceof Blob) {
		                            // Si c'est un Blob (Nouvelle méthode optimisée)
		                            totalBytes += photo.size;
		                        } else if (typeof photo === 'string') {
		                            // Si c'est du Base64 (Anciennes images avant migration)
		                            totalBytes += photo.length; 
		                        }
		                    });
		                }
		            });
		        }
		
		        // Formatage de l'affichage
		        let sizeStr = "";
		        if (totalBytes < 1024) sizeStr = totalBytes + " B";
		        else if (totalBytes < 1024 * 1024) sizeStr = (totalBytes / 1024).toFixed(1) + " KB";
		        else sizeStr = (totalBytes / (1024 * 1024)).toFixed(2) + " MB";
		
		        if (elSmall) elSmall.innerText = `(${sizeStr})`;
		        if (elBig) elBig.innerText = sizeStr;
		
		    } catch (e) {
		        console.error("Erreur calcul stockage:", e);
		        if (elSmall) elSmall.innerText = "(?)";
		    }
		}

        function updateDashboardStats() {
            document.getElementById('stats-total').innerText = collection.length;
            document.getElementById('stats-weed').innerText = collection.filter(i => i.category === 'weed').length;
            document.getElementById('stats-hash').innerText = collection.filter(i => i.category === 'hash').length;
            document.getElementById('stats-mass').innerText = collection.reduce((a,c) => a + (parseFloat(c.quantity)||0), 0).toFixed(1) + 'g';
        }

        function renderCollectionList() {
            const c = document.getElementById('collection-list');
            c.innerHTML = '';
            document.getElementById('empty-state').classList.toggle('hidden', collection.length > 0);
            
            [...collection].reverse().forEach(i => {
				const imgSrc = (i.photos && i.photos.length) ? getImageSrc(i.photos[0]) : null;
                const p = imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-3xl opacity-30">${i.category === 'hash' ? '🍫' : '🥦'}</div>`;
                const h = `
				<div onclick="openCollectionDetail(${i.id})" class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 relative group hover:border-emerald-300 transition cursor-pointer">
					<div class="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">${p}</div>
					<div class="flex-1 min-w-0">
						<div class="flex justify-between items-start">
							<h3 class="font-bold text-slate-800 truncate pr-2">${escapeHTML(i.strain)}</h3>
							<span class="text-xl">${getFlag(i.country)}</span>
						</div>
						<p class="text-xs text-slate-500 font-bold uppercase mb-1">${escapeHTML(i.commercialName || 'Inconnu')}</p>
						${i.type ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 block w-fit mb-1">${escapeHTML(i.type)}</span>` : ''}
						<div class="flex items-center gap-2 mt-2">
							<span class="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded font-bold">${i.quantity}g</span>
						</div>
					</div>
				</div>`;
                c.insertAdjacentHTML('beforeend', h);
            });
        }

        // --- FONCTIONS GRAPHIQUES ---
        const initCharts = () => {
            // Chart Puissance
            const ctxPotency = document.getElementById('potencyChart');
            if (ctxPotency) {
                new Chart(ctxPotency, {
                    type: 'bar',
                    data: {
                        labels: ['Sativa','Indica','Exotic','Dry Sift','Ice-O-Lator','Rosin','BHO'],
                        datasets: [{
                            label: '% THC',
                            data: [15,20,28,40,65,75,90],
                            backgroundColor: ['#10B981','#10B981','#10B981','#D97706','#2563EB','#9333EA','#64748B'],
                            borderRadius: 4
                        }]
                    },
                    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: false } }
                });
            }

            // Radar Comparateur
            updateComparator();

            // Plotly Matrix
            Plotly.newPlot('globalMatrixPlot', [{
                x: Object.values(masterData).map(d => d.matrix.x),
                y: Object.values(masterData).map(d => d.matrix.y),
                text: Object.values(masterData).map(d => d.name),
                mode: 'markers+text',
                type: 'scatter',
                textposition: 'top center',
                marker: { size: 30, color: Object.values(masterData).map(d => d.hex) }
            }], {
                xaxis: { title: 'Pureté', range: [0, 100] },
                yaxis: { title: 'Solidité', range: [0, 12] },
                margin: { t: 20, l: 40 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)'
            }, { displayModeBar: false });
        };

        function updateComparator() {
            const selectA = document.getElementById('selectA');
            const selectB = document.getElementById('selectB');
            
            const dA = masterData[selectA.value || "weed_sativa"];
            const dB = masterData[selectB.value || "hash_rosin"];
            
            const ctx = document.getElementById('comparatorRadar');
            
            if (comparatorChart) {
                comparatorChart.destroy();
            }
            
            comparatorChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Fruité','Terreux','Physique','Odeur','Intensité'],
                    datasets: [
                        { label: dA.name, data: dA.radar, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.2)' },
                        { label: dB.name, data: dB.radar, borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.2)' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
                }
            });
        }

        // --- AFFICHAGE DÉTAILS ---
        function showDetail(k) {
            const d = masterData[k];
            showView('detail');
            
            document.getElementById('detail-header').className = `bg-white p-8 rounded-2xl shadow-lg border-t-8 border-${d.color}-500`;
            const badge = document.getElementById('detail-badge');
            badge.innerText = d.badge;
            badge.className = `px-3 py-1 rounded-full text-sm font-bold uppercase mb-2 inline-block bg-${d.color}-100 text-${d.color}-800`;
            
            const title = document.getElementById('detail-title');
            title.innerText = d.name;
            title.className = `text-4xl md:text-5xl font-black text-${d.color}-900`;
            
            document.getElementById('detail-icon').innerText = d.icon;
            document.getElementById('detail-desc').innerText = d.desc;
            document.getElementById('detail-desc').className = `text-lg text-slate-600 border-l-4 border-${d.color}-200 pl-4 text-justify`;
            
            document.getElementById('detail-flow').innerHTML = d.process.map(s => `
                <div class="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div class="text-xs text-${d.color}-400 font-mono uppercase">${s.t}</div>
                    <div class="font-bold">${s.d}</div>
                </div>`).join('');

            const c1 = document.getElementById('detailRadarChart');
            const c2 = document.getElementById('detailBarChart');
            
            // Stockage des instances de chart sur l'élément DOM (méthode simplifiée)
            if (c1.chartInstance) c1.chartInstance.destroy();
            if (c2.chartInstance) c2.chartInstance.destroy();

            c1.chartInstance = new Chart(c1, {
                type: 'radar',
                data: {
                    labels: ['Fruité','Terreux','Physique','Odeur','Intensité'],
                    datasets: [{ label: d.name, data: d.radar, backgroundColor: `${d.hex}33`, borderColor: d.hex, fill: true }]
                },
                options: { maintainAspectRatio: false, plugins: { legend: false } }
            });

            c2.chartInstance = new Chart(c2, {
                type: 'bar',
                data: {
                    labels: ['Rendement','Puissance','Prix','Tech'],
                    datasets: [{ data: d.metrics, backgroundColor: d.hex, borderRadius: 6 }]
                },
                options: { maintainAspectRatio: false, plugins: { legend: false }, scales: { y: { max: 100 } } }
            });
        }

        // --- GESTION FORMULAIRES ET MODALS ---
        function openCollectionForm(id = null) {
            const f = document.getElementById('collection-form');
            f.reset();
            document.getElementById('editId').value = id || "";
            currentPhotos = [];
            const d = new Date().toISOString().split('T')[0];
            document.getElementById('inp-date').value = d;
            
            if (id) {
                const i = collection.find(x => x.id == id);
                if (i) {
                    document.getElementById('inp-category').value = i.category;
                    document.getElementById('inp-quantity').value = i.quantity;
                    document.getElementById('inp-strain').value = i.strain;
                    document.getElementById('inp-commercialName').value = i.commercialName;
                    document.getElementById('inp-country').value = i.country;
                    document.getElementById('inp-price').value = i.price;
                    if (i.type) document.getElementById('inp-hashType').value = i.type;
                    document.getElementById('inp-observation').value = i.observation || "";
                    if (i.date) document.getElementById('inp-date').value = i.date.split('T')[0];
                    toggleFormFields(i.category);
                    if (i.photos) currentPhotos = [...i.photos];
                }
            } else {
                toggleFormFields('weed');
            }
            renderPhotoPreviews();
            document.getElementById('collection-modal').classList.remove('hidden');
        }

        async function handleCollectionSubmit(e) {
            e.preventDefault();
            const f = new FormData(e.target);
            const eid = document.getElementById('editId').value;
            const dr = f.get('date');
            const do_ = dr ? new Date(dr + 'T12:00:00') : new Date();
            
            const i = {
                category: f.get('category'),
                quantity: f.get('quantity'),
                strain: f.get('strain'),
                commercialName: f.get('commercialName'),
                farm: f.get('farm'),
                type: f.get('hashType'),
                country: f.get('country'),
                price: f.get('price'),
                observation: f.get('observation'),
                photos: currentPhotos,
                date: do_.toISOString()
            };
            
            if (eid) i.id = parseInt(eid);
            await saveCollectionItem(i);
            closeCollectionForm();
        }

        function closeCollectionForm() {
            document.getElementById('collection-modal').classList.add('hidden');
        }

        async function saveCollectionItem(item) {
		try {
				// 1. On marque l'item comme "sale" (non synchronisé) par défaut
				item._dirty = true;

				// 2. Sauvegarde Locale (Priorité absolue)
				// On sauvegarde AVEC le flag dirty
				const id = await db.save('collection', item);
				item.id = id; 
				
				// Mise à jour de l'interface (Optimistic UI)
				collection = await db.getAll('collection');
				updateDashboardStats();
				renderCollectionList();
				calculateStorageUsage();

				// 3. Tentative de Sync Cloud immédiate
				if(window.firebaseFuncs && firebaseInstance) {
					try {
						const { setDoc, doc } = window.firebaseFuncs;
						const { db: firestore, appId } = firebaseInstance;

						// Préparation pour le cloud (Nettoyage + Sécurité)
						const cleanItem = { 
							...item, 
							photos: [], // Pas de photos sur le cloud
							strain: escapeHTML(item.strain),
							observation: escapeHTML(item.observation || "")
						};
						// On ne veut pas envoyer la propriété '_dirty' sur le serveur
						delete cleanItem._dirty; 

						// Envoi...
						await setDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', id.toString()), cleanItem);

						// 4. SUCCÈS : On retire le flag dirty en local
						item._dirty = false;
						await db.save('collection', item); // Mise à jour silencieuse en DB locale
						console.log("☁️ Synchro Cloud réussie pour l'item " + id);

					} catch (cloudErr) {
						console.warn("⚠️ Mode Hors-ligne : L'item reste marqué '_dirty' pour plus tard.");
					}
				}
			} catch (e) { 
				console.error("Critical Save Error:", e); 
				alert("Erreur critique de sauvegarde locale !"); 
			}
		}
        
		async function syncDirtyItems() {
			// Vérifications de base
			if (!navigator.onLine || !window.firebaseFuncs || !firebaseInstance || !myUid) return;

			// On récupère tout ce qui est marqué 'dirty' dans la collection actuelle
			// (Note: 'collection' est déjà chargée en mémoire par initApp)
			const dirtyItems = collection.filter(i => i._dirty === true);

			if (dirtyItems.length === 0) return;

			console.log(`🔄 Tentative de synchronisation de ${dirtyItems.length} éléments en attente...`);
			
			const { setDoc, doc } = window.firebaseFuncs;
			const { db: firestore, appId } = firebaseInstance;
			let syncedCount = 0;

			for (const item of dirtyItems) {
				try {
					const cleanItem = { 
						...item, 
						photos: [],
						strain: escapeHTML(item.strain),
						observation: escapeHTML(item.observation || "")
					};
					delete cleanItem._dirty;

					await setDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', item.id.toString()), cleanItem);
					
					// Succès : on nettoie le flag
					item._dirty = false;
					await db.save('collection', item);
					syncedCount++;
				} catch (e) {
					console.error("Échec sync différée pour item " + item.id, e);
				}
			}
			
			if (syncedCount > 0) {
				console.log(`✅ ${syncedCount} éléments synchronisés avec succès.`);
				// On rafraichit la collection en mémoire pour être sûr
				collection = await db.getAll('collection');
			}
		}
		
        async function deleteCollectionItem(id) {
            if(confirm('Supprimer ?')) {
                await db.delete('collection', id);
                collection = await db.getAll('collection');
                updateDashboardStats();
                renderCollectionList();
                calculateStorageUsage(); // Mise à jour du stockage après suppression
                closeCollectionDetail();
                if(window.firebaseFuncs && firebaseInstance) {
                    try {
                        const { deleteDoc, doc } = window.firebaseFuncs;
                        const { db: firestore, appId } = firebaseInstance;
                        await deleteDoc(doc(firestore, 'artifacts', appId, 'users', myUid, 'portfolio', id.toString()));
                    } catch(e) {}
                }
            }
        }

        function openCollectionDetail(id) {
            const i = collection.find(x => x.id == id);
            if (!i) return;
            document.getElementById('cd-strain').innerText = i.strain;
            document.getElementById('cd-commercial').innerText = i.commercialName || 'Sans nom';
            document.getElementById('cd-flag').innerText = getFlag(i.country);
            document.getElementById('cd-quantity').innerText = i.quantity + 'g';
            document.getElementById('cd-price').innerText = i.price + '€';
            document.getElementById('cd-category').innerText = i.category === 'hash' ? 'Hash 🍫' : 'Weed 🥦';
            document.getElementById('cd-date').innerText = new Date(i.date).toLocaleDateString();
            document.getElementById('cd-farm').innerText = i.farm || 'Inconnu';
            
            // LOGIQUE AJOUTÉE : TYPE DE HASH (MODIFICATION 3)
            const hashBadge = document.getElementById('cd-hash-badge');
            if (i.category === 'hash' && i.type) {
                hashBadge.innerText = i.type;
                hashBadge.classList.remove('hidden');
            } else {
                hashBadge.classList.add('hidden');
            }

            if (i.observation) {
                document.getElementById('cd-observation').innerText = i.observation;
                document.getElementById('cd-observation-container').classList.remove('hidden');
            } else {
                document.getElementById('cd-observation-container').classList.add('hidden');
            }
            
            document.getElementById('cd-btn-edit').onclick = () => { closeCollectionDetail(); openCollectionForm(id); };
            document.getElementById('cd-btn-delete').onclick = () => { deleteCollectionItem(id); };
            
            const m = document.getElementById('cd-main-img');
            const t = document.getElementById('cd-thumbs');
            t.innerHTML = '';
            
			if (i.photos && i.photos.length > 0) {
			    m.src = getImageSrc(i.photos[0]); // <--- Utilisation de getImageSrc
			    m.classList.remove('opacity-30', 'p-10');
			    
			    if (i.photos.length > 1) {
			        i.photos.forEach(s => {
			            const el = document.createElement('img');
			            el.src = getImageSrc(s); // <--- Utilisation de getImageSrc
			            el.className = "w-12 h-12 rounded-lg border-2 border-white/50 cursor-pointer object-cover";
			            el.onclick = () => m.src = getImageSrc(s); // <--- Ici aussi
			            t.appendChild(el);
			        });
			    }
            } else {
                m.src = "";
            }
            document.getElementById('collection-detail-modal').classList.remove('hidden');
        }

        function closeCollectionDetail() {
            document.getElementById('collection-detail-modal').classList.add('hidden');
        }

		// Nouvelle version optimisée (Retourne un Blob)
		function compressImage(f, w = 1200, q = 0.8) {
		    return new Promise(r => {
		        const R = new FileReader();
		        R.onload = e => {
		            const i = new Image();
		            i.onload = () => {
		                const c = document.createElement('canvas');
		                let W = i.width, H = i.height;
		                if (W > w) { H *= w / W; W = w; }
		                c.width = W; c.height = H;
		                c.getContext('2d').drawImage(i, 0, 0, W, H);
		                
		                // Ici on change : on exporte en Blob au lieu de toDataURL
		                c.toBlob(blob => {
		                    r(blob);
		                }, 'image/jpeg', q);
		            };
		            i.src = e.target.result;
		        };
		        R.readAsDataURL(f);
		    });
		}

        async function handlePhotos(i) {
            if (i.files) {
                for (const f of i.files) {
                    try { currentPhotos.push(await compressImage(f, 1200, 0.8)); } catch {}
                }
                renderPhotoPreviews();
            }
        }

        function renderPhotoPreviews() {
			document.getElementById('photo-preview-list').innerHTML = currentPhotos.map((s, i) => `
			    <div class="w-20 h-20 rounded-xl relative overflow-hidden group flex-shrink-0">
			        <img src="${getImageSrc(s)}" class="w-full h-full object-cover">
			        <button type="button" onclick="currentPhotos.splice(${i},1);renderPhotoPreviews()" class="absolute top-0 right-0 bg-red-500 text-white text-xs p-1 opacity-0 group-hover:opacity-100">X</button>
			    </div>`).join('');
        }

        // --- GESTION SECTIONS PERSONNALISÉES ---
        function openSectionModal(id = null) {
            document.getElementById('section-form').reset();
            document.getElementById('sec-current-image').classList.add('hidden');
            currentSectionImage = null;
            if (id) {
                const s = customSections.find(x => x.id === id);
                document.getElementById('sec-id').value = s.id;
                document.getElementById('sec-title').value = s.title;
                document.getElementById('sec-text').value = s.text;
                if (s.image) {
                    currentSectionImage = s.image;
                    document.querySelector('#sec-current-image img').src = s.image;
                    document.getElementById('sec-current-image').classList.remove('hidden');
                }
            }
            document.getElementById('section-modal').classList.remove('hidden');
        }

        function closeSectionModal() {
            document.getElementById('section-modal').classList.add('hidden');
        }

        async function handleSectionSubmit(e) {
            e.preventDefault();
            const f = e.target;
            const id = f.secId.value ? parseInt(f.secId.value) : Date.now();
            const fi = document.getElementById('sec-photo-input').files[0];
            if (fi) currentSectionImage = await compressImage(fi, 800, 0.7);
            
            const s = { id, title: f.secTitle.value, text: f.secText.value, image: currentSectionImage };
            const i = customSections.findIndex(x => x.id === id);
            if (i > -1) customSections[i] = s;
            else customSections.push(s);
            
            await db.save('config', { key: 'customSections', value: customSections });
            renderCustomSections();
            closeSectionModal();
        }

        async function deleteCustomSection(id) {
            if (confirm('Supprimer ?')) {
                customSections = customSections.filter(x => x.id !== id);
                await db.save('config', { key: 'customSections', value: customSections });
                renderCustomSections();
            }
        }

        function renderCustomSections() {
            document.getElementById('custom-sections-container').innerHTML = customSections.map((s, i) => `
                <section class="bg-white rounded-2xl shadow-md p-8 border-l-8 border-emerald-600 relative group animate-fade-in text-justify">
                    ${isEditMode ? `<div class="absolute top-4 right-4 flex gap-2"><button onclick="openSectionModal(${s.id})" class="text-blue-500 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 text-xs">Modifier</button><button onclick="deleteCustomSection(${s.id})" class="text-red-500 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-xs">Supprimer</button></div>` : ''}
                    <h2 class="section-title">${i + 8}. ${escapeHTML(s.title)}</h2>
					<div class="text-lg leading-relaxed text-slate-600 whitespace-pre-wrap">${escapeHTML(s.text)}</div>
                </section>`).join('');
        }

        // --- GESTION AMIS (FRIENDS) ---
        async function promptAddFriend() {
            const fid = prompt("Entrez l'ID Unique de votre ami :");
            if (fid && fid.length > 5) {
                const name = prompt("Nom de l'ami :") || "Ami";
                const initial = name.charAt(0).toUpperCase();
                await db.save('friends', { id: fid, name: name, initial: initial });
                friends = await db.getAll('friends');
                renderFriendsList();
            }
        }

        function renderFriendsList() {
		    const container = document.getElementById('friends-list');
		    
		    // --- PROTECTION AJOUTÉE ICI ---
		    // Si la balise n'existe plus dans le HTML (ce qu'on vient de faire), on arrête la fonction.
		    if (!container) return; 
		    // -----------------------------
		
		    const addBtn = container.querySelector('.add-btn');
		    container.innerHTML = '';
		    friends.forEach(f => {
		        const el = document.createElement('div');
		        el.className = 'friend-avatar bg-blue-500 hover:bg-blue-600 border-2 border-white text-white shadow-sm';
		        el.innerText = f.initial; el.title = f.name; el.onclick = () => viewFriendPortfolio(f);
		        container.appendChild(el);
		    });
		    if(addBtn) container.appendChild(addBtn);
		}

        async function viewFriendPortfolio(friend) {
            if (!firebaseInstance || !window.firebaseFuncs) { alert("Connexion Cloud nécessaire."); return; }
			currentViewingFriendId = friend.id;
            showView('friend');
            document.getElementById('friend-view-name').innerText = friend.name;
            document.getElementById('friend-collection-list').innerHTML = '<div class="col-span-full text-center py-10"><div class="wn-loader"></div></div>';
            document.getElementById('friend-empty-state').classList.add('hidden');
            try {
                const { getDocs, collection: fsCol } = window.firebaseFuncs;
                const { db: firestore, appId } = firebaseInstance;
                const snapshot = await getDocs(fsCol(firestore, 'artifacts', appId, 'users', friend.id, 'portfolio'));
                const items = []; snapshot.forEach(d => items.push(d.data()));
                currentFriendItems = items; 
                renderFriendCollection(items);
            } catch (e) { alert("Impossible de charger."); showView('home'); }
        }

		// Fonction pour supprimer l'ami en cours de visionnage
		async function deleteCurrentFriend() {
		    if (!currentViewingFriendId) return;
		    
		    if (confirm("Voulez-vous vraiment retirer cet ami de votre liste locale ?")) {
		        try {
		            // Suppression dans la base locale IndexedDB
		            await db.delete('friends', currentViewingFriendId);
		            
		            // Mise à jour de la liste en mémoire
		            friends = await db.getAll('friends');
		            
		            // Rafraîchissement de l'affichage
		            renderFriendsList();
		            
		            // Retour à la collection
		            alert("Ami supprimé.");
		            showView('collection');
		            
		        } catch (e) {
		            console.error(e);
		            alert("Erreur lors de la suppression.");
		        }
		    }
		}

        function renderFriendCollection(items) {
            const c = document.getElementById('friend-collection-list'); c.innerHTML = '';
            if (items.length === 0) { document.getElementById('friend-empty-state').classList.remove('hidden'); return; }
            items.sort((a, b) => new Date(b.date) - new Date(a.date));
            items.forEach((i, index) => {
                const h = `
				<div onclick="openFriendDetail(${index})" class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 opacity-90 cursor-pointer hover:shadow-md transition">
				<div class="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-3xl opacity-50">${i.category === 'hash' ? '🍫' : '🥦'}</div>
				<div class="flex-1 min-w-0">
					<div class="flex justify-between items-start">
						<h3 class="font-bold text-slate-800 truncate pr-2">${escapeHTML(i.strain)}</h3>
						<span class="text-xl">${getFlag(i.country)}</span>
					</div>
					<p class="text-xs text-slate-500 font-bold uppercase mb-1">${escapeHTML(i.commercialName || 'Inconnu')}</p>
					${i.type ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200 block w-fit mb-1">${escapeHTML(i.type)}</span>` : ''}
					<div class="flex items-center gap-2 mt-2">
						<span class="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded font-bold">${escapeHTML(i.quantity)}g</span>
						<span class="text-[10px] text-slate-400 ml-auto">${new Date(i.date).toLocaleDateString()}</span>
					</div>
					${i.observation ? `<p class="mt-2 text-xs text-slate-600 italic border-t pt-1 truncate">"${escapeHTML(i.observation)}"</p>` : ''}
				</div>
				</div>`;
                c.insertAdjacentHTML('beforeend', h);
            });
        }

        function openFriendDetail(index) {
            const item = currentFriendItems[index];
            if(!item) return;

            document.getElementById('fd-strain').innerText = item.strain;
            document.getElementById('fd-commercial').innerText = item.commercialName || item.farm || 'Sans nom';
            
            if(item.category === 'hash' && item.type) {
                const badge = document.getElementById('fd-hash-badge');
                badge.innerText = item.type;
                badge.classList.remove('hidden');
            } else {
                document.getElementById('fd-hash-badge').classList.add('hidden');
            }

            document.getElementById('fd-flag').innerText = getFlag(item.country);
            document.getElementById('fd-quantity').innerText = item.quantity + 'g';
            document.getElementById('fd-price').innerText = item.price + '€';
            document.getElementById('fd-category').innerText = item.category === 'hash' ? 'Hash 🍫' : 'Weed 🥦';
            document.getElementById('fd-date').innerText = new Date(item.date).toLocaleDateString();
            
            if(item.observation){
                document.getElementById('fd-observation').innerText = item.observation;
                document.getElementById('fd-observation-container').classList.remove('hidden');
            } else {
                document.getElementById('fd-observation-container').classList.add('hidden');
            }
            
            document.getElementById('fd-farm').innerText = item.farm || 'Inconnu';
            document.getElementById('friend-detail-modal').classList.remove('hidden');
        }

        function closeFriendDetail() {
            document.getElementById('friend-detail-modal').classList.add('hidden');
        }
								
								// Fonction pour copier l'ID
									function copyToClipboard() {
									    if (!myUid) return alert("ID non chargé.");
									    
									    // Utilisation de l'API moderne du presse-papier
									    navigator.clipboard.writeText(myUid).then(() => {
									        // Feedback visuel sur le bouton
									        const btn = document.getElementById('btn-copy-id');
									        const originalText = btn.innerText;
									        
									        btn.innerText = "✅ Copié !";
									        btn.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
									        
									        // On remet l'état normal après 2 secondes
									        setTimeout(() => {
									            btn.innerText = originalText;
									            btn.classList.remove('bg-green-100', 'text-green-700', 'border-green-300');
									        }, 2000);
									    }).catch(err => {
									        console.error('Erreur copie:', err);
									        alert("Impossible de copier automatiquement.");
									    });
									}
									
									// Fonction pour partager l'ID (Menu natif du téléphone)
									async function shareId() {
									    if (!myUid) return alert("ID non chargé.");
									
									    const shareData = {
									        title: 'Mon ID Green Codex',
									        text: `Salut ! Ajoute-moi sur Green Codex pour voir ma collection. Mon ID est : ${myUid}`,
									    };
									
									    // Vérifie si le navigateur supporte le partage natif (Mobile)
									    if (navigator.share) {
									        try {
									            await navigator.share(shareData);
									        } catch (err) {
									            // L'utilisateur a annulé ou erreur, on ne fait rien
									        }
									    } else {
									        // Fallback pour PC : on copie juste le texte
									        copyToClipboard();
									        alert("Le menu de partage n'est pas dispo sur ce navigateur. L'ID a été copié !");
									    }
									}


        // --- AUTRES UTILITAIRES ---
        function getFlag(c) {
            if (!c) return '🏳️';
            const m = { 'france': '🇫🇷', 'espagne': '🇪🇸', 'spain': '🇪🇸', 'usa': '🇺🇸', 'cali': '🇺🇸', 'maroc': '🇲🇦', 'morocco': '🇲🇦', 'suisse': '🇨🇭', 'italie': '🇮🇹', 'canada': '🇨🇦', 'uk': '🇬🇧', 'angleterre': '🇬🇧', 'allemagne': '🇩🇪', 'thailande': '🇹🇭', 'pays-bas': '🇳🇱', 'hollande': '🇳🇱', 'netherlands': '🇳🇱', 'belgique': '🇧🇪' };
            for (let k in m) if (c.toLowerCase().includes(k)) return m[k];
            return '🏳️';
        }

        function toggleFormFields(c) {
            document.getElementById('hash-fields').classList.toggle('hidden', c !== 'hash');
        }

		// --- FONCTION ACCORDÉONS (Indispensable pour Info / À propos) ---
		function toggleSection(id) {
		    const e = document.getElementById(id);
		    if(e) {
		        // Bascule la classe 'expanded' qui doit gérer l'ouverture CSS
		        e.classList.toggle('expanded');
		
		    }
		}

        async function checkGitHubStatus() {
            if (GITHUB_USERNAME === 'antoto2021') console.log("GitHub Check");
            const c = await fetchLatestCommit();
            if (!c) return;
            const rh = c.sha, sh = localStorage.getItem(UPDATE_STORAGE_KEY);
            if (!sh) {
                localStorage.setItem(UPDATE_STORAGE_KEY, rh);
                localStorage.setItem(UPDATE_TIME_KEY, Date.now());
            } else if (sh !== rh) {
                triggerUpdateUI();
                const p = parseCommitMessage(c.commit.message);
                if (p.length > 0) activeUpdates = p;
            }
        }

        async function fetchLatestCommit() {
            try {
                const r = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/commits?per_page=1&t=${Date.now()}`);
                if (!r.ok) return null;
                const d = await r.json();
                return d[0];
            } catch { return null; }
        }

        function triggerUpdateUI() {
            document.getElementById('updateDot').style.display = 'block';
            document.getElementById('updateAlert').style.display = 'flex';
            const a = document.querySelector('.arrow-pointer');
            a.classList.remove('bouncing');
            void a.offsetWidth;
            a.classList.add('bouncing');
        }

        // Action du bouton flottant (Refresh) : Recharge vraiment la page
        function forceUpdate() {
            document.getElementById('refreshBtn').classList.add('rotating');
            setTimeout(() => {
                const u = window.location.href.split('?')[0];
                window.location.href = u + '?v=' + Date.now();
            }, 500);
        }

        // Action du bouton Info (Vérifier) : Vérifie GitHub sans recharger
        async function verifyUpdate(btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ Vérification...";
            btn.disabled = true;
            try {
                await renderInfoView(); // Met à jour les infos GitHub
                // Comparaison simple pour le retour visuel
                const local = localStorage.getItem(UPDATE_STORAGE_KEY);
                const remote = document.getElementById('info-remote-hash').innerText.replace('...', '');
                
                if (local && local.substring(0, 7) === remote) {
                    btn.innerHTML = "✅ À jour";
                } else {
                    btn.innerHTML = "🚀 M.à.j dispo !";
                    triggerUpdateUI(); // Affiche la bulle rouge si update dispo
                }
            } catch(e) {
                btn.innerHTML = "❌ Erreur";
            }
            // Remet le texte normal après 2 secondes
            setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
        }

        // --- FONCTIONS DE SAUVEGARDE ET RESTAURATION (MODIFICATION 2) ---
        async function exportBackup() {
            const data = {
                collection: await db.getAll('collection'),
                customSections: customSections,
                timestamp: Date.now()
            };
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GreenCodex_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        }

        async function importBackup(input) {
            const file = input.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if(data.collection && Array.isArray(data.collection)) {
                        if(confirm(`Restaurer ${data.collection.length} éléments ? Cela fusionnera avec votre collection actuelle.`)) {
                            // On fusionne la collection
                            for(const item of data.collection) {
                                // On garde l'ID s'il existe pour écraser l'ancien, sinon nouvel ID auto
                                await db.save('collection', item);
                            }
                            // On restaure les sections personnalisées
                            if(data.customSections && Array.isArray(data.customSections)) {
                                customSections = data.customSections;
                                await db.save('config', {key: 'customSections', value: customSections});
                            }
                            alert('Restauration terminée avec succès !');
                            location.reload();
                        }
                    } else {
                        alert('Format de fichier invalide.');
                    }
                } catch(err) {
                    alert('Erreur lors de la lecture du fichier de sauvegarde.');
                    console.error(err);
                }
            };
            reader.readAsText(file);
        }

        async function handlePostUpdate() {
            const c = await fetchLatestCommit();
            if (!c) return;
            const rh = c.sha, sh = localStorage.getItem(UPDATE_STORAGE_KEY);
            if (sh === rh) {
                const u = new URL(window.location.href);
                u.searchParams.delete('v');
                window.history.replaceState({}, document.title, u.toString());
                return;
            }
            const o = document.getElementById('wn-overlay');
            o.style.display = 'flex';
            setTimeout(() => o.classList.add('show-modal'), 10);
            localStorage.setItem(UPDATE_STORAGE_KEY, rh);
            localStorage.setItem(UPDATE_TIME_KEY, Date.now());
            const p = parseCommitMessage(c.commit.message);
            if (p.length > 0) activeUpdates = p;
            renderSlides();
            updateSlideUI();
            document.getElementById('wn-btn').style.display = 'flex';
        }

        function parseCommitMessage(m) {
            const l = m.split('\n'), u = [], r = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
            l.forEach(x => {
                const c = x.trim();
                if (c.match(/^[*+-]\s/)) {
                    let t = c.substring(2).trim(), p = t.split(':');
                    if (p.length >= 2) {
                        const tp = p[0].trim(), dp = p.slice(1).join(':').trim();
                        let i = "✨", tt = tp;
                        const ma = tp.match(r);
                        if (ma && tp.indexOf(ma[0]) === 0) { i = ma[0]; tt = tp.replace(ma[0], '').trim(); }
                        u.push({ icon: i, title: tt, desc: dp });
                    }
                }
            });
            return u;
        }

        function renderSlides() {
            const c = document.getElementById('wn-content'), d = document.getElementById('wn-dots');
            if (activeUpdates.length === 0) { c.innerHTML = `<div class="wn-slide" style="display:block">...</div>`; return; }
            c.innerHTML = activeUpdates.map((s, i) => `<div class="wn-slide" id="slide-${i}"><span class="wn-icon">${s.icon}</span><span class="wn-slide-title">${s.title}</span><p class="wn-desc">${s.desc}</p></div>`).join('');
            d.innerHTML = activeUpdates.map((_, i) => `<div class="wn-dot" id="dot-${i}"></div>`).join('');
        }

        function updateSlideUI() {
            document.querySelectorAll('.wn-slide').forEach((e, i) => { e.style.display = i === currentSlide ? 'block' : 'none'; });
            document.querySelectorAll('.wn-dot').forEach((e, i) => { if (i === currentSlide) e.classList.add('active'); else e.classList.remove('active'); });
            const b = document.getElementById('wn-btn');
            if (currentSlide === activeUpdates.length - 1) { b.innerHTML = "Compris ✅"; b.style.backgroundColor = "#166534"; } else { b.innerHTML = "Suivant ➜"; b.style.backgroundColor = "#15803d"; }
        }

        function nextSlide() {
            if (currentSlide < activeUpdates.length - 1) { currentSlide++; updateSlideUI(); } else { closePopup(); }
        }

        function closePopup() {
            const o = document.getElementById('wn-overlay');
            o.classList.remove('show-modal');
            setTimeout(() => {
                o.style.display = 'none';
                const u = new URL(window.location.href);
                if (u.searchParams.has('v')) { u.searchParams.delete('v'); window.history.replaceState({}, document.title, u.toString()); }
            }, 300);
        }

        function openTutorial() {
            activeUpdates = tutorialSlides;
            currentSlide = 0;
            const b = document.getElementById('wn-badge-text');
            b.innerText = "Tutoriel";
            b.style.backgroundColor = "#F59E0B";
            b.style.color = "#fff";
            document.getElementById('wn-main-title').innerText = "Guide";
            const o = document.getElementById('wn-overlay');
            o.style.display = 'flex';
            setTimeout(() => o.classList.add('show-modal'), 10);
            renderSlides();
            updateSlideUI();
            document.getElementById('wn-btn').style.display = 'flex';
        }

        async function renderInfoView() {
            const lh = localStorage.getItem(UPDATE_STORAGE_KEY) || 'Aucun';
            document.getElementById('info-local-hash').innerText = lh.substring(0, 7) + '...';
            
            // --- MODIFICATION ICI : Gestion intelligente du temps (min, h, j, mois) ---
            const lt = localStorage.getItem(UPDATE_TIME_KEY);
            if (lt) {
                const diffMs = Date.now() - parseInt(lt);
                const m = Math.floor(diffMs / 60000);
                
                let timeStr;
                if (m < 60) {
                    timeStr = `Il y a ${m} min`;
                } else if (m < 1440) { // Moins de 24h
                    timeStr = `Il y a ${Math.floor(m / 60)} h`;
                } else if (m < 43200) { // Moins de 30 jours (24*60*30)
                    timeStr = `Il y a ${Math.floor(m / 1440)} j`;
                } else {
                    timeStr = `Il y a ${Math.floor(m / 43200)} mois`;
                }
                
                document.getElementById('info-local-date').innerText = timeStr;
            } else {
                 document.getElementById('info-local-date').innerText = "Date inconnue";
            }
            // --- FIN MODIFICATION ---

            const sd = document.getElementById('connection-status'), re = document.getElementById('info-remote-hash');
            re.innerText = "...";
            sd.className = "w-2 h-2 rounded-full bg-gray-400";
            const rc = await fetchLatestCommit();
            if (rc) {
                re.innerText = rc.sha.substring(0, 7) + '...';
                sd.classList.remove('bg-gray-400');
                sd.classList.add('bg-green-500');
            } else {
                re.innerText = "Offline";
                sd.classList.remove('bg-gray-400');
                sd.classList.add('bg-red-500');
            }
            if (myUid) document.getElementById('my-uid-display').innerText = myUid;
        }

        // --- INITIALISATION PRINCIPALE ---
        async function initApp() {
            try {
                await db.init();
                // Migration Logic
                const legacyCol = localStorage.getItem('green_codex_collection_v4');
                if (legacyCol) { const p = JSON.parse(legacyCol); if (p.length > 0) { for (let i of p) { delete i.id; await db.save('collection', i); } } localStorage.removeItem('green_codex_collection_v4'); }
                const legacyCt = localStorage.getItem('green_codex_content_v4');
                if (legacyCt) { await db.save('config', { key: 'contentMap', value: JSON.parse(legacyCt) }); localStorage.removeItem('green_codex_content_v4'); }
                const legacySc = localStorage.getItem('green_codex_custom_sections_v4');
                if (legacySc) { await db.save('config', { key: 'customSections', value: JSON.parse(legacySc) }); localStorage.removeItem('green_codex_custom_sections_v4'); }

                collection = await db.getAll('collection');
                friends = await db.getAll('friends');
                renderFriendsList();
                const cc = (await db.getAll('config')).find(c => c.key === 'contentMap'); contentMap = cc ? cc.value : {};
                const cs = (await db.getAll('config')).find(c => c.key === 'customSections'); customSections = cs ? cs.value : [];
                loadSavedContent(); 
                updateDashboardStats(); 
                calculateStorageUsage(); // APPEL INITIAL DU CALCUL
                initCharts();

                if (window.initFirebase) {
                    firebaseInstance = await window.initFirebase();
                    if (firebaseInstance) {
                        myUid = firebaseInstance.user.uid;
                        await db.save('config', { key: 'user_uid', value: myUid });
						// Tenter de synchroniser les éléments en attente au démarrage
						setTimeout(() => syncDirtyItems(), 3000);
                    } else {
                        const su = (await db.getAll('config')).find(c => c.key === 'user_uid');
                        if (su) myUid = su.value;
                    }
                }
                setTimeout(() => checkGitHubStatus(), 5000);
            } catch (e) { console.error("Init Error:", e); }
        }

        window.addEventListener('load', () => { 
            const u = new URLSearchParams(window.location.search);
            const sA = document.getElementById('selectA'), sB = document.getElementById('selectB');
            Object.keys(masterData).forEach(k => { sA.add(new Option(masterData[k].name, k)); sB.add(new Option(masterData[k].name, k)); });
            sA.value = "weed_sativa"; sB.value = "hash_rosin";
            
            initApp().then(() => { if (u.has('v')) handlePostUpdate(); });
        });

		// === LOGIQUE CALI TEAM (GROUPE UNIQUE) === //

		const CALI_GROUP_ID = "cali_team_v1"; // ID Fixe dans Firebase
		
		// 1. Entrer dans le groupe (Vérifie et crée le groupe si inexistant)
		async function openCaliTeam() {
		    if (!firebaseInstance) { alert("Connexion requise"); return; }
		    
		    // On bascule la vue immédiatement pour la réactivité
		    showView('cali-hub');
		    
		    // Vérification silencieuse de l'existence du groupe
		    try {
		        const { doc, getDoc, setDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        const groupRef = doc(db, 'groups', CALI_GROUP_ID);
		        const groupSnap = await getDoc(groupRef);
		
		        if (!groupSnap.exists()) {
		            // Création automatique si premier lancement
		            await setDoc(groupRef, {
		                name: "Cali Team",
		                members: [myUid], // Je m'ajoute comme premier membre
		                createdAt: new Date().toISOString()
		            });
		        }
		    } catch(e) { console.error("Err Cali Init", e); }
		}
		
		// 2. Gestion des MEMBRES (Amis & Portfolio)
		async function loadCaliMembers() {
		    const container = document.getElementById('cali-members-list');
		    container.innerHTML = '<div class="wn-loader"></div>';
		    
		    try {
		        const { doc, getDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        const snap = await getDoc(doc(db, 'groups', CALI_GROUP_ID));
		        
		        if (snap.exists()) {
		            const members = snap.data().members || [];
		            container.innerHTML = '';
		            
		            if(members.length === 0) {
		                container.innerHTML = '<div class="text-center text-slate-400 italic">Aucun membre.</div>';
		                return;
		            }
		
		            members.forEach(uid => {
		                const displayName = getFriendName(uid);
		                const isMe = uid === myUid;
		                const initial = displayName.charAt(0).toUpperCase();
		                
		                // Clic sur la carte = Voir Portfolio
		                // Clic sur la poubelle = Supprimer
		                const html = `
		                <div onclick="viewPortfolioByUid('${uid}', '${escapeHTML(displayName)}')" class="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm flex items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition group relative">
		                    <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-xl shadow-inner">
		                        ${initial}
		                    </div>
		                    <div class="flex-1 min-w-0">
		                        <h4 class="font-bold text-slate-800 truncate">${escapeHTML(displayName)}</h4>
		                        <p class="text-[10px] text-slate-400 font-mono truncate">ID: ${uid.substring(0,6)}...</p>
		                    </div>
		                    ${!isMe ? `<button onclick="removeMemberFromCali('${uid}', event)" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500 transition z-10" title="Retirer du groupe">✕</button>` : '<span class="text-xs font-bold text-indigo-200">Moi</span>'}
		                    
		                    <div class="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-xs font-bold text-indigo-500 mr-2">
		                        Voir 👁️
		                    </div>
		                </div>`;
		                container.insertAdjacentHTML('beforeend', html);
		            });
		        }
		    } catch(e) { 
		        console.error(e);
		        container.innerHTML = '<div class="text-red-400 text-center">Erreur chargement.</div>'; 
		    }
		}
		
		// Fonction intermédiaire pour ouvrir le portfolio depuis l'ID
		function viewPortfolioByUid(uid, name) {
		    // On construit l'objet "friend" attendu par la fonction existante
		    const friendObj = { id: uid, name: name };
		    viewFriendPortfolio(friendObj);
		}
		
		// Nouvelle fonction pour retirer un membre du groupe (Sans arrayRemove)
		async function removeMemberFromCali(uidTarget, event) {
		    event.stopPropagation(); // Empêche l'ouverture du portfolio au clic
		    
		    if(!confirm("Retirer cet utilisateur du groupe Cali Team ?\n(Il ne pourra plus voir les spots ni les signaux)")) return;
		
		    try {
		        const { doc, getDoc, updateDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        const groupRef = doc(db, 'groups', CALI_GROUP_ID);
		        
		        // 1. On lit la liste actuelle
		        const snap = await getDoc(groupRef);
		        if(snap.exists()) {
		            const currentMembers = snap.data().members || [];
		            
		            // 2. On filtre pour enlever l'ID ciblé
		            const newMembers = currentMembers.filter(id => id !== uidTarget);
		            
		            // 3. On sauvegarde la nouvelle liste
		            await updateDoc(groupRef, { members: newMembers });
		            
		            loadCaliMembers(); // Rafraîchir l'affichage
		        }
		    } catch(e) {
		        alert("Erreur suppression : " + e.message);
		    }
		}

		// Fonction pour ajouter un membre au groupe (Cali Team)
		async function addMemberToCali() {
		    // 1. Vérification de sécurité
		    if (!firebaseInstance) {
		        alert("Erreur : Vous n'êtes pas connecté à la base de données. Vérifiez votre connexion internet.");
		        return;
		    }
		
		    // 2. Demande de l'ID
		    const newUid = prompt("Entrez l'ID Unique de l'ami à ajouter :");
		    
		    // Si l'utilisateur annule ou laisse vide, on arrête
		    if (!newUid || newUid.trim() === "") return;
		
		    try {
		        const { doc, updateDoc, arrayUnion } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        
		        // 3. Envoi à Firebase
		        // On utilise arrayUnion pour ajouter sans effacer les autres
		        await updateDoc(doc(db, 'groups', CALI_GROUP_ID), {
		            members: arrayUnion(newUid.trim())
		        });
		        
		        // 4. Confirmation et rechargement de la liste
		        alert("Membre ajouté avec succès !");
		        loadCaliMembers();
		        
		    } catch(e) {
		        console.error("Erreur Ajout Membre:", e);
		        alert("Erreur lors de l'ajout : " + e.message);
		    }
		}
	// 3. Gestion des SPOTS & WISHLIST
			let currentCaliType = 'spot'; // 'spot' ou 'wish'
			let allCaliSpotsCache = []; // Cache pour le filtrage local
			
		function openSpotForm(type) {
		    currentCaliType = type;
		    const modal = document.getElementById('cali-spot-modal');
		    
		    const config = {
		        spot: { title: "Nouveau Spot 📍", emoji: "📍" },
		        wish: { title: "Nouvelle Envie 🧞", emoji: "🧞" }
		    };
		    
		    document.getElementById('csm-title').innerText = config[type].title;
		    document.getElementById('csm-type').value = type;
		    document.getElementById('csm-emoji').value = config[type].emoji;
		    
		    // --- CORRECTION (BUG FIX) ---
		    // Réinitialisation de l'ID pour être sûr de créer un nouvel item
		    document.getElementById('spot-id-input').value = ""; 
		    
		    // Reset form fields
		    document.getElementById('csm-name').value = "";
		    document.getElementById('csm-link').value = "";
		    document.getElementById('csm-lat').value = "";
		    document.getElementById('csm-lon').value = "";
		    document.getElementById('csm-city').value = "";
		    document.getElementById('csm-desc').value = "";
		    // Idéalement, remettre la catégorie à défaut aussi
		    if(document.getElementById('csm-cat')) document.getElementById('csm-cat').selectedIndex = 0;
		    
		    modal.classList.remove('hidden');
		}
			
		function parseMapsLink(url) {
			    const regex = /(-?\d+\.\d+)[,\/!](-?\d+\.\d+)/;
			    const match = url.match(regex);
			    if (match && match.length >= 3) {
			        document.getElementById('csm-lat').value = match[1];
			        document.getElementById('csm-lon').value = match[2];
			    }
			}
			
			async function handleCaliSpotSubmit(e) {
		    e.preventDefault();
		    const type = document.getElementById('csm-type').value;
		    const id = document.getElementById('spot-id-input').value; // Récupère l'ID si mode édition
		    
		    const data = {
		        type: type,
		        emoji: document.getElementById('csm-emoji').value,
		        name: document.getElementById('csm-name').value,
		        mapsLink: document.getElementById('csm-link').value,
		        lat: document.getElementById('csm-lat').value,
		        lon: document.getElementById('csm-lon').value,
		        city: document.getElementById('csm-city').value || "Zone inconnue",
		        category: document.getElementById('csm-cat').value,
		        desc: document.getElementById('csm-desc').value,
		        // On ne change pas addedBy ni createdAt en modification
		    };
		    
		    if (!id) {
		        data.addedBy = myUid;
		        data.createdAt = Date.now();
		    }
		    
		    try {
		        const { collection, addDoc, doc, updateDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        
		        if (id) {
		            // MISE À JOUR
		            await updateDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id), data);
		        } else {
		            // CRÉATION
		            await addDoc(collection(db, 'groups', CALI_GROUP_ID, 'locations'), data);
		        }
		        
		        document.getElementById('cali-spot-modal').classList.add('hidden');
		        loadCaliLocations(type); 
		    } catch(e) { alert("Erreur sauvegarde: " + e.message); }
		}


async function loadCaliLocations(targetType) {
    const listId = targetType === 'spot' ? 'cali-spots-list' : 'cali-wishlist-list';
    const container = document.getElementById(listId);
    if(!container) return;
    
    container.innerHTML = '<div class="wn-loader"></div>';
    
    try {
        const { collection, getDocs, query, where } = window.firebaseFuncs;
        const { db } = firebaseInstance;
        
        // Requête Firebase
        const q = query(collection(db, 'groups', CALI_GROUP_ID, 'locations'), where("type", "==", targetType));
        const snap = await getDocs(q);
        
        container.innerHTML = '';
        if (snap.empty) { container.innerHTML = '<div class="text-center text-slate-400 italic">Rien ici pour le moment.</div>'; return; }
        
        const items = [];
        snap.forEach(d => items.push({id: d.id, ...d.data()}));
        
        // --- CORRECTION DU TRI (BUG FIX) ---
        if (targetType === 'spot') {
            // On ne trie par ville que si la ville existe
            items.sort((a,b) => (a.city || "").localeCompare(b.city || ""));
            
            allCaliSpotsCache = items; 
            renderDynamicFilters(items); 
            
            // Si menu signal, on charge aussi la liste
            const signalList = document.getElementById('cali-signal-spots-list');
            if(signalList) signalList.innerHTML = ''; // On vide d'abord
            // On génère le HTML pour le signal (réutilisation de renderLocationList possible ou duplication simplifiée)
            // Pour faire simple ici, on laisse le comportement d'origine qui semblait cloner le HTML:
             renderLocationList(items, container, 'spot');
             if(signalList) signalList.innerHTML = container.innerHTML;

        } else {
            // Pour la Wishlist, on trie par date de création (le plus récent en haut)
            items.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
            renderLocationList(items, container, 'wish');
        }

    } catch(e) { console.error("Erreur chargement:", e); container.innerHTML = "Erreur..."; }
}

// Génération des boutons de filtre (Seulement si des items existent)
function renderDynamicFilters(items) {
    const filterContainer = document.querySelector('#view-cali-spots .no-scrollbar');
    if (!filterContainer) return;

    // Récupérer les catégories uniques
    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
    
    let html = `<button onclick="filterSpots('all')" class="px-4 py-1 bg-slate-800 text-white rounded-full text-xs font-bold whitespace-nowrap transition transform active:scale-95 shadow-sm">Tout</button>`;
    
    const catColors = { 'Chill': 'emerald', 'Vue': 'blue', 'Eau': 'cyan', 'Abri': 'slate', 'Autre': 'gray' };
    
    categories.forEach(cat => {
        const color = catColors[cat] || 'gray';
								
      // Note: On passe la catégorie entre quotes simples pour éviter les bugs d'espaces
        html += `<button onclick="filterSpots('${cat}')" class="px-4 py-1 bg-${color}-100 text-${color}-800 rounded-full text-xs font-bold whitespace-nowrap transition transform active:scale-95 border border-${color}-200 ml-2">${cat}</button>`;
    });
    
    filterContainer.innerHTML = html;
}

function filterSpots(category) {
    const container = document.getElementById('cali-spots-list');
    let filteredItems = allCaliSpotsCache;
    
    if (category !== 'all') {
        filteredItems = allCaliSpotsCache.filter(i => i.category === category);
    }
				
    // On réutilise la fonction d'affichage standard
    renderLocationList(filteredItems, container, 'spot');
}

// Fonction d'affichage Polyvalente (Spots ou Wishlist)
function renderLocationList(items, container, type) {
    container.innerHTML = '';
    
    items.forEach(item => {
        if (type === 'spot') {
            // --- VISUEL SPOT (Classique) ---
            const html = `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 hover:border-blue-300 transition relative group">
                <div class="flex items-start gap-3">
                    <div class="text-3xl bg-slate-50 w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0">${item.emoji}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-slate-800 leading-tight">${escapeHTML(item.name)}</h3>
                            <span class="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 h-fit whitespace-nowrap">${escapeHTML(item.city)}</span>
                        </div>
                        <p class="text-xs text-slate-500 italic mt-1 line-clamp-2">${escapeHTML(item.desc)}</p>
                    </div>
                </div>
                
                <div class="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                    <div class="flex gap-2">
                        ${item.lat ? `<a href="${item.mapsLink || '#'}" target="_blank" class="text-xs font-bold text-white bg-blue-500 px-3 py-1.5 rounded-lg shadow-sm">🗺️ Y aller</a>` : ''}
                        <button onclick="activateCaliSignal('${item.id}', '${escapeHTML(item.name)}')" class="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">📡 Signal</button>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="editCaliItem('${item.id}', 'spot')" class="text-slate-400 hover:text-blue-500 text-lg">✎</button>
                        <button onclick="deleteCaliItem('${item.id}', 'spot')" class="text-slate-400 hover:text-red-500 text-lg">🗑️</button>
                    </div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        
        } else if (type === 'wish') {
            // --- VISUEL WISHLIST (Bulles Simples) ---
            const isDone = item.done === true;
            const opacity = isDone ? 'opacity-50 grayscale' : '';
            const checkColor = isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-transparent';
            
            const html = `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 flex items-start gap-4 transition ${opacity}">
                <button onclick="toggleWishStatus('${item.id}', ${!isDone})" class="mt-1 w-6 h-6 rounded-full border-2 ${checkColor} flex items-center justify-center transition-all flex-shrink-0 shadow-sm">✓</button>
                
                <div class="flex-1">
                    <p class="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">${escapeHTML(item.text)}</p>
                    <p class="text-[10px] text-slate-400 mt-2 text-right">Ajouté par un ami</p>
                </div>

                <div class="flex flex-col gap-2 border-l border-slate-100 pl-3 ml-2">
                    <button onclick="editCaliItem('${item.id}', 'wish')" class="text-slate-400 hover:text-purple-500">✎</button>
                    <button onclick="deleteCaliItem('${item.id}', 'wish')" class="text-slate-400 hover:text-red-500">🗑️</button>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        }
    });
}


		
		// --- LOGIQUE JEUX (GAMING HUB) ---
		// 1. Afficher la grille des jeux
		function renderGamesGrid() {
		    const container = document.getElementById('cali-games-list');
		    if (!container) return;
		    container.innerHTML = '';
		
		    gamesList.forEach(game => {
		        const html = `
		        <div onclick="window.location.href='jeux/${game.id}/index.html'" class="...">
		            <div class="text-3xl mb-1">${game.icon}</div>
		            <div class="text-[10px] font-bold text-slate-600 uppercase text-center leading-tight">${game.name}</div>
		        </div>`;
		        container.insertAdjacentHTML('beforeend', html);
		    });
		}
		
		// 2. Se déclarer "Prêt à jouer"
		async function setGameStatus(gameId, gameName) {
		    if (!firebaseInstance) return;
		    // Feedback visuel immédiat (Optionnel)
		    document.getElementById('my-game-status').innerText = gameName + " (En attente...)";
		    
		    try {
		        const { doc, setDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        
		        // On écrase le statut précédent
		        await setDoc(doc(db, 'groups', CALI_GROUP_ID, 'game_signals', myUid), {
		            gameId: gameId,
		            gameName: gameName,
		            userId: myUid,
		            timestamp: Date.now()
		        });
		        
		        loadActivePlayers(); // Rafraichir la liste
		    } catch (e) { console.error("Err Game Status", e); }
		}

		// 3. Voir qui joue à quoi
		async function loadActivePlayers() {
		    const container = document.getElementById('cali-active-players');
		    const myStatusTxt = document.getElementById('my-game-status');
		    
		    if (!container) return;
		    
		    try {
		        const { collection, getDocs } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        
		        const snap = await getDocs(collection(db, 'groups', CALI_GROUP_ID, 'game_signals'));
		        container.innerHTML = '';
		        let amIPlaying = false;
		        
		        if (snap.empty) {
		            container.innerHTML = '<div class="col-span-full text-center text-slate-400 italic text-sm py-4">La salle d\'arcade est vide.</div>';
		        }
		
		        snap.forEach(d => {
		            const data = d.data();
		            // On filtre les statuts vieux de plus de 2 heures
		            const diffMins = (Date.now() - data.timestamp) / 60000;
		            
		            if (diffMins < 120) { 
		                const friendName = getFriendName(d.id);
		                const isMe = d.id === myUid;
		                
		                if (isMe) {
		                    amIPlaying = true;
		                    myStatusTxt.innerText = `Prêt pour : ${data.gameName}`;
		                    myStatusTxt.className = "text-lg font-black text-indigo-600";
		                }
		
		                // On cherche l'icône du jeu
		                const gameObj = gamesList.find(g => g.id === data.gameId) || { icon: '🎮', color: 'gray' };
		
		                const html = `
		                <div class="bg-white border-l-4 border-${gameObj.color}-500 p-3 rounded-lg shadow-sm flex items-center justify-between">
		                    <div class="flex items-center gap-3">
		                        <div class="text-2xl">${gameObj.icon}</div>
		                        <div>
		                            <div class="font-bold text-slate-800 text-sm">${escapeHTML(friendName)}</div>
		                            <div class="text-xs text-slate-500">veut jouer à <strong>${escapeHTML(data.gameName)}</strong></div>
		                        </div>
		                    </div>
		                    <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">${Math.floor(diffMins)} min</span>
		                </div>`;
		                container.insertAdjacentHTML('beforeend', html);
		            }
		        });
		
		        if (!amIPlaying) {
		            myStatusTxt.innerText = "Inactif";
		            myStatusTxt.className = "text-lg font-black text-slate-300";
		        }
		
		    } catch (e) { console.error(e); }
		}
		
		// 4. Quitter la salle de jeu
		async function quitGameLobby() {
		    try {
		        const { doc, deleteDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        await deleteDoc(doc(db, 'groups', CALI_GROUP_ID, 'game_signals', myUid));
		        loadActivePlayers();
		    } catch(e) {}
		}
				
		// --- LOGIQUE ACTIONS & WISHLIST ---
		
		// 1. Ouvrir le modal Wishlist (Création ou Édition)
		function openWishModal(id = null, text = "") {
		    const modal = document.getElementById('wish-modal');
		    const input = document.getElementById('wish-text');
		    const idInput = document.getElementById('wish-id-input');
		    
		    input.value = text; // Vide si création, rempli si édition
		    idInput.value = id || ""; 
		    
		    modal.classList.remove('hidden');
		    input.focus();
		}
		
		// 2. Soumission du formulaire Wishlist
		async function handleWishSubmit(e) {
		    e.preventDefault();
		    const text = document.getElementById('wish-text').value;
		    const id = document.getElementById('wish-id-input').value;
		    
		    if (!text || !firebaseInstance) return;
		
		    try {
		        const { collection, addDoc, doc, updateDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		
		        if (id) {
		            // Mode Édition
		            await updateDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id), { text: text });
		        } else {
		            // Mode Création
		            await addDoc(collection(db, 'groups', CALI_GROUP_ID, 'locations'), {
		                type: 'wish',
		                text: text,
		                done: false,
		                addedBy: myUid,
		                createdAt: Date.now()
		            });
		        }
		        
		        document.getElementById('wish-modal').classList.add('hidden');
		        loadCaliLocations('wish');
		    } catch(err) { alert("Erreur: " + err.message); }
		}
		
		// 3. Toggle Status (Vœu réalisé ou non)
		async function toggleWishStatus(id, newStatus) {
		    try {
		        const { doc, updateDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        await updateDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id), { done: newStatus });
		        // Rechargement silencieux pour mettre à jour l'UI
		        loadCaliLocations('wish');
		    } catch(e) { console.error(e); }
		}
		
		// 4. Suppression Universelle (Spot ou Wish)
		async function deleteCaliItem(id, type) {
		    if(!confirm("Supprimer définitivement cet élément pour tout le groupe ?")) return;
		    
		    try {
		        const { doc, deleteDoc } = window.firebaseFuncs;
		        const { db } = firebaseInstance;
		        await deleteDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id));
		        loadCaliLocations(type); // Rafraichir la liste concernée
		    } catch(e) { alert("Erreur suppression: " + e.message); }
		}
		
		// 5. Édition Universelle (Redirige vers le bon modal)
		function editCaliItem(id, type) {
		    // On doit retrouver l'objet dans le cache pour pré-remplir
		    // Note: Pour la wishlist, on n'a pas mis en cache global, on va chercher dans le DOM ou faire une astuce.
		    // Astuce simple : On relance une petite recherche locale ou on passe les params.
		    // Pour faire propre, on va chercher dans la liste affichée (via une requête rapide ou cache).
		    
		    // Pour simplifier l'exemple, supposons qu'on récupère les données via Firebase getDoc si besoin, 
		    // ou mieux, on utilise le cache si disponible.
		    
		    if (!firebaseInstance) return;
		    const { doc, getDoc } = window.firebaseFuncs;
		    const { db } = firebaseInstance;
		    
		    getDoc(doc(db, 'groups', CALI_GROUP_ID, 'locations', id)).then(snap => {
		        if(snap.exists()) {
		            const data = snap.data();
		            if (type === 'wish') {
		                openWishModal(id, data.text);
		            } else if (type === 'spot') {
		                // Remplir le gros modal Spot
		                openSpotForm('spot'); // Ouvre vide
		                // Remplir les champs
		                document.getElementById('spot-id-input').value = id; // Important pour l'update
		                document.getElementById('csm-name').value = data.name;
		                document.getElementById('csm-emoji').value = data.emoji;
		                document.getElementById('csm-link').value = data.mapsLink;
		                document.getElementById('csm-city').value = data.city;
		                document.getElementById('csm-cat').value = data.category;
		                document.getElementById('csm-desc').value = data.desc;
		                document.getElementById('csm-lat').value = data.lat;
		                document.getElementById('csm-lon').value = data.lon;
		                document.getElementById('csm-title').innerText = "Modifier le Spot ✏️";
		            }
		        }
		    });
		}

		
		// --- PWA: ENREGISTREMENT SERVICE WORKER ---
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('./sw.js')
					.then(reg => console.log('Service Worker enregistré ✅'))
					.catch(err => console.log('Erreur SW ❌', err));
			});
		}
		
		// Déclenche la synchro quand le navigateur détecte le retour d'internet
		window.addEventListener('online', () => {
			console.log("🌐 Connexion rétablie. Lancement de la synchronisation...");
			syncDirtyItems();
		});
