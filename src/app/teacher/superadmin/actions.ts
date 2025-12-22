

'use server';

import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { UserProfile, SchoolClass, Course, Unit, Topic, ActivityItem, Question, Assignment, ScoreEvent } from "@/lib/types";

// Node.js file system and path modules
import fs from 'fs/promises';
import path from 'path';

// Helper to serialize any data, converting Timestamps
const serialize = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(serialize);
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = serialize(data[key]);
            }
        }
        return newObj;
    }
    return data;
};

export async function getAllUsers(): Promise<UserProfile[]> {
    const db = getAdminDb();
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return serialize({ uid: doc.id, ...data }) as UserProfile;
    });
}

export async function deleteUserFromFirestore(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Kullanıcı ID\'si belirtilmedi.' };
    }
    try {
        const auth = getAdminAuth();
        await auth.deleteUser(userId);

        const db = getAdminDb();
        await db.collection('users').doc(userId).delete();

        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting user ${userId}:`, error);
        return { success: false, error: 'Kullanıcı silinirken bir hata oluştu: ' + error.message };
    }
}

export async function updateUser(user: UserProfile): Promise<{ success: boolean; error?: string }> {
    if (!user || !user.uid) {
        return { success: false, error: "Geçersiz kullanıcı verisi." };
    }

    try {
        const db = getAdminDb();
        const auth = getAuth();
        const { uid, email, displayName, password } = user;
        const firestoreData: any = {
            displayName: user.displayName,
            role: user.role,
            class: user.class,
            score: user.score,
        };

        const authUpdatePayload: any = { email, displayName };
        if (password) {
            authUpdatePayload.password = password;
        }
        await auth.updateUser(uid, authUpdatePayload);

        const userRef = db.collection('users').doc(uid);
        await userRef.update(firestoreData);
        
        return { success: true };

    } catch (error: any) {
        console.error("Error updating user:", error);
        return { success: false, error: "Kullanıcı güncellenirken bir hata oluştu: " + error.message };
    }
}

export async function resetAllGeneralScores(): Promise<{success: boolean, error?: string}> {
    try {
        const db = getAdminDb();
        const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
        if (usersSnapshot.empty) {
            return { success: true };
        }
        
        const batch = db.batch();
        usersSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { score: 0 });
        });
        
        await batch.commit();
        return { success: true };
        
    } catch (error: any) {
        console.error("Error resetting all scores:", error);
        return { success: false, error: "Puanlar sıfırlanırken bir hata oluştu." };
    }
}

const slugify = (text: string) => {
    if (!text) return '';
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
}


export async function exportAllData(
    dataType: 'users' | 'curriculum' | 'questions' | 'examQuestions' | 'assignments' | 'scoreEvents' | 'activity-items' | 'yazilacaklar',
    filters: { classId?: string | null; courseId?: string | null; unitId?: string | null; topicId?: string | null; }
) {
    const db = getAdminDb();
    const { classId, courseId, unitId, topicId } = filters;
    
    // --- MAPPING DATA ---
    const [classesSnap, coursesSnap, unitsSnap, topicsSnap] = await Promise.all([
        db.collection('classes').get(),
        db.collection('courses').get(),
        db.collectionGroup('units').get(),
        db.collectionGroup('topics').get()
    ]);

    const classesMap = new Map(classesSnap.docs.map(doc => [doc.id, doc.data().name]));
    const coursesMap = new Map(coursesSnap.docs.map(doc => [doc.id, doc.data() as Course]));
    const unitsMap = new Map(unitsSnap.docs.map(doc => [doc.id, doc.data() as Unit]));
    const topicsMap = new Map(topicsSnap.docs.map(doc => [doc.id, doc.data() as Topic]));
    
    const getRelevantIds = async () => {
        let relevantCourseIds: string[] = [];
        let relevantUnitIds: string[] = [];
        let relevantTopicIds: string[] = [];
    
        if (courseId && courseId !== 'all') {
            relevantCourseIds = [courseId];
        } else if (classId && classId !== 'all') {
            relevantCourseIds = coursesSnap.docs
                .filter(doc => doc.data().classId === classId)
                .map(doc => doc.id);
        } else {
            relevantCourseIds = coursesSnap.docs.map(doc => doc.id);
        }
    
        const courseUnitMap: { [courseId: string]: string[] } = {};
        for (const courseDocId of relevantCourseIds) {
            const courseUnits = unitsSnap.docs
                .filter(unitDoc => unitDoc.ref.path.startsWith(`courses/${courseDocId}/`))
                .map(unitDoc => unitDoc.id);
            courseUnitMap[courseDocId] = courseUnits;
        }
    
        if (unitId && unitId !== 'all') {
            relevantUnitIds = [unitId];
        } else {
            relevantUnitIds = relevantCourseIds.flatMap(cId => courseUnitMap[cId] || []);
        }
    
        if (topicId && topicId !== 'all') {
            relevantTopicIds = [topicId];
        } else if (relevantUnitIds.length > 0) {
            const topicIdPromises = relevantCourseIds.flatMap(courseDocId => {
                const courseUnits = courseUnitMap[courseDocId] || [];
                return courseUnits
                    .filter(unitDocId => relevantUnitIds.includes(unitDocId))
                    .map(unitDocId => 
                        db.collection(`courses/${courseDocId}/units/${unitDocId}/topics`).get()
                    );
            });
            const topicSnaps = await Promise.all(topicIdPromises);
            relevantTopicIds = topicSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
        } else if (relevantCourseIds.length > 0) {
            // Case where no unit is selected but course is
            const topicIdPromises = relevantCourseIds.flatMap(courseDocId => {
                const courseUnits = courseUnitMap[courseDocId] || [];
                return courseUnits.map(unitDocId => 
                    db.collection(`courses/${courseDocId}/units/${unitDocId}/topics`).get()
                );
            });
            const topicSnaps = await Promise.all(topicIdPromises);
            relevantTopicIds = topicSnaps.flatMap(snap => snap.docs.map(doc => doc.id));
        }
        
        return { relevantCourseIds, relevantUnitIds, relevantTopicIds };
    };

    const addNamesToItem = (item: any) => {
        const newItem: any = { ...item };
        const course = coursesMap.get(item.courseId);
        
        if (course) {
            newItem.courseName = course.title;
            const className = classesMap.get(course.classId);
            if(className) {
                newItem.className = className;
            }
        }
        if (newItem.unitId && unitsMap.has(newItem.unitId)) {
            newItem.unitName = unitsMap.get(newItem.unitId)?.title;
        }
        if (newItem.topicId && topicsMap.has(newItem.topicId)) {
            newItem.topicName = topicsMap.get(newItem.topicId)?.title;
        }
        
        const fieldsToRemove = ['id', 'createdAt', 'classId', 'courseId', 'unitId', 'topicId', 'teacherId', 'topic', 'uid', 'password'];
        fieldsToRemove.forEach(field => delete newItem[field]);


        return newItem;
    };
    
    if (dataType === 'yazilacaklar') {
        const { relevantTopicIds } = await getRelevantIds();
        const yazilacaklarData: any[] = [];
        const topicsToProcess = topicsSnap.docs.filter(doc => relevantTopicIds.length === 0 || relevantTopicIds.includes(doc.id));
        
        for (const topicDoc of topicsToProcess) {
            const topicData = topicDoc.data() as Topic;
            const pathSegments = topicDoc.ref.path.split('/');
            const cId = pathSegments[1];
            const uId = pathSegments[3];
            const course = coursesMap.get(cId);

            const defsSnap = await db.collection('activityItems')
                .where('topicId', '==', topicDoc.id)
                .where('type', '==', 'definition')
                .get();

            const conceptDefinitions = defsSnap.docs.map(d => ({
                concept: d.data().content.term,
                definition: d.data().content.definition
            }));

            const notes = topicData.writingContent?.notes || [];

            if (notes.length > 0 || conceptDefinitions.length > 0) {
                 yazilacaklarData.push({
                   className: classesMap.get(course?.classId || '') || 'Genel',
                   courseName: course?.title || 'Bilinmeyen Ders',
                   unitName: unitsMap.get(uId)?.title || 'Bilinmeyen Ünite',
                   topicName: topicData.title,
                   writingContent: {
                       notes,
                       conceptDefinitions
                   }
               });
            }
        }
        return serialize(yazilacaklarData);
    }
    
    const { relevantTopicIds } = await getRelevantIds();
    
    const fetchCollectionByFilter = async (collectionName: string, field: string, ids: string[]) => {
        if (ids.length === 0 && (topicId || unitId || courseId || classId)) {
            return [];
        }
        
        let allItems: any[] = [];
        let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(collectionName);
        
        if (ids.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < ids.length; i += 30) {
                chunks.push(ids.slice(i, i + 30));
            }
            for (const chunk of chunks) {
                const snapshot = await query.where(field, 'in', chunk).get();
                const items = snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
                allItems.push(...items);
            }
        } else {
            const snapshot = await query.get();
            allItems = snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
        }
        return allItems;
    };

    switch (dataType) {
        case 'users':
            let usersQuery: FirebaseFirestore.Query = db.collection('users');
            if (classId && classId !== 'all') {
                const className = classesMap.get(classId);
                usersQuery = usersQuery.where('class', '>=', className).where('class', '<', className + '\uf8ff');
            }
            const usersSnapshot = await usersQuery.get();
            return usersSnapshot.docs.map(userDoc => {
                const user = addNamesToItem(serialize({ uid: userDoc.id, ...userDoc.data() }));
                return user;
            });
            
       case 'curriculum': {
            const { relevantCourseIds } = await getRelevantIds();
            const coursesToExport = coursesSnap.docs
                .filter(doc => relevantCourseIds.length === 0 || relevantCourseIds.includes(doc.id));
        
            const curriculumData = await Promise.all(coursesToExport.map(async (courseDoc) => {
                const course = courseDoc.data() as Course;
                const className = classesMap.get(course.classId || '') || 'Genel';
                
                const unitsInCourse = unitsSnap.docs
                    .filter(doc => doc.ref.path.startsWith(`courses/${courseDoc.id}/`));

                const units = await Promise.all(unitsInCourse.map(async (unitDoc) => {
                    const unitData = unitDoc.data() as Unit;
                    
                    const topicsInUnit = topicsSnap.docs
                        .filter(topicDoc => topicDoc.ref.path.startsWith(`courses/${courseDoc.id}/units/${unitDoc.id}/`));
                    
                    const topics = topicsInUnit.map(topicDoc => ({ title: topicDoc.data().title }));
                    
                    if (topics.length > 0) {
                        return { title: unitData.title, topics };
                    }
                    return null;
                }));
                    
                return { title: course.title, className, units: units.filter(Boolean) };
            }));
            return curriculumData;
        }
        case 'questions':
            return fetchCollectionByFilter('questions', 'topicId', relevantTopicIds);
        case 'examQuestions':
             return fetchCollectionByFilter('examQuestions', 'topicId', relevantTopicIds);
        case 'activity-items':
            return fetchCollectionByFilter('activityItems', 'topicId', relevantTopicIds);
        case 'assignments': {
             let query: FirebaseFirestore.Query = db.collection('assignments');
             if (classId && classId !== 'all') {
                 query = query.where('classId', '==', classId);
             }
             const snapshot = await query.get();
             return snapshot.docs.map(doc => addNamesToItem(serialize({ id: doc.id, ...doc.data() })));
        }
        case 'scoreEvents': {
            const allUsersSnapshot = await db.collection('users').get();
            const userMap = new Map(allUsersSnapshot.docs.map(u => [u.id, { displayName: u.data().displayName, className: u.data().class?.split(' - ')[0] || '' }]));
            
            let userIdsToFilter: string[] = [];
            if (classId && classId !== 'all') {
                const className = classesMap.get(classId);
                userIdsToFilter = allUsersSnapshot.docs
                    .filter(doc => doc.data().class?.startsWith(className || '###'))
                    .map(doc => doc.id);
            }

            const eventsData = await fetchCollectionByFilter('scoreEvents', 'userId', userIdsToFilter); 
            return eventsData.map((event: any) => ({
                userName: userMap.get(event.userId)?.displayName || 'Bilinmeyen Kullanıcı',
                ...event,
            }));
        }
        
        default:
            throw new Error(`Invalid data type: ${dataType}`);
    }
}

export async function exportDataForStaticSite(filters: { classId?: string | null; courseId?: string | null; unitId?: string | null; topicId?: string | null; }) {
    const db = getAdminDb();
    const { classId, courseId, unitId, topicId } = filters;
    const allDocsToWrite: { path: string, content: string }[] = [];
    const exportPath = path.join(process.cwd(), 'public', 'curriculum');
    const CHUNK_SIZE = 100;

    try {
        const addFileToWrite = (filePath: string, content: any) => {
            allDocsToWrite.push({
                path: path.join(exportPath, filePath),
                content: JSON.stringify(content)
            });
        };

        if (!classId && !courseId && !unitId && !topicId) {
            try {
                const existingFiles = await fs.readdir(exportPath);
                const deletePromises = existingFiles.map(file => fs.unlink(path.join(exportPath, file)));
                await Promise.all(deletePromises);
            } catch (e: any) {
                if (e.code !== 'ENOENT') console.warn("Could not clear curriculum directory, it might not exist yet.");
            }
        }
        await fs.mkdir(exportPath, { recursive: true });
        
        const manifestClassesSnap = await db.collection("classes").orderBy('createdAt', 'asc').get();
        const manifestCoursesSnap = await db.collection("courses").get();
        const allCoursesForManifest = manifestCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Course }));

        let classGroups = await Promise.all(manifestClassesSnap.docs.map(async (classDoc) => {
            const classData = classDoc.data() as SchoolClass;
            if (classData.isPublished === false) return null;
            
            const coursesInClass = allCoursesForManifest.filter(c => c.classId === classDoc.id && (c.isPublished ?? true));
            if (coursesInClass.length === 0) return null;

            const courses = await Promise.all(coursesInClass.map(async (course) => {
                const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').get();
                const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                    const unitData = unitDoc.data() as Unit;
                    if (!(unitData.isPublished ?? true)) return null;
                    
                    const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                    
                    const hasContent = !!unitData.htmlContent || topicsSnapshot.docs.some(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                        const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                        return (topicData.isPublished ?? true) && (topicData.htmlContent || hasYazilacaklar);
                    });

                    return hasContent ? { id: unitDoc.id, title: unitData.title, hasUnitOzet: !!unitData.htmlContent, topics: [] } : null;
                }));

                const validUnits = units.filter(Boolean);
                return validUnits.length > 0 ? { id: course.id, title: course.title, units: validUnits } : null;
            }));

            const validCourses = courses.filter(Boolean);
            return validCourses.length > 0 ? { name: classData.name, courses: validCourses } : null;
        }));
        
        // Add "Genel" courses
        const generalCoursesData = allCoursesForManifest.filter(c => !c.classId && (c.isPublished ?? true));
        if (generalCoursesData.length > 0) {
             const courses = await Promise.all(generalCoursesData.map(async (course) => {
                const unitsSnapshot = await db.collection('courses').doc(course.id).collection('units').get();
                 const units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                    const unitData = unitDoc.data() as Unit;
                    if (!(unitData.isPublished ?? true)) return null;
                    
                    const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unitDoc.id).collection('topics').get();
                    const hasContent = !!unitData.htmlContent || topicsSnapshot.docs.some(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                         const hasYazilacaklar = (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                        return (topicData.isPublished ?? true) && (topicData.htmlContent || hasYazilacaklar);
                    });

                    return hasContent ? { id: unitDoc.id, title: unitData.title, hasUnitOzet: !!unitData.htmlContent, topics: [] } : null;
                }));
                 const validUnits = units.filter(Boolean);
                return validUnits.length > 0 ? { id: course.id, title: course.title, units: validUnits } : null;
             }));
             const validGeneralCourses = courses.filter(Boolean);
             if (validGeneralCourses.length > 0) {
                 classGroups.push({ name: "Genel", courses: validGeneralCourses as any });
             }
        }
        
        let finalClassGroups = classGroups.filter(Boolean) as any[];

        for (let group of finalClassGroups) {
            for (let course of group.courses) {
                for (let unit of course.units) {
                    const topicsSnapshot = await db.collection('courses').doc(course.id).collection('units').doc(unit.id).collection('topics').orderBy('title').get();
                    
                    const topicPromises = topicsSnapshot.docs.map(async (doc) => {
                        const topicData = doc.data() as Topic;
                        if (!(topicData.isPublished ?? true)) return null;

                        const defsSnap = await db.collection('activityItems').where('topicId', '==', doc.id).where('type', '==', 'definition').get();

                        const hasYazilacaklarContent = (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0 || !defsSnap.empty;
                        const hasOzetContent = !!topicData.htmlContent;
                        
                        if (hasOzetContent || hasYazilacaklarContent) {
                            return { id: doc.id, title: topicData.title, hasYazilacaklarContent, hasOzetContent };
                        }
                        return null;
                    });
                    
                    const topics = (await Promise.all(topicPromises)).filter(Boolean);
                    unit.topics = topics;
                }
                course.units = course.units.filter((u: any) => u.topics.length > 0 || u.hasUnitOzet);
            }
            group.courses = group.courses.filter((c: any) => c.units.length > 0);
        }
        
        finalClassGroups = finalClassGroups.filter(g => g.courses.length > 0);

        addFileToWrite('manifest.json', { classGroups: finalClassGroups });
        
        await fs.mkdir(path.join(exportPath, 'activities'), { recursive: true });

        const activitiesSnapshot = await db.collection('activityItems').get();
        const activitiesByTopic: { [key: string]: any[] } = {};
        activitiesSnapshot.docs.forEach((doc) => {
            const item = serialize({ id: doc.id, ...doc.data() });
            if (item.topicId) {
                if (!activitiesByTopic[item.topicId]) activitiesByTopic[item.topicId] = [];
                activitiesByTopic[item.topicId].push(item);
            }
        });
        
        for (const tId in activitiesByTopic) {
             addFileToWrite(`activities/${tId}.json`, activitiesByTopic[tId]);
        }
        
        for (let i = 0; i < allDocsToWrite.length; i += CHUNK_SIZE) {
            const chunk = allDocsToWrite.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(file => fs.writeFile(file.path, file.content)));
        }
        
        return { success: true, message: `${allDocsToWrite.length} dosya başarıyla oluşturuldu.` };

    } catch (e: any) {
        console.error("Error exporting static site data:", e);
        return { success: false, error: "Statik site verileri oluşturulurken bir hata oluştu: " + e.message };
    }
}
```
<change>
    <file>/src/app/curriculum/page.tsx</file>
    <content><![CDATA[
// @/app/curriculum/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Star, ChevronRight, FileText, Columns, Library } from 'lucide-react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Topic = { id: string; title: string; hasYazilacaklarContent: boolean; hasOzetContent: boolean };
type Unit = { id: string; title: string; hasUnitOzet: boolean; topics: Topic[] };
type Course = { id: string; title: string; units: Unit[] };
type ClassGroup = { name: string; courses: Course[] };

const getGradient = (index: number) => {
    const gradients = [
        'from-purple-500 to-indigo-600',
        'from-pink-500 to-rose-600',
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600',
        'from-cyan-400 to-blue-600'
    ];
    return gradients[index % gradients.length];
};

export default function PublicCurriculumPage() {
    const [data, setData] = useState<{ classGroups: ClassGroup[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchManifest = async () => {
            try {
                // public/curriculum/manifest.json dosyasını çek
                const res = await fetch('/curriculum/manifest.json');
                if (!res.ok) {
                    throw new Error('Müfredat manifestosu yüklenemedi.');
                }
                const manifestData = await res.json();
                setData(manifestData);
            } catch (error) {
                console.error("Error fetching manifest:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchManifest();
    }, []);

    const formatGroupName = (name: string) => {
        if (!isNaN(parseInt(name))) {
            return `${name}. Sınıf`;
        }
        return name;
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (!data || !data.classGroups || data.classGroups.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-center">
                <p className="text-xl text-slate-400">Görüntülenecek herkese açık müfredat bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-20">
            <div className="text-center mb-12">
                <BookOpen className="mx-auto h-16 w-16 text-cyan-400 mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter">
                    Genel Müfredat
                </h1>
                <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                    Mevcut ders içeriklerini, özetleri ve önemli notları keşfedin.
                </p>
            </div>

            <div className="space-y-8 max-w-6xl mx-auto">
                {data.classGroups.map((group, groupIndex) => (
                    <div key={group.name} className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                        <h2 className={cn(
                            "px-8 py-6 text-3xl font-black text-white bg-gradient-to-r",
                            getGradient(groupIndex)
                        )}>
                            <div className="flex items-center gap-3">
                                <Star className="h-8 w-8 text-yellow-300 fill-yellow-300 drop-shadow-md flex-shrink-0" />
                                {formatGroupName(group.name)}
                            </div>
                        </h2>
                        
                        <div className="p-4 md:p-6">
                            <Accordion type="multiple" className="w-full space-y-4">
                                {group.courses.map((course) => (
                                    <AccordionItem key={course.id} value={course.id} className="border-none bg-slate-800/40 rounded-2xl overflow-hidden border border-white/5 hover:bg-slate-800/60 transition-colors">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline text-xl font-bold text-slate-200 group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-slate-900 border border-white/10 rounded-lg group-hover:scale-110 transition-transform">
                                                    <Library className="h-6 w-6 text-cyan-400" />
                                                </div>
                                                {course.title}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-2">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                                {course.units.map(unit => (
                                                     <AccordionItem key={unit.id} value={unit.id} className="border-none bg-slate-900/50 rounded-xl overflow-hidden">
                                                        <AccordionTrigger className="px-4 py-3 hover:no-underline text-slate-300 font-semibold group/unit">
                                                             <div className="flex items-center gap-3 w-full">
                                                                <ChevronRight className="h-4 w-4 text-slate-600 transition-transform duration-200 group-data-[state=open]/unit:rotate-90"/>
                                                                <span className="flex-1 text-left">{unit.title}</span>
                                                                {unit.hasUnitOzet && (
                                                                    <Link href={`/ozetler/${course.id}/${unit.id}`} onClick={(e) => e.stopPropagation()}>
                                                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-amber-900/50 hover:bg-amber-600 border border-amber-700 hover:border-amber-500 text-amber-200 hover:text-white">
                                                                            <BookOpen className="h-3 w-3 mr-1"/> Ünite Özeti
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                             </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-4 bg-black/20 space-y-2">
                                                            {unit.topics.map(topic => (
                                                                <div key={topic.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors">
                                                                    <p className="font-medium text-sm text-slate-300">{topic.title}</p>
                                                                    <div className="flex gap-2">
                                                                        {topic.hasYazilacaklarContent && (
                                                                            <Link href={`/yazilacaklar/${course.id}/${unit.id}/${topic.id}`}>
                                                                                <Button variant="secondary" size="sm" className="h-7 px-3 text-xs bg-sky-600 hover:bg-sky-500 text-white"><Columns className="mr-1.5 h-3 w-3"/> Notlar</Button>
                                                                            </Link>
                                                                        )}
                                                                        {topic.hasOzetContent && (
                                                                             <Link href={`/ozetler/${course.id}/${unit.id}/${topic.id}`}>
                                                                                <Button variant="secondary" size="sm" className="h-7 px-3 bg-purple-600 hover:bg-purple-500 text-white"><FileText className="mr-1.5 h-3 w-3"/> Özet</Button>
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </AccordionContent>
                                                     </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
