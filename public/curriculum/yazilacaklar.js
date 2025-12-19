
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');
    const titleDiv = document.getElementById('title');
    const notesDiv = document.getElementById('notes-content');
    const defsDiv = document.getElementById('definitions-content');

    function showError(message) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = `Hata: ${message}`;
            errorDiv.style.display = 'block';
        }
        console.error(message);
    }
    
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');

    if (!topicId) {
        showError("Konu bilgisi bulunamadı.");
        return;
    }

    const dataUrl = `/curriculum/yazilacaklar/${topicId}.json`;
    fetch(dataUrl)
        .then(response => {
            if (!response.ok) throw new Error(`Veri dosyası bulunamadı: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            if (data.notes && data.notes.length > 0) {
                notesDiv.innerHTML = data.notes.map(note => 
                    `<li class="text-3xl mb-4 p-4 bg-slate-800 rounded-lg shadow-md">${note}</li>`
                ).join('');
            } else {
                notesDiv.innerHTML = '<p class="text-slate-500">Bu konu için önemli not bulunmuyor.</p>';
            }
            
            if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
                defsDiv.innerHTML = data.conceptDefinitions.map(item => 
                    `<div class="mb-6 p-4 bg-slate-800 rounded-lg shadow-md">
                        <h3 class="text-2xl font-bold text-cyan-400">${item.concept}</h3>
                        <p class="text-xl mt-2">${item.definition}</p>
                    </div>`
                ).join('');
            } else {
                 defsDiv.innerHTML = '<p class="text-slate-500">Bu konu için kavram tanımı bulunmuyor.</p>';
            }
        })
        .catch(error => showError(error.message));
});
