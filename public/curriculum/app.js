
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');

    if (!mainContent) {
        console.error("Hata: 'mainContent' ID'li eleman bulunamadı.");
        return;
    }

    // Başlangıçta yükleniyor mesajını göster
    mainContent.innerHTML = '<h2>Veriler Yükleniyor...</h2>';

    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Manifest dosyası yüklenemedi. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Sadece manifest dosyasından gelen mesajı göster
            if (data && data.message) {
                 mainContent.innerHTML = `<h1>Başarı!</h1><p>${data.message}</p>`;
            } else {
                 mainContent.innerHTML = '<h1>Hata</h1><p>Manifest dosyasının yapısı beklenildiği gibi değil.</p>';
            }
        })
        .catch(error => {
            console.error('Veri çekme hatası:', error);
            mainContent.innerHTML = `<h1>Hata</h1><p>Veriler yüklenirken bir sorun oluştu: ${error.message}</p>`;
        });
});
