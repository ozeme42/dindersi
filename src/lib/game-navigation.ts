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
 * - Ana sayfadan/konudan oynayanlar: Doğrudan ana sayfaya ('/') döner (Kurulum ekranı asla gösterilmez)
 * - Görev modu: /student/gorevler
 * - Öğretmen modu: /teacher/activities
 * - Kurulumdan kasıtlı gelenler: Seçim ekranı
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

    // 0. Özel returnUrl belirtilmişse
    if (returnUrl) {
        return decodeURIComponent(returnUrl);
    }

    // 1. Ana sayfadan veya konu/özet portalından gelenler doğrudan ana sayfaya döner
    if (from === 'home' || from === 'portal' || from === 'konu' || from === 'ozetler' || from === 'main') {
        return '/';
    }

    // 2. Görev modundaysa öğrenci görevlerine döner
    if (isMission) {
        return '/student/gorevler';
    }

    // 3. Sadece öğretmen için: Etkinlik Merkezi'ne (Din Dersi Atölyesi) dön
    if (isTeacher) {
        return getTeacherActivitiesUrl(searchParams);
    }

    // 4. Akıllı tahta öğretmen oturumu (classId ve ders/konu parametreleri taşıyan akış)
    const hasCurriculumParams = Boolean(
        searchParams?.get('classId') && 
        (searchParams?.get('courseId') || searchParams?.get('topicId'))
    );
    if (hasCurriculumParams && !isStudent && from !== 'home') {
        return getTeacherActivitiesUrl(searchParams);
    }

    // 5. Oyun konu/özet linkinden açılmışsa ve 'from !== kurulum' ise (Ana sayfa / genel portal akışı)
    // Seçim ekranına düşmemeli, doğrudan ana sayfaya dönmeli
    if (searchParams?.get('courseId') || searchParams?.get('topicId') || searchParams?.get('unitId')) {
        if (from !== 'kurulum') {
            return '/';
        }
    }

    // 6. defaultBackUrl bir kurulum ekranına (/oyunlar/anagram-duvari vb.) yönlendiriyorsa ve from !== 'kurulum' ise
    if (defaultBackUrl && defaultBackUrl.startsWith('/oyunlar/') && from !== 'kurulum') {
        return '/';
    }

    return defaultBackUrl || '/';
}
