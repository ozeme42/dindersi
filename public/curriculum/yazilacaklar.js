// yazilacaklar.js - YEREL VERİ TABANI VERSİYONU

document.addEventListener('DOMContentLoaded', () => {
    // 1. URL'den parametreleri al
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    // 2. HTML elemanlarını seç
    const pageTitle = document.getElementById('page-title');
    const mainContainer = document.getElementById('main-container');
    const loading = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');

    // Başlığı ayarla
    if (pageTitle && topicName) {
        pageTitle.textContent = decodeURIComponent(topicName);
    }

    // Yükleme ekranını gizle/göster fonksiyonları
    const hideLoading = () => { if (loading) loading.style.display = 'none'; };
    const showError = (msg) => {
        hideLoading();
        if (errorContainer) {
            errorContainer.textContent = msg;
            errorContainer.classList.remove('hidden');
        }
    };

    // 3. Veri Kontrolü
    if (!topicId) {
        showError("Konu ID'si bulunamadı.");
        return;
    }

    if (typeof window.TUM_VERILER === 'undefined') {
        showError("Veri dosyası (database.js) yüklenemedi. Lütfen dosyaları kontrol edin.");
        return;
    }

    // 4. Veriyi İşle ve Göster
    renderContent(topicId);

    function renderContent(id) {
        try {
            // A) Veri tabanında bu konuya ait içerikleri topla
            // Veri yapısı bazen dağınık olabilir, bu yüzden hem genel listelere hem de ders içine bakacağız.
            
            let foundDefinitions = []; // Kavramlar
            let foundNotes = [];       // Notlar

            // YÖNTEM 1: Eğer data.json içinde 'contents' veya 'definitions' diye ayrı bir liste varsa oradan çek
            // (Senin veri yapında muhtemelen dağınık duruyorlar, id ile eşleşeni bulacağız)
            
            const allData = window.TUM_VERILER;
            
            // Eğer veride 'contents' dizisi varsa oraya bak (Genel Firebase yapısı)
            const contentList = allData.contents || [];
            // Eğer veride 'definitions' dizisi varsa oraya bak
            const definitionList = allData.definitions || [];

            // ID eşleşmesi ile verileri süz
            const relatedContents = [...contentList, ...definitionList].filter(item => item.topicId === id);

            // Bulunanları türüne göre ayır
            relatedContents.forEach(item => {
                // Kavramlar
                if (item.type === 'concept' || item.type === 'definition' || (item.content && item.content.term)) {
                    foundDefinitions.push(item);
                }
                // Notlar
                else if (item.type === 'note' || item.type === 'text' || (item.content && item.content.text)) {
                    foundNotes.push(item);
                }
            });

            // YÖNTEM 2: Eğer yukarıdan boş dönerse, ders ağacının içine bak (courses -> units -> topics -> definitions/notes)
            if (foundDefinitions.length === 0 && foundNotes.length === 0) {
                if (allData.courses) {
                    allData.courses.forEach(course => {
                        course.units.forEach(unit => {
                            const topic = unit.topics.find(t => t.id === id);
                            if (topic) {
                                // Eğer topic içinde writingContent varsa
                                if (topic.writingContent) {
                                    if (topic.writingContent.conceptDefinitions) foundDefinitions = topic.writingContent.conceptDefinitions;
                                    if (topic.writingContent.notes) foundNotes = topic.writingContent.notes;
                                }
                                // Veya topic içinde steps varsa
                                if (topic.steps) {
                                    topic.steps.forEach(step => {
                                        if (step.type === 'concept' || step.type === 'definition') foundDefinitions.push(step);
                                        if (step.type === 'text' || step.type === 'note') foundNotes.push(step);
                                    });
                                }
                            }
                        });
                    });
                }
            }

            // 5. HTML Oluştur
            let htmlContent = '';

            // --- KAVRAMLAR BÖLÜMÜ ---
            if (foundDefinitions.length > 0) {
                htmlContent += `
                    <div class="content-section">
                        <h2>💡 Kavramlar ve Tanımlar</h2>
                        <div class="space-y-4">
                `;
                
                foundDefinitions.forEach(item => {
                    // Veri yapısına göre terim ve tanımı bulmaya çalış
                    let term = item.term || (item.content ? item.content.term : null) || (item.content ? item.content.text : null) || "Kavram";
                    let def = item.definition || (item.content ? item.content.definition : null) || "";

                    htmlContent += `
                        <div class="item bg-slate-800/50 p-4 rounded-lg border-l-4 border-cyan-500">
                            <strong class="text-cyan-300 block text-lg mb-1">${term}</strong>
                            <span class="text-slate-300">${def}</span>
                        </div>
                    `;
                });

                htmlContent += `</div></div>`;
            }

            // --- NOTLAR BÖLÜMÜ ---
            if (foundNotes.length > 0) {
                htmlContent += `
                    <div class="content-section">
                        <h2>📌 Önemli Notlar</h2>
                        <ul class="space-y-3">
                `;

                foundNotes.forEach(item => {
                    // Not metnini bul
                    let text = item.text || (item.content ? item.content.text : null) || item.content || "";
                    
                    // Eğer text HTML içeriyorsa direkt bas, değilse p etiketiyle
                    htmlContent += `
                        <li class="item bg-slate-800/30 p-3 rounded border border-white/5 flex gap-3">
                            <span class="text-yellow-500 text-xl">➤</span>
                            <div class="text-slate-200">${text}</div>
                        </li>
                    `;
                });

                htmlContent += `</ul></div>`;
            }

            // --- HİÇBİR ŞEY BULUNAMADIYSA ---
            if (foundDefinitions.length === 0 && foundNotes.length === 0) {
                mainContainer.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-slate-500 text-lg">Bu konu için henüz yazılı içerik eklenmemiş.</p>
                        <button onclick="history.back()" class="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Geri Dön</button>
                    </div>
                `;
            } else {
                mainContainer.innerHTML = htmlContent;
            }

            hideLoading();

        } catch (err) {
            console.error(err);
            showError("İçerik oluşturulurken bir hata oluştu: " + err.message);
        }
    }
});