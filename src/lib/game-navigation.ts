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
 * - Öğretmen ise: Etkinlik Merkezi'ne (/teacher/activities) parametrelerle döner
 * - Öğrenci ise: Eski akış aynen korunur (defaultBackUrl veya /student/gorevler)
 */
export function getGameBackUrl({
    user,
    searchParams,
    defaultBackUrl = '/oyunlar',
}: {
    user?: { role?: string } | null;
    searchParams?: URLSearchParams | ReadonlyURLSearchParams | null;
    defaultBackUrl?: string;
}): string {
    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher' || user?.role === 'superadmin';
    const isMission = searchParams?.get('mode') === 'mission';

    // 1. Görev modundaysa öğrenci görevlerine döner
    if (isMission) {
        return '/student/gorevler';
    }

    // 2. Öğrenci ise önceki rota aynen korunur
    if (isStudent) {
        return defaultBackUrl;
    }

    // 3. Sadece öğretmen için: Etkinlik Merkezi'ne (Din Dersi Atölyesi) dön
    if (isTeacher) {
        return getTeacherActivitiesUrl(searchParams);
    }

    // Giriş yapmamış ancak akıllı tahtada ders/konu parametreleri taşıyan akış
    const hasCurriculumParams = Boolean(
        searchParams?.get('classId') && 
        (searchParams?.get('courseId') || searchParams?.get('topicId'))
    );
    if (hasCurriculumParams) {
        return getTeacherActivitiesUrl(searchParams);
    }

    return defaultBackUrl;
}
