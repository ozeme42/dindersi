document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const courseName = params.get('courseName');
    const topicName = params.get('topicName');

    const titleElement = document.getElementById('title');
    const gameListElement = document.getElementById('game-list');
    const loadingMessage = document.getElementById('loading-message');

    if (titleElement) {
        titleElement.textContent = `${courseName} - ${topicName}`;
    }

    if (!gameListElement || !loadingMessage) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        if (loadingMessage) loadingMessage.textContent = 'Sayfa yapısı hatalı.';
        return;
    }

    if (!topicId) {
        loadingMessage.textContent = 'Konu bilgisi bulunamadı.';
        return;
    }

    const activityTypes = [
        { href: '/oyunlar/milyoner-yarismasi', label: 'Kim 1000 Puan İster?' },
        { href: '/oyunlar/yazi-tura', label: 'Yazı Tura' },
        { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması' },
        { href: '/oyunlar/kelime-avi', label: 'Kelime Avı' },
        { href: '/oyunlar/kutu-ac', label: 'Kutu Aç' },
        { href: '/oyunlar/kavram-avi', label: 'Kavram Avı' },
        { href: '/oyunlar/eslestirme', label: 'Eşleştirme' },
        { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası' },
        { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca' },
        { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları' },
        { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur' },
        { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım' },
        { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri' },
        { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu' },
        { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi' },
        { href: '/oyunlar/labirent', label: 'Labirent' },
        { href: '/oyunlar/soru-coz', label: 'Soru Çöz' },
        { href: '/oyunlar/tornado', label: 'Tornado' },
    ];

    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('Veri dosyası bulunamadı.');
        }
        const data = await response.json();

        const questionsForTopic = data.questions.filter((q) => q.topicId === topicId);
        const activitiesForTopic = data.activities.filter((a) => a.topicId === topicId);

        let gameLinksHtml = '';

        if (questionsForTopic.length > 0 || activitiesForTopic.length > 0) {
            activityTypes.forEach(activity => {
                const url = new URL(activity.href, window.location.origin);
                url.search = params.toString(); // Copy params from current URL
                url.pathname = url.pathname.replace('/oyunlar', '/oyunlar') + '/oyun'; // Ensure it points to the game itself
                
                gameLinksHtml += `
                    <a href="${url.toString()}" class="game-link">
                        ${activity.label}
                    </a>
                `;
            });
        } else {
            gameLinksHtml = '<p>Bu konu için uygun oyun verisi bulunamadı.</p>';
        }

        gameListElement.innerHTML = gameLinksHtml;
        loadingMessage.style.display = 'none';

    } catch (error) {
        console.error("Oyun listesi yüklenirken hata:", error);
        loadingMessage.textContent = 'Oyunlar yüklenemedi.';
    }
});
