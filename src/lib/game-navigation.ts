import type { ReadonlyURLSearchParams } from 'next/navigation';

/**
 * Öğretmenler için Din Dersi Atölyesi (Etkinlik Merkezi) hedef URL'ini
 * mevcut sorgu parametrelerini (classId, courseId, unitId, topicId vb.) koruyarak üretir.
 */
export function getTeacherActivitiesUrl(
    searchParams?: URLSearchParams | ReadonlyURLSearchParams | null
): string {
    const params = new URLSearchParams();
    const classId = searchParams?.get('classId');
    const courseId = searchParams?.get('courseId');
    const unitId = searchParams?.get('unitId');
    const topicId = searchParams?.get('topicId');
    const courseName = searchParams?.get('courseName');
    const unitName = searchParams?.get('unitName');
    const topicName = searchParams?.get('topicName');

    if (classId) params.set('classId', classId);
    if (courseId) params.set('courseId', courseId);
    if (unitId) params.set('unitId', unitId);
    if (topicId) params.set('topicId', topicId);
    if (courseName) params.set('courseName', courseName);
    if (unitName) params.set('unitName', unitName);
    if (topicName) params.set('topicName', topicName);

    const qs = params.toString();
    return qs ? `/teacher/activities?${qs}` : '/teacher/activities';
}

/**
 * Oyun içi "Geri" / "Çıkış" butonunun gideceği hedef URL'i belirler:
 * - Ana sayfadan/konudan oynayanlar: Doğrudan ana sayfaya ('/') döner (Kurulum/seçim ekranı asla gösterilmez)
 * - Görev modu: /student/gorevler
 * - Sınıf içi akıllı tahta (classId taşıyan öğretmen oturumu): /teacher/activities
 * - Diğer tüm durumlar: Her zaman ana sayfaya ('/') döner
 */
export function getGameBackUrl({
    user,
    searchParams,
    defaultBackUrl = '/',
}: {
    user?: { role?: string } | null;
    searchParams?: URLSearchParams | ReadonlyURLSearchParams | null;
    defaultBackUrl?: string;
}): string {
    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher' || user?.role === 'superadmin';
    const isMission = searchParams?.get('mode') === 'mission';
    const from = searchParams?.get('from') || searchParams?.get('source');
    const returnUrl = searchParams?.get('returnUrl');
    const classId = searchParams?.get('classId');

    // 0. Özel returnUrl belirtilmişse
    if (returnUrl) {
        return decodeURIComponent(returnUrl);
    }

    // 1. Görev modundaysa öğrenci görevlerine döner
    if (isMission) {
        return '/student/gorevler';
    }

    // 2. Yalnızca sınıf ortamında akıllı tahtada aktif sınıf dersi yürüten öğretmen için (classId zorunlu)
    if (isTeacher && classId && from !== 'home') {
        return getTeacherActivitiesUrl(searchParams);
    }

    // 3. Öğrenci panelinin kendi içerisindeki bir akıştan başlatılmışsa
    if (isStudent && from === 'student') {
        return '/student';
    }

    // 4. Eğer defaultBackUrl açıkça ana sayfa dışında güvenli bir sayfaya yönlendirilmişse (ve oyun kurulum ekranı değilse)
    if (defaultBackUrl && defaultBackUrl !== '/' && !defaultBackUrl.startsWith('/oyunlar')) {
        return defaultBackUrl;
    }

    // 5. KESİN KURAL: Ana sayfadan, konu/özet sayfasından veya genel siteden oynayan herkes (öğretmen testleri dahil)
    // kurulum/seçim ekranına asla düşmez, doğrudan ana sayfaya döner.
    return '/';
}
