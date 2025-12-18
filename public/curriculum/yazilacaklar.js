
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('content-container');
    const titleEl = document.getElementById('topic-title');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (!container || !titleEl || !loadingIndicator) return;

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (!topicId) {
        renderError("Konu ID'si bulunamadı.");
        loadingIndicator.style.display = 'none';
        return;
    }
    
    titleEl.textContent = decodeURIComponent(topicName || 'Yazılacaklar');

    async function fetchAndRender() {
        try {
            const response = await fetch(`yazilacaklar/${topicId}.json`);
             if (!response.ok) throw new Error('Yazılacaklar verisi bulunamadı.');
            const data = await response.json();
            
            let htmlContent = '';

            if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
                 htmlContent += `
                    <div class="mb-12">
                        <h2 class="text-3xl font-bold text-cyan-400 mb-6 border-b-2 border-cyan-500/30 pb-2">Kavramlar ve Tanımları</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${data.conceptDefinitions.map(item => `
                                <div class="bg-slate-800/50 p-6 rounded-2xl border border-white/10 shadow-lg">
                                    <h3 class="font-bold text-lg text-white mb-2">${item.concept}</h3>
                                    <p class="text-slate-400 text-sm">${item.definition}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (data.notes && data.notes.length > 0) {
                htmlContent += `
                    <div>
                        <h2 class="text-3xl font-bold text-amber-400 mb-6 border-b-2 border-amber-500/30 pb-2">Önemli Notlar</h2>
                        <div class="space-y-4">
                            ${data.notes.map((note, index) => `
                                <div class="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-white/10">
                                    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm">${index + 1}</div>
                                    <p class="text-slate-300 pt-1.5">${note}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (!htmlContent) {
                renderError("Bu konu için gösterilecek 'Yazılacaklar' içeriği bulunmuyor.");
            } else {
                container.innerHTML = htmlContent;
            }

        } catch (error) {
            console.error(error);
            renderError(error.message);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    
     function renderError(message) {
        container.innerHTML = `
            <div class="bg-red-900/50 border border-red-500 text-red-200 p-8 rounded-2xl text-center">
                <h2 class="text-2xl font-bold mb-2">İçerik Yüklenemedi</h2>
                <p>${message}</p>
            </div>
        `;
    }

    fetchAndRender();
});
