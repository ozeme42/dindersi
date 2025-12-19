document.addEventListener('DOMContentLoaded', () => {
    const topicTitleEl = document.getElementById('topic-title');
    const gameList = document.getElementById('game-list');
    
    // URL'den başlığı al
    const urlParams = new URLSearchParams(window.location.search);
    const title = urlParams.get('title');
    
    if (title) topicTitleEl.textContent = decodeURIComponent(title);
    else topicTitleEl.textContent = "Genel Oyun Alanı";

    // Örnek oyun kartları
    const games = [
        { name: "Bilgi Yarışması", color: "from-blue-500 to-indigo-600", icon: "❓" },
        { name: "Kelime Avı", color: "from-green-500 to-emerald-600", icon: "🔍" },
        { name: "Eşleştirme", color: "from-purple-500 to-pink-600", icon: "🧩" }
    ];

    gameList.innerHTML = games.map(g => `
        <div class="bg-slate-800 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition hover:scale-105 cursor-pointer" onclick="alert('${g.name} yakında eklenecek!')">
            <div class="h-32 bg-gradient-to-r ${g.color} flex items-center justify-center text-4xl">${g.icon}</div>
            <div class="p-6"><h3 class="text-xl font-bold text-white">${g.name}</h3><button class="mt-4 w-full py-2 bg-slate-700 rounded text-sm">Oyna</button></div>
        </div>
    `).join('');
});