'use server';

import fs from 'fs/promises';
import path from 'path';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import type { GetQuizInput } from '@/lib/types';

export interface ClassTestQuestion {
  id: string;
  type: 'mcq' | 'open_ended';
  text: string;
  options?: string[]; // Sadece Çoktan Seçmeli için (4 şık)
  correctAnswer: string; // Çoktan seçmelide doğru şık; Açık uçluda Model Cevap / Puanlama Anahtarı
  explanation?: string; // Açıklama / Çözüm gerekçesi
  difficulty?: 'Kolay' | 'Orta' | 'Zor';
  source?: 'bank' | 'ai' | 'manual';
}

export interface ClassTest {
  id: string;
  title: string;
  description?: string;
  className?: string;
  courseName?: string;
  unitName?: string;
  topicName?: string;
  defaultDurationSeconds: number; // 0 = süre yok / manuel
  questions: ClassTestQuestion[];
  createdAt: string;
  updatedAt?: string;
}

export interface ClassTestSummary {
  id: string;
  title: string;
  description?: string;
  className?: string;
  courseName?: string;
  defaultDurationSeconds: number;
  questionCount: number;
  mcqCount: number;
  openEndedCount: number;
  createdAt: string;
}

const TESTS_DIR = path.join(process.cwd(), 'public', 'curriculum', 'class-tests');

// Örnek Başlangıç Testi
const SAMPLE_TEST: ClassTest = {
  id: 'ornek-5-sinif-peygamber',
  title: '5. Sınıf - Peygamber İnancı Karma Alıştırma Testi',
  description: 'Öğrencilerin defterlerine cevaplayacağı 3 çoktan seçmeli ve 2 açık uçlu örnek sınıf testi.',
  className: '5. Sınıf',
  courseName: 'Din Kültürü ve Ahlak Bilgisi',
  unitName: '1. İnsan ve Din',
  topicName: 'Peygamber ve Peygamberlere İman',
  defaultDurationSeconds: 60,
  createdAt: new Date().toISOString(),
  questions: [
    {
      id: 'q-sample-1',
      type: 'mcq',
      text: 'Peygamberlerin Allah’tan (c.c.) aldıkları vahiyleri ve emirleri insanlara eksiksiz ve olduğu gibi ulaştırmalarına ne ad verilir?',
      options: ['Sıdk', 'Tebliğ', 'Fetanet', 'İsmet'],
      correctAnswer: 'Tebliğ',
      explanation: 'Tebliğ, peygamberlerin vahiyleri eksiksiz insanlara bildirmesi sıfatıdır.',
      difficulty: 'Kolay',
      source: 'manual'
    },
    {
      id: 'q-sample-2',
      type: 'mcq',
      text: 'Aşağıdakilerden hangisi peygamberlerin ortak sıfatlarından biri olan "Emanet" kelimesinin anlamıdır?',
      options: ['Doğru sözlü olmak', 'Güvenilir olmak', 'Akıllı ve zeki olmak', 'Günahtan korunmuş olmak'],
      correctAnswer: 'Güvenilir olmak',
      explanation: 'Emanet, peygamberlerin her konuda güvenilir ve dürüst olmalarını ifade eder.',
      difficulty: 'Kolay',
      source: 'manual'
    },
    {
      id: 'q-sample-3',
      type: 'open_ended',
      text: 'Peygamberlerin insanlara örnek olması neden önemlidir? Bir insanın melek yerine peygamber olarak gönderilmesinin hikmetini iki maddeyle açıklayınız.',
      correctAnswer: 'Model Cevap:\n1. İnsan peygamberler bizim gibi yaşar, yer, içer, sevinir, üzülür; dolayısıyla ibadetlerin ve ahlakın pratikte nasıl uygulanacağını bizzat göstererek en gerçekçi örneği (üsve-i hasene) oluşturur.\n2. Melekler insanüstü varlıklar olduğu için insanlar "onlar melek, biz onların yaptıklarını yapamayız" diyerek mazeret öne sürebilirdi; insan olması bu mazereti ortadan kaldırır.',
      explanation: 'Öğrencinin; örneklik (rol model), insan fıtratına uygunluk ve bahaneleri ortadan kaldırma noktalarına değinmesi yeterlidir.',
      difficulty: 'Orta',
      source: 'manual'
    },
    {
      id: 'q-sample-4',
      type: 'mcq',
      text: 'Peygamberlerin Allah’ın izniyle peygamberliklerini ispatlamak için gösterdikleri, insanların benzerini yapmaktan aciz kaldığı olağanüstü olaylara ne denir?',
      options: ['Keramet', 'Mucize', 'İlham', 'Rüya'],
      correctAnswer: 'Mucize',
      explanation: 'Mucize, sadece peygamberlere has ve Allah’ın izniyle gerçekleşen harikulade olaylardır.',
      difficulty: 'Kolay',
      source: 'manual'
    },
    {
      id: 'q-sample-5',
      type: 'open_ended',
      text: '"Sıdk" ve "İsmet" kavramlarını tanımlayarak bu iki sıfatın bir peygamberde bulunmasının insanlara güven vermedeki etkisini kısaca yazınız.',
      correctAnswer: 'Model Cevap:\n- Sıdk: Peygamberlerin her zaman doğru sözlü olması, asla yalan söylememesidir.\n- İsmet: Peygamberlerin her türlü günahtan ve kötülükten korunmuş olmasıdır.\n- Etkisi: İnsanlar ancak sözünde duran ve ahlakı temiz olan bir elçinin getirdiği dine ve vahye tereddüt etmeden inanır ve itaat eder.',
      explanation: 'Sıdk ve İsmet tanımları doğru yapılmalı ve güven duygusuyla olan bağı açıklanmalıdır.',
      difficulty: 'Orta',
      source: 'manual'
    }
  ]
};

async function ensureTestsDirectory() {
  try {
    await fs.mkdir(TESTS_DIR, { recursive: true });
    const indexPath = path.join(TESTS_DIR, 'index.json');
    try {
      await fs.access(indexPath);
    } catch {
      // Dizin boşsa örnek testi yaz
      await fs.writeFile(path.join(TESTS_DIR, `${SAMPLE_TEST.id}.json`), JSON.stringify(SAMPLE_TEST, null, 2), 'utf-8');
      const initialIndex: ClassTestSummary[] = [{
        id: SAMPLE_TEST.id,
        title: SAMPLE_TEST.title,
        description: SAMPLE_TEST.description,
        className: SAMPLE_TEST.className,
        courseName: SAMPLE_TEST.courseName,
        defaultDurationSeconds: SAMPLE_TEST.defaultDurationSeconds,
        questionCount: SAMPLE_TEST.questions.length,
        mcqCount: SAMPLE_TEST.questions.filter(q => q.type === 'mcq').length,
        openEndedCount: SAMPLE_TEST.questions.filter(q => q.type === 'open_ended').length,
        createdAt: SAMPLE_TEST.createdAt
      }];
      await fs.writeFile(indexPath, JSON.stringify(initialIndex, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error ensuring tests directory:', err);
  }
}

/**
 * Kayıtlı tüm testlerin özet listesini döner.
 */
export async function getClassTests(): Promise<{ success: boolean; tests: ClassTestSummary[]; error?: string }> {
  try {
    await ensureTestsDirectory();
    const indexPath = path.join(TESTS_DIR, 'index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    const tests: ClassTestSummary[] = JSON.parse(content);
    return { success: true, tests: tests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  } catch (error: any) {
    console.error('Error in getClassTests:', error);
    return { success: false, tests: [], error: error.message };
  }
}

/**
 * Belirli bir testin tüm detaylarını (sorularıyla birlikte) getirir.
 */
export async function getClassTestById(id: string): Promise<{ success: boolean; test?: ClassTest; error?: string }> {
  try {
    await ensureTestsDirectory();
    const filePath = path.join(TESTS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const test: ClassTest = JSON.parse(content);
    return { success: true, test };
  } catch (error: any) {
    console.error(`Error in getClassTestById (${id}):`, error);
    return { success: false, error: 'Test bulunamadı veya okunamadı.' };
  }
}

/**
 * Testi kaydeder veya günceller.
 */
export async function saveClassTest(test: ClassTest): Promise<{ success: boolean; error?: string }> {
  try {
    if (!test.id || !test.title || !test.questions || test.questions.length === 0) {
      return { success: false, error: 'Test başlığı ve en az bir soru zorunludur.' };
    }

    await ensureTestsDirectory();
    const filePath = path.join(TESTS_DIR, `${test.id}.json`);
    test.updatedAt = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(test, null, 2), 'utf-8');

    // index.json güncelle
    const indexPath = path.join(TESTS_DIR, 'index.json');
    let index: ClassTestSummary[] = [];
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    } catch {}

    const summary: ClassTestSummary = {
      id: test.id,
      title: test.title,
      description: test.description,
      className: test.className,
      courseName: test.courseName,
      defaultDurationSeconds: test.defaultDurationSeconds,
      questionCount: test.questions.length,
      mcqCount: test.questions.filter(q => q.type === 'mcq').length,
      openEndedCount: test.questions.filter(q => q.type === 'open_ended').length,
      createdAt: test.createdAt || new Date().toISOString()
    };

    const existingIndex = index.findIndex(t => t.id === test.id);
    if (existingIndex !== -1) {
      index[existingIndex] = summary;
    } else {
      index.unshift(summary);
    }

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving class test:', error);
    return { success: false, error: error.message || 'Test kaydedilirken hata oluştu.' };
  }
}

/**
 * Testi siler.
 */
export async function deleteClassTest(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureTestsDirectory();
    const filePath = path.join(TESTS_DIR, `${id}.json`);
    await fs.unlink(filePath).catch(() => {});

    const indexPath = path.join(TESTS_DIR, 'index.json');
    let index: ClassTestSummary[] = [];
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
      index = index.filter(t => t.id !== id);
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting class test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Soru Bankasından test için soru seçme listesi getirir.
 */
export async function getBankQuestionsForTest(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
  count?: number;
}): Promise<{ success: boolean; questions: ClassTestQuestion[]; error?: string }> {
  try {
    const quizInput: GetQuizInput = {
      courseId: params.courseId === 'all' ? undefined : params.courseId,
      unitId: params.unitId === 'all' ? undefined : params.unitId,
      topicId: params.topicId === 'all' ? undefined : params.topicId,
      questionCount: params.count || 40,
      questionTypes: ['mcq', 'Çoktan Seçmeli'],
      isStatic: true
    };

    const result = await getQuestionsFromBank(quizInput as any);
    if (result.error) {
      return { success: false, questions: [], error: result.error };
    }

    const converted: ClassTestQuestion[] = (result.questions || []).map((q: any, idx: number) => {
      const questionText = q.text || q.question || '';
      return {
        id: q.id || `bank-q-${Date.now()}-${idx}`,
        type: 'mcq',
        text: questionText,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'Orta',
        source: 'bank'
      };
    });

    return { success: true, questions: converted };
  } catch (error: any) {
    console.error('Error in getBankQuestionsForTest:', error);
    return { success: false, questions: [], error: error.message };
  }
}

/**
 * Yapay Zeka (AI) ile Kaynak Metinden veya Özel İstemden Çoktan Seçmeli ve Açık Uçlu sorular üretir.
 */
export async function generateAiQuestionsForTest(params: {
  sourceText?: string;
  customPrompt?: string;
  topicName?: string;
  className?: string;
  mcqCount: number;
  openEndedCount: number;
  difficulty?: 'Kolay' | 'Orta' | 'Zor' | 'Karışık';
}): Promise<{ success: boolean; questions: ClassTestQuestion[]; error?: string }> {
  try {
    const { apiKey, modelName } = await resolveActiveGeminiConfig();
    if (!apiKey) {
      return {
        success: false,
        questions: [],
        error: 'Gemini API anahtarı bulunamadı. Lütfen Ayarlar > Yapay Zeka bölümünden API anahtarınızı girin.'
      };
    }

    const { sourceText, customPrompt, topicName, className, mcqCount, openEndedCount, difficulty = 'Orta' } = params;

    const totalCount = mcqCount + openEndedCount;
    if (totalCount <= 0) {
      return { success: false, questions: [], error: 'En az 1 adet soru üretilmelidir.' };
    }

    let prompt = `Sen Türkiye MEB Din Kültürü ve Ahlak Bilgisi ve İmam Hatip müfredatına tam hakim uzman bir eğitimcisin.
Aşağıda verilen bilgilere ve pedagojik kurallara dayanarak akıllı tahtada öğrencilere çözdürülmek üzere sınav soruları hazırla.

HEDEF KİTLE / SEVİYE: ${className || 'Ortaokul'} Düzeyi
${topicName ? `KONU: ${topicName}` : ''}
${difficulty ? `HEDEF ZORLUK: ${difficulty}` : ''}

İSTENEN SORU DAĞILIMI:
- Çoktan Seçmeli Soru Sayısı: ${mcqCount}
- Açık Uçlu (Klasik) Soru Sayısı: ${openEndedCount}

${sourceText ? `### KAYNAK METİN:\n"""\n${sourceText}\n"""\n(Sorular kesinlikle bu kaynak metindeki bilgi, kavram ve olaylara dayanmalıdır.)` : ''}
${customPrompt ? `### ÖĞRETMENİN ÖZEL YÖNERGESİ / TALİMATI:\n"""\n${customPrompt}\n"""` : ''}

KURALLAR:
1. Çoktan seçmeli sorularda mutlaka 4 seçenek (options) ver. Seçenekler dengeli, mantıklı ve net olsun. "correctAnswer" alanı seçeneklerden birinin birebir aynısı olsun.
2. Açık uçlu sorularda öğrencinin kavramı kendi cümleleriyle açıklaması, muhakeme etmesi veya örneklendirmesi istensin. "correctAnswer" alanına öğretmen için detaylı "Model Cevap / Puanlama Kriteri" yaz.
3. Soru metinleri sınıfın akıllı tahtasında kolayca okunabilecek sadelikte, imla ve noktalama kurallarına uygun olsun.

ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında geçerli bir JSON çıktısı üret. Başında ve sonunda başka hiçbir açıklama veya markdown metni yazma (Sadece saf JSON veya \`\`\`json \`\`\` bloğu):

{
  "questions": [
    {
      "type": "mcq",
      "text": "Soru metni buraya",
      "options": ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"],
      "correctAnswer": "A seçeneği",
      "explanation": "Bu sorunun çözüm mantığı ve gerekçesi",
      "difficulty": "Orta"
    },
    {
      "type": "open_ended",
      "text": "Açık uçlu soru metni buraya",
      "correctAnswer": "Model Cevap: Öğrencinin değinmesi gereken temel noktalar ve ideal yanıt...",
      "explanation": "Puanlama kriteri ve değerlendirme rehberi",
      "difficulty": "Orta"
    }
  ]
}
`;

    const rawResponse = await runGeminiWithFallback({
      apiKey,
      primaryModel: modelName,
      prompt,
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
      }
    });

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    const parsed = JSON.parse(cleaned);
    const questionsList = parsed.questions || parsed.data || parsed;

    if (!Array.isArray(questionsList)) {
      throw new Error('Yapay zeka yanıtı geçerli soru listesi içermiyor.');
    }

    const generatedQuestions: ClassTestQuestion[] = questionsList.map((q: any, idx: number) => ({
      id: `ai-q-${Date.now()}-${idx}`,
      type: q.type === 'open_ended' ? 'open_ended' : 'mcq',
      text: q.text || q.question || '',
      options: q.type === 'mcq' && Array.isArray(q.options) ? q.options : undefined,
      correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ''),
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'Orta',
      source: 'ai'
    }));

    return { success: true, questions: generatedQuestions };
  } catch (error: any) {
    console.error('Error generating questions with AI:', error);
    return { success: false, questions: [], error: error.message || 'Yapay zeka ile soru üretilirken hata oluştu.' };
  }
}
